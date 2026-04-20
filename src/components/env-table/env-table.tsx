import { useCallback, useMemo, useState } from "react"
import {
  type RowSelectionState,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { columns, type TableMeta } from "./columns"
import { BatchDeleteDialog } from "./batch-delete-dialog"
import { getEnvCategory } from "@/lib/format"
import { useBatchDeleteEnv } from "@/hooks/use-delete-env"
import type { EnvEntry } from "@/types/scan"

type CategoryFilter = "all" | "python" | "node" | "orphan"
type SizeFilter = "all" | "100mb" | "500mb" | "1gb"

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "python", label: "Python" },
  { value: "node", label: "Node.js" },
  { value: "orphan", label: "Orphan" },
]

const SIZE_OPTIONS: { value: SizeFilter; label: string; bytes: number }[] = [
  { value: "all", label: "Any size", bytes: 0 },
  { value: "100mb", label: "> 100 MB", bytes: 100 * 1024 * 1024 },
  { value: "500mb", label: "> 500 MB", bytes: 500 * 1024 * 1024 },
  { value: "1gb", label: "> 1 GB", bytes: 1024 * 1024 * 1024 },
]

interface EnvTableProps {
  data: EnvEntry[]
  scanRoot: string | null
  onDeleted: (path: string) => void
}

export function EnvTable({ data, scanRoot, onDeleted }: EnvTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handleSingleDeleted = useCallback(
    (path: string) => {
      onDeleted(path)
    },
    [onDeleted],
  )

  const handleBatchDeleted = useCallback(
    (paths: string[]) => {
      setRowSelection({})
      for (const path of paths) onDeleted(path)
    },
    [onDeleted],
  )

  const { isDeleting: isBatchDeleting, deleteEnvs } = useBatchDeleteEnv(handleBatchDeleted)

  const sizeThreshold = SIZE_OPTIONS.find((o) => o.value === sizeFilter)?.bytes ?? 0

  const filteredData = useMemo(() => {
    let result = data

    if (categoryFilter === "orphan") {
      result = result.filter((e) => !e.hasProjectFile)
    } else if (categoryFilter !== "all") {
      result = result.filter((e) => getEnvCategory(e.envType) === categoryFilter)
    }

    if (sizeThreshold > 0) {
      result = result.filter((e) => e.sizeBytes >= sizeThreshold)
    }

    return result
  }, [data, categoryFilter, sizeThreshold])

  const categoryCounts = useMemo(() => {
    const counts = { all: data.length, python: 0, node: 0, orphan: 0 }
    for (const entry of data) {
      const cat = getEnvCategory(entry.envType)
      counts[cat]++
      if (!entry.hasProjectFile) counts.orphan++
    }
    return counts
  }, [data])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: { onDeleted: handleSingleDeleted, scanRoot } satisfies TableMeta,
  })

  const selectedEntries = table.getSelectedRowModel().rows.map((r) => r.original)
  const selectedCount = selectedEntries.length

  return (
    <div className="space-y-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={categoryFilter === tab.value ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-3 text-xs"
              onClick={() => {
                setCategoryFilter(tab.value)
                setRowSelection({})
              }}
            >
              {tab.label}
              <span className="tabular-nums text-muted-foreground">
                {categoryCounts[tab.value]}
              </span>
            </Button>
          ))}
        </div>

        <Input
          placeholder="Search environments..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex items-center gap-1 rounded-lg border p-1">
          {SIZE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={sizeFilter === opt.value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => {
                setSizeFilter(opt.value)
                setRowSelection({})
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Batch action bar — visible only when rows are selected */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <BatchDeleteDialog
            entries={selectedEntries}
            onConfirm={() => void deleteEnvs(selectedEntries.map((e) => e.path))}
            isDeleting={isBatchDeleting}
          />
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => setRowSelection({})}
          >
            Clear selection
          </Button>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No environments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length} environment(s) found
      </p>
    </div>
  )
}
