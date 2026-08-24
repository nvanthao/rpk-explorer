<script setup lang="ts">
defineProps<{ matchCount: number }>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="relative w-full max-w-sm">
    <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6" />
      <path d="M14 14L18 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
    <input
      v-model="model"
      type="text"
      placeholder="Search commands…"
      class="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-16 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-teal-500"
    />
    <span
      v-if="model.trim()"
      class="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-xs tabular-nums text-stone-400"
    >
      {{ matchCount }}
    </span>
    <button
      v-if="model"
      type="button"
      class="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-200"
      aria-label="Clear search"
      @click="model = ''"
    >
      ×
    </button>
  </div>
</template>
