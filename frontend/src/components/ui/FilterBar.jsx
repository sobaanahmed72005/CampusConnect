import React from 'react'
import { Search, X } from 'lucide-react'
import './FilterBar.css'

export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  categories = [],
  activeCategory,
  onCategoryChange,
  extraFilters,
  children
}) {
  const hasExtra = extraFilters || children

  return (
    <div className="modern-filter-bar mb-6">
      {/* Top Tier: Search Box (Left) + Filter Actions (Right) */}
      {(onSearchChange || hasExtra) && (
        <div className="filter-bar-top">
          {onSearchChange && (
            <div className="filter-search-box">
              <Search size={15} className="filter-search-icon" />
              <input
                type="text"
                className="filter-search-input"
                placeholder={searchPlaceholder}
                value={search || ''}
                onChange={e => onSearchChange(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="filter-search-clear"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {hasExtra && (
            <div className="filter-bar-extra">
              {extraFilters}
              {children}
            </div>
          )}
        </div>
      )}

      {/* Hairline Divider */}
      {categories.length > 0 && (onSearchChange || hasExtra) && (
        <div className="filter-bar-divider" />
      )}

      {/* Bottom Tier: Category Chips Track */}
      {categories.length > 0 && (
        <div className="filter-pills-track">
          {categories.map(c => {
            const isActive = activeCategory === c
            return (
              <button
                key={c}
                type="button"
                className={`filter-pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => onCategoryChange && onCategoryChange(c)}
              >
                {c}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
