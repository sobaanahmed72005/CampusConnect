import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 12,
  onPageChange,
  className = ''
}) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - 2)
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div
      className={`pagination-container flex flex-wrap items-center justify-between gap-4 mt-8 pt-4 border-t ${className}`}
      style={{ borderColor: 'var(--border)' }}
      role="navigation"
      aria-label="Pagination Navigation"
    >
      {/* Items range counter */}
      <div className="text-xs text-muted font-medium">
        Showing <span className="text-primary font-bold">{totalItems > 0 ? startItem : 0}</span> to{' '}
        <span className="text-primary font-bold">{endItem}</span> of{' '}
        <span className="text-primary font-bold">{totalItems}</span> results
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page Button */}
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Go to first page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Number Buttons */}
        {getPageNumbers().map((page) => (
          <button
            key={page}
            type="button"
            className={`btn btn-sm ${page === currentPage ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onPageChange(page)}
            style={{ minWidth: 34, padding: '4px 8px', fontWeight: page === currentPage ? 700 : 500 }}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        {/* Next Page Button */}
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Go to last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
}
