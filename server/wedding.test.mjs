import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { loadPricing,quote } from './pricing.mjs'
import { advise } from './advisor.mjs'
import { createApi } from './api.mjs'
import { createLeads,makeMailer } from './leads.mjs'

const trial=loadPricing()
const trip={date:'2027-02-02',from:'秦安县城',to:'酒店',km:30,town:false,mountain:false,highway:false}
const fleet={head:'s450-head',tails:{'a6-tail':5}}
function verified(){
  const db=structuredClone(trial)
  db.packages[0].status='已核准'
  db.dates[trip.date]={tier:'普通',value:0,approved:true}
  return db
}
test('试配资料、核准套餐、改配与用途独立计价',()=>{
  assert.equal(loadPricing({live:true}).vehicles.length,0)
  assert.equal(quote(trial,fleet,trip).total,2200)
  const db=verified()
  assert.equal(quote(db,fleet,trip).total,2100)
  for(const [n,total] of [[7,2840],[11,4120]]) assert.equal(quote(db,{...fleet,tails:{'a6-tail':n}},trip).total,total)
  assert.equal(quote(db,{head:'e300-head',tails:{'e300-tail':2,'a6-tail':1}},trip).total,1420)
  assert.equal(quote(db,{head:'range-head',tails:fleet.tails},trip).total,2400)
  assert.equal(quote(db,{head:'h9-head',tails:{'hs5-tail':5}},trip).total,2100)
  assert.throws(()=>quote(db,{head:'a6-tail',tails:{}},trip))
})
test('30 公里、超里程、特殊路线、未定价及热门日期',()=>{
  const db=verified()
  assert.equal(quote(db,fleet,trip).pending.length,0)
  assert.match(quote(db,fleet,{...trip,km:31}).pending.join(' '),/1 公里/)
  db.routes.超公里.approved=true
  assert.equal(quote(db,fleet,{...trip,km:31}).total,2202)
  db.routes.超公里.unit='每台每公里'
  assert.equal(quote(db,fleet,{...trip,km:31}).total,2212)
  const road=quote(db,fleet,{...trip,town:true,mountain:true,highway:true})
  assert.equal(road.total,0);assert.ok(road.lines.every(l=>l.amount===null))
  for(const item of ['乡镇','山路','高速'])assert.match(road.pending.join(' '),new RegExp(item))
  const unknown=quote(db,{head:'h9-head',tails:{'h5-tail':3}},trip)
  assert.equal(unknown.total,600);assert.match(unknown.pending.join(' '),/红旗 H5/)
  db.dates[trip.date]={tier:'热门',value:120,approved:true}
  assert.equal(quote(db,fleet,trip).total,2320)
  assert.throws(()=>quote(db,fleet,{...trip,date:'2027-02-30'}))
})
const tastes=[{stage:'mood',text:'要中式但别太张扬'},{stage:'focus',text:'整队统一'},{stage:'size',text:'六台'},{stage:'budget',text:'没预算概念'}]
test('顾问记住已有偏好，修改方案沿用真实购物车',async()=>{
  const db=verified()
  assert.equal((await advise(db,[],null,{})).stage,'mood')
  assert.equal((await advise(db,[{stage:'mood',text:'中式、整齐、八台'}],null,{})).stage,'budget')
  const plan=await advise(db,tastes,null,{})
  assert.deepEqual(plan.cart,{head:'h9-head',tails:{'hs5-tail':5}})
  const adjust=text=>advise(db,[...tastes,{stage:'adjust',text}],fleet,{})
  assert.deepEqual((await adjust('头车留下，跟车少两台')).cart,{head:'s450-head',tails:{'a6-tail':3}})
  const swapped=await adjust('只换头车');assert.notEqual(swapped.cart.head,fleet.head);assert.deepEqual(swapped.cart.tails,fleet.tails)
  assert.ok((await adjust('有没有便宜一点的搭配')).subtotal<2200)
})
test('咨询接口并发去重、快照与失败恢复',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'wedding-leads-')),calls=[]
  const queue=createLeads(dir,async(id,body)=>{calls.push({id,body});if(calls.length===1)throw new Error('temporary')})
  const api=createApi({pricing:verified(),store:queue,env:{}})
  const app=createServer((req,res)=>api.middleware(req,res,()=>res.end()))
  await new Promise(r=>app.listen(0,'127.0.0.1',r))
  const url='http://127.0.0.1:'+app.address().port+'/api/'
  const post=(path,data)=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
  const inspect=new DatabaseSync(join(dir,'leads.sqlite'))
  try{
    const result=await (await post('quote',{cart:fleet,trip})).json()
    const data={key:'test-concurrent-12345',version:result.version,cart:fleet,trip,contact:{kind:'微信',value:'local-test',name:'',note:'测试'},preferences:['喜庆热闹']}
    const [a,b]=await Promise.all([post('leads',data),post('leads',data)])
    assert.deepEqual([a.status,b.status].sort(),[200,201])
    assert.equal((await a.json()).id,(await b.json()).id)
    assert.equal(inspect.prepare('SELECT count(*) n FROM leads').get().n,1)
    assert.equal((await post('leads',{...data,contact:{...data.contact,note:'修改'}})).status,400)
    assert.equal((await post('leads',{...data,key:'another-request-12345',version:'old'})).status,409)
    assert.equal(inspect.prepare('SELECT status FROM leads').get().status,'pending')
    assert.deepEqual(calls[0].body.quote,result)
    inspect.prepare('UPDATE leads SET retry_at=0').run()
    await queue.flush()
    assert.equal(calls.length,2);assert.equal(inspect.prepare('SELECT status FROM leads').get().status,'sent')
  }finally{api.stop();await new Promise(r=>app.close(r));inspect.close();queue.close()}
})
test('未配置 SMTP，咨询可持久保留',async()=>{
  assert.equal(makeMailer({}),null)
  const dir=mkdtempSync(join(tmpdir(),'wedding-offline-'))
  const first=createLeads(dir,null),id=first.save('test','hash',{contact:{}})
  await first.flush();first.close()
  const received=[]
  const recovered=createLeads(dir,async(key)=>{received.push(key)})
  await recovered.flush();recovered.close()
  assert.deepEqual(received,[id])
})
test('投递内容与用户确认的快照一致，邮件只发给配置的收件人',async()=>{
  let mail
  const deliver=makeMailer({MAIL_TO:'receiver@example.invalid',SMTP_USER:'sender@example.invalid',SMTP_PASS:'test'},()=>({sendMail:async message=>{mail=message}}))
  const q=quote(trial,fleet,{...trip,km:34})
  await deliver('local-test',{trip:{...trip,km:34},quote:q,contact:{kind:'微信',value:'local-test',note:'希望再优惠'},preferences:['整队统一']})
  assert.equal(mail.to,'receiver@example.invalid')
  assert.match(mail.subject,/2027-02-02｜6 台车｜试配 2200 元/)
  for(const word of ['local-test','奔驰 S450','奥迪 A6 C7/C8','34 公里','超出基础里程 4 公里','希望再优惠','整队统一',q.version]) assert.ok(mail.text.includes(word))
  assert.doesNotMatch(mail.text,/司机成本|毛利/)
})
