import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useTaskStore } from '../store/taskStore';
import { CommandIcon, Plus, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button } from '@thatsit/ui';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

export function CommandButton() {
  const { setCommandPaletteOpen, setFocusedTaskId, currentView, setCurrentView } = useAppStore();
  const { addTask, refreshTasks } = useTaskStore();
  const [showActions, setShowActions] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  const handleMainButtonClick = () => {
    if (showActions) {
      setCommandPaletteOpen(true);
      setShowActions(false);
    } else {
      setShowActions(true);
    }
  };

  const handleCollapse = () => {
    setShowActions(false);
  };

  const handleNewTask = async () => {
    await addTask('New task');
    await refreshTasks();
    // Get the newly created task (it will be the most recent one in dueToday since it has no due date parsed)
    const { dueToday } = useTaskStore.getState();
    const newTask = dueToday.find(t => t.title === 'New task' && !t.completed);
    if (newTask) {
      setFocusedTaskId(newTask.id);
    }
    setShowActions(false);
  };

  // Calculate position with safe areas
  const bottomOffset = keyboardHeight > 0
    ? `calc(${keyboardHeight}px + 1rem)`
    : 'calc(var(--safe-area-inset-bottom, 0px) + 1rem)';
  const rightOffset = 'calc(var(--safe-area-inset-right, 0px) + 1rem)';

  return (
    <div
      className="fixed z-50 flex flex-col items-center gap-2 transition-[bottom] duration-200"
      style={{ bottom: bottomOffset, right: rightOffset }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Quick action buttons */}
      <div
        className={`flex flex-col gap-2 transition-all duration-200 ${
          showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <Button
          variant="ghost"
          onClick={handleCollapse}
          className="w-12 h-12 items-center justify-center bg-[var(--bg)] rounded-full"
          title="Collapse"
        >
          <ChevronDown size={20} />
        </Button>
        <Button
          variant="ghost"
          onClick={handleNewTask}
          className="w-12 h-12 items-center justify-center bg-[var(--bg)] rounded-full"
          title="New task"
        >
          <Plus size={20} />
        </Button>
      </div>

      {/* Main command button / back button */}
      {currentView === 'archive' ? (
        <Button
          variant="ghost"
          onClick={() => setCurrentView('tasks')}
          className="lg:hidden md:visible w-12 h-12 items-center justify-center bg-[var(--bg)] rounded-full"
          aria-label="Back to tasks"
        >
          <ArrowLeft size={28} />
        </Button>
      ) : (
        <Button
          variant="ghost"
          onClick={handleMainButtonClick}
          className="lg:hidden md:visible w-12 h-12 items-center justify-center bg-[var(--bg)] rounded-full"
          aria-label="Open command palette"
        >
          <CommandIcon size={28} />
        </Button>
      )}
    </div>
  );
}
