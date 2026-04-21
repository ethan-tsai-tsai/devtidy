import { useCallback, useEffect, useState } from "react"
import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error"

interface UpdaterState {
  status: UpdateStatus
  version: string | null
  error: string | null
  downloaded: number
  total: number | null
}

const INITIAL_STATE: UpdaterState = {
  status: "idle",
  version: null,
  error: null,
  downloaded: 0,
  total: null,
}

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>(INITIAL_STATE)

  const checkForUpdate = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "checking", error: null }))
    try {
      const update = await check()
      if (!update?.available) {
        setState((prev) => ({ ...prev, status: "idle" }))
        return
      }
      setState((prev) => ({ ...prev, status: "available", version: update.version }))
    } catch (err: unknown) {
      // Silently reset on check failure — network may be unavailable
      setState((prev) => ({ ...prev, status: "idle", error: err instanceof Error ? err.message : String(err) }))
    }
  }, [])

  const installUpdate = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "downloading", downloaded: 0, total: null }))
    try {
      const update = await check()
      if (!update?.available) return

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            setState((prev) => ({ ...prev, total: event.data.contentLength ?? null }))
            break
          case "Progress":
            setState((prev) => ({ ...prev, downloaded: prev.downloaded + event.data.chunkLength }))
            break
          case "Finished":
            setState((prev) => ({ ...prev, status: "ready" }))
            break
        }
      })

      await relaunch()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setState((prev) => ({ ...prev, status: "error", error: message }))
    }
  }, [])

  // Check for updates once on startup after a short delay
  useEffect(() => {
    const timer = setTimeout(() => void checkForUpdate(), 3000)
    return () => clearTimeout(timer)
  }, [checkForUpdate])

  return { ...state, checkForUpdate, installUpdate }
}
