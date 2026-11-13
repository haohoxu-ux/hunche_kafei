import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import nodemailer from 'nodemailer'
import { requireValue } from './pricing.mjs'

export function makeMailer(env=process.env,createTransport=nodemailer.createTransport){
  if(!env.MAIL_TO || !env.SMTP_USER || !env.SMTP_PASS) return null
  const port=Number(env.SMTP_PORT || 465)
  const transport=createTransport({host:env.SMTP_HOST || 'smtp.qq.com',port,secure:port===465,requireTLS:port!==465,auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},connectionTimeout:15000,socketTimeout:25000})
  return async (id,lead)=>{
    const q=lead.quote,t=lead.trip,c=lead.contact
    const amount=(q.preview?'试配':q.pending.length?'已知费用':'参考价')+' '+q.total+' 元'
    const body=['咨询编号 '+id,'婚期 '+t.date,'联系 '+c.kind+' '+c.value,'称呼 '+(c.name||'未填写'),'路线 '+t.from+' → '+t.to+'，预计 '+t.km+' 公里', '途经 '+[t.town?'乡镇':'县城',t.mountain?'山路':'平路',t.highway?'高速':''].filter(Boolean).join('、'),
      ...q.lines.map(l=>l.role+' '+l.name+' × '+l.quantity+'，单价 '+(l.unit??'待核')+'，车型小计 '+(l.amount??'待核')),q.package?'适用套餐 '+q.package:'按车型计算','车辆已知费用 '+q.base+' 元',...q.fees.map(f=>f.label+' '+f.amount+' 元'), amount,'待核 '+(q.pending.join('、')||'无额外计价项'),'档期及具体车辆由车队回访确认','价格版本 '+q.version,'新人偏好 '+(lead.preferences.join(' ／ ')||'未填写'),'备注 '+(c.note||'无')]
    await transport.sendMail({from:env.SMTP_USER,to:env.MAIL_TO,messageId:'<'+id+'@qinan-wedding.local>',subject:'婚车咨询｜'+t.date+'｜'+q.count+' 台车｜'+amount,text:body.join('\n')})
  }
}
export function createLeads(directory,deliver){
  mkdirSync(directory,{recursive:true})
  const db=new DatabaseSync(join(directory,'leads.sqlite'))
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL,
      payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
      retry_at INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`)
  let running=false
  function fingerprint(input){return createHash('sha256').update(JSON.stringify(input)).digest('hex')}
  function existing(key,hash){
    const row=db.prepare('SELECT id,fingerprint FROM leads WHERE request_key=?').get(key)
    if(row) requireValue(row.fingerprint===hash,'此咨询内容已变更，请重新确认')
    return row?.id
  }
  function save(key,hash,lead){
    const id=randomUUID()
    db.prepare('INSERT INTO leads(id,request_key,fingerprint,payload,created_at) VALUES(?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING').run(id,key,hash,JSON.stringify(lead),Date.now())
    return existing(key,hash)
  }
  async function flush(){
    if(!deliver || running) return
    running=true
    try{
      for(let i=0;i<10;i++){
        const now=Date.now()
        const row=db.prepare("UPDATE leads SET retry_at=?,attempts=attempts+1 WHERE id=(SELECT id FROM leads WHERE status='pending' AND retry_at<=? ORDER BY created_at LIMIT 1) RETURNING id,payload,attempts").get(now+180000,now)
        if(!row) break
        try{
          await deliver(row.id,JSON.parse(row.payload))
          db.prepare("UPDATE leads SET status='sent' WHERE id=?").run(row.id)
        } catch {
          db.prepare('UPDATE leads SET retry_at=? WHERE id=?').run(now+Math.min(3600000,30000*2**Math.min(row.attempts-1,7)),row.id)
          console.warn('邮件投递待重试，咨询编号',row.id)
        }
      }
    } finally {running=false}
  }
  return {fingerprint,existing,save,flush,close:()=>db.close()}
}
