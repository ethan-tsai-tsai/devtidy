import { useCallback, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { toast } from "sonner"

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
        toast.success("Moved to trash")
        onDeleted(path)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setState({ isDeleting: false, error: message })
        toast.error("Delete failed", { description: message })
      }
    },
    [onDeleted]
  )

  return { ...state, deleteEnv }
}

export function useBatchDeleteEnv(onDeleted: (paths: string[]) => void) {
  const [state, setState] = useState<DeleteState>({ isDeleting: false, error: null })

  const deleteEnvs = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return
      setState({ isDeleting: true, error: null })
      try {
        const deleted = await invoke<string[]>("delete_envs", { paths })
        setState({ isDeleting: false, error: null })
        const failedCount = paths.length - deleted.length
        if (failedCount > 0) {
          toast.warning(
            `Moved ${deleted.length} item${deleted.length !== 1 ? "s" : ""} to trash`,
            { description: `${failedCount} item${failedCount !== 1 ? "s" : ""} could not be deleted (check permissions)` }
          )
        } else {
          toast.success(`Moved ${deleted.length} item${deleted.length !== 1 ? "s" : ""} to trash`)
        }
        onDeleted(deleted)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setState({ isDeleting: false, error: message })
        toast.error("Batch delete failed", { description: message })
      }
    },
    [onDeleted]
  )

  return { ...state, deleteEnvs }
}
