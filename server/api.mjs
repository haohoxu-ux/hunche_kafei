import { resolve } from 'node:path'
import { loadPricing, quote, requireValue } from './pricing.mjs'
import { advise } from './advisor.mjs'
import { createLeads, makeMailer } from './leads.mjs'

async function readBody(req){
  requireValue(req.headers['content-type']?.split(';')[0]==='application/json','请使用 JSON 提交')
  const chunks=[];let bytes=0
  for await (const chunk of req){
    bytes+=chunk.length
    requireValue(bytes<=64000,'提交内容过长')
    chunks.push(chunk)
  }
  let data
  try{ data=JSON.parse(Buffer.concat(chunks).toString()) }catch{throw new Error('提交内容格式无效')}
  requireValue(data && typeof data==='object' && !Array.isArray(data),'请求格式无效')
  return data
}
const trim=(v,max)=>{requireValue(typeof v==='string' && v.length<=max,'请检查输入长度');return v.trim()}
export function createApi({pricing,store,mailer,env=process.env}={}){
  requireValue(!env.PRICING_MODE || ['live','preview'].includes(env.PRICING_MODE),'PRICING_MODE 应为 live 或 preview')
  const rules=pricing || loadPricing({folder:env.PRICING_DIR || 'pricing',live:env.PRICING_MODE==='live'})
  const delivery=mailer===undefined?makeMailer(env):mailer
  const leads=store || createLeads(resolve(env.LEAD_DATA_DIR || '.private'),delivery)
  const timer=setInterval(()=>leads.flush().catch(()=>console.error('咨询队列暂不可用')),15000)
  timer.unref()
  const publicCatalog={version:rules.version,preview:rules.preview,vehicles:rules.vehicles,baseKm:rules.routes.基础公里.value}
  const limits=new Map()
  async function middleware(req,res,next){
    const path=req.url.split('?')[0]
    if(!path.startsWith('/api/')) return next()
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
    try{
      if(path==='/api/catalog' && req.method==='GET') return send(200,publicCatalog)
      if(req.method!=='POST' || !['/api/quote','/api/advisor','/api/leads'].includes(path)) return send(404,{error:'接口不存在'})
      if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host) return send(403,{error:'请从本站提交'})
      if(path!=='/api/quote'){
        const key=path+req.socket.remoteAddress, now=Date.now()
        if(limits.size>1000) for(const [k,v] of limits) if(v.until<=now) limits.delete(k)
        let bucket=limits.get(key)
        if(!bucket || bucket.until<=now){bucket={until:now+60000,n:0};limits.set(key,bucket)}
        if(++bucket.n>(path==='/api/leads'?15:90)) return send(429,{error:'操作较频繁，请稍后重试'})
      }
      const data=await readBody(req)
      if(path==='/api/quote') return send(200,quote(rules,data.cart,data.trip))
      if(path==='/api/advisor') return send(200,await advise(rules,data.messages,data.cart,env))
      requireValue(typeof data.key==='string' && /^[a-zA-Z0-9-]{16,80}$/.test(data.key),'请重新确认咨询')
      const hash=leads.fingerprint(data)
      const previous=leads.existing(data.key,hash)
      if(previous) return send(200,{id:previous})
      if(data.version!==rules.version) return send(409,{error:'价格版本已更新，请刷新方案并重新确认'})
      const result=quote(rules,data.cart,data.trip)
      const c=data.contact || {}
      const contact={kind:c.kind,value:trim(c.value,80),name:trim(c.name || '',60),note:trim(c.note || '',600)}
      requireValue(contact.kind==='手机' ? /^1\d{10}$/.test(contact.value) : contact.kind==='微信' && contact.value.length>=2,'请填写有效的手机号或微信')
      requireValue(Array.isArray(data.preferences) && data.preferences.length<=60,'偏好信息无效')
      const preferences=data.preferences.map(v=>trim(v,500))
      const {date,from,to,km,town,mountain,highway}=data.trip
      const id=leads.save(data.key,hash,{trip:{date,from,to,km,town,mountain,highway},quote:result,contact,preferences})
      send(201,{id})
      void leads.flush().catch(()=>console.error('咨询队列暂不可用'))
    } catch(error){
      if(error.code || error instanceof TypeError) {console.error('婚车服务错误',error.code || error.name);return send(500,{error:'服务暂时不可用，请稍后重试'})}
      send(400,{error:error.message})
    }
  }
  return {middleware,stop:()=>{clearInterval(timer);if(!store) leads.close()}}
}
