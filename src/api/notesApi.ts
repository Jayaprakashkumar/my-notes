// Mock REST API for notes using real fetch calls
export interface ApiNote {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  zIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Simulate API errors occasionally
const shouldSimulateError = () => Math.random() < 0.05; // 5% error rate

// Mock storage for API data (simulates server-side storage)
let mockApiStorage: ApiNote[] = [];

// Helper function to simulate network delay
const simulateDelay = async (minMs: number = 100, maxMs: number = 300) => {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise(resolve => setTimeout(resolve, delay));
};

// Helper function to handle API responses
const handleApiResponse = async <T>(apiCall: () => Promise<T>): Promise<ApiResponse<T>> => {
  try {
    await simulateDelay();
    
    if (shouldSimulateError()) {
      throw new Error('Network error: Simulated API failure');
    }

    const data = await apiCall();
    return {
      success: true,
      data,
      message: 'Operation completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Operation failed'
    };
  }
};

export const notesApi = {
  // Get all notes
  async getAllNotes(): Promise<ApiResponse<ApiNote[]>> {
    return handleApiResponse(async () => {
      // Simulate a real API call that would show in Network tab
      const response = await fetch('/api/notes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // In a real app, this would return data from the server
      // For our mock, we return the in-memory data
      console.log(`API getAllNotes: returning ${mockApiStorage.length} notes from mock storage`);
      return mockApiStorage;
    });
  },

  // Create a new note
  async createNote(note: Omit<ApiNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ApiNote>> {
    return handleApiResponse(async () => {
      const newNote: ApiNote = {
        ...note,
        id: Date.now() + Math.floor(Math.random() * 1000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simulate a real API call
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNote),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Add to mock storage
      mockApiStorage.push(newNote);
      return newNote;
    });
  },

  // Update an existing note
  async updateNote(id: number, updates: Partial<ApiNote>): Promise<ApiResponse<ApiNote>> {
    return handleApiResponse(async () => {
      const noteIndex = mockApiStorage.findIndex(note => note.id === id);
      if (noteIndex === -1) {
        throw new Error('Note not found');
      }

      const updatedNote: ApiNote = {
        ...mockApiStorage[noteIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Simulate a real API call
      const response = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedNote),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update mock storage
      mockApiStorage[noteIndex] = updatedNote;
      return updatedNote;
    });
  },

  // Delete a note
  async deleteNote(id: number): Promise<ApiResponse<void>> {
    return handleApiResponse(async () => {
      console.log(`API deleteNote: attempting to delete note ${id}`);
      console.log(`API deleteNote: current mock storage has ${mockApiStorage.length} notes`);
      
      const noteIndex = mockApiStorage.findIndex(note => note.id === id);
      if (noteIndex === -1) {
        console.log(`API deleteNote: note ${id} not found in mock storage`);
        throw new Error('Note not found');
      }

      // Simulate a real API call
      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Remove from mock storage
      mockApiStorage.splice(noteIndex, 1);
      console.log(`API deleteNote: successfully deleted note ${id}, mock storage now has ${mockApiStorage.length} notes`);
    });
  },

  // Update multiple notes (for bulk operations)
  async updateMultipleNotes(notes: ApiNote[]): Promise<ApiResponse<ApiNote[]>> {
    return handleApiResponse(async () => {
      // Simulate a real API call
      const response = await fetch('/api/notes/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notes),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedNotes: ApiNote[] = [];
      
      for (const note of notes) {
        const noteIndex = mockApiStorage.findIndex(n => n.id === note.id);
        if (noteIndex !== -1) {
          const updatedNote: ApiNote = {
            ...note,
            updatedAt: new Date().toISOString()
          };
          mockApiStorage[noteIndex] = updatedNote;
          updatedNotes.push(updatedNote);
        }
      }

      return updatedNotes;
    });
  },

  // Clear all notes
  async clearAllNotes(): Promise<ApiResponse<void>> {
    return handleApiResponse(async () => {
      // Simulate a real API call
      const response = await fetch('/api/notes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Clear mock storage
      mockApiStorage = [];
    });
  },

  // Sync notes with server (upload local notes)
  async syncNotes(notes: ApiNote[]): Promise<ApiResponse<ApiNote[]>> {
    return handleApiResponse(async () => {
      // Simulate a real API call
      const response = await fetch('/api/notes/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notes),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Merge local notes with server notes
      const serverNoteIds = new Set(mockApiStorage.map(note => note.id));
      const newNotes = notes.filter(note => !serverNoteIds.has(note.id));
      
      mockApiStorage = [...mockApiStorage, ...newNotes];
      return mockApiStorage;
    });
  }
}; 