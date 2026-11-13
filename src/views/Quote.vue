<script setup lang="ts">
import { computed,onMounted,ref,reactive,watch } from 'vue'
import { ArrowLeft, ArrowRight, Check, MapPin } from 'lucide-vue-next'
import { draft,api,loadCatalog,catalog,catalogError,type Quote,yuan } from '../data/wedding'
const result=ref<Quote>(),error=ref(''),sending=ref(false),loading=ref(false),leadError=ref(''),receipt=ref(''),showContact=ref(false),retry=ref(0)
const contact=reactive({kind:'手机',value:'',name:'',note:''})
const trip=draft.trip
const ready=computed(()=>draft.cart.head && trip.date && trip.from.trim() && trip.to.trim() && typeof trip.km==='number' && trip.km>=0 && trip.km<=10000)
const validContact=computed(()=>contact.kind==='手机'?/^1\d{10}$/.test(contact.value.trim()):contact.value.trim().length>=2)
onMounted(loadCatalog)
watch(()=>[catalog.value?.version,JSON.stringify(draft.cart),JSON.stringify(trip),retry.value],(_,__,cleanup)=>{
  let active=true
  result.value=undefined;error.value='';showContact.value=false;receipt.value='';leadError.value='';loading.value=false
  if(!catalog.value || !ready.value) return
  loading.value=true
  const timer=setTimeout(async()=>{
    try{const q=await api<Quote>('quote',{cart:draft.cart,trip});if(active) result.value=q}
    catch(e){if(active) error.value=(e as Error).message}
    finally{if(active) loading.value=false}
  },180)
  cleanup(()=>{active=false;clearTimeout(timer)})
},{immediate:true})
let latestBody='',latestKey=''
async function submit(){
  if(!result.value || sending.value || !validContact.value || receipt.value) return
  sending.value=true;leadError.value=''
  try{
    const payload={version:result.value.version,cart:draft.cart,trip,contact,preferences:draft.messages.filter(m=>m.role==='user').map(m=>m.text)}
    const body=JSON.stringify(payload)
    if(body!==latestBody){
      latestBody=body
      latestKey=crypto.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)
      if(crypto.subtle){
        const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body))
        const digest=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')
        try{const key='wedding-lead-'+digest;latestKey=sessionStorage.getItem(key)||latestKey;sessionStorage.setItem(key,latestKey)}catch{/* memory key remains available */}
      }
    }
    const response=await api<{id:string}>('leads',{...JSON.parse(body),key:latestKey})
    receipt.value=response.id
  }catch(e){leadError.value=(e as Error).message}
  finally{sending.value=false}
}
</script>
<template><section class="wedding-page wrap"><div class="wedding-heading"><div><p class="wedding-kicker">喜元素婚庆车队</p><h1>我的婚车报价</h1><p>补齐迎亲行程，查看这支车队的费用明细。</p></div><RouterLink to="/fleet" class="wedding-link"><ArrowLeft :size="16"/> 返回调整车辆</RouterLink></div>
<p v-if="catalogError" role="alert">{{catalogError}} <button @click="loadCatalog">重试</button></p>
<p v-else-if="!draft.cart.head">还没有选择头车。<RouterLink class="wedding-link" to="/fleet">去选车 <ArrowRight :size="16"/></RouterLink></p>
<div v-else class="quote-layout"><div class="wedding-panel"><h2><MapPin :size="21"/> 接亲行程</h2>
<fieldset class="trip-fields" :disabled="sending"><label>婚期<input v-model="trip.date" type="date" required></label><label>预计行程（公里）<input v-model.number="trip.km" type="number" min="0" max="10000" step="0.1" placeholder="例如 30" required></label><label>出发地<input v-model="trip.from" maxlength="100" placeholder="小区、村镇或酒店" required></label><label>目的地<input v-model="trip.to" maxlength="100" placeholder="接亲终点" required></label>
<div class="road-options"><label><input v-model="trip.town" type="checkbox"> 途经乡镇</label><label><input v-model="trip.mountain" type="checkbox"> 有山路</label><label><input v-model="trip.highway" type="checkbox"> 走高速</label></div></fieldset>
<p class="trial-note">县城基础里程 {{catalog?.baseKm ?? '…'}} 公里。实际档期及路线由车队回访核实。</p>
</div><div class="wedding-panel quote-sheet"><h2>方案报价</h2>
<p v-if="!ready">填好婚期、起终点与预计公里数后，这里会显示报价。</p><p v-if="loading" role="status">正在计算…</p><p v-if="error" role="alert" class="form-error">{{error}} <button @click="retry++">重新计算</button></p>
<template v-if="result"><p v-if="result.preview" class="trial-note">试配参考 · 本版使用待核准的口述资料。</p>
<div v-for="line in result.lines" :key="line.id" class="price-row"><div><small>{{line.role}}</small><strong>{{line.name}}</strong><small>{{line.unit===null?'人工核价':yuan(line.unit)+' / 台'}} × {{line.quantity}}</small></div><b>{{line.amount===null?'待核':yuan(line.amount)}}</b></div>
<div v-if="result.package" class="price-row"><span>{{result.package}}</span><b>{{yuan(result.base)}}</b></div>
<div v-else class="price-row"><span>已知车辆费用</span><b>{{yuan(result.base)}}</b></div>
<div v-for="f in result.fees" :key="f.label" class="price-row"><span>{{f.label}}</span><b>{{yuan(f.amount)}}</b></div>
<div v-if="result.pending.length" class="pending"><strong>待车队核实</strong><ul><li v-for="p in result.pending" :key="p">{{p}}</li></ul></div>
<div class="quote-total"><span>{{result.pending.length?'已知费用小计':'方案参考价'}}</span><b>{{yuan(result.total)}}</b></div>
<button v-if="!showContact" class="btn dark" @click="showContact=true">带这套方案咨询 <ArrowRight :size="16"/></button>
<form v-else-if="!receipt" class="lead-form" @submit.prevent="submit"><h3>车队怎样联系你？</h3><fieldset :disabled="sending"><div class="choice-tabs"><button v-for="kind in ['手机','微信']" :key="kind" type="button" :aria-pressed="contact.kind===kind" @click="contact.kind=kind;contact.value=''">{{kind}}</button></div><label>{{contact.kind==='手机'?'手机号码':'微信号'}}<input v-model="contact.value" :type="contact.kind==='手机'?'tel':'text'" required maxlength="80"></label><label>称呼（选填）<input v-model="contact.name" maxlength="60"></label><label>想商量的事（选填）<textarea v-model="contact.note" maxlength="600" rows="2" placeholder="例如：保留这台头车，看看还有没有优惠"></textarea></label></fieldset><small>确认后，车队将收到你的联系方式、方案、行程及搭配偏好，用于本次咨询。</small><p v-if="leadError" role="alert" class="form-error">{{leadError}} <button v-if="leadError.includes('版本')" type="button" @click="loadCatalog">刷新方案</button></p><button class="btn dark" :disabled="sending || !validContact">{{sending?'正在提交…':'确认提交咨询'}}</button></form>
<div v-else class="receipt" role="status"><Check :size="20"/><div><b>咨询已保存</b><p>车队可按你留下的方式回访。</p><small>咨询编号 {{receipt}}</small></div></div>
</template></div></div></section></template>
