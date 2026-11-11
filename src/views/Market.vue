<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowUpRight, CarFront, ChartNoAxesCombined, KeyRound, LayoutGrid, Megaphone, MessagesSquare } from 'lucide-vue-next'
import AgentKey from '../components/AgentKey.vue'
import { agents, agentPath, categories } from '../data/agents'

const route = useRoute()
const router = useRouter()
const categoryIcons = [LayoutGrid, MessagesSquare, CarFront, Megaphone, ChartNoAxesCombined]
const active = computed(() => categories.find(category => category === route.query.category) ?? categories[0])
const visibleAgents = computed(() => active.value === categories[0]
  ? agents
  : agents.filter(agent => agent.category === active.value))

function filter(category: string) {
  router.replace({ path: '/agents', query: category === categories[0] ? {} : { category } })
}
</script>

<template>
  <div class="key-market">
    <section class="gallery-hero" aria-labelledby="store-title">
      <div class="gallery-emblem" aria-hidden="true">
        <span></span><KeyRound :size="22" :stroke-width="1.35"/><span></span>
      </div>
      <p class="gallery-wordmark">QIN'AN AI KEY STORE</p>
      <h1 id="store-title">秦安婚车 <em>AI</em> 超市</h1>
      <p class="gallery-motto">每一把钥匙，都开启一种全新的经营能力。</p>
      <p class="gallery-intro">从客户成交、婚车搭配，到内容营销与车队经营，让 AI 成为你的专属业务助手。</p>
    </section>
    <section class="gallery-shell" aria-label="智能体钥匙展区">
      <div class="gallery-toolbar">
        <nav class="gallery-filters" aria-label="智能体分类">
          <button v-for="(category, i) in categories" :key="category"
                  :aria-pressed="active === category" @click="filter(category)">
            <component :is="categoryIcons[i]" :size="15" :stroke-width="1.5"/>
            {{ category }}
          </button>
        </nav>
        <span class="gallery-count" role="status"><KeyRound :size="14"/><b>{{ String(visibleAgents.length).padStart(2, '0') }}</b> 枚钥匙</span>
      </div>

      <Transition name="gallery-change" mode="out-in">
        <div :key="active" class="key-grid">
          <RouterLink v-for="agent in visibleAgents" :key="agent.slug"
                      class="key-entry" :to="{ path: agentPath(agent), query: active === categories[0] ? {} : { category: active } }"
                      :aria-label="'体验' + agent.name">
            <div class="entry-labels">
              <span class="key-serial">KEY <i>/</i> {{ String(agents.indexOf(agent) + 1).padStart(2, '0') }}</span>
              <span class="key-category">{{ agent.category }}</span>
            </div>
            <AgentKey :agent="agent"/>
            <div class="entry-copy">
              <h2>{{ agent.name }}</h2>
              <p>{{ agent.intro }}</p>
            </div>
            <div class="entry-action"><span>立即体验</span><ArrowUpRight :size="14"/></div>
          </RouterLink>
        </div>
      </Transition>

      <aside class="gallery-partner">
        <div><h2>车队合作</h2><p>让你的车队，也拥有专属的 AI 经营助手。</p></div>
        <RouterLink to="/#partner">了解合作 <ArrowUpRight :size="16"/></RouterLink>
      </aside>
    </section>
  </div>
</template>
