import { fleetLines, requireValue } from './pricing.mjs'

export const opening = '想象一下，接亲车队开到家门口，你最希望那一刻是什么感觉？'
export const advisorPrompt = `你是秦安婚车搭配顾问。根据新人按时间排列的原话，提取偏好和最新修改意图。第一步理解画面和氛围，第二步了解主车突出还是整队统一，第三步收集数量，然后再了解预算，允许跳过。已经表达过的内容沿用，后说的修正覆盖前面的内容。第四步使用货架上的车型，第五步允许保留头车、只换头车、增减跟车、寻找低价组合。把“热闹但别太张扬”理解为整齐而克制。仅返回 JSON，字段 style（中式、热闹、大气、低调、经典或空），focus（头车亮眼、整队统一或空），size（整队台数或 null），budget（元或 null），head、tail（用户明确指定的车型编号或空），edit（none、cheaper、swapHead、changeTail、resize、delta），delta（最后一轮要求的跟车增减数量）。车型从输入货架选。只提取对话中表达的意图，不杜撰价格、车型、档期、协议或费用。`

function numbers(s) {
  const digit={'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}
  return s.replace(/[零一二两三四五六七八九十百千万]+/g, token=>{
    let result=0, current=0
    for(const c of token){
      if(Object.hasOwn(digit,c)) current=digit[c]
      else {const unit={十:10,百:100,千:1000,万:10000}[c]; result+=(current || 1)*unit;current=0}
    }
    return String(result+current)
  })
}
function localPreferences(messages,vehicles){
  const prefs={style:'',focus:'',size:null,budget:null,head:'',tail:'',edit:'none',delta:0}
  for(const {text,stage} of messages){
    const t=numbers(text)
    if(/中式|国风|传统/.test(text)) prefs.style='中式'
    else if(/低调|耐看|克制|别太张扬|简约/.test(text)) prefs.style='低调'
    else if(/大气|排场|气派|豪华/.test(text)) prefs.style='大气'
    else if(/喜庆|热闹|红火/.test(text)) prefs.style='热闹'
    else if(stage==='mood' && !prefs.style) prefs.style='经典'
    if(/整齐|统一|同系|同色/.test(text)) prefs.focus='整队统一'
    else if(/亮眼|突出|抢眼|主角/.test(text)) prefs.focus='头车亮眼'
    const change=t.match(/(少|减|去掉|多|加|增加|减少)(?:掉|上)?\s*(\d+)\s*[辆台]/)
    const size=t.match(/(\d+)\s*[辆台]/)
    if(!change && size && (stage!=='adjust' || /整队|总共|一共|总数|改成/.test(text))) prefs.size=Number(size[1])
    if(stage==='size' && !prefs.size) prefs.size=6
    const budget=t.match(/(\d+(?:\.\d+)?)\s*(?:块|元|预算|以内|左右)/) || t.match(/预算\D{0,4}(\d+)/) || (stage==='budget' && t.match(/(\d{3,})/))
    if(budget) prefs.budget=Number(budget[1])
    prefs.edit='none';prefs.delta=0
    if(change){prefs.edit='delta';prefs.delta=Number(change[2])*(/少|减|去掉/.test(change[1])?-1:1)}
    else if(/便宜|省钱|经济|降价|省一点/.test(text)) prefs.edit='cheaper'
    else if(/换.*头车|头车.*换/.test(text)) prefs.edit='swapHead'
    else if(/换.*跟车|跟车.*换/.test(text)) prefs.edit='changeTail'
    else if(stage==='adjust' && size) prefs.edit='resize'
    for(const v of vehicles){
      const model=v.name.replace(/\s/g,'')
      const match=text.replace(/\s/g,'').toUpperCase()
      if(match.includes(model.toUpperCase()) || (/S450|H9|E300|HS5/.test(model) && match.includes(model.match(/S450|H9|E300|HS5/)[0]))){
        if(v.role==='头车' && !/跟车.*E300|E300.*跟车/i.test(text)) prefs.head=v.id
        if(v.role==='跟车' && !/头车.*E300|E300.*头车/i.test(text)) prefs.tail=v.id
      }
    }
  }
  return prefs
}
async function preferences(messages,vehicles,env) {
  const prefs=localPreferences(messages,vehicles)
  if(!env.ADVISOR_API_URL || !env.ADVISOR_MODEL || !env.ADVISOR_API_KEY) return prefs
  try {
    const result=await fetch(env.ADVISOR_API_URL,{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.ADVISOR_API_KEY},body:JSON.stringify({model:env.ADVISOR_MODEL,temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:advisorPrompt},{role:'user',content:JSON.stringify({messages,vehicles:vehicles.map(({id,name,role})=>({id,name,role}))})}]})})
    if(!result.ok) return prefs
    const p=JSON.parse((await result.json()).choices[0].message.content)
    for(const [key,opts] of Object.entries({style:['中式','热闹','大气','低调','经典'],focus:['头车亮眼','整队统一'],edit:['none','cheaper','swapHead','changeTail','resize','delta']})) if(opts.includes(p[key])) prefs[key]=p[key]
    for(const [key,min,max] of [['size',1,100],['budget',0,1000000],['delta',-99,99]]) if(Number.isInteger(p[key]) && p[key]>=min && p[key]<=max) prefs[key]=p[key]
    for(const [key,role] of [['head','头车'],['tail','跟车']]) if(vehicles.some(v=>v.id===p[key] && v.role===role)) prefs[key]=p[key]
  } catch { /* Network or invalid model output: use the same local preference flow. */ }
  return prefs
}
const ask=(stage,text,options)=>({stage,text,options})
export async function advise(db,messages,current,env=process.env){
  requireValue(Array.isArray(messages) && messages.length<=60 && messages.every(m=>m && ['mood','focus','size','budget','adjust'].includes(m.stage) && typeof m.text==='string' && m.text.trim() && m.text.length<=500),'每条消息请控制在 500 字以内，最多 60 轮')
  if(!messages.length) return ask('mood',opening,['喜庆热闹','大气有排场','低调耐看'])
  const p=await preferences(messages,db.vehicles,env)
  const has=stage=>messages.some(m=>m.stage===stage)
  if(!p.focus && !has('focus')) return ask('focus',p.style==='中式'?'中式迎亲很讲究整队的观感。你想让头车更亮眼，还是喜欢整排车整齐统一？':'你希望头车稍微亮眼一点，还是更喜欢整排车看起来整齐统一？',['头车亮眼','整队统一'])
  if(!p.size && !has('size')) return ask('size','你希望几台车一起出发？还拿不准的话，我们先配一支 6 台的车队。',['6 台','8 台','12 台','先按 6 台'])
  const skipsBudget=messages.some(m=>/没预算概念|没想好预算|预算.*(不限|不确定|没想好)|不考虑预算|先不谈预算/.test(m.text))
  if(p.budget===null && !has('budget') && !skipsBudget) return ask('budget','你心里有个大概想控制的总价吗？也可以先看一版搭配再调。',['先看搭配','2500 元以内','3500 元左右'])
  const heads=db.vehicles.filter(v=>v.role==='头车' && v.price!==null && v.region!=='乡镇')
  const tails=db.vehicles.filter(v=>v.role==='跟车' && v.price!==null && v.region!=='乡镇')
  if(!heads.length || !tails.length) return ask('adjust','车队正在更新已上架车型，你可以先浏览选车页。',[])
  const affordable=list=>[...list].sort((a,b)=>a.price-b.price)
  const pick=(list,id)=>list.find(v=>v.id===id) || list[0]
  let head=pick(heads,p.head || (p.style==='中式'?'h9-head':p.focus==='头车亮眼' && p.style==='大气'?'range-head':'s450-head'))
  const toneTail=p.style==='中式'?'hs5-tail':p.focus==='整队统一' && head.id==='s450-head'?'e300-tail':'a6-tail'
  let tail=pick(tails,p.tail || toneTail)
  const size=Math.min(100,Math.max(1,p.size || 6))
  if(p.budget!==null && head.price+tail.price*(size-1)>p.budget){
    if(!p.tail) tail=affordable(tails)[0]
    if(!p.head && head.price+tail.price*(size-1)>p.budget) head=affordable(heads)[0]
  }
  let cart={head:head.id,tails:size>1?{[tail.id]:size-1}:{}}
  let reason=p.style==='中式'?'按你喜欢的中式氛围选配，先从庄重的头车和整齐的跟车开始。':p.focus==='头车亮眼'?'让头车成为迎亲队伍的视觉重点，跟车统一搭配。':'用同款跟车排出整齐的队形，让车队看起来协调。'
  if(current && messages.at(-1).stage==='adjust'){
    const lines=fleetLines(db,current)
    const count=lines.reduce((s,l)=>s+l.quantity,0)
    cart=structuredClone(current)
    if(p.edit==='delta' || p.edit==='resize'){
      let diff= p.edit==='delta'?p.delta:size-count
      diff=Math.max(1-count,Math.min(100-count,diff))
      if(diff>0){const id=Object.keys(cart.tails).at(-1) || tail.id;cart.tails[id]=(cart.tails[id]||0)+diff}
      else for(const id of Object.keys(cart.tails).reverse()){
        const n=Math.min(-diff,cart.tails[id]);cart.tails[id]-=n;diff+=n
        if(!cart.tails[id]) delete cart.tails[id]
      }
      reason='保留头车，按你的想法调整了跟车数量。'
    } else if(p.edit==='cheaper'){
      const cheapest=affordable(tails)[0]
      const origHead=db.vehicles.find(v=>v.id===cart.head)
      const keepHead=/头车.*(留|保|不换)|保留.*头车/.test(messages.at(-1).text)
      if(!keepHead && origHead.price!==null && origHead.price>affordable(heads)[0].price) cart.head=affordable(heads)[0].id
      cart.tails=count>1?{[cheapest.id]:count-1}:{}
      reason='按相同台数比较了基础价，优先采用价格较低的搭配。'
    } else if(p.edit==='swapHead' || (p.head && p.head!==cart.head)){
      const alternatives=heads.filter(v=>v.id!==cart.head)
      if(!alternatives.length) return ask('adjust','当前只有一款已定价头车，可以先调整跟车。',['跟车少两台'])
      cart.head=pick(alternatives,p.head).id;reason='这版只更换头车，跟车的车型和数量沿用原方案。'
    } else if(p.edit==='changeTail' || p.tail){
      cart.tails=count>1?{[tail.id]:count-1}:{};reason='保留头车及车队规模，重新搭配跟车。'
    } else return ask('adjust','你想先改头车、跟车型号，还是整队的台数？',['只换头车','跟车少两台','便宜一点'])
  }
  const lines=fleetLines(db,cart)
  const subtotal=lines.reduce((s,l)=>s+(l.amount || 0),0)
  const color=messages.flatMap(m=>Array.from(m.text.matchAll(/(?:喜欢|想要|要|选|偏爱|希望)?(全黑|纯白|黑色|白色|红色|香槟色|银色)/g),match=>match[1])).at(-1)
  if(color) reason+=' 你提到的'+color+'已记在方案偏好里，具体车色随档期核实。'
  if(p.budget!==null && subtotal>p.budget) reason+=' 按当前台数，车辆小计仍超过预算，可以再减少跟车。'
  return {stage:'adjust',text:reason,options:['只换头车','跟车少两台','便宜一点'],cart,lines,subtotal}
}
