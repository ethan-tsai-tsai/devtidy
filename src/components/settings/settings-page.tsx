import { useCallback, useEffect, useState } from "react"
import { Plus, X, Save, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSettings } from "@/hooks/use-settings"
import type { AppSettings } from "@/types/scan"

function ExcludeChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs font-mono">
      {name}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
        aria-label={`Remove ${name}`}
      >
        <X className="size-3" />
      </button>
    </span>
  )
}

export function SettingsPage() {
  const { settings, isLoading, isSaving, error, saveSettings } = useSettings()

  const [draft, setDraft] = useState<AppSettings>(settings)
  const [newExclude, setNewExclude] = useState("")

  // Sync draft when settings load from backend
  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const isDirty =
    draft.scanDepth !== settings.scanDepth ||
    JSON.stringify(draft.extraExcludes) !== JSON.stringify(settings.extraExcludes)

  const handleAddExclude = useCallback(() => {
    const trimmed = newExclude.trim()
    if (!trimmed || draft.extraExcludes.includes(trimmed)) return
    setDraft((prev) => ({ ...prev, extraExcludes: [...prev.extraExcludes, trimmed] }))
    setNewExclude("")
  }, [newExclude, draft.extraExcludes])

  const handleRemoveExclude = useCallback((name: string) => {
    setDraft((prev) => ({
      ...prev,
      extraExcludes: prev.extraExcludes.filter((e) => e !== name),
    }))
  }, [])

  const handleDepthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0))
    setDraft((prev) => ({ ...prev, scanDepth: val }))
  }, [])

  const handleSave = () => void saveSettings(draft)
  const handleReset = () => setDraft(settings)

  const handleExcludeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddExclude()
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading settings...</div>
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure scan behavior</p>
      </div>

      {/* Scan depth */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Max Scan Depth</h3>
          <p className="text-xs text-muted-foreground">
            How deep to recurse into directories. 0 means unlimited.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={0}
            max={50}
            value={draft.scanDepth}
            onChange={handleDepthChange}
            className="w-24 tabular-nums"
          />
          <span className="text-xs text-muted-foreground">
            {draft.scanDepth === 0 ? "No limit" : `${draft.scanDepth} level${draft.scanDepth > 1 ? "s" : ""}`}
          </span>
        </div>
      </section>

      {/* Extra excludes */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Extra Excluded Directories</h3>
          <p className="text-xs text-muted-foreground">
            Directory names to skip during scanning (in addition to built-in exclusions like{" "}
            <code className="font-mono">.git</code>, <code className="font-mono">Library</code>).
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. dist, .next"
            value={newExclude}
            onChange={(e) => setNewExclude(e.target.value)}
            onKeyDown={handleExcludeKeyDown}
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddExclude}
            disabled={!newExclude.trim() || draft.extraExcludes.includes(newExclude.trim())}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        {draft.extraExcludes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {draft.extraExcludes.map((name) => (
              <ExcludeChip key={name} name={name} onRemove={() => handleRemoveExclude(name)} />
            ))}
          </div>
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="size-4" />
              Save
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={isSaving || !isDirty}>
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </div>
    </div>
  )
}
