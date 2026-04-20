import { useCallback, useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import type { AppSettings } from "@/types/scan"

const DEFAULT_SETTINGS: AppSettings = {
  scanDepth: 0,
  extraExcludes: [],
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    invoke<AppSettings>("get_settings")
      .then((s) => setSettings(s))
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setIsLoading(false))
  }, [])

  const saveSettings = useCallback(async (next: AppSettings) => {
    setIsSaving(true)
    setError(null)
    try {
      await invoke("save_settings", { settings: next })
      setSettings(next)
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setIsSaving(false)
    }
  }, [])

  return { settings, isLoading, isSaving, error, saveSettings }
}
