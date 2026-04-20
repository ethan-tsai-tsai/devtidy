import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, FolderOpen, FolderX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DeleteDialog } from "./delete-dialog"
import { formatBytes, formatRelativeTime, formatEnvType, getEnvCategory } from "@/lib/format"
import type { EnvEntry } from "@/types/scan"

export interface TableMeta {
  onDeleted: (path: string) => void
  scanRoot: string | null
}

function toRelativePath(absolutePath: string, root: string | null): string {
  if (!root) return absolutePath
  const normalized = root.endsWith("/") ? root : `${root}/`
  return absolutePath.startsWith(normalized)
    ? absolutePath.slice(normalized.length)
    : absolutePath
}

function SortableHeader({
  column,
  children,
}: {
  column: { getToggleSortingHandler: () => ((event: unknown) => void) | undefined; getIsSorted: () => false | "asc" | "desc" }
  children: React.ReactNode
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 gap-1"
      onClick={column.getToggleSortingHandler()}
    >
      {children}
      <ArrowUpDown className="size-3.5 opacity-50" />
      {sorted === "asc" && <span className="sr-only">(ascending)</span>}
      {sorted === "desc" && <span className="sr-only">(descending)</span>}
    </Button>
  )
}

export const columns: ColumnDef<EnvEntry>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(!!checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "envType",
    header: ({ column }) => <SortableHeader column={column}>Type</SortableHeader>,
    cell: ({ row }) => {
      const envType = row.original.envType
      const category = getEnvCategory(envType)
      return (
        <Badge variant={category === "python" ? "default" : "secondary"}>
          {formatEnvType(envType)}
        </Badge>
      )
    },
    filterFn: "equals",
  },
  {
    accessorKey: "hasProjectFile",
    header: ({ column }) => <SortableHeader column={column}>Project</SortableHeader>,
    cell: ({ row }) => {
      const { hasProjectFile, projectPath } = row.original
      const display = projectPath ? (projectPath.split("/").pop() ?? projectPath) : null
      return hasProjectFile ? (
        <span className="flex items-center gap-1.5 text-xs" title={projectPath ?? undefined}>
          <FolderOpen className="size-3.5 text-green-500" />
          <span className="max-w-[200px] truncate">{display}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FolderX className="size-3.5 text-destructive" />
          Orphan
        </span>
      )
    },
  },
  {
    accessorKey: "path",
    header: ({ column }) => <SortableHeader column={column}>Path</SortableHeader>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta
      const display = toRelativePath(row.original.path, meta.scanRoot)
      return (
        <span className="max-w-[300px] truncate font-mono text-xs" title={row.original.path}>
          {display}
        </span>
      )
    },
  },
  {
    accessorKey: "sizeBytes",
    header: ({ column }) => <SortableHeader column={column}>Size</SortableHeader>,
    cell: ({ row }) => (
      <span className="tabular-nums">{formatBytes(row.original.sizeBytes)}</span>
    ),
  },
  {
    accessorKey: "lastModified",
    header: ({ column }) => <SortableHeader column={column}>Last Modified</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground" title={row.original.lastModified}>
        {formatRelativeTime(row.original.lastModified)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta
      return <DeleteDialog entry={row.original} onDeleted={meta.onDeleted} />
    },
    enableSorting: false,
  },
]
