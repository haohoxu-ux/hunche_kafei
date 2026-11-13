import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { parse } from 'csv-parse/sync'

export function requireValue(condition, message) {
  if (!condition) throw new Error(message)
}
function amount(value) {
  if (value === '') return null
  const n = Number(value)
  requireValue(/^\d+(\.\d{1,2})?$/.test(value) && n <= 1000000, '价格或公里数格式有误')
  return n
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value + 'T12:00:00Z')
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0,10) === value
}
export function loadPricing({ folder = 'pricing', live = false } = {}) {
  const read = name => parse(readFileSync(resolve(folder,name + '.csv')), {columns:true, bom:true, trim:true, skip_empty_lines:true})
  const all = read('vehicles').map(row => {
    requireValue(/^[a-z][a-z0-9-]+$/.test(row.编号) && row.车型 && ['头车','跟车'].includes(row.用途) && ['试配','已核准','下架'].includes(row.状态), '车型行无效：' + row.编号)
    requireValue(/^\/assets\/images\/[\w.-]+\.(webp|jpg|png)$/i.test(row.图片) && existsSync(resolve('public', '.' + row.图片)) && row.图片说明, '请提供车型图片和说明：' + row.编号)
    requireValue(['县城','乡镇','全部'].includes(row.地区), '车型地区无效')
    return {id:row.编号, name:row.车型, role:row.用途, price:amount(row.对客价), status:row.状态, image:row.图片, caption:row.图片说明, region:row.地区}
  })
  requireValue(new Set(all.map(v=>v.id)).size === all.length,'车型用途编号重复')
  const vehicles = all.filter(v=>v.status === '已核准' || (!live && v.status === '试配'))
  const packages = read('packages').map(row => {
    const tails = {}
    for (const pair of row.跟车编号及数量.split('|')) {
      const [id,q] = pair.split('*')
      requireValue(all.some(v=>v.id===id && v.role==='跟车') && !Object.hasOwn(tails,id) && /^[1-9]\d?$/.test(q), '套餐跟车配置错误')
      tails[id] = Number(q)
    }
    requireValue(all.some(v=>v.id===row.头车编号 && v.role==='头车') && ['已核准','待核'].includes(row.状态) && ['县城','乡镇'].includes(row.地区), '套餐条件无效')
    const price=amount(row.价格), maxKm=amount(row.里程上限)
    requireValue(price!==null && maxKm!==null && row.名称,'套餐缺少价格、名称或里程')
    return {name:row.名称, head:row.头车编号,tails,region:row.地区,maxKm,price,status:row.状态}
  })
  const units = {基础公里:['公里'],超公里:['整队每公里','每台每公里'],乡镇:['整单','每台'],山路:['整单','每台'],高速:['整单']}
  const routes = {}
  for (const row of read('routes')) {
    const value = amount(row.金额)
    requireValue(Object.hasOwn(units,row.项目) && units[row.项目].includes(row.计费单位) && !routes[row.项目] && ['已核准','待核'].includes(row.状态) && (row.状态!=='已核准' || value!==null),'路线规则无效：' + row.项目)
    routes[row.项目] = {unit:row.计费单位,value,approved:row.状态==='已核准'}
  }
  requireValue(Object.keys(routes).length===5 && routes.基础公里.approved,'请补齐路线规则')
  const dates = {}
  for (const row of read('dates')) {
    const value = amount(row.调整金额)
    requireValue(validDate(row.婚期) && !dates[row.婚期] && ['普通','热门'].includes(row.档位) && ['已核准','待核'].includes(row.状态) && (row.状态!=='已核准' || value!==null) && (row.档位!=='普通' || value===0),'婚期行无效')
    dates[row.婚期] = {tier:row.档位,value,approved:row.状态==='已核准'}
  }
  const preview = !live && vehicles.some(v=>v.status==='试配')
  const version = createHash('sha256').update(JSON.stringify([vehicles,packages,routes,dates,preview])).digest('hex').slice(0,12)
  return {vehicles,packages,routes,dates,version,preview}
}
export function fleetLines(db, cart) {
  requireValue(cart && typeof cart==='object' && typeof cart.head==='string' && cart.tails && typeof cart.tails==='object' && !Array.isArray(cart.tails),'请重新选择车队')
  const find = (id,role) => {
    const v=db.vehicles.find(v=>v.id===id && v.role===role)
    requireValue(v,'车型已变更，请重新选车')
    return v
  }
  const entries=[[find(cart.head,'头车'),1]]
  for(const [id,n] of Object.entries(cart.tails)){
    requireValue(Number.isInteger(n) && n>0 && n<=99,'跟车数量须为 1 至 99')
    entries.push([find(id,'跟车'),n])
  }
  requireValue(entries.reduce((sum,[,n])=>sum+n,0)<=100,'单次方案最多 100 台')
  return entries.map(([v,n])=>({id:v.id,name:v.name,role:v.role,quantity:n,unit:v.price,amount:v.price===null?null:money(v.price*n)}))
}
function money(value){ return Math.round(value*100)/100 }
export function quote(db,cart,trip) {
  const lines = fleetLines(db,cart)
  requireValue(trip && validDate(trip.date) && [trip.from,trip.to].every(s=>typeof s==='string' && s.trim() && s.length<=100),'请补全婚期和起终点')
  requireValue(Number.isFinite(trip.km) && trip.km>=0 && trip.km<=10000 && ['town','mountain','highway'].every(k=>typeof trip[k]==='boolean'),'请核对里程和路线')
  const count = lines.reduce((s,l)=>s+l.quantity,0)
  const pending=[], fees=[]
  const region=trip.town?'乡镇':'县城'
  const dateRule=db.dates[trip.date]
  const matches=p=>p.head===cart.head && p.region===region && !trip.mountain && dateRule?.tier!=='热门' && trip.km<=p.maxKm && Object.keys(cart.tails).length===Object.keys(p.tails).length && Object.entries(p.tails).every(([k,v])=>cart.tails[k]===v)
  const pack=db.packages.find(p=>p.status==='已核准' && dateRule?.approved && matches(p))
  let base=0
  if(pack) base=pack.price
  else {
    for(const line of lines){
      const vehicle=db.vehicles.find(v=>v.id===line.id)
      if(line.amount===null || ![region,'全部'].includes(vehicle.region)) {pending.push(line.name+'（'+line.role+'）'+region+'用车价');line.amount=null;line.unit=null}
      else base+=line.amount
    }
    if(db.packages.some(p=>p.status==='待核' && matches(p))) pending.push('套餐优惠待车队核准，当前按单车计')
  }
  function fee(label,rule,multiplier=1){
    if(!rule.approved) pending.push(label)
    else fees.push({label,amount:money(rule.value*multiplier)})
  }
  if(!dateRule || !dateRule.approved) pending.push('婚期档位及差价')
  else if(dateRule.tier==='热门') fee('热门婚期调整',dateRule)
  const extra=money(Math.max(0,trip.km-db.routes.基础公里.value))
  if(extra) fee('超出基础里程 '+extra+' 公里',db.routes.超公里,extra*(db.routes.超公里.unit==='每台每公里'?count:1))
  for(const [flag,label] of [['town','乡镇'],['mountain','山路'],['highway','高速']]){
    if(trip[flag]) fee(label==='高速'?'高速过路费':label+'附加费',db.routes[label],db.routes[label].unit==='每台'?count:1)
  }
  return {version:db.version,preview:db.preview,lines,count,base:money(base),package:pack?.name || '',fees,pending,total:money(base+fees.reduce((s,f)=>s+f.amount,0))}
}
