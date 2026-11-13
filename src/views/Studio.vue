<script setup lang="ts">
import {computed, ref, nextTick, onBeforeUnmount} from 'vue'
import {useRoute} from 'vue-router'
import {ArrowLeft, ArrowUpRight, ArrowRight, ArrowUp, MessageSquare, RotateCcw} from 'lucide-vue-next'
import {agents,agentPath,categories} from '../data/agents'
import {makeReply} from '../data/reply'
import AgentKey from '../components/AgentKey.vue'
const route=useRoute()
const agent=agents.find(a=>a.slug===route.params.slug)!
const back=computed(()=>({path:'/agents',query:categories.some(c=>c===route.query.category)?{category:String(route.query.category)}:{}}))
const suggestions=computed(()=>[...agents.filter(a=>a.slug!==agent.slug && a.category===agent.category),...agents.filter(a=>a.category!==agent.category)].slice(0,2))
const input=ref(typeof route.query.task==='string'?route.query.task.slice(0,1500):'')
const field=ref<HTMLTextAreaElement>()
const panel=ref<HTMLElement>()
const history=ref<{role:'user'|'assistant';text:string}[]>([])
const pending=ref(false)
let timer:ReturnType<typeof setTimeout>|undefined
function start(){field.value?.focus({preventScroll:true});field.value?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'})}
function fill(s:string){input.value=s;start()}
async function bottom(){await nextTick();if(panel.value) panel.value.scrollTop=panel.value.scrollHeight}
function send(){
  const prompt=input.value.trim()
  if(!prompt||pending.value) return
  history.value.push({role:'user',text:prompt});input.value='';pending.value=true;bottom()
  timer=setTimeout(()=>{history.value.push({role:'assistant',text:makeReply(agent,prompt)});pending.value=false;bottom()},420)
}
function enter(e:KeyboardEvent){if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();send()}}
function reset(){clearTimeout(timer);pending.value=false;history.value=[];input.value='';field.value?.focus()}
onBeforeUnmount(()=>clearTimeout(timer))
</script>
<template>
<div class="studio">
  <section class="studio-crown">
    <div class="gallery-shell">
      <RouterLink :to="back" class="back"><ArrowLeft :size="15"/> 返回 AI 超市</RouterLink>
      <div class="studio-head">
        <div class="studio-summary">
          <p class="detail-wordmark">{{ agent.en.toUpperCase() }} <span>/ {{ agent.category }}</span></p>
          <h1>{{ agent.name }}</h1>
          <p>{{ agent.intro }}</p>
          <button class="start-key" @click="start">开始体验 <ArrowUpRight :size="16"/></button>
          <RouterLink v-if="agent.slug==='smart-quote' || agent.slug==='car-designer'" class="start-key" :to="agent.slug==='smart-quote'?'/fleet':'/advisor'">{{agent.slug==='smart-quote'?'自己选车算价':'聊聊我想要的婚礼'}} <ArrowRight :size="16"/></RouterLink>
        </div>
        <AgentKey :agent="agent"/>
      </div>
    </div>
  </section>
  <div class="gallery-shell studio-body">
<div class="studio-layout"><aside class="agent-profile"><span class="eyebrow">AGENT PROFILE</span><h2>能力与场景</h2><div class="profile-group"><h3>核心能力</h3><div class="tags"><span v-for="s in agent.skills" :key="s">{{s}}</span></div></div><div class="profile-group"><h3>适用场景</h3><p>{{agent.scene}}</p></div><div class="profile-group"><h3>推荐任务</h3><button v-for="task in agent.tasks" :key="task" class="task" @click="fill(task)">{{task}} <ArrowUpRight :size="16"/></button></div></aside>
<section class="chat" aria-label="AI 对话模拟"><header><div><MessageSquare :size="19"/> 对话工作台</div><span class="demo-tag"><i></i> 演示模式</span></header>
<div class="messages" ref="panel" role="log" aria-live="polite" aria-relevant="additions"><div v-if="!history.length" class="chat-welcome"><span class="agent-icon"><component :is="agent.icon" :size="30" :stroke-width="1.4"/></span><h2>和{{agent.name.replace('AI ','')}}聊聊</h2><p>选择推荐任务，或写下你想解决的问题。</p></div>
<div v-for="(m,i) in history" :key="i" class="message" :class="m.role"><small>{{m.role==='user'?'你':agent.name}}</small><div>{{m.text}}</div></div><div v-if="pending" class="replying">正在整理演示回复…</div></div>
<form class="composer" @submit.prevent="send"><textarea ref="field" v-model="input" maxlength="1500" rows="2" aria-label="输入任务" placeholder="写下你的任务或问题…" @keydown="enter"></textarea><div class="composer-actions"><small>Enter 发送 · Shift + Enter 换行</small><button :disabled="!input.trim()||pending" aria-label="发送消息">发送 <ArrowUp :size="15"/></button></div></form>
<div class="chat-note"><span>本地预设回复 · 未接入真实 AI 服务</span><button v-if="history.length" @click="reset"><RotateCcw :size="12"/> 新对话</button></div></section></div>
<div class="related"><div class="section-heading"><h2>继续探索</h2><RouterLink :to="back" class="inline-link">返回 AI 超市 <ArrowRight :size="16"/></RouterLink></div><div class="related-grid"><RouterLink v-for="a in suggestions" :key="a.slug" :to="agentPath(a)"><component :is="a.icon" :size="22"/><span>{{a.name}}<small>{{a.scene}}</small></span><ArrowUpRight :size="18"/></RouterLink></div></div></div></div></template>
