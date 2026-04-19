import { useCallback, useState } from "react"
import { invoke } from "@tauri-apps/api/core"

interface DeleteState {
  isDeleting: boolean
  error: string | null
}

export function useDeleteEnv(onDeleted: (path: string) => void) {
  const [state, setState] = useState<DeleteState>({ isDeleting: false, error: null })

  const deleteEnv = useCallback(
    async (path: string) => {
      setState({ isDeleting: true, error: null })
      try {
        await invoke("delete_env", { path })
        setState({ isDeleting: false, error: null })
        onDeleted(path)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setState({ isDeleting: false, error: message })
      }
    },
    [onDeleted]
  )

  return { ...state, deleteEnv }
}
