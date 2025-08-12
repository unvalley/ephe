import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import {
  type StorageProvider,
  createBrowserLocalStorage,
  createStorage,
  defaultStorageProvider,
} from "../../utils/storage";

export type StoredImage = {
  id: string;
  dataUrl: string;
  name: string;
  size: number;
  type: string;
  timestamp: string;
};

export type ImageStorage = {
  getAll: () => StoredImage[];
  getById: (id: string) => StoredImage | null;
  save: (file: File) => Promise<StoredImage>;
  deleteById: (id: string) => void;
  deleteAll: () => void;
  getTotalStorageSize: () => number;
  getImageUrl: (id: string) => string | null;
};

const MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB limit

// Image Storage factory function
const createImageStorage = (storage: StorageProvider = createBrowserLocalStorage()): ImageStorage => {
  // Use a map structure internally for O(1) lookups
  const getImageMap = (): Record<string, StoredImage> => {
    try {
      const data = storage.getItem(LOCAL_STORAGE_KEYS.IMAGES);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading images:', error);
      return {};
    }
  };

  const saveImageMap = (imageMap: Record<string, StoredImage>): void => {
    try {
      storage.setItem(LOCAL_STORAGE_KEYS.IMAGES, JSON.stringify(imageMap));
    } catch (error) {
      console.error('Error saving images:', error);
    }
  };

  const getAll = (): StoredImage[] => {
    const imageMap = getImageMap();
    return Object.values(imageMap);
  };

  const getById = (id: string): StoredImage | null => {
    const imageMap = getImageMap();
    return imageMap[id] || null;
  };

  const save = async (file: File): Promise<StoredImage> => {
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const now = new Date();
        const id = `img_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check storage size
        const currentSize = getTotalStorageSize();
        if (currentSize + file.size > MAX_STORAGE_SIZE) {
          reject(new Error("Storage limit exceeded. Please delete some images."));
          return;
        }
        
        const image: StoredImage = {
          id,
          dataUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          timestamp: now.toISOString(),
        };
        
        const imageMap = getImageMap();
        imageMap[id] = image;
        saveImageMap(imageMap);
        resolve(image);
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read image file"));
      };
      
      reader.readAsDataURL(file);
    });
  };

  const deleteById = (id: string): void => {
    const imageMap = getImageMap();
    delete imageMap[id];
    saveImageMap(imageMap);
  };

  const deleteAll = (): void => {
    saveImageMap({});
  };

  const getTotalStorageSize = (): number => {
    const imageMap = getImageMap();
    return Object.values(imageMap).reduce((total, img) => total + img.size, 0);
  };

  const getImageUrl = (id: string): string | null => {
    const imageMap = getImageMap();
    const image = imageMap[id];
    return image ? image.dataUrl : null;
  };

  return {
    getAll,
    getById,
    save,
    deleteById,
    deleteAll,
    getTotalStorageSize,
    getImageUrl,
  };
};

export const imageStorage = createImageStorage(defaultStorageProvider);