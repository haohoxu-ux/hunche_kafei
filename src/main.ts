import { createApp, nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Market from './views/Market.vue'
import Studio from './views/Studio.vue'
import { agents } from './data/agents'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/fleet', component: () => import('./views/Fleet.vue'), meta: { title: '自己选车算价' } },
    { path: '/advisor', component: () => import('./views/Advisor.vue'), meta: { title: '聊聊我想要的婚礼' } },
    { path: '/quote', component: () => import('./views/Quote.vue'), meta: { title: '我的婚车报价' } },
    { path: '/agents', component: Market },
    { path: '/agents/:slug', component: Studio, beforeEnter: to => agents.some(a => a.slug === to.params.slug) || '/agents' },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  async scrollBehavior(to, from, saved) {
    await nextTick()
    if (to.hash && document.getElementById(to.hash.slice(1))) return { el: to.hash, top: 74, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }
    if (saved) return saved
    if (to.path !== from.path || from.hash || to.path === '/') return { top: 0 }
  }
})
router.afterEach(to => {
  const agent = agents.find(a => a.slug === to.params.slug)
  document.title = (agent?.name || to.meta.title || (to.path === '/agents' ? 'AI 超市' : '秦安婚车 AI')) + " · QIN'AN WEDDING AI"
})
createApp(App).use(router).mount('#app')

