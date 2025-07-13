// Note management types
export interface Note {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  zIndex?: number;
}

export interface DraggedNote {
  id: number;
  offsetX: number;
  offsetY: number;
}

export interface ResizeStart {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NoteRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Event handler types
export type MouseEventHandler = (e: React.MouseEvent<HTMLDivElement>) => void;
export type NoteMouseDownHandler = (e: React.MouseEvent<HTMLDivElement>, noteId: number) => void;
export type ContentChangeHandler = (noteId: number, content: string) => void; 