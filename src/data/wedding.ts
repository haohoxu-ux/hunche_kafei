import { computed, reactive, ref, watch } from 'vue'

export interface Vehicle {id:string;name:string;role:'头车'|'跟车';price:number|null;image:string;caption:string;region:string}
export interface Cart {head:string;tails:Record<string,number>}
export interface Trip {date:string;from:string;to:string;km:number|'';town:boolean;mountain:boolean;highway:boolean}
export interface Line {id:string;name:string;role:string;quantity:number;unit:number|null;amount:number|null}
export interface Quote {version:string;preview:boolean;lines:Line[];count:number;base:number;package:string;fees:{label:string;amount:number}[];pending:string[];total:number}
export interface Reply {stage:string;text:string;options:string[];cart?:Cart;lines?:Line[];subtotal?:number}
export interface Message {stage:string;text:string;role:'user'|'advisor'}
export const initial:Reply={stage:'mood',text:'想象一下，接亲车队开到家门口，你最希望那一刻是什么感觉？',options:['喜庆热闹','大气有排场','低调耐看']}
const defaults=()=>({cart:{head:'',tails:{}} as Cart,trip:{date:'',from:'',to:'',km:'' as number|'',town:false,mountain:false,highway:false},messages:[] as Message[],reply:initial,applied:false})
function restore(){
  try {
    const saved=JSON.parse(sessionStorage.getItem('qinan-wedding-v1') || 'null')
    if(saved && typeof saved.cart?.head==='string' && saved.cart?.tails && saved.trip && Array.isArray(saved.messages) && saved.reply?.stage) return Object.assign(defaults(),saved) as ReturnType<typeof defaults>
  } catch { /* Session storage is optional. */ }
  return defaults()
}
export const draft=reactive(restore())
watch(draft,()=>{try{sessionStorage.setItem('qinan-wedding-v1',JSON.stringify(draft))}catch{/* storage unavailable */}})
export const catalog=ref<{version:string;preview:boolean;vehicles:Vehicle[];baseKm:number}>()
export const catalogError=ref('')
let loading:Promise<void>|undefined
export async function api<T>(path:string,data?:unknown):Promise<T>{
  const res=await fetch('/api/'+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
  const json=await res.json().catch(()=>({error:'无法连接婚车服务，请检查网络后重试'}))
  if(!res.ok || json.error) throw new Error(json.error || '服务暂不可用，请重试')
  return json as T
}
export function loadCatalog(){
  if(loading) return loading
  catalogError.value=''
  loading=api<NonNullable<typeof catalog.value>>('catalog').then(data=>{
    catalog.value=data
    const known=new Set(data.vehicles.map(v=>v.id))
    if(draft.cart.head && !known.has(draft.cart.head)) draft.cart.head=''
    for(const id of Object.keys(draft.cart.tails)) if(!known.has(id)) delete draft.cart.tails[id]
  }).catch(e=>{catalogError.value=e.message}).finally(()=>{loading=undefined})
  return loading
}
export const selected=computed(()=>(catalog.value?.vehicles || []).flatMap(v=>{
  const quantity=v.role==='头车'?Number(draft.cart.head===v.id):draft.cart.tails[v.id] || 0
  return quantity?[{...v,quantity}]:[]
}))
export const count=computed(()=>selected.value.reduce((s,v)=>s+v.quantity,0))
export const subtotal=computed(()=>selected.value.reduce((s,v)=>s+(v.price || 0)*v.quantity,0))
export const hasUnknown=computed(()=>selected.value.some(v=>v.price===null))
export const yuan=(n:number)=>'¥'+n.toLocaleString('zh-CN',{maximumFractionDigits:2})
export function change(v:Vehicle,delta:number){
  if(v.role==='头车'){draft.cart.head=delta>0?v.id:'';return}
  const n=(draft.cart.tails[v.id] || 0)+delta
  if(n>0 && n<=99 && (delta<0 || count.value<100)) draft.cart.tails[v.id]=n
  if(n<=0) delete draft.cart.tails[v.id]
}
export function applyCart(cart:Cart){draft.cart={head:cart.head,tails:{...cart.tails}}}
