<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ArrowUpRight, ArrowRight, MapPin, ChevronLeft, ChevronRight, Sparkles, Palette, CarFront } from 'lucide-vue-next'
import HeroFilm from '../components/HeroFilm.vue'
import Inquiry from '../components/Inquiry.vue'
import {agents,agentPath} from '../data/agents'
const culture = [
  {tab:'凤山',title:'凤山檐下，迎一城喜色。',copy:'抬头看凤山牌楼，层叠的檐线和彩绘勾出秦安的轮廓。将檐下的一抹金借给请柬，再用朱红缎带系上车门，让迎亲从熟悉的风景里启程。',img:'fengshan',place:'秦安 · 凤山',en:'FENGSHAN',url:'/assets/culture/credits.html'},
  {tab:'桃花',title:'借一枝春色，作迎亲花。',copy:'春日的刘坪镇秦洼村，桃花沿着山坡盛开。婚车花艺取一层花瓣粉，配暖白花材与细绿枝叶，把家乡的春意带到新人身边。',img:'',place:'刘坪镇 · 桃花色谱',en:'PEACH BLOSSOM',url:'https://news.cri.cn/n/20250413/1cefebfc-c104-3043-d74e-1758eb2b3285.html'},
  {tab:'大地湾',title:'从一笔陶纹，读懂秦安。',copy:'大地湾博物馆收藏的鱼纹彩陶盆，以弧线勾勒纹饰。把陶土的暖色融进席位卡和车队手册，让古老纹样在婚礼细节中延续。',img:'dadiwan',place:'秦安 · 大地湾博物馆',en:'DADIWAN',url:'/assets/culture/credits.html'},
  {tab:'女娲',title:'把团圆的祝愿，带回家。',copy:'陇城镇传承着女娲祭典。我们从当地人对平安与团圆的祈愿出发，以一封写给新人的家书，作为迎亲仪式的开篇。',img:'',place:'陇城镇 · 祝愿手记',en:'NÜWA HERITAGE',url:'https://www.tianshui.gov.cn/wlj/info/2712/132072.htm'},
  {tab:'古建筑',title:'一面红墙，映照新喜。',copy:'兴国寺红墙、木构与层叠的屋檐，是秦安街巷里熟悉的景致。让婚礼的朱砂红与这片古建筑的色彩呼应，为车队留下一张温暖的合影。',img:'xingguo',place:'秦安 · 兴国寺',en:'XINGGUO TEMPLE',url:'/assets/culture/credits.html'}
]
const c = ref(0)
const story = computed(()=>culture[c.value])
const fleet=[
 {name:'劳斯莱斯',en:'ROLLS-ROYCE',img:'rolls',text:'典礼主婚车',style:'经典礼遇'},
 {name:'奔驰迈巴赫',en:'MERCEDES-MAYBACH',img:'maybach',text:'行政级主婚车',style:'低调奢雅'},
 {name:'奔驰 G 级',en:'MERCEDES-BENZ G-CLASS',img:'gclass',text:'越野主婚车',style:'个性迎亲'},
 {name:'红旗车队',en:'HONGQI',img:'convoy',text:'中式迎亲车队',style:'东方礼序'}
]
const fleetStart=ref(0)
const visibleFleet=computed(()=>[0,1,2].map(i=>fleet[(fleetStart.value+i)%fleet.length]))
const season=ref('桃花春日')
const schemes=[{name:'桃花春日',detail:'桃花粉 × 暖米白',car:'迈巴赫主车 + 同色奔驰跟车',art:'低矮粉白花团，车门系浅粉缎带'}, {name:'中式雅礼',detail:'朱砂红 × 香槟金',car:'红旗主车 + 同色轿车跟队',art:'朱红主花搭配金色细带，呼应中式礼服'}, {name:'经典黑金',detail:'墨黑 × 香槟金',car:'劳斯莱斯主车 + 黑色行政轿车',art:'暖白玫瑰与少量绿叶，突出车身线条'}]
const scheme=computed(()=>schemes.find(s=>s.name===season.value)!)
let observer:IntersectionObserver|undefined
onMounted(()=>{
 if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
 observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('seen');observer?.unobserve(e.target)}}),{threshold:0.05})
 document.querySelectorAll('.reveal').forEach(el=>{el.classList.add('will-reveal');observer?.observe(el)})
})
onBeforeUnmount(()=>observer?.disconnect())
</script>
<template>
<HeroFilm/>
<section id="story" class="section story-section"><div class="wrap">
  <div class="section-heading reveal"><div><p class="eyebrow"><i></i> ROOTED IN QIN'AN</p><h2>婚礼的灵感，<em>生长在秦安。</em></h2></div><span class="place"><MapPin :size="14"/> 中国 · 甘肃 · 秦安</span></div>
  <div class="story-layout reveal"><div class="story-visual" :key="story.tab">
    <img v-if="story.img" :src="'/assets/culture/'+story.img+'.webp'" :alt="story.place+'实景摄影'" loading="lazy">
    <div v-else class="story-swatch" :class="{clay:c===3}"><img src="/blossom.svg" alt=""><span>{{c===1?'桃花粉':'朱砂红'}}</span></div>
    <span class="photo-caption"><MapPin :size="13"/> {{story.place}} <b>/ {{story.en}}</b></span></div>
    <div class="story-copy"><div class="culture-tabs" aria-label="秦安文化主题"><button v-for="(s,i) in culture" :key="s.tab" :aria-pressed="i===c" :class="{chosen:i===c}" @click="c=i">{{s.tab}}</button></div><h3>{{story.title}}</h3><p>{{story.copy}}</p><a :href="story.url" target="_blank" rel="noopener" class="inline-link">文化与影像出处 <ArrowUpRight :size="16"/></a></div></div>
</div></section>
<section id="fleet" class="section fleet-section"><div class="wrap">
 <div class="section-heading reveal"><div><p class="eyebrow"><i></i> THE FLEET</p><h2>婚车臻选</h2></div><div class="arrows"><button class="circle" aria-label="上一组婚车" @click="fleetStart=(fleetStart+3)%4"><ChevronLeft :size="18"/></button><button class="circle" aria-label="下一组婚车" @click="fleetStart=(fleetStart+1)%4"><ChevronRight :size="18"/></button></div></div>
 <div class="fleet-grid"><RouterLink v-for="car in visibleFleet" :key="car.img" :to="{path:'/agents/car-designer',query:{task:'请围绕'+car.name+'设计一组'+car.style+'的婚车方案。'}}" class="fleet-card"><div class="fleet-img"><img :src="'/assets/images/fleet-'+car.img+'.webp'" loading="lazy" :alt="car.name+'婚车实拍'"><span>{{car.text}}</span></div><div class="fleet-details"><div><small>{{car.en}}</small><h3>{{car.name}}</h3></div><ArrowUpRight :size="22"/></div></RouterLink></div>
</div></section>
<section id="design" class="section design-section"><div class="wrap design-layout"><div class="reveal"><p class="eyebrow"><i></i> AI WEDDING ATELIER</p><h2>为你的婚礼，<br>搭配一支车队。</h2><p class="section-desc">从喜欢的婚礼风格开始，挑选车型与花艺，再把想法交给 AI 婚车方案设计师。</p><div class="scheme-tabs"><button v-for="s in schemes" :key="s.name" :class="{chosen:season===s.name}" :aria-pressed="season===s.name" @click="season=s.name">{{s.name}}</button></div></div>
 <div class="scheme-card reveal"><span class="eyebrow">FLEET CONCEPT</span><h3>{{scheme.name}}</h3><ul><li><Palette/>{{scheme.detail}}</li><li><CarFront/>{{scheme.car}}</li><li><Sparkles/>{{scheme.art}}</li></ul><RouterLink :to="{path:'/agents/car-designer',query:{task:'请根据「'+scheme.name+'」风格，以'+scheme.car+'设计迎亲方案。'}}" class="inline-link">进入方案设计师 <ArrowRight :size="16"/></RouterLink></div></div></section>
<section id="capabilities" class="section"><div class="wrap"><div class="section-heading reveal"><div><p class="eyebrow"><i></i> AI AGENT MARKETPLACE</p><h2>你的婚车 AI 团队</h2></div><RouterLink class="inline-link" to="/agents">探索全部智能体 <ArrowRight :size="16"/></RouterLink></div><div class="ability-grid"><RouterLink v-for="a in [agents[0],agents[1],agents[3],agents[7]]" :key="a.slug" :to="agentPath(a)" class="ability"><component :is="a.icon"/><span>{{a.category}}</span><h3>{{a.name}}</h3><p>{{a.intro}}</p><ArrowUpRight class="ability-arrow" :size="18"/></RouterLink></div></div></section>
<section id="partner" class="partner"><div class="wrap partner-inner"><div><p class="eyebrow"><i></i> FLEET PARTNERSHIP</p><h2>与秦安车队长，<em>一路同行。</em></h2><p>面向本地车队长与婚礼服务机构，合作展示车型、搭配迎亲车队，共同打磨每一次出发。</p></div><Inquiry/></div></section>
</template>
