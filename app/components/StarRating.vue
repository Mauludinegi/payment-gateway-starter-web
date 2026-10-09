<script setup lang="ts">
/** Read-only stars, filled to the exact average (4.3 fills 86%). */
const props = withDefaults(defineProps<{
  value: number
  count?: number
  size?: 'sm' | 'md' | 'lg'
}>(), { size: 'sm' })

const fill = computed(() => `${Math.max(0, Math.min(5, props.value)) / 5 * 100}%`)
const label = computed(() => `${props.value.toFixed(1)} out of 5`)
const text = computed(() => ({ sm: 'text-sm', md: 'text-base', lg: 'text-2xl' }[props.size]))
</script>

<template>
  <span class="inline-flex items-center gap-1.5" :class="text">
    <span class="relative inline-block leading-none tracking-wider" role="img" :aria-label="label">
      <span class="text-dimmed" aria-hidden="true">★★★★★</span>
      <span class="absolute inset-0 overflow-hidden whitespace-nowrap text-amber-400" :style="{ width: fill }" aria-hidden="true">★★★★★</span>
    </span>
    <span v-if="count !== undefined" class="text-xs text-muted">
      {{ value.toFixed(1) }} ({{ count }})
    </span>
  </span>
</template>
