import type { ReactNode } from 'react';

interface TaskGroupProps {
  icon: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
}

export function TaskGroup({ icon, title, count, children }: TaskGroupProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--text-secondary)]">{icon}</span>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
          {title} ({count})
        </h2>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}
