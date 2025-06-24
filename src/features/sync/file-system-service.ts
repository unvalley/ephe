import type { FileMetadata, SyncedNote } from './types';

export class FileSystemService {

  isSupported(): boolean {
    return 'showDirectoryPicker' in window && 
           'FileSystemFileHandle' in window &&
           'FileSystemDirectoryHandle' in window;
  }

  async selectDirectory(): Promise<FileSystemDirectoryHandle> {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });
      return handle;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Directory selection cancelled');
      }
      throw error;
    }
  }

  async verifyPermission(handle: FileSystemDirectoryHandle, readWrite = true): Promise<boolean> {
    const options: FileSystemHandlePermissionDescriptor = {
      mode: readWrite ? 'readwrite' : 'read',
    };

    const permission = await handle.queryPermission(options);
    if (permission === 'granted') {
      return true;
    }

    const requestPermission = await handle.requestPermission(options);
    return requestPermission === 'granted';
  }

  async listMarkdownFiles(directoryHandle: FileSystemDirectoryHandle): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        files.push({
          filename: entry.name,
          lastModified: file.lastModified,
          size: file.size,
        });
      }
    }

    return files.sort((a, b) => b.lastModified - a.lastModified);
  }

  async readFile(directoryHandle: FileSystemDirectoryHandle, filename: string): Promise<SyncedNote> {
    try {
      const fileHandle = await directoryHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const content = await file.text();

      const id = this.extractIdFromFilename(filename);

      return {
        id,
        filename,
        content,
        lastModified: file.lastModified,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        throw new Error(`File not found: ${filename}`);
      }
      throw error;
    }
  }

  async writeFile(
    directoryHandle: FileSystemDirectoryHandle,
    filename: string,
    content: string
  ): Promise<void> {
    try {
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      throw new Error(`Failed to write file ${filename}: ${error}`);
    }
  }

  async deleteFile(directoryHandle: FileSystemDirectoryHandle, filename: string): Promise<void> {
    try {
      await directoryHandle.removeEntry(filename);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        return;
      }
      throw error;
    }
  }

  generateFilename(id: string, timestamp: string): string {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const sanitizedId = id.replace(/[^a-zA-Z0-9-_]/g, '');
    return `${dateStr}_${sanitizedId}.md`;
  }

  extractIdFromFilename(filename: string): string {
    const match = filename.match(/^\d{4}-\d{2}-\d{2}_(.+)\.md$/);
    return match ? match[1] : filename.replace('.md', '');
  }

  async readAllNotes(directoryHandle: FileSystemDirectoryHandle): Promise<SyncedNote[]> {
    const files = await this.listMarkdownFiles(directoryHandle);
    const notes: SyncedNote[] = [];

    for (const file of files) {
      try {
        const note = await this.readFile(directoryHandle, file.filename);
        notes.push(note);
      } catch (error) {
        console.error(`Failed to read file ${file.filename}:`, error);
      }
    }

    return notes;
  }
}