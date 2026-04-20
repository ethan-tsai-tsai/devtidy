import { useCallback, useState } from "react"
import { Loader2, Pencil } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import type { EnvEntry } from "@/types/scan"

interface RenameDialogProps {
  entry: EnvEntry
  onRenamed: (oldPath: string, newPath: string) => void
}

function currentName(path: string): string {
  return path.split("/").pop() ?? path
}

export function RenameDialog({ entry, onRenamed }: RenameDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentName(entry.path))
  const [isRenaming, setIsRenaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = (next: boolean) => {
    if (next) {
      setName(currentName(entry.path))
      setError(null)
    }
    setOpen(next)
  }

  const handleConfirm = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === currentName(entry.path)) return
    setIsRenaming(true)
    setError(null)
    try {
      const newPath = await invoke<string>("rename_env", {
        oldPath: entry.path,
        newName: trimmed,
      })
      setOpen(false)
      onRenamed(entry.path, newPath)
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setIsRenaming(false)
    }
  }, [name, entry.path, onRenamed])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void handleConfirm()
  }

  const isUnchanged = name.trim() === currentName(entry.path) || !name.trim()

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Rename ${entry.path}`} />
        }
      >
        <Pencil className="size-3.5 text-muted-foreground" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Environment</DialogTitle>
          <DialogDescription>
            Enter a new directory name. The parent directory will remain the same.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="New directory name"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isRenaming} />}>
            Cancel
          </DialogClose>
          <Button onClick={() => void handleConfirm()} disabled={isRenaming || isUnchanged}>
            {isRenaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Pencil className="size-4" />
            )}
            {isRenaming ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
