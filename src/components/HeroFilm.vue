<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ArrowRight, Sparkles, ArrowDown, Pause, Play } from 'lucide-vue-next'
const film = ref<HTMLVideoElement>()
const elapsed = ref(0)
const playing = ref(false)
const failed = ref(false)
const scenes = [{at:0,name:'桃境迎亲'},{at:10,name:'车队集结'},{at:25.04,name:'双车并肩'}]
const current = computed(() => elapsed.value >= scenes[2].at ? 2 : elapsed.value >= scenes[1].at ? 1 : 0)
function play(){ film.value?.play().catch(() => { playing.value=false }) }
function toggle(){ if (film.value?.paused) play(); else film.value?.pause() }
function seek(i:number){ if (!film.value || !Number.isFinite(film.value.duration)) return; film.value.currentTime=scenes[i].at; elapsed.value=scenes[i].at; play() }
function tick(){elapsed.value=film.value?.currentTime || 0}
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)')
function preference(){if(reduce.matches)film.value?.pause()}
onMounted(()=>{ if(!reduce.matches) play(); reduce.addEventListener('change',preference) })
onBeforeUnmount(()=>reduce.removeEventListener('change',preference))
</script>
<template><section class="hero" aria-labelledby="hero-title">
  <video v-if="!failed" ref="film" class="hero-video" src="/assets/videos/wedding-film.mp4?v=1937-1842" poster="/assets/images/wedding-film.webp" :autoplay="!reduce.matches" muted loop playsinline preload="auto" aria-label="秦安婚车品牌影像" @error="failed=true" @timeupdate="tick" @play="playing=true" @pause="playing=false"></video>
  <div class="hero-shade"></div>
  <div class="hero-content wrap"><p class="eyebrow hero-overline"><span></span> QIN'AN WEDDING AI</p>
  <h1 id="hero-title">让每一场婚礼，<br>都有属于秦安的<em>仪式感。</em></h1>
  <p class="hero-intro">从婚车搭配、专属方案，到智能报价与预约，<br class="desktop-break">让 AI 重新定义婚车服务体验。</p>
  <div class="hero-actions"><RouterLink class="btn primary" to="/#design">探索婚车方案 <ArrowRight :size="17"/></RouterLink><RouterLink class="btn ghost" to="/agents"><Sparkles :size="16"/> 进入 AI 超市</RouterLink></div></div>
  <div class="hero-bottom wrap"><RouterLink to="/#story" class="scroll-link"><span class="circle"><ArrowDown :size="16"/></span><span>向下探索<small>SCROLL TO EXPLORE</small></span></RouterLink>
    <div class="film-panel"><div class="film-text"><span class="film-kicker"><i></i> BRAND FILM</span><span class="film-name">{{ scenes[current].name }}</span></div><div class="chapters" v-if="!failed"><button v-for="(s,i) in scenes" :key="s.at" @click="seek(i)" :class="{active:i===current}" :aria-label="'播放第'+(i+1)+'幕：'+s.name" :aria-pressed="i===current"><span></span></button></div><span class="film-index">0{{current+1}} <b>/ 03</b></span><button v-if="!failed" class="circle film-toggle" :aria-label="playing?'暂停品牌影像':'播放品牌影像'" @click="toggle"><component :is="playing?Pause:Play" :size="15" fill="currentColor"/></button></div>
  </div>
</section></template>
