<script setup lang="ts">
const model = defineModel<number>({ required: true })
const hover = ref(0)
const shown = computed(() => hover.value || model.value)
const LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent']
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="flex" role="radiogroup" aria-label="Rating" @mouseleave="hover = 0">
      <button
        v-for="n in 5"
        :key="n"
        type="button"
        role="radio"
        :aria-checked="model === n"
        :aria-label="`${n} star${n > 1 ? 's' : ''}`"
        class="px-0.5 text-3xl leading-none transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        :class="n <= shown ? 'text-amber-400' : 'text-dimmed'"
        @mouseenter="hover = n"
        @click="model = n"
      >
        ★
      </button>
    </div>
    <span class="text-sm text-muted">{{ shown ? LABELS[shown - 1] : 'Choose a rating' }}</span>
  </div>
</template>
