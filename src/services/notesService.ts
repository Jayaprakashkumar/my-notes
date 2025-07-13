import { notesApi, ApiNote, ApiResponse } from '../api/notesApi';
import { Note } from '../types';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  isSyncing: boolean;
}

export class NotesService {
  private syncStatus: SyncStatus = {
    isOnline: true,
    lastSync: null,
    pendingChanges: 0,
    isSyncing: false
  };

  private pendingChanges: Set<number> = new Set();
  private debounceTimers: Map<number, NodeJS.Timeout> = new Map();
  private pendingUpdates: Map<number, Note> = new Map();
  private batchUpdateTimer: NodeJS.Timeout | null = null;
  private pendingBatchUpdates: Note[] = [];

  // Convert Note to ApiNote
  private noteToApiNote(note: Note): ApiNote {
    return {
      id: note.id,
      x: note.x,
      y: note.y,
      width: note.width,
      height: note.height,
      content: note.content,
      color: note.color,
      zIndex: note.zIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Convert ApiNote to Note
  private apiNoteToNote(apiNote: ApiNote): Note {
    return {
      id: apiNote.id,
      x: apiNote.x,
      y: apiNote.y,
      width: apiNote.width,
      height: apiNote.height,
      content: apiNote.content,
      color: apiNote.color,
      zIndex: apiNote.zIndex
    };
  }

  // Debounced update function
  private debouncedUpdate(note: Note, delay: number = 500): void {
    // Clear existing timer for this note
    const existingTimer = this.debounceTimers.get(note.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store the latest update
    this.pendingUpdates.set(note.id, note);

    // Set new timer
    const timer = setTimeout(async () => {
      const latestNote = this.pendingUpdates.get(note.id);
      if (latestNote) {
        this.pendingUpdates.delete(note.id);
        this.debounceTimers.delete(note.id);
        await this.performUpdate(latestNote);
      }
    }, delay);

    this.debounceTimers.set(note.id, timer);
  }

  // Perform the actual update
  private async performUpdate(note: Note): Promise<void> {
    try {
      if (this.syncStatus.isOnline) {
        const apiNote = this.noteToApiNote(note);
        await notesApi.updateNote(note.id, apiNote);
        this.syncStatus.lastSync = new Date();
      }
    } catch (error) {
      console.warn('API unavailable, updating note locally:', error);
      this.syncStatus.isOnline = false;
      this.syncStatus.pendingChanges++;
      this.pendingChanges.add(note.id);
    }

    // Always update local storage
    this.updateInLocalStorage(note);
  }

  // Batch update function for multiple notes
  private batchUpdate(notes: Note[], delay: number = 300): void {
    // Clear existing batch timer
    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
    }

    // Add notes to pending batch
    this.pendingBatchUpdates = [...this.pendingBatchUpdates, ...notes];

    // Set new timer
    this.batchUpdateTimer = setTimeout(async () => {
      const notesToUpdate = [...this.pendingBatchUpdates];
      this.pendingBatchUpdates = [];
      
      if (notesToUpdate.length > 0) {
        await this.performBatchUpdate(notesToUpdate);
      }
    }, delay);
  }

  // Perform batch update
  private async performBatchUpdate(notes: Note[]): Promise<void> {
    try {
      if (this.syncStatus.isOnline) {
        const apiNotes = notes.map(note => this.noteToApiNote(note));
        await notesApi.updateMultipleNotes(apiNotes);
        this.syncStatus.lastSync = new Date();
        this.syncStatus.pendingChanges = 0;
        this.pendingChanges.clear();
      }
    } catch (error) {
      console.warn('API unavailable, updating notes locally:', error);
      this.syncStatus.isOnline = false;
      this.syncStatus.pendingChanges += notes.length;
      notes.forEach(note => this.pendingChanges.add(note.id));
    }

    // Always update local storage
    notes.forEach(note => this.updateInLocalStorage(note));
  }

  // Load notes from API with local storage fallback
  async loadNotes(): Promise<Note[]> {
    // First, try to load from local storage as backup
    const localNotes = this.loadFromLocalStorage();
    console.log(`Loaded ${localNotes.length} notes from local storage`);
    
    try {
      this.syncStatus.isOnline = true;
      const response = await notesApi.getAllNotes();
      console.log(`API response:`, response);
      
      if (response.success && response.data) {
        const apiNotes = response.data.map(apiNote => this.apiNoteToNote(apiNote));
        console.log(`Loaded ${apiNotes.length} notes from API`);
        
        // Merge API notes with local notes
        // API notes take precedence, and we respect API deletions
        const apiNoteIds = new Set(apiNotes.map(note => note.id));
        
        // Only keep local notes that don't exist in API (new notes created offline)
        // If a note exists in local but not in API, it means it was deleted on the server
        const localOnlyNotes = localNotes.filter(note => !apiNoteIds.has(note.id));
        console.log(`Keeping ${localOnlyNotes.length} local-only notes`);
        
        const mergedNotes = [...apiNotes, ...localOnlyNotes];
        console.log(`Final merged notes: ${mergedNotes.length} total`);
        
        // Save merged notes to local storage (this removes deleted notes from local storage)
        this.saveToLocalStorage(mergedNotes);
        this.syncStatus.lastSync = new Date();
        return mergedNotes;
      } else {
        throw new Error(response.error || 'Failed to load notes from API');
      }
    } catch (error) {
      console.warn('API unavailable, loading from local storage:', error);
      this.syncStatus.isOnline = false;
      return localNotes;
    }
  }

  // Save notes to API with local storage backup (debounced)
  async saveNotes(notes: Note[]): Promise<void> {
    // Always save to local storage first
    this.saveToLocalStorage(notes);

    // Use batch update for multiple notes
    this.batchUpdate(notes);
  }

  // Create a new note
  async createNote(note: Omit<Note, 'id'>): Promise<Note> {
    try {
      if (this.syncStatus.isOnline) {
        const apiNote = this.noteToApiNote({ ...note, id: Date.now() });
        const response = await notesApi.createNote(apiNote);
        
        if (response.success && response.data) {
          const newNote = this.apiNoteToNote(response.data);
          this.addToLocalStorage(newNote);
          return newNote;
        }
      }
    } catch (error) {
      console.warn('API unavailable, creating note locally:', error);
      this.syncStatus.isOnline = false;
    }

    // Fallback to local creation
    const newNote: Note = {
      ...note,
      id: Date.now() + Math.floor(Math.random() * 1000)
    };
    this.addToLocalStorage(newNote);
    return newNote;
  }

  // Update a note (debounced)
  async updateNote(note: Note): Promise<void> {
    // Use debounced update instead of immediate API call
    this.debouncedUpdate(note);
  }

  // Delete a note
  async deleteNote(noteId: number): Promise<void> {
    console.log(`Deleting note ${noteId} from API and local storage`);
    
    // Clear any pending updates for this note
    const existingTimer = this.debounceTimers.get(noteId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.debounceTimers.delete(noteId);
    }
    this.pendingUpdates.delete(noteId);

    try {
      if (this.syncStatus.isOnline) {
        const response = await notesApi.deleteNote(noteId);
        console.log(`API deletion response:`, response);
        this.syncStatus.lastSync = new Date();
      }
    } catch (error) {
      console.warn('API unavailable, deleting note locally:', error);
      this.syncStatus.isOnline = false;
      this.syncStatus.pendingChanges++;
      this.pendingChanges.add(noteId);
    }

    // Always update local storage
    this.removeFromLocalStorage(noteId);
    console.log(`Note ${noteId} deleted from local storage`);
  }

  // Clear all notes
  async clearAllNotes(): Promise<void> {
    // Clear all pending updates
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.pendingUpdates.clear();
    this.pendingBatchUpdates = [];

    try {
      if (this.syncStatus.isOnline) {
        await notesApi.clearAllNotes();
        this.syncStatus.lastSync = new Date();
        this.syncStatus.pendingChanges = 0;
        this.pendingChanges.clear();
      }
    } catch (error) {
      console.warn('API unavailable, clearing notes locally:', error);
      this.syncStatus.isOnline = false;
    }

    // Always clear local storage
    localStorage.removeItem('tempo-notes');
    console.log('Cleared all notes from local storage');
  }

  // Clear only local storage
  clearLocalStorage(): void {
    localStorage.removeItem('tempo-notes');
    console.log('Cleared local storage');
  }

  // Sync pending changes when back online
  async syncPendingChanges(notes: Note[]): Promise<void> {
    if (this.syncStatus.isSyncing || this.pendingChanges.size === 0) {
      return;
    }

    this.syncStatus.isSyncing = true;

    try {
      const pendingNotes = notes.filter(note => this.pendingChanges.has(note.id));
      const apiNotes = pendingNotes.map(note => this.noteToApiNote(note));
      
      await notesApi.updateMultipleNotes(apiNotes);
      
      this.syncStatus.lastSync = new Date();
      this.syncStatus.pendingChanges = 0;
      this.pendingChanges.clear();
      this.syncStatus.isOnline = true;
    } catch (error) {
      console.warn('Failed to sync pending changes:', error);
      this.syncStatus.isOnline = false;
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Get pending updates count
  getPendingUpdatesCount(): number {
    return this.pendingUpdates.size + this.pendingBatchUpdates.length;
  }

  // Local storage methods
  private saveToLocalStorage(notes: Note[]): void {
    try {
      localStorage.setItem('tempo-notes', JSON.stringify(notes));
      console.log(`Saved ${notes.length} notes to local storage`);
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }

  private loadFromLocalStorage(): Note[] {
    try {
      const savedNotes = localStorage.getItem('tempo-notes');
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        console.log(`Loaded ${notes.length} notes from local storage`);
        return notes;
      }
    } catch (error) {
      console.error('Failed to load from local storage:', error);
    }
    return [];
  }

  private addToLocalStorage(note: Note): void {
    const notes = this.loadFromLocalStorage();
    notes.push(note);
    this.saveToLocalStorage(notes);
  }

  private updateInLocalStorage(note: Note): void {
    const notes = this.loadFromLocalStorage();
    const index = notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      notes[index] = note;
      this.saveToLocalStorage(notes);
    } else {
      // If note doesn't exist, add it
      notes.push(note);
      this.saveToLocalStorage(notes);
    }
  }

  private removeFromLocalStorage(noteId: number): void {
    const notes = this.loadFromLocalStorage();
    const filteredNotes = notes.filter(note => note.id !== noteId);
    this.saveToLocalStorage(filteredNotes);
  }

  // Get local storage info
  getLocalStorageInfo(): { count: number; size: string } {
    try {
      const savedNotes = localStorage.getItem('tempo-notes');
      if (savedNotes) {
        const size = new Blob([savedNotes]).size;
        const notes = JSON.parse(savedNotes);
        return {
          count: notes.length,
          size: `${(size / 1024).toFixed(2)} KB`
        };
      }
    } catch (error) {
      console.error('Failed to get local storage info:', error);
    }
    return { count: 0, size: '0 KB' };
  }
}

// Export singleton instance
export const notesService = new NotesService(); 