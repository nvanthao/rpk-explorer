import { ref, watch } from 'vue'

const STORAGE_KEY = 'rpk-explorer:favorites'

/**
 * Reads the persisted favorite ids from localStorage. Returns an empty list
 * when the key is missing or the stored value is malformed, so a bad payload
 * never breaks app startup.
 */
function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch {
    return []
  }
}

/**
 * Favorite command ids (the same space-joined path ids the CommandIndex
 * uses, e.g. "rpk topic create"), kept in insertion order and persisted to
 * localStorage on every change. Ids are stored as-is; callers resolve them
 * against the current CommandIndex and skip ids that no longer exist.
 */
export function useFavorites() {
  const favorites = ref<string[]>(load())

  watch(
    favorites,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // localStorage can be unavailable (private mode, quota). Favorites
        // then live only for the current session.
      }
    },
    { deep: true },
  )

  function isFavorite(id: string): boolean {
    return favorites.value.includes(id)
  }

  function toggleFavorite(id: string) {
    if (isFavorite(id)) {
      favorites.value = favorites.value.filter((fav) => fav !== id)
    } else {
      favorites.value = [...favorites.value, id]
    }
  }

  return { favorites, isFavorite, toggleFavorite }
}
