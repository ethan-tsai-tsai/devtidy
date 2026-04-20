import { useCallback, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useDeleteEnv } from "@/hooks/use-delete-env"
import { formatBytes, formatEnvType } from "@/lib/format"
import type { EnvEntry } from "@/types/scan"

interface DeleteDialogProps {
  entry: EnvEntry
  onDeleted: (path: string) => void
}

export function DeleteDialog({ entry, onDeleted }: DeleteDialogProps) {
  const [open, setOpen] = useState(false)

  const handleDeleted = useCallback((path: string) => {
    setOpen(false)
    onDeleted(path)
  }, [onDeleted])

  const { isDeleting, error, deleteEnv } = useDeleteEnv(handleDeleted)

  const handleConfirm = () => {
    void deleteEnv(entry.path)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${entry.path}`} />
        }
      >
        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Trash</DialogTitle>
          <DialogDescription>
            This will move the following environment to the system trash. You can restore it from your trash if needed.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/50 p-3 text-xs">
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{formatEnvType(entry.envType)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Size</dt>
              <dd className="font-medium tabular-nums">{formatBytes(entry.sizeBytes)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Path</dt>
              <dd className="break-all font-mono">{entry.path}</dd>
            </div>
          </dl>
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isDeleting} />}>
            Cancel
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {isDeleting ? "Moving..." : "Move to Trash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
