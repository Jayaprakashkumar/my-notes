import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { Note, DraggedNote, ResizeStart } from './types';
import SystemCheck from './components/SystemCheck';
import { notesService } from './services/notesService';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [nextId, setNextId] = useState<number>(1);
  const [draggedNote, setDraggedNote] = useState<DraggedNote | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeStart, setResizeStart] = useState<ResizeStart>({ x: 0, y: 0, width: 0, height: 0 });
  const [frontNoteId, setFrontNoteId] = useState<number | null>(null);
  const [newNoteIds, setNewNoteIds] = useState<Set<number>>(new Set());
  const [localStorageInfo, setLocalStorageInfo] = useState<{ count: number; size: string }>({ count: 0, size: '0 KB' });
  const workspaceRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);

  // Load notes from API/localStorage on component mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const loadedNotes = await notesService.loadNotes();
        setNotes(loadedNotes);
        
        // Set the next ID to be higher than the highest existing note ID
        if (loadedNotes.length > 0) {
          const maxId = Math.max(...loadedNotes.map(note => note.id));
          setNextId(maxId + 1);
        }
        
      } catch (error) {
        console.error('Error loading notes:', error);
        setNotes([]);
        setNextId(1);
      }
    };

    loadNotes();
  }, []);

  // Create a new note at specified position
  const createNote = async (x: number, y: number, width: number = 200, height: number = 150): Promise<void> => {
    // Find the highest z-index currently in use
    const maxZIndex = notes.length > 0 ? Math.max(...notes.map(note => note.zIndex || 1)) : 0;
    
    const newNoteData = {
      x,
      y,
      width,
      height,
      content: 'New Note',
      color: getRandomColor(),
      zIndex: maxZIndex + 1
    };

    try {
      const newNote = await notesService.createNote(newNoteData);
      setNotes(prev => [...prev, newNote]);
      setNewNoteIds(prev => new Set(Array.from(prev).concat(newNote.id)));
      setNextId(prev => Math.max(prev, newNote.id + 1));
      
      // Remove the new note animation after it completes
      setTimeout(() => {
        setNewNoteIds(prev => {
          const updated = new Set(Array.from(prev));
          updated.delete(newNote.id);
          return updated;
        });
      }, 300);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  // Generate random color for notes
  const getRandomColor = (): string => {
    const colors: string[] = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Handle workspace click to create notes
  const handleWorkspaceClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      createNote(x, y);
    }
  };

  // Handle note dragging
  const handleNoteMouseDown = (e: React.MouseEvent<HTMLDivElement>, noteId: number): void => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    // Bring note to front
    bringNoteToFront(noteId);

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDraggedNote({ id: noteId, offsetX, offsetY });
    setIsDragging(true);
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: MouseEvent): void => {
    if (!isDragging || !draggedNote || !workspaceRef.current) return;

    const workspaceRect = workspaceRef.current.getBoundingClientRect();
    const newX = e.clientX - workspaceRect.left - draggedNote.offsetX;
    const newY = e.clientY - workspaceRect.top - draggedNote.offsetY;

    setNotes(prev => {
      const updatedNotes = prev.map(note => 
        note.id === draggedNote.id 
          ? { ...note, x: Math.max(0, newX), y: Math.max(0, newY) }
          : note
      );
      
      // Save to API/localStorage asynchronously
      saveNotesToStorage(updatedNotes);
      return updatedNotes;
    });
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = async (e: MouseEvent): Promise<void> => {
    if (isDragging && draggedNote) {
      // Check if mouse is over trash zone
      if (trashRef.current) {
        const trashRect = trashRef.current.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Check if mouse is over trash zone
        if (mouseX >= trashRect.left && 
            mouseX <= trashRect.right && 
            mouseY >= trashRect.top && 
            mouseY <= trashRect.bottom) {
          // Remove note if mouse is over trash
          setNotes(prev => prev.filter(n => n.id !== draggedNote.id));
          
          // Delete from API/localStorage and wait for completion
          try {
            await notesService.deleteNote(draggedNote.id);
          } catch (error) {
            console.error('Error deleting note:', error);
          }
        }
      }
    }
    
    // Remove drag-over class from trash zone
    if (trashRef.current) {
      trashRef.current.classList.remove('drag-over');
    }
    
    setIsDragging(false);
    setDraggedNote(null);
    setIsResizing(false);
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>, noteId: number): void => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: note.width,
      height: note.height
    });
    setIsResizing(true);
    setDraggedNote({ id: noteId, offsetX: 0, offsetY: 0 });
  };

  // Handle resize during mouse move
  const handleResizeMove = (e: MouseEvent): void => {
    if (!isResizing || !draggedNote) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    const newWidth = Math.max(100, resizeStart.width + deltaX);
    const newHeight = Math.max(100, resizeStart.height + deltaY);

    setNotes(prev => {
      const updatedNotes = prev.map(note => 
        note.id === draggedNote.id 
          ? { ...note, width: newWidth, height: newHeight }
          : note
      );
      
      // Save to API/localStorage asynchronously
      saveNotesToStorage(updatedNotes);
      return updatedNotes;
    });
  };

  // Update mouse move handler to handle both dragging and resizing
  const handleMouseMoveUpdated = (e: MouseEvent): void => {
    if (isResizing) {
      handleResizeMove(e);
    } else if (isDragging) {
      handleMouseMove(e);
      
      // Check if mouse is over trash zone for visual feedback
      if (trashRef.current) {
        const trashRect = trashRef.current.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const isOverTrash = mouseX >= trashRect.left && 
                           mouseX <= trashRect.right && 
                           mouseY >= trashRect.top && 
                           mouseY <= trashRect.bottom;

        // Add/remove drag-over class for visual feedback
        if (isOverTrash) {
          trashRef.current.classList.add('drag-over');
        } else {
          trashRef.current.classList.remove('drag-over');
        }
      }
    } else {
      // Remove drag-over class when not dragging
      if (trashRef.current) {
        trashRef.current.classList.remove('drag-over');
      }
    }
  };

  // Handle note content change
  const handleNoteContentChange = async (noteId: number, content: string): Promise<void> => {
    const updatedNote = notes.find(note => note.id === noteId);
    if (!updatedNote) return;

    const noteWithNewContent = { ...updatedNote, content };
    
    setNotes(prev => prev.map(note => 
      note.id === noteId ? noteWithNewContent : note
    ));

    try {
      await notesService.updateNote(noteWithNewContent);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  // Save notes to API/localStorage
  const saveNotesToStorage = async (notesToSave: Note[]): Promise<void> => {
    try {
      await notesService.saveNotes(notesToSave);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  // Clear all notes
  const clearAllNotes = async (): Promise<void> => {
    if (window.confirm('Are you sure you want to delete all notes? This action cannot be undone.')) {
      setNotes([]);
      setNextId(1);
      
      try {
        await notesService.clearAllNotes();
      } catch (error) {
        console.error('Error clearing notes:', error);
      }
    }
  };

  // Bring note to front (highest z-index)
  const bringNoteToFront = (noteId: number): void => {
    setNotes(prev => {
      const noteToMove = prev.find(note => note.id === noteId);
      if (!noteToMove) return prev;

      // Find the highest z-index currently in use
      const maxZIndex = Math.max(...prev.map(note => note.zIndex || 1));
      
      // Move the clicked note to the front
      const updatedNotes = prev.map(note => 
        note.id === noteId 
          ? { ...note, zIndex: maxZIndex + 1 }
          : note
      );
      
      // Save to localStorage
      saveNotesToStorage(updatedNotes);
      return updatedNotes;
    });

    // Set animation state
    setFrontNoteId(noteId);
    setTimeout(() => setFrontNoteId(null), 300);
  };

  // Handle note click to bring to front
  const handleNoteClick = (e: React.MouseEvent<HTMLDivElement>, noteId: number): void => {
    // Only bring to front if clicking on the note itself, not on controls
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.note-content')) {
      bringNoteToFront(noteId);
    }
  };

  // Handle note deletion
  const handleNoteDelete = async (noteId: number): Promise<void> => {
    const note = notes.find(n => n.id === noteId);
    if (note && window.confirm(`Are you sure you want to delete this note?`)) {
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      try {
        await notesService.deleteNote(noteId);
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  // Add event listeners with desktop optimizations
  useEffect(() => {
    // Throttle mouse move events for better performance on desktop
    let animationFrameId: number;
    
    const throttledMouseMove = (e: MouseEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(() => {
        handleMouseMoveUpdated(e);
      });
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Delete key, not Backspace (which is used for typing)
      if (e.key === 'Delete') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.closest('.note')) {
          // Don't trigger delete if user is typing in a textarea
          if (activeElement.tagName === 'TEXTAREA') {
            return;
          }
          const noteElement = activeElement.closest('.note') as HTMLElement;
          const noteId = parseInt(noteElement.dataset.noteId || '0');
          if (noteId > 0) {
            e.preventDefault();
            handleNoteDelete(noteId);
          }
        }
      }
    };

    document.addEventListener('mousemove', throttledMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isDragging, isResizing, draggedNote, resizeStart]);

  // Update pending updates count and local storage info periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalStorageInfo(notesService.getLocalStorageInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <SystemCheck />
      <div className="header">
        <div className="header-left">
        <h1>Tempo Notes</h1>
        <p>Click anywhere to create a note. Notes are automatically saved.</p>
       {localStorageInfo?.count > 0 && (
        <p>
        <span className="local-storage-info" title="Local storage information">
               {localStorageInfo.count} notes ({localStorageInfo.size})
            </span>
        </p>
       )}
       </div>
          <button 
            className="clear-all-button"
            onClick={clearAllNotes}
            title="Clear all notes"
          >
            Clear All Notes
          </button>
      </div>
      
      <div 
        className="workspace" 
        ref={workspaceRef}
        onClick={handleWorkspaceClick}
      >
        {notes.map(note => (
          <div
            key={note.id}
            className={`note ${frontNoteId === note.id ? 'bring-to-front' : ''} ${newNoteIds.has(note.id) ? 'new-note' : ''}`}
            data-note-id={note.id}
            style={{
              left: note.x,
              top: note.y,
              width: note.width,
              height: note.height,
              backgroundColor: note.color,
              zIndex: note.zIndex || 1
            }}
            onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
            onClick={(e) => handleNoteClick(e, note.id)}
          >
            <textarea
              value={note.content}
              onChange={(e) => handleNoteContentChange(note.id, e.target.value)}
              placeholder="Type your note here..."
              className="note-content"
            />
            <div className="note-controls">
              <button 
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNoteDelete(note.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Delete note (or press Delete key when note is focused)"
                aria-label="Delete note"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
            <div 
              className="resize-handle"
              onMouseDown={(e) => handleResizeStart(e, note.id)}
            />
          </div>
        ))}
      </div>

      <div className="trash-zone" ref={trashRef}>
        <div className="trash-icon">🗑️</div>
        <span>Drop here to delete</span>
      </div>
    </div>
  );
};

export default App; 