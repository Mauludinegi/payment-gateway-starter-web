<script setup lang="ts">
/** The product's image, or its icon on a tinted tile when it has none. */
const props = withDefaults(defineProps<{
  product: { name: string, icon: string, imageUrl: string | null }
  variant?: 'card' | 'hero' | 'thumb'
}>(), { variant: 'card' })

const frame = computed(() => ({
  card: 'aspect-[16/10] w-full',
  hero: 'aspect-[16/10] w-full rounded-xl',
  thumb: 'size-12 shrink-0 rounded-lg',
}[props.variant]))
const iconSize = computed(() => props.variant === 'thumb' ? 'size-6' : 'size-14')
</script>

<template>
  <img
    v-if="product.imageUrl"
    :src="product.imageUrl"
    :alt="product.name"
    :class="frame"
    class="bg-elevated object-cover"
    loading="lazy"
  >
  <div v-else :class="frame" class="flex items-center justify-center bg-primary/10">
    <UIcon :name="product.icon" :class="iconSize" class="text-primary" />
  </div>
</template>
