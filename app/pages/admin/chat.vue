<script setup lang="ts">
import type { ChatMessage, ChatRoom } from '~/types/api'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: rooms, refresh: refreshRooms } = await useAdminFetch<ChatRoom[]>('/api/admin/chat/rooms')

const searchQuery = ref('')
const statusFilter = ref<'ALL' | 'OPEN' | 'CLOSED'>('ALL')

const openRoomsCount = computed(() => rooms.value?.filter(r => r.status === 'OPEN').length ?? 0)
const closedRoomsCount = computed(() => rooms.value?.filter(r => r.status === 'CLOSED').length ?? 0)

const filteredRooms = computed(() => {
  let list = rooms.value ?? []
  if (statusFilter.value !== 'ALL') {
    list = list.filter(r => r.status === statusFilter.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r =>
      r.customerName.toLowerCase().includes(q) ||
      (r.customerEmail && r.customerEmail.toLowerCase().includes(q)) ||
      (r.lastMessageText && r.lastMessageText.toLowerCase().includes(q)),
    )
  }
  return list
})

const selectedRoom = ref<ChatRoom | null>(null)
const mobileView = ref<'list' | 'chat'>('list')
const messages = ref<ChatMessage[]>([])
const loadingMessages = ref(false)
const replyText = ref('')
const sending = ref(false)
const liveConnected = ref(false)
const messageContainer = ref<HTMLElement | null>(null)

let eventSource: EventSource | null = null
let roomsPollTimer: ReturnType<typeof setInterval> | null = null
let messagesPollTimer: ReturnType<typeof setInterval> | null = null

// Select first room by default if available
if (rooms.value && rooms.value.length > 0) {
  selectedRoom.value = rooms.value[0]!
}

watch(selectedRoom, async (room) => {
  if (!room || !import.meta.client) return
  messages.value = []
  await loadMessages(room.id, false)
  connectSse(room.id)
}, { immediate: true })

function appendMessage(msg: any) {
  const id = msg?.id || msg?.messageId
  if (!id) return
  const normalized: ChatMessage = {
    id,
    roomId: msg.roomId,
    senderId: msg.senderId,
    senderRole: msg.senderRole,
    senderName: msg.senderName,
    text: msg.text,
    createdAt: msg.createdAt,
  }
  const exists = messages.value.some(m => (m.id || (m as any).messageId) === id)
  if (!exists) {
    messages.value.push(normalized)
    scrollToBottom()
  }
}

async function loadMessages(roomId: string, isBackground = false) {
  if (!isBackground) {
    loadingMessages.value = true
  }
  try {
    const list = await $fetch<ChatMessage[]>(`/api/admin/chat/rooms/${roomId}/messages`)
    for (const m of list) {
      appendMessage(m)
    }
  }
  catch (e) {
    console.error('Failed to load messages', e)
  }
  finally {
    if (!isBackground) {
      loadingMessages.value = false
    }
  }
}

function connectSse(roomId: string) {
  if (!import.meta.client) return
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  if (messagesPollTimer) {
    clearInterval(messagesPollTimer)
    messagesPollTimer = null
  }

  // Active room messages polling fallback (every 3.5s)
  messagesPollTimer = setInterval(() => {
    if (selectedRoom.value?.id === roomId) {
      loadMessages(roomId, true)
    }
  }, 3500)

  try {
    eventSource = new EventSource(`/api/admin/chat/rooms/${roomId}/events`)

    eventSource.addEventListener('open', () => {
      liveConnected.value = true
    })

    eventSource.addEventListener('connected', () => {
      liveConnected.value = true
    })

    const handleIncoming = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        appendMessage(data)
        refreshRooms()
      }
      catch (err) {
        console.error('Error parsing admin SSE message', err)
      }
    }

    eventSource.addEventListener('chat', handleIncoming)
    eventSource.addEventListener('message', handleIncoming)
    eventSource.onmessage = handleIncoming

    eventSource.onerror = () => {
      liveConnected.value = false
    }
  }
  catch (e) {
    console.warn('Failed to connect admin SSE', e)
    liveConnected.value = false
  }
}

async function handleReply() {
  const text = replyText.value.trim()
  if (!text || !selectedRoom.value || sending.value) return
  sending.value = true
  replyText.value = ''
  try {
    const sent = await $fetch<ChatMessage>(`/api/admin/chat/rooms/${selectedRoom.value.id}/messages`, {
      method: 'POST',
      body: { text },
    })
    appendMessage(sent)
    refreshRooms()
  }
  catch (e) {
    console.error('Failed to send admin reply', e)
    replyText.value = text
  }
  finally {
    sending.value = false
  }
}

const actionLoading = ref(false)

async function toggleRoomStatus() {
  if (!selectedRoom.value || actionLoading.value) return
  const newStatus = selectedRoom.value.status === 'OPEN' ? 'CLOSED' : 'OPEN'
  actionLoading.value = true
  try {
    const updated = await $fetch<ChatRoom>(`/api/admin/chat/rooms/${selectedRoom.value.id}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    selectedRoom.value.status = updated.status
    const inList = rooms.value?.find(r => r.id === selectedRoom.value?.id)
    if (inList) inList.status = updated.status
  }
  catch (e) {
    console.error('Failed to toggle room status', e)
  }
  finally {
    actionLoading.value = false
  }
}

async function deleteRoomById(roomId: string, customerName: string) {
  if (actionLoading.value) return
  if (!confirm(`Hapus seluruh percakapan dengan "${customerName}"? Semua riwayat chat akan dihapus permanen.`)) return
  actionLoading.value = true
  try {
    await $fetch(`/api/admin/chat/rooms/${roomId}`, { method: 'DELETE' })
    if (rooms.value) {
      rooms.value = rooms.value.filter(r => r.id !== roomId)
    }
    if (selectedRoom.value?.id === roomId) {
      selectedRoom.value = rooms.value && rooms.value.length > 0 ? rooms.value[0]! : null
      messages.value = []
      mobileView.value = 'list'
    }
  }
  catch (e) {
    console.error('Failed to delete chat room', e)
  }
  finally {
    actionLoading.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

function formatTime(isoString: string) {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  catch {
    return ''
  }
}

function formatDate(isoString: string) {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  catch {
    return ''
  }
}

const { notificationPermission, enableNotifications, setupFcm } = useChat()

onMounted(() => {
  if (import.meta.client && 'Notification' in window && Notification.permission === 'default') {
    enableNotifications()
  } else {
    setupFcm()
  }

  // Periodically refresh list of customer conversations every 4 seconds
  roomsPollTimer = setInterval(() => {
    refreshRooms()
  }, 4000)
})

onUnmounted(() => {
  if (roomsPollTimer) {
    clearInterval(roomsPollTimer)
    roomsPollTimer = null
  }
  if (messagesPollTimer) {
    clearInterval(messagesPollTimer)
    messagesPollTimer = null
  }
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
})
</script>

<template>
  <UDashboardPanel id="live-chat" grow class="h-[calc(100dvh-theme(spacing.16))] sm:h-screen flex flex-col overflow-hidden" :ui="{ body: 'p-0 sm:p-0 flex flex-1 overflow-hidden min-h-0' }">
    <template #header>
      <UDashboardNavbar title="Live Customer Support" badge="Realtime & FCM">
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Refresh chat"
            @click="() => refreshRooms()"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-1 min-h-0 overflow-hidden bg-background">
      <!-- Left: Conversations List -->
      <div
        class="w-full md:w-80 lg:w-96 border-r border-default flex flex-col bg-muted/5 shrink-0 min-h-0"
        :class="mobileView === 'chat' ? 'hidden md:flex' : 'flex'"
      >
        <div class="px-4 py-3 border-b border-default bg-elevated/70 backdrop-blur flex items-center justify-between shrink-0">
          <p class="font-semibold text-xs tracking-wider text-muted uppercase">
            Percakapan Customer ({{ filteredRooms.length }})
          </p>
          <span class="size-2 rounded-full bg-emerald-500 animate-pulse" title="Realtime sync active" />
        </div>

        <!-- Search & Status Filter Controls -->
        <div class="p-2.5 border-b border-default bg-elevated/40 space-y-2 shrink-0">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Cari nama, email, pesan..."
            size="xs"
            class="w-full"
          >
            <template v-if="searchQuery" #trailing>
              <button
                type="button"
                class="flex items-center text-muted hover:text-default"
                aria-label="Hapus pencarian"
                @click="searchQuery = ''"
              >
                <UIcon name="i-lucide-x" class="size-3.5" />
              </button>
            </template>
          </UInput>

          <!-- Status Segmented Filter -->
          <div class="flex items-center gap-1 bg-muted/15 p-0.5 rounded-lg border border-default/50 text-[11px]">
            <button
              type="button"
              class="flex-1 py-1 px-1.5 rounded-md font-medium transition text-center"
              :class="statusFilter === 'ALL' ? 'bg-primary text-primary-contrast shadow-2xs font-semibold' : 'text-muted hover:text-default'"
              @click="statusFilter = 'ALL'"
            >
              Semua ({{ rooms?.length ?? 0 }})
            </button>
            <button
              type="button"
              class="flex-1 py-1 px-1.5 rounded-md font-medium transition text-center"
              :class="statusFilter === 'OPEN' ? 'bg-emerald-600 text-white shadow-2xs font-semibold' : 'text-muted hover:text-default'"
              @click="statusFilter = 'OPEN'"
            >
              Open ({{ openRoomsCount }})
            </button>
            <button
              type="button"
              class="flex-1 py-1 px-1.5 rounded-md font-medium transition text-center"
              :class="statusFilter === 'CLOSED' ? 'bg-neutral-600 text-white shadow-2xs font-semibold' : 'text-muted hover:text-default'"
              @click="statusFilter = 'CLOSED'"
            >
              Closed ({{ closedRoomsCount }})
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto divide-y divide-default/60 min-h-0">
          <div
            v-if="filteredRooms.length === 0"
            class="flex flex-col items-center justify-center p-8 text-center text-sm text-muted"
          >
            <UIcon name="i-lucide-search-x" class="size-9 opacity-30 mb-2.5" />
            <p class="font-medium text-xs">Tidak ada percakapan yang cocok</p>
            <p class="text-[11px] text-dimmed mt-0.5">Coba sesuaikan kata kunci atau filter status.</p>
          </div>

          <div
            v-for="room in filteredRooms"
            :key="room.id"
            role="button"
            tabindex="0"
            class="group relative w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer select-none"
            :class="selectedRoom?.id === room.id ? 'bg-primary/10 border-l-3 border-primary' : 'hover:bg-elevated/80'"
            @click="() => { selectedRoom = room; mobileView = 'chat' }"
            @keydown.enter="() => { selectedRoom = room; mobileView = 'chat' }"
          >
            <UAvatar
              :src="room.customerPictureUrl ?? undefined"
              :alt="room.customerName"
              size="md"
              class="shrink-0 ring-1 ring-default shadow-xs"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-1">
                <p class="font-semibold text-sm truncate text-default">
                  {{ room.customerName }}
                </p>
                <span class="text-[10px] text-muted shrink-0 tabular-nums">
                  {{ formatDate(room.lastMessageAt) }}
                </span>
              </div>
              <p class="text-xs text-muted truncate leading-relaxed">
                {{ room.lastMessageText || 'Memulai percakapan...' }}
              </p>
              <div class="mt-2 flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <UBadge
                    size="xs"
                    :color="room.status === 'OPEN' ? 'success' : 'neutral'"
                    variant="subtle"
                    class="font-medium"
                  >
                    {{ room.status }}
                  </UBadge>
                  <span v-if="room.customerEmail" class="text-[10px] text-dimmed truncate">
                    {{ room.customerEmail }}
                  </span>
                </div>
                <!-- Delete icon on row hover -->
                <button
                  type="button"
                  class="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-error hover:bg-error/10 transition-all rounded"
                  title="Hapus percakapan"
                  @click.stop="deleteRoomById(room.id, room.customerName)"
                >
                  <UIcon name="i-lucide-trash-2" class="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Active Chat Conversation -->
      <div
        v-if="selectedRoom"
        class="flex-1 flex flex-col bg-elevated/30 overflow-hidden min-h-0"
        :class="mobileView === 'list' ? 'hidden md:flex' : 'flex'"
      >
        <!-- Room Chat Header -->
        <div class="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-default bg-elevated flex items-center justify-between gap-2 shrink-0">
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <!-- Mobile back button to room list -->
            <UButton
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              size="xs"
              class="md:hidden -ml-1 text-muted hover:text-default shrink-0"
              aria-label="Kembali ke daftar percakapan"
              @click="mobileView = 'list'"
            />
            <UAvatar
              :src="selectedRoom.customerPictureUrl ?? undefined"
              :alt="selectedRoom.customerName"
              size="sm"
              class="shrink-0 ring-1 ring-default shadow-xs"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h3 class="font-semibold text-xs sm:text-sm truncate text-default">
                  {{ selectedRoom.customerName }}
                </h3>
                <UBadge
                  size="xs"
                  :color="selectedRoom.status === 'OPEN' ? (liveConnected ? 'success' : 'warning') : 'neutral'"
                  variant="subtle"
                >
                  <span class="size-1.5 rounded-full mr-1" :class="selectedRoom.status === 'OPEN' ? (liveConnected ? 'bg-success animate-pulse' : 'bg-warning') : 'bg-neutral-400'" />
                  <span class="hidden sm:inline">{{ selectedRoom.status === 'OPEN' ? (liveConnected ? 'Live connected' : 'Connecting...') : 'Dinonaktifkan / Closed' }}</span>
                  <span class="sm:hidden">{{ selectedRoom.status === 'OPEN' ? (liveConnected ? 'Live' : '...') : 'Closed' }}</span>
                </UBadge>
              </div>
              <p class="text-[10px] sm:text-xs text-muted truncate">
                {{ selectedRoom.customerEmail ?? 'No email' }}
              </p>
            </div>
          </div>

          <!-- Room Actions: Nonaktifkan/Blokir & Hapus -->
          <div class="flex items-center gap-1 shrink-0">
            <UButton
              size="xs"
              :color="selectedRoom.status === 'OPEN' ? 'warning' : 'success'"
              :variant="selectedRoom.status === 'OPEN' ? 'subtle' : 'solid'"
              :icon="selectedRoom.status === 'OPEN' ? 'i-lucide-ban' : 'i-lucide-check-circle-2'"
              :loading="actionLoading"
              :title="selectedRoom.status === 'OPEN' ? 'Nonaktifkan / Blokir Customer' : 'Buka Chat Customer'"
              @click="toggleRoomStatus"
            >
              <span class="hidden sm:inline">{{ selectedRoom.status === 'OPEN' ? 'Nonaktifkan' : 'Buka Chat' }}</span>
            </UButton>
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :loading="actionLoading"
              title="Hapus Percakapan"
              @click="deleteRoomById(selectedRoom.id, selectedRoom.customerName)"
            >
              <span class="hidden sm:inline">Hapus</span>
            </UButton>
          </div>
        </div>

        <!-- Warning bar if CLOSED -->
        <div
          v-if="selectedRoom.status === 'CLOSED'"
          class="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-3.5 py-2 text-xs text-warning-700 dark:text-warning-300 shrink-0"
        >
          <UIcon name="i-lucide-shield-alert" class="size-4 shrink-0" />
          <span class="font-medium text-[11px] sm:text-xs">Percakapan ini dinonaktifkan (CLOSED). Customer tidak dapat mengirim pesan baru ke chat ini.</span>
        </div>

        <!-- Messages Thread -->
        <div
          ref="messageContainer"
          class="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 min-h-0"
        >
          <div v-if="loadingMessages" class="flex justify-center p-8">
            <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-primary" />
          </div>

          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex flex-col"
            :class="msg.senderRole === 'ADMIN' ? 'items-end' : 'items-start'"
          >
            <div class="flex items-center gap-1.5 mb-1 text-[11px] text-muted px-1">
              <span class="font-medium">{{ msg.senderName }}</span>
              <UBadge v-if="msg.senderRole === 'ADMIN'" size="xs" color="primary" variant="subtle">
                Admin
              </UBadge>
            </div>
            <div
              class="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-xs"
              :class="
                msg.senderRole === 'ADMIN'
                  ? 'rounded-br-xs bg-primary text-primary-contrast'
                  : 'rounded-bl-xs border border-default bg-elevated text-default'
              "
            >
              <p class="whitespace-pre-wrap break-words leading-relaxed">
                {{ msg.text }}
              </p>
            </div>
            <span class="mt-1 px-1 text-[10px] text-dimmed tabular-nums">
              {{ formatTime(msg.createdAt) }}
            </span>
          </div>
        </div>

        <!-- Reply Input Footer -->
        <div class="p-2.5 sm:p-3.5 border-t border-default bg-elevated shrink-0">
          <form class="flex items-center gap-2" @submit.prevent="handleReply">
            <UInput
              v-model="replyText"
              placeholder="Balas pesan customer..."
              class="flex-1"
              size="sm"
              :disabled="sending"
              autofocus
            />
            <UButton
              type="submit"
              icon="i-lucide-send"
              label="Balas"
              color="primary"
              size="sm"
              :loading="sending"
              :disabled="!replyText.trim() || sending"
            />
          </form>
        </div>
      </div>

      <!-- No Conversation Selected Empty State -->
      <div v-else class="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted">
        <UIcon name="i-lucide-messages-square" class="size-12 opacity-30 mb-3" />
        <h4 class="font-medium text-sm">
          Pilih Percakapan
        </h4>
        <p class="text-xs text-dimmed mt-1 max-w-xs">
          Pilih salah satu chat dari daftar di sebelah kiri untuk melihat percakapan dan membalas pesan customer.
        </p>
      </div>
    </div>
    </template>
  </UDashboardPanel>
</template>
