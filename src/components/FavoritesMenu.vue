<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{
  favorites: { id: string; label: string }[]
}>()

const emit = defineEmits<{
  navigate: [id: string]
  remove: [id: string]
}>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

function onDocumentClick(event: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

function navigate(id: string) {
  emit('navigate', id)
  open.value = false
}
</script>

<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      :class="open && 'bg-stone-100 dark:bg-stone-800'"
      @click="open = !open"
    >
      <span class="text-amber-500">★</span>
      Favorites
      <span v-if="favorites.length" class="tabular-nums text-stone-400">{{ favorites.length }}</span>
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-full z-20 mt-1.5 w-72 rounded-lg border border-stone-200 bg-white py-1 shadow-xl dark:border-stone-700 dark:bg-stone-900"
    >
      <p v-if="!favorites.length" class="px-3 py-2 text-xs text-stone-400">
        No favorites yet. Open a command and press ☆.
      </p>
      <ul v-else class="max-h-80 overflow-y-auto">
        <li v-for="entry in favorites" :key="entry.id" class="group flex items-center">
          <button
            type="button"
            class="min-w-0 flex-1 px-3 py-1.5 text-left font-mono text-xs text-stone-700 transition hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
            @click="navigate(entry.id)"
          >
            <span class="block truncate">{{ entry.label }}</span>
          </button>
          <button
            type="button"
            class="mr-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-stone-300 opacity-0 transition hover:bg-stone-200 hover:text-stone-700 group-hover:opacity-100 dark:hover:bg-stone-700 dark:hover:text-stone-200"
            :aria-label="`Remove ${entry.label} from favorites`"
            @click="emit('remove', entry.id)"
          >
            ×
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
