"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export type SortDir = "asc" | "desc";
export type SortState = { columnId: string; dir: SortDir } | null;

export interface Column<T> {
  id: string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  cell: (row: T) => React.ReactNode;
  /** Skeleton width for the loading state (Tailwind class). */
  skeletonClassName?: string;
  /** Applied to both <th> and <td> (use for widths/min-width). */
  className?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  sort?: SortState;
  onSortChange?: (columnId: string) => void;
  pagination?: PaginationState;
  /** Shown (spanning all columns) when not loading and data is empty. */
  empty?: React.ReactNode;
  className?: string;
}

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function DataTable<T>({
  columns,
  data,
  getRowId,
  loading = false,
  skeletonRows = 8,
  selectable = false,
  selectedIds = [],
  onSelectedIdsChange,
  onRowClick,
  sort,
  onSortChange,
  pagination,
  empty,
  className,
}: DataTableProps<T>) {
  const selected = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const pageIds = data.map(getRowId);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  function toggleAll() {
    if (!onSelectedIdsChange) return;
    if (allOnPageSelected) {
      onSelectedIdsChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      onSelectedIdsChange([...new Set([...selectedIds, ...pageIds])]);
    }
  }

  function toggleRow(id: string) {
    if (!onSelectedIdsChange) return;
    onSelectedIdsChange(
      selected.has(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  const showEmpty = !loading && data.length === 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-xs",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
            <tr className="border-b border-border">
              {selectable && (
                <th scope="col" className="w-12 px-4 py-3">
                  <Checkbox
                    checked={allOnPageSelected}
                    indeterminate={!allOnPageSelected && someOnPageSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows on this page"
                    disabled={loading || data.length === 0}
                  />
                </th>
              )}
              {columns.map((col) => {
                const active = sort?.columnId === col.id;
                const SortIcon = !active
                  ? ArrowUpDown
                  : sort?.dir === "asc"
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={
                      active
                        ? sort?.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn(
                      "px-4 py-3 text-xs font-medium text-text-secondary",
                      alignClass[col.align ?? "left"],
                      col.className,
                    )}
                  >
                    {col.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(col.id)}
                        className={cn(
                          "group inline-flex items-center gap-1.5 rounded-sm font-medium transition-colors hover:text-gray-700 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                          col.align === "right" && "flex-row-reverse",
                          active && "text-gray-700 dark:text-gray-200",
                        )}
                      >
                        {col.header}
                        <SortIcon
                          className={cn(
                            "size-3.5 transition-opacity",
                            active
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-60",
                          )}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-border">
                    {selectable && (
                      <td className="px-4 py-4">
                        <Skeleton className="size-4 rounded-[5px]" />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.id} className={cn("px-4 py-4", col.className)}>
                        <Skeleton
                          className={cn("h-4", col.skeletonClassName ?? "w-24")}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row) => {
                  const id = getRowId(row);
                  const isSelected = selected.has(id);
                  return (
                    <tr
                      key={id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        "border-b border-border transition-colors last:border-b-0",
                        isSelected
                          ? "bg-orange-25 dark:bg-orange-400/10"
                          : "hover:bg-gray-50 dark:hover:bg-white/4",
                        onRowClick && "cursor-pointer",
                      )}
                    >
                      {selectable && (
                        <td
                          className="px-4 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(id)}
                            aria-label="Select row"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className={cn(
                            "px-4 py-4 text-text-secondary align-middle",
                            alignClass[col.align ?? "left"],
                            col.className,
                          )}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {showEmpty && empty}

      {pagination && !showEmpty && (
        <TablePagination {...pagination} loading={loading} />
      )}
    </div>
  );
}

function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  loading,
}: PaginationState & { loading?: boolean }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
      <div className="text-sm text-text-secondary">
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span>
            <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">
              {from}–{to}
            </span>{" "}
            of <span className="tabular-nums">{total}</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-text-secondary sm:inline">
          Page <span className="tabular-nums">{page}</span> of{" "}
          <span className="tabular-nums">{totalPages}</span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={loading || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={loading || page >= totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
