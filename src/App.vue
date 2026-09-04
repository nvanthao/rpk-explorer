<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ForceGraph from './components/ForceGraph.vue'
import SearchBar from './components/SearchBar.vue'
import DetailCard from './components/DetailCard.vue'
import FavoritesMenu from './components/FavoritesMenu.vue'
import { buildIndex, commandPath, descendantsOf, pathTo, search, ROOT_ID, type CommandIndex } from './lib/tree'
import { useFavorites } from './lib/favorites'
import type { RpkCommand } from './types'

const index = ref<CommandIndex | null>(null)
const loadError = ref<string | null>(null)

const expanded = ref<Set<string>>(new Set([ROOT_ID]))
const selectedLeafId = ref<string | null>(null)
const searchQuery = ref('')

// Snapshot of `expanded` taken the moment a search starts, restored when the
// search is cleared, so exploring via search doesn't permanently rearrange
// the graph the user had built up by hand.
const expandedBeforeSearch = ref<Set<string> | null>(null)

const { favorites, isFavorite, toggleFavorite } = useFavorites()

// Favorites resolved against the loaded index, sorted alphabetically by
// command path. Ids that no longer exist in the current data.json (e.g. a
// removed rpk command) are hidden, not deleted, so they reappear if the
// command comes back.
const favoriteEntries = computed(() => {
  if (!index.value) return []
  return favorites.value
    .filter((id) => index.value!.byId.has(id))
    .map((id) => ({ id, label: commandPath(index.value!, id) }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

// Expands the full root-to-favorite path, selects the command, and copies
// the command string to the clipboard.
function goToFavorite(id: string) {
  if (!index.value?.byId.has(id)) return
  const path = pathTo(index.value, id)
  const next = new Set(expanded.value)
  for (let i = 0; i < path.length - 1; i++) next.add(path[i])
  expanded.value = next
  selectedLeafId.value = id
  navigator.clipboard.writeText(commandPath(index.value, id)).catch(() => {
    // Clipboard API can be denied (permissions, insecure context). The user
    // can still copy from the detail card.
  })
}

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data.json`)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const raw: RpkCommand = await res.json()
    index.value = buildIndex(raw)
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : String(err)
  }
})

const selectedNode = computed(() => {
  if (!index.value || !selectedLeafId.value) return null
  return index.value.byId.get(selectedLeafId.value) ?? null
})

const breadcrumb = computed(() => {
  if (!index.value || !selectedLeafId.value) return []
  return pathTo(index.value, selectedLeafId.value).map((id) => index.value!.byId.get(id)!.name)
})

const selectedCommandPath = computed(() => {
  if (!index.value || !selectedLeafId.value) return ''
  return commandPath(index.value, selectedLeafId.value)
})

const matchCount = computed(() => {
  if (!index.value || !searchQuery.value.trim()) return 0
  return search(index.value, searchQuery.value).length
})

function toggleCategory(id: string) {
  if (!index.value) return
  const next = new Set(expanded.value)
  if (next.has(id)) {
    next.delete(id)
    const descendants = descendantsOf(index.value, id)
    for (const d of descendants) next.delete(d)
    if (selectedLeafId.value && (selectedLeafId.value === id || descendants.includes(selectedLeafId.value))) {
      selectedLeafId.value = null
    }
  } else {
    next.add(id)
  }
  expanded.value = next
}

function selectLeaf(id: string) {
  selectedLeafId.value = selectedLeafId.value === id ? null : id
}

function collapseAll() {
  expanded.value = new Set([ROOT_ID])
  selectedLeafId.value = null
  searchQuery.value = ''
}

// Auto-reveal the root→match path while searching; restore prior expansion on clear.
watch(searchQuery, (query, previous) => {
  if (!index.value) return
  const trimmed = query.trim()

  if (trimmed && !previous.trim()) {
    expandedBeforeSearch.value = new Set(expanded.value)
  }

  if (trimmed) {
    const matches = search(index.value, trimmed)
    const next = new Set(expanded.value)
    for (const match of matches) {
      for (let i = 0; i < match.path.length - 1; i++) next.add(match.path[i])
    }
    expanded.value = next
  } else if (expandedBeforeSearch.value) {
    expanded.value = expandedBeforeSearch.value
    expandedBeforeSearch.value = null
  }
})
</script>

<template>
  <div class="flex h-screen flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
    <header class="flex flex-wrap items-center gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
      <h1 class="text-sm font-semibold tracking-tight">rpk command explorer</h1>
      <SearchBar v-model="searchQuery" :match-count="matchCount" />
      <FavoritesMenu :favorites="favoriteEntries" @navigate="goToFavorite" @remove="toggleFavorite" />
      <button
        type="button"
        class="ml-auto rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        @click="collapseAll"
      >
        Collapse all
      </button>
    </header>

    <p class="border-b border-stone-200 bg-stone-100/60 px-4 py-1.5 text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
      Click a category to expand it · click a command for details · drag to rearrange · scroll to zoom
    </p>

    <main class="relative flex min-h-0 flex-1">
      <div class="relative min-w-0 flex-1">
        <ForceGraph
          v-if="index"
          :index="index"
          :expanded="expanded"
          :selected-leaf-id="selectedLeafId"
          :search-query="searchQuery"
          @toggle-category="toggleCategory"
          @select-leaf="selectLeaf"
        />
        <div v-else-if="loadError" class="flex h-full items-center justify-center p-6 text-center text-sm text-red-600">
          Couldn't load public/data.json ({{ loadError }}). Run <code class="mx-1 rounded bg-stone-100 px-1 dark:bg-stone-800">just print-tree</code> to generate it.
        </div>
        <div v-else class="flex h-full items-center justify-center text-sm text-stone-400">Loading…</div>
      </div>

      <DetailCard
        v-if="selectedNode"
        :node="selectedNode"
        :command-path="selectedCommandPath"
        :breadcrumb="breadcrumb"
        :is-favorite="isFavorite(selectedNode.id)"
        class="absolute right-0 top-0 z-10 sm:relative"
        @close="selectedLeafId = null"
        @toggle-favorite="toggleFavorite(selectedNode.id)"
      />
    </main>
  </div>
</template>
