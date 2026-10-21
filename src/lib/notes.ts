import { ref, watch } from 'vue'

const STORAGE_KEY = 'rpk-explorer:notes'

/**
 * Reads the persisted notes from localStorage. Returns an empty map when the
 * key is missing or the stored value is malformed, so a bad payload never
 * breaks app startup. Non-string values are dropped.
 */
function load(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const notes: Record<string, string> = {}
    for (const [id, text] of Object.entries(parsed)) {
      if (typeof text === 'string' && text !== '') notes[id] = text
    }
    return notes
  } catch {
    return {}
  }
}

/**
 * Free-text notes per command id (the same space-joined path ids the
 * CommandIndex uses, e.g. "rpk topic create"), for things like sample output
 * or personal reminders. Persisted to localStorage on every change. Ids are
 * stored as-is, like favorites, so a note survives a command that disappears
 * from data.json and comes back later.
 */
export function useNotes() {
  const notes = ref<Record<string, string>>(load())

  watch(
    notes,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // localStorage can be unavailable (private mode, quota). Notes then
        // live only for the current session.
      }
    },
    { deep: true },
  )

  function noteFor(id: string): string {
    return notes.value[id] ?? ''
  }

  // Saving blank text deletes the note so empty entries don't pile up.
  function setNote(id: string, text: string) {
    const next = { ...notes.value }
    if (text.trim() === '') delete next[id]
    else next[id] = text
    notes.value = next
  }

  return { notes, noteFor, setNote }
}
