<script setup lang="ts">
/** Nothing for unlimited stock; a warning when few are left. */
const props = defineProps<{ stock: number | null }>()

const LOW = 5
const badge = computed(() => {
  if (props.stock === null) return null
  if (props.stock === 0) return { label: 'Sold out', color: 'error' as const }
  if (props.stock <= LOW) return { label: `Only ${props.stock} left`, color: 'warning' as const }
  return { label: `${props.stock} in stock`, color: 'neutral' as const }
})
</script>

<template>
  <UBadge v-if="badge" :label="badge.label" :color="badge.color" variant="subtle" />
</template>
