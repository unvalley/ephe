import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useState, useEffect } from "react";
import { imageStorage, type StoredImage } from "./image-storage";
import { showToast } from "../../utils/components/toast";
import type { EditorView } from "@codemirror/view";

type ImageManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editorView?: EditorView | null;
};

export const ImageManagerModal = ({ isOpen, onClose, editorView }: ImageManagerModalProps) => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setImages(imageStorage.getAll());
    }
  }, [isOpen]);

  const handleDelete = (imageId: string) => {
    if (confirm("Are you sure you want to delete this image?")) {
      imageStorage.deleteById(imageId);
      setImages(images.filter((img) => img.id !== imageId));
      showToast("Image deleted", "default");
      if (selectedImage === imageId) {
        setSelectedImage(null);
      }
    }
  };

  const handleInsert = (image: StoredImage) => {
    if (editorView) {
      const { state } = editorView;
      const cursor = state.selection.main.head;
      const imageMarkdown = `![${image.name}](image:${image.id})`;
      
      editorView.dispatch({
        changes: {
          from: cursor,
          to: cursor,
          insert: imageMarkdown,
        },
        selection: { anchor: cursor + imageMarkdown.length },
      });
      
      showToast("Image inserted", "default");
      onClose();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalSize = images.reduce((acc, img) => acc + img.size, 0);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white dark:bg-neutral-800">
          <div className="flex h-full flex-col">
            <div className="border-neutral-200 border-b px-6 py-4 dark:border-neutral-700">
              <DialogTitle className="font-medium text-lg">
                Image Manager
              </DialogTitle>
              <p className="mt-1 text-neutral-600 text-sm dark:text-neutral-400">
                {images.length} images • {formatFileSize(totalSize)} used
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {images.length === 0 ? (
                <div className="text-center text-neutral-500">
                  No images uploaded yet
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      role="button"
                      tabIndex={0}
                      className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 ${
                        selectedImage === image.id
                          ? "border-blue-500"
                          : "border-neutral-200 dark:border-neutral-700"
                      }`}
                      onClick={() => setSelectedImage(image.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedImage(image.id);
                        }
                      }}
                    >
                      <img
                        src={image.dataUrl}
                        alt={image.name}
                        className="h-32 w-full object-cover"
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="truncate text-white text-xs">
                            {image.name}
                          </p>
                          <p className="text-white/80 text-xs">
                            {formatFileSize(image.size)}
                          </p>
                        </div>
                      </div>

                      {selectedImage === image.id && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInsert(image);
                            }}
                            className="rounded bg-blue-500 px-2 py-1 text-white text-xs hover:bg-blue-600"
                          >
                            Insert
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(image.id);
                            }}
                            className="rounded bg-red-500 px-2 py-1 text-white text-xs hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-neutral-200 border-t px-6 py-3 dark:border-neutral-700">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-neutral-100 px-4 py-2 font-medium text-sm hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600"
              >
                Close
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};