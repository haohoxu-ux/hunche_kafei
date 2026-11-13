<script setup lang="ts">
import { nextTick,onMounted,ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Send, MessageCircle } from 'lucide-vue-next'
import { draft,initial,api,type Reply,loadCatalog,catalog,yuan,applyCart } from '../data/wedding'
const router=useRouter(),input=ref(''),busy=ref(false),error=ref(''),inputEl=ref<HTMLTextAreaElement>(),last=ref<HTMLElement>(),confirm=ref<HTMLDialogElement>()
onMounted(loadCatalog)
async function send(value:string){
  const text=value.trim()
  if(!text || busy.value) return
  busy.value=true;error.value=''
  const stage=draft.reply.stage
  const user={role:'user' as const,stage,text}
  const messages=[...draft.messages.filter(m=>m.role==='user'),user].map(({text,stage})=>({text,stage}))
  try{
    const current=draft.applied?draft.cart:draft.reply.cart || (draft.cart.head?draft.cart:null)
    const result=await api<Reply>('advisor',{messages,cart:current?.head?current:null})
    draft.messages.push({role:'advisor',stage,text:draft.reply.text},user)
    draft.reply=result.cart || stage!=='adjust'?result:{...result,cart:draft.reply.cart,lines:draft.reply.lines,subtotal:draft.reply.subtotal}
    if(result.cart) draft.applied=false
    input.value='';await nextTick()
    last.value?.scrollIntoView({block:'nearest'})
  }catch(e){error.value=(e as Error).message;input.value=text}
  finally{busy.value=false}
}
function usePlan(){
  const c=draft.reply.cart
  if(!c) return
  if(!catalog.value || [c.head,...Object.keys(c.tails)].some(id=>!catalog.value?.vehicles.some(v=>v.id===id))){error.value='货架已更新，请重新聊一版搭配';return}
  applyCart(c);draft.applied=true;confirm.value?.close();router.push('/fleet')
}
function choose(){
  if((draft.cart.head || Object.keys(draft.cart.tails).length) && !draft.applied) confirm.value?.showModal()
  else if(draft.applied) router.push('/fleet')
  else usePlan()
}
function reset(){draft.messages=[];draft.reply={...initial};draft.applied=false;error.value='';input.value=''}
function key(event:KeyboardEvent){
  if(event.key==='Enter' && !event.shiftKey && !event.isComposing && event.keyCode!==229){event.preventDefault();send(input.value)}
}
</script>
<template><section class="wedding-page wrap">
<div class="wedding-heading"><div><p class="wedding-kicker">喜元素婚车搭配顾问</p><h1>聊聊我想要的婚礼</h1><p>从迎亲的画面聊起，一起挑出适合你的车队。</p></div><RouterLink to="/fleet" class="wedding-link">直接去选车 <ArrowRight :size="16"/></RouterLink></div>
<div class="advisor-layout"><div class="chat-panel"><div class="chat-bar"><span><MessageCircle :size="18"/> 婚车搭配顾问</span><button v-if="draft.messages.length" :disabled="busy" @click="reset">重新聊</button></div>
<div class="wedding-chat" aria-live="polite"><p v-for="(m,i) in draft.messages" :key="i" class="bubble" :class="m.role">{{m.text}}</p><div ref="last"><p class="bubble advisor">{{draft.reply.text}}</p></div></div>
<article v-if="draft.reply.lines && draft.reply.cart" class="suggestion"><h2>为你搭配的车队</h2><div v-for="l in draft.reply.lines" :key="l.id" class="price-row"><span>{{l.role}} · {{l.name}}</span><b>{{l.quantity}} 台</b></div><div class="quote-total"><span>{{catalog?.preview?'试配车辆小计':'车辆小计'}}</span><b>{{yuan(draft.reply.subtotal || 0)}}</b></div><button class="btn dark" @click="choose">{{draft.applied?'查看我的车队':'用这套继续选'}} <ArrowRight :size="16"/></button></article>
<div class="chat-options"><button v-for="option in draft.reply.options" :key="option" :disabled="busy" @click="send(option)">{{option}}</button><button v-if="!draft.messages.length" @click="inputEl?.focus()">我自己说</button></div>
<form class="chat-compose" @submit.prevent="send(input)"><textarea ref="inputEl" v-model="input" rows="2" maxlength="500" aria-label="描述你的想法" placeholder="说说你的想法…" @keydown="key"></textarea><button type="submit" :disabled="busy || !input.trim()" aria-label="发送想法"><Send :size="18"/></button></form>
<p v-if="busy" role="status">顾问正在整理你的想法…</p><p v-if="error" role="alert" class="form-error">{{error}}</p></div>
<aside class="advisor-aside"><img src="/assets/images/fleet-convoy.webp" alt="迎亲车队参考影像"><div><h2>你的迎亲画面</h2><p>{{draft.messages.find(m=>m.role==='user')?.text || '你喜欢的氛围，会成为搭配的起点。'}}</p><RouterLink to="/fleet" class="wedding-link">看看车型货架 <ArrowRight :size="15"/></RouterLink></div></aside></div>
<dialog ref="confirm" class="wedding-dialog"><h2>使用这套搭配？</h2><p>推荐方案将替换购物车里的车辆，已填写的行程会保留。</p><div class="wedding-actions"><button class="btn dark" @click="usePlan">确认替换</button><button class="btn outline" @click="confirm?.close()">继续考虑</button></div></dialog>
</section></template>
