<script setup lang="ts">
const props = defineProps<{ expiresAt: string }>()

const now = ref<number>()
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const remaining = computed(() => now.value === undefined ? undefined : Math.max(0, new Date(props.expiresAt).getTime() - now.value))
const text = computed(() => {
  if (remaining.value === undefined) return '--:--'
  const s = Math.floor(remaining.value / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(s / 3600)
  return h > 0 ? `${h}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
})
</script>

<template>
  <span class="inline-flex items-center gap-1.5 font-mono tabular-nums" :class="remaining === 0 ? 'text-error' : ''">
    <UIcon name="i-lucide-timer" class="size-4" />
    {{ remaining === 0 ? 'Expired' : text }}
  </span>
</template>
