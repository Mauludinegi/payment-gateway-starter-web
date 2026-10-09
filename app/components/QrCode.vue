<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{ value: string, size?: number }>()
const src = ref<string>()

async function render() {
  src.value = await QRCode.toDataURL(props.value, { width: props.size ?? 240, margin: 1, errorCorrectionLevel: 'M' })
}

onMounted(render)
watch(() => props.value, render)
</script>

<template>
  <div class="inline-flex rounded-xl bg-white p-3">
    <img v-if="src" :src="src" :width="size ?? 240" :height="size ?? 240" alt="Payment QR code">
    <USkeleton v-else :style="{ width: `${size ?? 240}px`, height: `${size ?? 240}px` }" />
  </div>
</template>
