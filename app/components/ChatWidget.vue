<script setup lang="ts">
const { user } = useAuth()
const {
  isOpen,
  room,
  messages,
  loading,
  sending,
  connected,
  unreadCount,
  notificationPermission,
  enableNotifications,
  showBrowserNotification,
  toggleChat,
  sendMessage,
  initChat,
} = useChat()

onMounted(() => {
  if (import.meta.client && 'Notification' in window) {
    notificationPermission.value = Notification.permission
  }
  if (user.value) {
    initChat()
  }
})

watch(user, (newUser) => {
  if (newUser) {
    initChat()
  }
})

const inputMessage = ref('')
const messageContainer = ref<HTMLElement | null>(null)

const quickPrompts = [
  'Bagaimana cara bayar lewat QRIS?',
  'Cara bayar Virtual Account?',
  'Bantuan pesanan saya',
]

function selectPrompt(prompt: string) {
  inputMessage.value = prompt
  handleSend()
}

async function handleSend() {
  const text = inputMessage.value.trim()
  if (!text || sending.value) return
  inputMessage.value = ''
  try {
    await sendMessage(text)
    scrollToBottom()
  }
  catch {
    inputMessage.value = text
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

watch(isOpen, (open) => {
  if (open) {
    scrollToBottom()
  }
})

function formatTime(isoString: string) {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  catch {
    return ''
  }
}
</script>

<template>
  <div class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
    <!-- Chat Popup Window -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div
        v-if="isOpen"
        class="mb-3 sm:mb-4 flex h-[min(560px,calc(100dvh-5.5rem))] sm:h-[530px] w-[calc(100vw-2rem)] sm:w-[380px] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-default bg-elevated shadow-2xl backdrop-blur"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-default bg-gradient-to-r from-primary-600/15 via-primary-500/10 to-transparent px-3.5 py-3 sm:px-4 sm:py-3.5 shrink-0">
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div class="relative flex items-center justify-center shrink-0">
              <div class="size-9 sm:size-10 rounded-full bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-md shadow-primary/20">
                <UIcon name="i-lucide-headphones" class="size-4 sm:size-5" />
              </div>
              <span
                class="absolute -bottom-0.5 -right-0.5 size-2.5 sm:size-3 rounded-full border-2 border-elevated"
                :class="connected ? 'bg-emerald-500 ring-1 ring-emerald-400' : 'bg-amber-500'"
                :title="connected ? 'Live terhubung' : 'Menghubungkan...'"
              />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-semibold text-xs sm:text-sm truncate">Customer Support</span>
                <span
                  class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium shrink-0"
                  :class="connected ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'"
                >
                  <span class="size-1 sm:size-1.5 rounded-full" :class="connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'" />
                  {{ connected ? 'Online' : 'Connecting...' }}
                </span>
              </div>
              <p class="text-[11px] sm:text-xs text-muted truncate">
                Bantuan pembayaran & toko
              </p>
            </div>
          </div>
          <div class="flex items-center gap-0.5 shrink-0">
            <button
              v-if="user"
              type="button"
              class="flex size-7 sm:size-8 items-center justify-center rounded-full text-muted transition hover:bg-muted/15 hover:text-default"
              title="Tes Notifikasi Layar Mac"
              aria-label="Tes Notifikasi Layar Mac"
              @click="showBrowserNotification('Customer Support', 'Halo! Tes notifikasi layar Mac berhasil masuk 🎉')"
            >
              <UIcon name="i-lucide-bell" class="size-3.5 sm:size-4" />
            </button>
            <button
              type="button"
              class="flex size-7 sm:size-8 items-center justify-center rounded-full text-muted transition hover:bg-muted/15 hover:text-default"
              aria-label="Tutup chat"
              @click="toggleChat"
            >
              <UIcon name="i-lucide-x" class="size-4" />
            </button>
          </div>
        </div>

        <!-- Notification Permission Prompt Bar -->
        <div
          v-if="user && notificationPermission !== 'granted'"
          class="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-3 py-2 text-xs shrink-0"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <UIcon name="i-lucide-bell-ring" class="size-3.5 shrink-0 text-primary" />
            <span class="truncate text-[11px] sm:text-xs text-default">Munculkan notif di layar?</span>
          </div>
          <UButton
            size="xs"
            color="primary"
            variant="solid"
            label="Aktifkan"
            class="shrink-0 font-medium text-[11px]"
            @click="enableNotifications"
          />
        </div>

        <!-- Body: Logged Out State -->
        <div
          v-if="!user"
          class="flex flex-1 flex-col items-center justify-center p-6 text-center"
        >
          <div class="mb-3 rounded-2xl bg-primary/10 p-4 text-primary">
            <UIcon name="i-lucide-message-square-lock" class="size-9" />
          </div>
          <h4 class="font-semibold text-base">
            Masuk untuk Mulai Chat
          </h4>
          <p class="mt-1 text-xs text-muted max-w-xs">
            Silakan sign in agar customer support kami bisa mengenali pesanan dan akun Anda.
          </p>
          <UButton
            to="/login"
            label="Sign in sekarang"
            icon="i-lucide-log-in"
            color="primary"
            class="mt-4"
            size="sm"
            @click="toggleChat"
          />
        </div>

        <!-- Body: Logged In & Messages -->
        <div v-else class="flex flex-1 flex-col overflow-hidden min-h-0">
          <!-- Loading State -->
          <div v-if="loading" class="flex flex-1 items-center justify-center">
            <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-primary" />
          </div>

          <!-- Message List -->
          <div
            v-else
            ref="messageContainer"
            class="flex-1 space-y-3 overflow-y-auto p-3.5 sm:p-4 text-sm min-h-0"
          >
            <!-- Welcome banner if no messages yet -->
            <div
              v-if="messages.length === 0"
              class="rounded-xl border border-dashed border-default bg-muted/10 p-4 text-center"
            >
              <p class="font-medium text-xs text-muted">
                👋 Halo <span class="font-semibold text-default">{{ user.name }}</span>! Ada yang bisa kami bantu seputar produk atau pembayaran?
              </p>
              <div class="mt-3 flex flex-wrap gap-1.5 justify-center">
                <button
                  v-for="prompt in quickPrompts"
                  :key="prompt"
                  type="button"
                  class="rounded-lg border border-default bg-elevated px-3 py-1.5 text-left text-xs text-muted transition hover:border-primary hover:text-primary active:scale-95 shadow-2xs"
                  @click="selectPrompt(prompt)"
                >
                  {{ prompt }}
                </button>
              </div>
            </div>

            <!-- Messages -->
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="flex flex-col"
              :class="msg.senderRole === 'CUSTOMER' ? 'items-end' : 'items-start'"
            >
              <div
                class="max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-xs"
                :class="
                  msg.senderRole === 'CUSTOMER'
                    ? 'rounded-br-xs bg-primary text-primary-contrast'
                    : 'rounded-bl-xs border border-default bg-elevated text-default'
                "
              >
                <p class="whitespace-pre-wrap break-words leading-relaxed">
                  {{ msg.text }}
                </p>
              </div>
              <span class="mt-1 px-1 text-[10px] text-dimmed">
                {{ formatTime(msg.createdAt) }}
              </span>
            </div>
          </div>

          <!-- Message Input Footer -->
          <div class="border-t border-default p-2.5 sm:p-3 bg-elevated shrink-0">
            <div
              v-if="room?.status === 'CLOSED'"
              class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-800 dark:text-amber-200"
            >
              <div class="flex items-center justify-center gap-1.5 font-medium">
                <UIcon name="i-lucide-lock" class="size-4 text-amber-600 dark:text-amber-400" />
                <span>Percakapan ini dinonaktifkan</span>
              </div>
              <p class="mt-0.5 text-[11px] text-muted">
                Customer support telah menutup percakapan ini.
              </p>
            </div>
            <form v-else class="flex items-center gap-2" @submit.prevent="handleSend">
              <UInput
                v-model="inputMessage"
                placeholder="Tulis pesan..."
                class="flex-1"
                size="sm"
                :disabled="sending"
                autofocus
              />
              <UButton
                type="submit"
                icon="i-lucide-send"
                color="primary"
                size="sm"
                :loading="sending"
                :disabled="!inputMessage.trim() || sending"
                aria-label="Kirim pesan"
              />
            </form>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Floating Trigger Bubble Button -->
    <button
      type="button"
      class="group relative flex size-12 sm:size-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary-600 to-primary-500 text-white shadow-xl shadow-primary/30 transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:shadow-primary/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      :aria-label="isOpen ? 'Tutup chat' : 'Buka bantuan live chat'"
      @click="toggleChat"
    >
      <!-- Icon with smooth transition -->
      <UIcon
        v-if="isOpen"
        name="i-lucide-x"
        class="size-5 sm:size-6 transition-transform duration-200 group-hover:rotate-90"
      />
      <UIcon
        v-else
        name="i-lucide-message-square-text"
        class="size-5 sm:size-6 transition-transform duration-200"
      />

      <!-- Unread message count badge (red badge counter, zapzap / whatsapp style) -->
      <span
        v-if="!isOpen && unreadCount > 0"
        class="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 flex h-5 min-w-5 sm:h-6 sm:min-w-6 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] sm:text-xs font-bold text-white shadow-md shadow-rose-500/40 ring-2 ring-white dark:ring-gray-950 transition-transform duration-200"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>

      <!-- Online Live Pulse Badge if no unread messages -->
      <span v-else-if="!isOpen" class="absolute -top-0.5 -right-0.5 flex size-3 sm:size-3.5">
        <span class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span class="relative inline-flex size-3 sm:size-3.5 rounded-full border-2 border-white dark:border-gray-950 bg-emerald-500" />
      </span>
    </button>
  </div>
</template>
