import React from 'react'
import { Loader2 } from 'lucide-react'

export default function LoadingGrid({ count = 6, type = 'card', gridClass = 'grid-auto', label }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {label && (
        <div className="flex items-center gap-2 text-xs text-muted font-semibold animate-pulse mb-1">
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <span>{label}</span>
        </div>
      )}

      {type === 'table' ? (
        <TableSkeleton rows={count} />
      ) : (
        <div className={gridClass}>
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              className="card p-4 flex flex-col gap-3"
              style={{
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)'
              }}
            >
              {/* Image Skeleton Box */}
              <div
                className="skeleton"
                style={{
                  height: '140px',
                  width: '100%',
                  borderRadius: 'var(--radius-md)'
                }}
              />
              {/* Category Badge Skeleton */}
              <div
                className="skeleton"
                style={{
                  height: '14px',
                  width: '30%',
                  borderRadius: 'var(--radius-full)'
                }}
              />
              {/* Title Skeleton */}
              <div
                className="skeleton"
                style={{
                  height: '18px',
                  width: '75%',
                  borderRadius: 'var(--radius-sm)'
                }}
              />
              {/* Subtitle / Price Skeleton */}
              <div
                className="skeleton"
                style={{
                  height: '14px',
                  width: '50%',
                  borderRadius: 'var(--radius-sm)'
                }}
              />
              {/* Button Skeleton */}
              <div
                className="skeleton mt-2"
                style={{
                  height: '34px',
                  width: '100%',
                  borderRadius: 'var(--radius-md)'
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {[...Array(5)].map((_, i) => (
              <th key={i}>
                <div className="skeleton" style={{ height: '14px', width: '70px', borderRadius: '4px' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, r) => (
            <tr key={r}>
              {[...Array(5)].map((_, c) => (
                <td key={c}>
                  <div className="skeleton" style={{ height: '16px', width: c === 0 ? '120px' : '80px', borderRadius: '4px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
