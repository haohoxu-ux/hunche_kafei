<script setup lang="ts">
import { ref } from 'vue'
import { ArrowUpRight, X, Download, Check } from 'lucide-vue-next'
const dialog=ref<HTMLDialogElement>()
const kind=ref('车队入驻')
const contact=ref('')
const note=ref('')
const brief=ref('')
function open(){brief.value=''; dialog.value?.showModal()}
function prepare(){brief.value=['秦安婚车 AI · 合作咨询草稿','合作方向　'+kind.value,'联系信息　'+contact.value.trim(),'合作需求　'+note.value.trim()].join('\n')}
function download(){ const url=URL.createObjectURL(new Blob(['\uFEFF'+brief.value],{type:'text/plain;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download='秦安婚车-合作咨询草稿.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000) }
</script>
<template><button class="btn primary" @click="open">合作咨询 <ArrowUpRight :size="17"/></button>
<dialog ref="dialog" class="inquiry" aria-labelledby="inquiry-title" @click="($event.target===dialog) && dialog?.close()">
  <button class="close-dialog circle" aria-label="关闭" @click="dialog?.close()"><X :size="18"/></button>
  <p class="eyebrow">PARTNERSHIP</p><h2 id="inquiry-title">合作咨询</h2>
  <p class="muted">演示模式 · 信息仅用于在本机生成咨询草稿。</p>
  <form v-if="!brief" @submit.prevent="prepare"><label>合作方向<select v-model="kind"><option>车队入驻</option><option>婚礼机构合作</option><option>婚车方案咨询</option></select></label><label>联系方式<input v-model="contact" required maxlength="80" pattern=".*\S.*" placeholder="微信或电话"></label><label>合作需求<textarea v-model="note" required maxlength="600" placeholder="例如车队规模、服务区域或婚期" rows="3"></textarea></label><button class="btn dark" :disabled="!contact.trim()||!note.trim()">生成咨询草稿 <ArrowUpRight :size="16"/></button></form>
  <div v-else class="brief"><b><Check :size="17"/> 草稿已生成</b><pre>{{brief}}</pre><button class="btn dark" @click="download">保存草稿 <Download :size="16"/></button><button class="text-btn" @click="brief=''">继续编辑</button></div>
</dialog></template>
