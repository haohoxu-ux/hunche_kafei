<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowUpRight, ArrowUp, Menu, X } from 'lucide-vue-next'
import Brand from './components/Brand.vue'
const route = useRoute()
const open = ref(false)
const scrolled = ref(false)
const activeSection = ref('')
const onHero = computed(() => route.path === '/' && !scrolled.value && !open.value)
function scroll() {
  scrolled.value = window.scrollY > 40
  activeSection.value = ''
  if (route.path === '/') {
    for (const id of ['story','fleet','design','capabilities','partner']) {
      const el = document.getElementById(id)
      if (el && el.getBoundingClientRect().top < 170) activeSection.value = id
    }
  }
}
function escapeMenu(e: KeyboardEvent) { if (e.key === 'Escape') open.value = false }
watch(() => route.fullPath, () => { open.value = false; requestAnimationFrame(scroll) })
onMounted(() => { scroll(); window.addEventListener('scroll',scroll,{passive:true}); window.addEventListener('keydown',escapeMenu) })
onBeforeUnmount(() => { window.removeEventListener('scroll',scroll); window.removeEventListener('keydown',escapeMenu) })
const links = [{ title:'首页', to:'/', id:'' },{ title:'婚车展示', to:'/#fleet', id:'fleet' },{ title:'AI 超市', to:'/agents', id:'agents' },{ title:'品牌故事', to:'/#story', id:'story' }]
const selected = (id:string) => route.path.startsWith('/agents') ? id === 'agents' : route.path==='/' && activeSection.value === id
</script>
<template>
<a href="#main" class="skip">跳至正文</a>
<header class="site-header" :class="{ glass:onHero, expanded:open, 'gallery-nav':route.path.startsWith('/agents') }">
  <div class="header-inner"><Brand/>
    <nav class="desktop-nav" aria-label="主导航"><RouterLink v-for="l in links" :key="l.to" :to="l.to" :class="{selected:selected(l.id)}">{{ l.title }}</RouterLink></nav>
    <div class="header-end"><RouterLink class="contact-link" to="/#partner">合作咨询 <ArrowUpRight :size="16"/></RouterLink><button class="menu-btn" :aria-expanded="open" aria-controls="mobile-nav" aria-label="导航菜单" @click="open=!open"><component :is="open?X:Menu"/></button></div>
  </div>
  <nav v-if="open" id="mobile-nav" class="mobile-nav" aria-label="手机导航"><RouterLink v-for="l in links" :key="l.to" :to="l.to" @click="open=false">{{ l.title }} <ArrowUpRight :size="18"/></RouterLink><RouterLink to="/#partner" @click="open=false">合作咨询 <ArrowUpRight :size="18"/></RouterLink></nav>
</header>
<main id="main"><RouterView :key="route.path"/></main>
<footer class="footer"><div class="wrap footer-top"><Brand/><div><RouterLink to="/#partner">联系车队</RouterLink><RouterLink to="/agents">AI 超市</RouterLink><a href="/assets/culture/credits.html" target="_blank" rel="noopener">影像出处</a></div><button aria-label="返回顶部" class="circle" @click="windowScroll"><ArrowUp :size="17"/></button></div><div class="wrap footer-bottom"><span>© 2026 QIN'AN WEDDING AI</span><span>甘肃 · 天水 · 秦安</span></div></footer>
</template>
<script lang="ts">
function windowScroll(){window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
</script>
