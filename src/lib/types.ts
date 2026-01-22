export type SyncStatus = 'synced' | 'pending' | 'conflict';

/**
 * Base interface for syncable entities.
 * All Dexie tables that participate in sync should extend this.
 */
export interface Syncable {
  id: string;
  _syncStatus: SyncStatus;
  _localUpdatedAt: Date;
  deletedAt?: Date;
}

export interface Task extends Syncable {
  id: string;
  title: string;                 // Raw input: "Buy milk #groceries due:tomorrow"
  displayTitle: string;          // Display text: "Buy milk #groceries"
  tags: string[];                // Extracted tags: ["groceries"]
  dueDate?: Date;                // Parsed from due:xxx
  completed: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // Sync tracking
  deletedAt?: Date;
  _syncStatus: SyncStatus;
  _localUpdatedAt: Date;

  // Cross-app reference
  noteId?: string;               // If task came from notes app
  appType: 'tasks' | 'notes';    // Which app created it
}

export interface SyncMeta {
  key: string;
  value: string;
}
