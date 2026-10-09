<script setup lang="ts">
import type { ChannelKind, ChannelOption } from '~/types/api'

const props = defineProps<{ loading?: boolean, current?: string | null }>()
const emit = defineEmits<{ select: [channel: string, mobileNumber: string | null] }>()

const { data: channels, status } = useFetch<ChannelOption[]>('/api/channels', { key: 'channels', default: () => [] })

const order: ChannelKind[] = ['VIRTUAL_ACCOUNT', 'QR', 'EWALLET', 'RETAIL']
const groups = computed(() => order
  .map(kind => ({ kind, ...CHANNEL_KIND[kind], channels: channels.value.filter(c => c.kind === kind) }))
  .filter(g => g.channels.length))

const selected = ref<string | null>(null)
const mobile = ref('+62')
const needsMobile = computed(() => selected.value === 'OVO')
const mobileValid = computed(() => /^\+62\d{8,13}$/.test(mobile.value))
const selectedLabel = computed(() => channels.value.find(c => c.channel === selected.value)?.label)

function submit() {
  if (!selected.value || (needsMobile.value && !mobileValid.value)) return
  emit('select', selected.value, needsMobile.value ? mobile.value : null)
}

watch(() => props.current, () => (selected.value = null))
</script>

<template>
  <div class="space-y-6">
    <USkeleton v-if="status === 'pending' && !channels.length" class="h-64" />

    <div v-for="group in groups" :key="group.kind">
      <p class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <UIcon :name="group.icon" class="size-4" />
        {{ group.label }}
      </p>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          v-for="c in group.channels"
          :key="c.channel"
          type="button"
          class="rounded-lg border px-3 py-2.5 text-left text-sm transition"
          :class="selected === c.channel
            ? 'border-primary bg-primary/10 ring-1 ring-primary'
            : 'border-default hover:border-accented hover:bg-elevated/50'"
          @click="selected = c.channel"
        >
          <span class="block font-medium text-highlighted">{{ c.label }}</span>
          <span v-if="c.channel === current" class="text-xs text-muted">current method</span>
        </button>
      </div>
    </div>

    <UFormField v-if="needsMobile" label="OVO mobile number" :error="mobile.length > 3 && !mobileValid ? 'Use the format +6281234567890' : undefined">
      <UInput v-model="mobile" class="w-full" inputmode="tel" placeholder="+6281234567890" />
    </UFormField>

    <UButton
      block
      size="lg"
      :disabled="!selected || (needsMobile && !mobileValid)"
      :loading="loading"
      :label="selectedLabel ? `Pay with ${selectedLabel}` : 'Choose a payment method'"
      @click="submit"
    />
  </div>
</template>
