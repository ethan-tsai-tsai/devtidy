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
import { useTranslation } from "react-i18next"
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

const CATEGORY_TAB_VALUES: CategoryFilter[] = ["all", "python", "node", "orphan"]

const SIZE_OPTION_DEFS: { value: SizeFilter; bytes: number }[] = [
  { value: "all", bytes: 0 },
  { value: "100mb", bytes: 100 * 1024 * 1024 },
  { value: "500mb", bytes: 500 * 1024 * 1024 },
  { value: "1gb", bytes: 1024 * 1024 * 1024 },
]

interface EnvTableProps {
  data: EnvEntry[]
  scanRoot: string | null
  onDeleted: (path: string) => void
}

export function EnvTable({ data, scanRoot, onDeleted }: EnvTableProps) {
  const { t } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const categoryTabs = CATEGORY_TAB_VALUES.map((value) => ({
    value,
    label: t(`table.categories.${value}`),
  }))

  const sizeOptions = SIZE_OPTION_DEFS.map((def) => ({
    ...def,
    label: t(`table.sizeFilters.${def.value}`),
  }))

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

  const sizeThreshold = SIZE_OPTION_DEFS.find((o) => o.value === sizeFilter)?.bytes ?? 0

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
          {categoryTabs.map((tab) => (
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
          placeholder={t("table.search")}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex items-center gap-1 rounded-lg border p-1">
          {sizeOptions.map((opt) => (
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
          <span className="text-sm font-medium">{t("table.selected", { count: selectedCount })}</span>
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
            {t("table.clearSelection")}
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
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("table.footer", { count: table.getFilteredRowModel().rows.length })}
      </p>
    </div>
  )
}
