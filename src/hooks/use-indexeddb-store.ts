import { useSyncExternalStore } from "react";
import { saveContent, loadContent } from "../utils/indexeddb";

type Store = {
  content: string | null;
};

type StoreSubscriber = (store: Store) => void;

class IndexedDBStore {
  private subscribers = new Set<StoreSubscriber>();
  private store: Store = { content: null };

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const content = await loadContent();
      this.store = { content };
      this.notify();
    } catch (error) {
      console.error("Failed to initialize IndexedDB store:", error);
    }
  }

  subscribe(subscriber: StoreSubscriber) {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  private notify() {
    for (const subscriber of this.subscribers) {
      subscriber(this.store);
    }
  }

  async setContent(content: string) {
    try {
      await saveContent(content);
      this.store = { content };
      this.notify();
    } catch (error) {
      console.error("Failed to save content to IndexedDB:", error);
      throw error;
    }
  }

  getSnapshot() {
    return this.store;
  }
}

const store = new IndexedDBStore();

export const useIndexedDBStore = () => {
  const snapshot = useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getSnapshot(),
    () => store.getSnapshot()
  );

  return {
    content: snapshot.content,
    setContent: store.setContent.bind(store),
  };
}; 