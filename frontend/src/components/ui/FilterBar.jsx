import React from 'react'
import { Search } from 'lucide-react'

export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  categories = [],
  activeCategory,
  onCategoryChange,
  extraFilters
}) {
  return (
    <div className="events-toolbar mb-6">
      {onSearchChange && (
        <div className="search-bar" style={{ flex: 1, maxWidth: '420px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      )}
      {categories.length > 0 && (
        <div className="tabs">
          {categories.map(c => (
            <button
              key={c}
              className={`tab ${activeCategory === c ? 'active' : ''}`}
              onClick={() => onCategoryChange && onCategoryChange(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {extraFilters && <div className="flex gap-2 items-center">{extraFilters}</div>}
    </div>
  )
}
