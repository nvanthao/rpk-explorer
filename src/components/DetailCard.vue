<script setup lang="ts">
import { ref } from 'vue'
import type { GraphNodeData } from '../types'

const props = defineProps<{
  node: GraphNodeData
  commandPath: string
  breadcrumb: string[]
  isFavorite: boolean
}>()

defineEmits<{ close: []; toggleFavorite: [] }>()

const copied = ref(false)

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(props.commandPath)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // Clipboard API can be denied (permissions, insecure context) — fail quietly.
  }
}

function formatDefault(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value) && value.length === 0) return null
  if (value === '' ) return null
  if (typeof value === 'boolean') return value ? 'true' : null
  return typeof value === 'string' ? value : JSON.stringify(value)
}
</script>

<template>
  <aside
    class="flex h-full w-full flex-col overflow-y-auto border-l border-stone-200 bg-white text-stone-900 shadow-xl dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 sm:w-96"
  >
    <div class="flex items-start justify-between gap-2 border-b border-stone-200 p-4 dark:border-stone-800">
      <div class="min-w-0">
        <p class="truncate text-xs text-stone-400">{{ breadcrumb.join(' › ') }}</p>
        <h2 class="mt-0.5 truncate text-lg font-semibold">{{ node.name }}</h2>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          :aria-label="isFavorite ? 'Remove from favorites' : 'Add to favorites'"
          class="rounded-full p-1 transition hover:bg-stone-100 dark:hover:bg-stone-800"
          :class="isFavorite ? 'text-amber-500' : 'text-stone-400 hover:text-amber-500'"
          @click="$emit('toggleFavorite')"
        >
          {{ isFavorite ? '★' : '☆' }}
        </button>
        <button
          type="button"
          aria-label="Close"
          class="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-5 p-4">
      <p v-if="node.raw.description" class="whitespace-pre-line text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        {{ node.raw.description }}
      </p>

      <div>
        <p class="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">Command</p>
        <div class="flex items-stretch gap-1.5">
          <code class="flex-1 overflow-x-auto rounded-md bg-stone-100 px-2.5 py-1.5 text-sm text-stone-800 dark:bg-stone-800 dark:text-stone-100">{{ commandPath }}</code>
          <button
            type="button"
            class="shrink-0 rounded-md border border-stone-300 px-2.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            :class="copied && 'border-teal-600 text-teal-700 dark:text-teal-400'"
            @click="copyCommand"
          >
            {{ copied ? 'Copied ✓' : 'Copy' }}
          </button>
        </div>
      </div>

      <div v-if="node.raw.usage">
        <p class="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">Usage</p>
        <code class="block overflow-x-auto whitespace-pre rounded-md bg-stone-100 px-2.5 py-1.5 text-sm text-stone-800 dark:bg-stone-800 dark:text-stone-100">{{ node.raw.usage }}</code>
      </div>

      <div v-if="node.raw.aliases?.length">
        <p class="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">Aliases</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="alias in node.raw.aliases"
            :key="alias"
            class="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300"
          >{{ alias }}</span>
        </div>
      </div>

      <div v-if="node.raw.flags.length">
        <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-400">Flags</p>
        <ul class="flex flex-col gap-3">
          <li v-for="flag in node.raw.flags" :key="flag.name" class="text-sm">
            <div class="flex flex-wrap items-baseline gap-1.5 font-mono text-[13px]">
              <span class="text-stone-800 dark:text-stone-100">--{{ flag.name }}</span>
              <span v-if="flag.shorthand" class="text-stone-400">-{{ flag.shorthand }}</span>
              <span class="text-stone-400">{{ flag.type }}</span>
              <span v-if="flag.required" class="rounded bg-teal-600/10 px-1 py-0.5 text-[11px] font-sans font-medium text-teal-700 dark:text-teal-400">required</span>
            </div>
            <p class="mt-0.5 text-stone-600 dark:text-stone-400">{{ flag.description }}</p>
            <p v-if="formatDefault(flag.default)" class="mt-0.5 text-xs text-stone-400">default: <code>{{ formatDefault(flag.default) }}</code></p>
          </li>
        </ul>
      </div>
    </div>
  </aside>
</template>
