import { useMemo, useState } from "react"
import {
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
import { getEnvCategory } from "@/lib/format"
import type { EnvEntry } from "@/types/scan"

type CategoryFilter = "all" | "python" | "node"

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "python", label: "Python" },
  { value: "node", label: "Node.js" },
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

  const filteredData = useMemo(
    () =>
      categoryFilter === "all"
        ? data
        : data.filter((entry) => getEnvCategory(entry.envType) === categoryFilter),
    [data, categoryFilter]
  )

  const categoryCounts = useMemo(() => {
    const counts = { all: data.length, python: 0, node: 0 }
    for (const entry of data) {
      const cat = getEnvCategory(entry.envType)
      counts[cat]++
    }
    return counts
  }, [data])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: { onDeleted, scanRoot } satisfies TableMeta,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={categoryFilter === tab.value ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-3 text-xs"
              onClick={() => setCategoryFilter(tab.value)}
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
      </div>
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
                <TableRow key={row.id}>
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
