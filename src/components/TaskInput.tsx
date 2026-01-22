import { useState, useRef, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';

interface TaskInputProps {
  onAdd: (input: string) => Promise<void>;
}

export function TaskInput({ onAdd }: TaskInputProps) {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    try {
      await onAdd(trimmed);
      setValue('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 p-3 bg-[var(--bg)] border border-[var(--border-color)] rounded-lg focus-within:border-[var(--primary)] transition-colors">
        <Plus className="w-5 h-5 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New task... (try: Buy milk #groceries due:tomorrow)"
          disabled={isLoading}
          className="flex-1 bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Pro tip: Use #tags and due:date (e.g., due:tomorrow, due:4/15)
      </p>
    </div>
  );
}
