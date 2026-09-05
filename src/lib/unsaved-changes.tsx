import { createContext, useContext, useMemo, useState } from 'react'

/**
 * Whether the builder currently holds work that is not on the server yet.
 *
 * Router navigation is already covered by `useBlocker` inside the builder, so
 * this signal exists for the one exit the blocker cannot reach: logging out.
 * Logout performs its auth side effect *before* navigating, and clearing the
 * session unmounts the builder through `RequireAuth` — by the time any
 * navigation happens there is no blocker left to ask. So the question has to be
 * asked before `logout()` runs, by a component that is a sibling of the builder
 * rather than a child.
 *
 * Only the boolean is shared. The page content stays where it belongs, in the
 * builder's own store.
 */
interface UnsavedChangesValue {
  hasUnsavedChanges: boolean
  setUnsavedChanges: (value: boolean) => void
}

/** Outside a provider nothing is unsaved, so consumers behave as they always did. */
const UnsavedChangesContext = createContext<UnsavedChangesValue>({
  hasUnsavedChanges: false,
  setUnsavedChanges: () => {},
})

export const DISCARD_UNSAVED_MESSAGE =
  'Você tem alterações que ainda não foram salvas. Sair agora vai descartá-las.'

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setUnsavedChanges] = useState(false)
  const value = useMemo(
    () => ({ hasUnsavedChanges, setUnsavedChanges }),
    [hasUnsavedChanges],
  )
  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>
}

export function useUnsavedChanges(): UnsavedChangesValue {
  return useContext(UnsavedChangesContext)
}
