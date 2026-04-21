import { useCallback, useState } from "react"
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
import { useDeleteEnv } from "@/hooks/use-delete-env"
import { formatBytes, formatEnvType } from "@/lib/format"
import type { EnvEntry } from "@/types/scan"

interface DeleteDialogProps {
  entry: EnvEntry
  onDeleted: (path: string) => void
}

export function DeleteDialog({ entry, onDeleted }: DeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

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
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>{t("deleteDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/50 p-3 text-xs">
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("deleteDialog.labelType")}</dt>
              <dd className="font-medium">{formatEnvType(entry.envType)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("deleteDialog.labelSize")}</dt>
              <dd className="font-medium tabular-nums">{formatBytes(entry.sizeBytes)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{t("deleteDialog.labelPath")}</dt>
              <dd className="break-all font-mono">{entry.path}</dd>
            </div>
          </dl>
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isDeleting} />}>
            {t("deleteDialog.cancel")}
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {isDeleting ? t("deleteDialog.moving") : t("deleteDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
