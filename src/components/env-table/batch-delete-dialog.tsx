import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
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
import { formatBytes } from "@/lib/format"
import type { EnvEntry } from "@/types/scan"

interface BatchDeleteDialogProps {
  entries: EnvEntry[]
  onConfirm: () => void
  isDeleting: boolean
}

export function BatchDeleteDialog({ entries, onConfirm, isDeleting }: BatchDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0)

  const handleConfirm = () => {
    onConfirm()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" className="h-7 gap-1.5 text-xs" />
        }
      >
        <Trash2 className="size-3.5" />
        {t("batchDeleteDialog.trigger", { count: entries.length })}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("batchDeleteDialog.title", { count: entries.length })}</DialogTitle>
          <DialogDescription>{t("batchDeleteDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/50 p-3 text-xs">
          <div className="mb-2 flex justify-between font-medium">
            <span>{t("batchDeleteDialog.totalSpaceFreed")}</span>
            <span className="tabular-nums">{formatBytes(totalBytes)}</span>
          </div>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {entries.map((e) => (
              <li key={e.path} className="flex justify-between gap-4 text-muted-foreground">
                <span className="truncate font-mono">{e.path}</span>
                <span className="shrink-0 tabular-nums">{formatBytes(e.sizeBytes)}</span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isDeleting} />}>
            {t("batchDeleteDialog.cancel")}
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {isDeleting ? t("batchDeleteDialog.moving") : t("batchDeleteDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
