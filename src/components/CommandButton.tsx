import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useTaskStore } from '../store/taskStore';
import { CommandIcon, Plus, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button } from '@thatsit/ui';
import { useVisualViewport } from '../hooks/useKeyboardHeight';

export function CommandButton() {
  const { setCommandPaletteOpen, setFocusedTaskId, currentView, setCurrentView } = useAppStore();
  const { addTask, refreshTasks } = useTaskStore();
  const [showActions, setShowActions] = useState(false);
  const viewport = useVisualViewport();

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

  // Calculate position relative to visual viewport
  const rightOffset = 'calc(var(--safe-area-inset-right, 0px) + 1rem)';

  const positionStyle = viewport.isKeyboardOpen
    ? {
        bottom: window.innerHeight - (viewport.top + viewport.height),
        right: rightOffset,
      }
    : {
        bottom: 'calc(var(--safe-area-inset-bottom, 0px) + 1rem)',
        right: rightOffset,
      };

  return (
    <div
      className="fixed z-50"
      style={positionStyle}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`flex flex-col items-center rounded-md overflow-hidden transition-shadow transition-bg duration-200 ${
          showActions ? 'shadow-lg' : ''
        }`}
        style={{ backgroundColor: 'var(--bg)' }}
      >
        {/* Quick action buttons */}
        <div
          className={`grid transition-[grid-template-rows] duration-200 ${
            showActions ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden flex flex-col">
            <Button
              variant="ghost"
              onClick={handleCollapse}
              className="w-12 h-12 items-center justify-center"
              title="Collapse"
            >
              <ChevronDown size={20} />
            </Button>
            <Button
              variant="ghost"
              onClick={handleNewTask}
              className="w-12 h-12 items-center justify-center"
              title="New task"
            >
              <Plus size={20} />
            </Button>
          </div>
        </div>

        {/* Main command button / back button */}
        {currentView === 'archive' ? (
          <Button
            variant="ghost"
            onClick={() => setCurrentView('tasks')}
            className="lg:hidden md:visible w-12 h-12 items-center justify-center"
            style={{ padding: '0.675rem 0.5rem' }}
            aria-label="Back to tasks"
          >
            <ArrowLeft size={18} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={handleMainButtonClick}
            className="lg:hidden md:visible w-12 h-12 items-center justify-center"
            style={{ padding: '0.675rem 0.5rem' }}
            aria-label="Open command palette"
          >
            <CommandIcon size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
