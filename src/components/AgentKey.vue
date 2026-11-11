<script setup lang="ts">
import type { Agent } from '../data/agents'

defineProps<{ agent: Agent }>()
</script>

<template>
  <figure class="key-display" :class="'finish-' + agent.slug">
    <span class="key-halo" aria-hidden="true"></span>
    <span class="key-plinth" aria-hidden="true"></span>
    <img class="key-object" :src="'/assets/keys/' + agent.slug + '.webp'"
         :alt="agent.name + '专属汽车钥匙'" width="440" height="444" draggable="false">
  </figure>
</template>

<style>
.key-display {
  --key-light: 186, 157, 109;
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--stage-height, 174px);
}
.finish-car-designer, .finish-order-assistant { --key-light: 152, 180, 184; }
.finish-video-director { --key-light: 150, 167, 185; }
.finish-poster-designer { --key-light: 191, 133, 113; }
.finish-copywriter { --key-light: 151, 166, 111; }
.key-halo, .key-plinth {
  position: absolute;
  pointer-events: none;
  transition: opacity 380ms ease, transform 380ms ease;
}
.key-halo {
  inset: -6% 0 -5%;
  background: radial-gradient(ellipse at 50% 60%, rgba(var(--key-light),.22), transparent 66%);
  opacity: .45;
}
.key-plinth {
  width: min(65%, 175px);
  height: 15%;
  bottom: 8%;
  border: 1px solid rgba(var(--key-light), .21);
  border-radius: 50%;
  background: radial-gradient(ellipse, #050605 14%, rgba(var(--key-light), .08) 65%, transparent 72%);
  box-shadow: inset 0 -2px 1px rgba(var(--key-light), .065), 0 6px 9px #0005;
}
.key-plinth::after {
  content: '';
  position: absolute;
  inset: 15% 9%;
  border: 1px solid rgba(var(--key-light), .1);
  border-radius: inherit;
}
.key-object {
  z-index: 1;
  width: auto;
  height: 87%;
  max-width: 82%;
  object-fit: contain;
  object-position: center;
  filter: drop-shadow(3px 9px 6px #0009);
  transform: translateY(-3%);
  transition: transform 380ms cubic-bezier(.2,.7,.25,1), filter 380ms ease;
}
@media (hover:hover) {
  .key-entry:hover .key-object {
    transform: translateY(-7%) rotate(-4deg) scale(1.075);
    filter: brightness(1.09) drop-shadow(0 0 1px #efd7a6) drop-shadow(4px 14px 8px #000b);
  }
  .key-entry:hover .key-halo { opacity: 1; }
  .key-entry:hover .key-plinth { transform: scale(.93); }
}
.key-entry:focus-visible .key-halo { opacity: 1; }
.key-entry:active .key-object { transform: translateY(-1%) scale(.97); }
@media (prefers-reduced-motion: reduce) {
  .key-object, .key-halo, .key-plinth { transition: none; }
  .key-entry:hover .key-object { transform: translateY(-3%); }
}
</style>
