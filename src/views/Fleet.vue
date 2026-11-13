<script setup lang="ts">
import { computed,onMounted,ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Plus, Minus, ShoppingBag, X, MessageCircle } from 'lucide-vue-next'
import { catalog,catalogError,loadCatalog,selected,count,subtotal,hasUnknown,draft,change,yuan,type Vehicle } from '../data/wedding'
const router=useRouter()
const role=ref<'头车'|'跟车'>('头车')
const fleet=computed(()=>catalog.value?.vehicles.filter(v=>v.role===role.value) || [])
const basket=ref<HTMLDialogElement>(),confirm=ref<HTMLDialogElement>(),dock=ref<HTMLButtonElement>()
const replacement=ref<Vehicle>(),notice=ref('')
onMounted(loadCatalog)
function fly(v:Vehicle,source:Element){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches || !dock.value) return
  const start=source.getBoundingClientRect(),end=dock.value.getBoundingClientRect()
  const img=new Image();img.src=v.image;img.alt='';img.className='fleet-flight'
  img.style.left=start.left+'px';img.style.top=start.top+'px';document.body.append(img)
  const a=img.animate([{transform:'scale(1)',opacity:1},{transform:'translate('+(end.left-start.left+18)+'px,'+(end.top-start.top)+'px) scale(.2)',opacity:.15}],{duration:450,easing:'ease-in'})
  a.onfinish=()=>img.remove();a.oncancel=()=>img.remove()
}
function add(v:Vehicle,event:MouseEvent){
  if(v.role==='头车' && draft.cart.head && draft.cart.head!==v.id){replacement.value=v;confirm.value?.showModal();return}
  if(v.role==='跟车' && (count.value>=100 || draft.cart.tails[v.id]>=99)){notice.value='已达到本方案的车辆数量上限';return}
  change(v,1);fly(v,event.currentTarget as Element);notice.value='已加入 '+v.name
}
function replace(){if(replacement.value) change(replacement.value,1);confirm.value?.close()}
function quick(total:number){
  const list=catalog.value?.vehicles || []
  const head=draft.cart.head || list.find(v=>v.role==='头车' && v.price!==null)?.id
  const tail=Object.keys(draft.cart.tails)[0] || list.find(v=>v.role==='跟车' && v.price!==null)?.id
  if(!head || !tail){notice.value='请先选择已上架的头车和跟车';return}
  const tails={...draft.cart.tails}
  let diff=total-1-Object.values(tails).reduce((s,n)=>s+n,0)
  if(diff>0) tails[tail]=(tails[tail]||0)+diff
  else for(const id of Object.keys(tails).reverse()){
    const n=Math.min(-diff,tails[id]);tails[id]-=n;diff+=n;if(!tails[id]) delete tails[id]
  }
  draft.cart={head,tails};notice.value='已搭配 '+total+' 台车，可继续调整';basket.value?.showModal()
}
function next(){basket.value?.close();router.push('/quote')}
</script>
<template>
<section class="wedding-page wrap">
  <div class="wedding-heading"><div><p class="wedding-kicker">喜元素婚庆车队</p><h1>自己选车算价</h1><p>选一辆头车，再为迎亲队伍搭配跟车。</p></div><RouterLink to="/advisor" class="wedding-link"><MessageCircle :size="17"/> 想听搭配建议</RouterLink></div>
  <p v-if="catalog?.preview" class="trial-note">试配货架 · 价格来自车队口述资料，实车、价格与档期由车队核实。</p>
  <div class="fleet-tools"><div class="choice-tabs"><button v-for="r in (['头车','跟车'] as const)" :key="r" :aria-pressed="role===r" @click="role=r">{{r}}</button></div><div class="quick-sizes"><span>快捷搭配</span><button v-for="n in [6,8,12]" :key="n" @click="quick(n)">{{n}} 台</button></div></div>
  <p v-if="catalogError" role="alert">{{catalogError}} <button class="wedding-link" @click="loadCatalog">重试</button></p>
  <p v-else-if="!catalog">正在加载车型…</p><p v-else-if="!fleet.length">车队正在整理这类车型的照片和报价。</p>
  <div class="vehicle-grid"><article v-for="v in fleet" :key="v.id" class="vehicle-card">
    <div class="vehicle-photo"><img :src="v.image" :alt="v.caption" loading="lazy"><span>{{v.caption}}</span></div>
    <div class="vehicle-body"><small>{{v.region}} · {{v.role}}</small><h2>{{v.name}}</h2><div class="vehicle-bottom"><div><b>{{v.price===null?'人工核价':yuan(v.price)}}</b><small v-if="v.price!==null"> / 台</small></div>
    <div class="counter"><template v-if="v.role==='跟车' && draft.cart.tails[v.id]"><button :aria-label="'减少'+v.name" @click="change(v,-1)"><Minus :size="16"/></button><span>{{draft.cart.tails[v.id]}}</span></template><button :disabled="v.role==='头车' && draft.cart.head===v.id" :aria-label="'加入'+v.name" @click="add(v,$event)"><span v-if="draft.cart.head===v.id">已选</span><Plus v-else :size="17"/></button></div></div></div>
  </article></div>
  <span class="wedding-sr" aria-live="polite">{{notice}}</span>
  <button ref="dock" class="fleet-dock" @click="basket?.showModal()"><ShoppingBag :size="22"/><span>我的车队 <b>{{count}}</b></span><strong>{{hasUnknown?'已知 ':''}}{{yuan(subtotal)}}</strong></button>
  <dialog ref="basket" class="wedding-dialog" @click.self="basket?.close()"><div class="dialog-heading"><h2>我的车队</h2><button aria-label="关闭车队" @click="basket?.close()"><X/></button></div>
    <p v-if="!count">还没有选车，先挑一辆喜欢的头车吧。</p>
    <div v-for="v in selected" :key="v.id" class="basket-row"><img :src="v.image" :alt="v.caption"><div><small>{{v.role}}</small><strong>{{v.name}}</strong><span>{{v.price===null?'待核价':yuan(v.price*v.quantity)}}</span></div><div class="counter"><button :aria-label="'移除一台'+v.name" @click="change(v,-1)"><Minus :size="16"/></button><span>{{v.quantity}}</span><button v-if="v.role==='跟车'" :aria-label="'增加一台'+v.name" @click="change(v,1)"><Plus :size="16"/></button></div></div>
    <div class="quote-total"><span>{{hasUnknown?'已知车辆小计':'车辆小计'}}</span><b>{{yuan(subtotal)}}</b></div><p v-if="!draft.cart.head" class="trial-note">选择头车后即可填写行程。</p>
    <button class="btn dark" :disabled="!draft.cart.head" @click="next">填写行程并报价 <ArrowRight :size="16"/></button>
  </dialog>
  <dialog ref="confirm" class="wedding-dialog"><h2>替换头车？</h2><p>将头车更换为{{replacement?.name}}，跟车配置会保留。</p><div class="wedding-actions"><button class="btn dark" @click="replace">替换头车</button><button class="btn outline" @click="confirm?.close()">保留原车</button></div></dialog>
</section></template>
