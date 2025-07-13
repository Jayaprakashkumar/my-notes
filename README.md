# Tempo Notes

A beautiful, interactive single-page React application for creating and managing notes with drag-and-drop functionality.

## Features

### Core Functionality
- **Create Notes**: Click anywhere on the workspace to create a new note at that position
- **Move Notes**: Drag notes to any position on the workspace
- **Resize Notes**: Drag the resize handle (bottom-right corner) to change note size
- **Delete Notes**: Drag a note over the trash zone to delete it
- **Edit Content**: Click on any note to edit its content

### Design Features
- **Modern UI**: Beautiful gradient background with glassmorphism effects
- **Random Colors**: Each note gets a unique, vibrant color
- **Smooth Animations**: Hover effects and smooth transitions
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Accessibility**: Proper focus states and keyboard navigation

### Technical Features
- **TypeScript**: Full type safety with comprehensive interfaces and type definitions
- **React Hooks**: Uses modern React patterns with useState, useRef, and useEffect
- **Event Handling**: Sophisticated mouse event handling for drag, resize, and click operations
- **Cross-browser Compatible**: Works on all modern browsers

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## How to Use

### Creating Notes
- Simply click anywhere on the workspace (the main area) to create a new note
- Each note will appear with a random color and default text

### Moving Notes
- Click and drag any part of a note (except the resize handle) to move it around
- Notes will snap to the workspace boundaries

### Resizing Notes
- Look for the small handle in the bottom-right corner of each note
- Click and drag this handle to resize the note
- Minimum size is 100x100 pixels

### Editing Content
- Click on the text area of any note to edit its content
- The text area automatically resizes with the note

### Deleting Notes
- Drag any note over the trash zone (bottom-right corner of the screen)
- The trash zone will highlight when you're dragging over it
- Release the note over the trash to delete it

### Save Notes
- All the notes are autosaved in the local storage and asynchronsouly saved to mock api
- Data are presistant until it removed manually. Added "clear All notes" button in the app.


## File Structure

```
src/
├── App.tsx         # Main application component (TypeScript)
├── App.css         # Application styles
├── index.tsx       # React entry point (TypeScript)
├── index.css       # Global styles
├── types.ts        # TypeScript type definitions
└── react-app-env.d.ts # React app environment types

public/
└── index.html      # HTML template

tsconfig.json       # TypeScript configuration
package.json        # Dependencies and scripts
README.md          # This file
```

## System Requirements

### Desktop Requirements
- **Minimum Screen Resolution**: 1024x768
- **Recommended Screen Resolution**: 1920x1080 or higher

### Browser Support
- **Chrome**: Version 80 or higher (recommended)
- **Firefox**: Version 75 or higher
- **Safari**: Version 13 or higher
- **Edge**: Version 79 or higher
- **Internet Explorer**: Version 11 (limited support)
