import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <main
      className="p-4 min-h-screen flex flex-row justify-center"
      style={{
        paddingTop: 'max(1rem, var(--safe-area-inset-top, 0px))',
        paddingRight: 'max(1rem, var(--safe-area-inset-right, 0px))',
        paddingBottom: 'max(1rem, var(--safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, var(--safe-area-inset-left, 0px))',
      }}
    >
      <div className="w-full max-w-2xl">
        {children}
      </div>
    </main>
  );
}
