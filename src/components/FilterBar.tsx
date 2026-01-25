import { useState } from 'react';
import { X, Filter } from 'lucide-react';
import { Input, Button } from '@thatsit/ui';
import { useTaskStore } from '../store/taskStore';

export function FilterBar() {
  const filterText = useTaskStore((state) => state.filterText);
  const savedFilters = useTaskStore((state) => state.savedFilters);
  const setFilterText = useTaskStore((state) => state.setFilterText);
  const saveCurrentFilter = useTaskStore((state) => state.saveCurrentFilter);
  const removeFilter = useTaskStore((state) => state.removeFilter);
  const clearFilters = useTaskStore((state) => state.clearFilters);

  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filterText.trim()) {
      saveCurrentFilter();
    }
  };

  const hasFilters = savedFilters.length > 0;

  // Show filter UI if open or if there are active filters
  const showFilterUI = isOpen;

  return (
    <div className="mb-4 flex flex-row justify-end">
      <div className='flex flex-col w-full'>
      {!showFilterUI ? (
        <div className='flex flex-row justify-end'>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="flex text-[var(--text-muted)]"
        >
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
        </Button>
        </div>
      ) : (
        <div className='flex flex-row'>
          <Input
            variant="ghost"
            type="text"
            placeholder="Filter by tags or text..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
          </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2 justify-between">
            <div>
            {savedFilters.map((filter) => (
              <Button
                key={filter}
                variant="ghost"
                className="flex flex-row gap-2 align-items-center color-primary"
                onClick={() => removeFilter(filter)}
              >
                <span>{filter}</span>
                <X className="w-4 h-4" />
              </Button>
            ))}
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
          </div>
    </div>
  );
}
