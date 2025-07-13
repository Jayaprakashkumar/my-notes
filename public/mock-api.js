// Mock API Service Worker
// This intercepts fetch requests to /api/* and provides mock responses

// Mock storage for the service worker
let mockStorage = [];

// Try to load from localStorage on service worker start
try {
  const savedStorage = localStorage.getItem('service-worker-storage');
  if (savedStorage) {
    mockStorage = JSON.parse(savedStorage);
    console.log(`Service Worker: Loaded ${mockStorage.length} notes from localStorage`);
  }
} catch (error) {
  console.log('Service Worker: Could not load from localStorage, starting with empty storage');
}

// Helper to save storage to localStorage
function saveStorage() {
  try {
    localStorage.setItem('service-worker-storage', JSON.stringify(mockStorage));
    console.log(`Service Worker: Saved ${mockStorage.length} notes to localStorage`);
  } catch (error) {
    console.log('Service Worker: Could not save to localStorage');
  }
}

// Helper to create API response
function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// Helper to simulate network delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simulate occasional errors
function shouldSimulateError() {
  return Math.random() < 0.05; // 5% error rate
}

// Handle API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Simulate network delay
  await delay(100 + Math.random() * 200);

  // Simulate occasional errors
  if (shouldSimulateError()) {
    return createResponse(
      { error: 'Simulated network error' },
      500
    );
  }

  try {
    switch (method) {
      case 'GET':
        if (path === '/api/notes') {
          console.log(`Service Worker: GET /api/notes - returning ${mockStorage.length} notes`);
          return createResponse(mockStorage);
        }
        break;

      case 'POST':
        if (path === '/api/notes') {
          const note = await request.json();
          note.id = Date.now() + Math.floor(Math.random() * 1000);
          note.createdAt = new Date().toISOString();
          note.updatedAt = new Date().toISOString();
          mockStorage.push(note);
          saveStorage();
          return createResponse(note, 201);
        }
        if (path === '/api/notes/sync') {
          const notes = await request.json();
          const serverNoteIds = new Set(mockStorage.map(note => note.id));
          const newNotes = notes.filter(note => !serverNoteIds.has(note.id));
          mockStorage = [...mockStorage, ...newNotes];
          saveStorage();
          return createResponse(mockStorage);
        }
        break;

      case 'PUT':
        if (path === '/api/notes/bulk') {
          const notes = await request.json();
          const updatedNotes = [];
          
          for (const note of notes) {
            const index = mockStorage.findIndex(n => n.id === note.id);
            if (index !== -1) {
              note.updatedAt = new Date().toISOString();
              mockStorage[index] = note;
              updatedNotes.push(note);
            }
          }
          saveStorage();
          return createResponse(updatedNotes);
        }
        
        // Handle individual note updates
        const noteId = path.match(/\/api\/notes\/(\d+(?:\.\d+)?)/)?.[1];
        if (noteId) {
          const updates = await request.json();
          const index = mockStorage.findIndex(n => n.id === parseFloat(noteId));
          if (index !== -1) {
            mockStorage[index] = { ...mockStorage[index], ...updates, updatedAt: new Date().toISOString() };
            saveStorage();
            return createResponse(mockStorage[index]);
          }
          return createResponse({ error: 'Note not found' }, 404);
        }
        break;

      case 'DELETE':
        if (path === '/api/notes') {
          // Clear all notes
          mockStorage = [];
          saveStorage();
          return createResponse({ message: 'All notes cleared' });
        }
        
        // Handle individual note deletion
        const deleteNoteId = path.match(/\/api\/notes\/(\d+(?:\.\d+)?)/)?.[1];
        if (deleteNoteId) {
          console.log(`Service Worker: DELETE /api/notes/${deleteNoteId} - current storage has ${mockStorage.length} notes`);
          const index = mockStorage.findIndex(n => n.id === parseFloat(deleteNoteId));
          if (index !== -1) {
            mockStorage.splice(index, 1);
            saveStorage();
            console.log(`Service Worker: Successfully deleted note ${deleteNoteId}, storage now has ${mockStorage.length} notes`);
            return createResponse({ message: 'Note deleted' });
          }
          console.log(`Service Worker: Note ${deleteNoteId} not found in storage`);
          return createResponse({ error: 'Note not found' }, 404);
        }
        break;

      case 'OPTIONS':
        // Handle CORS preflight requests
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
    }

    return createResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return createResponse({ error: error.message }, 500);
  }
}

// Service Worker Event Listeners
self.addEventListener('install', (event) => {
  console.log('Mock API Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Mock API Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
  }
}); 