import { EditorView } from "@codemirror/view";
import { showToast } from "../../utils/components/toast";
import { imageStorage } from "./image-storage";

export const createImageDropHandler = () => {
  return EditorView.domEventHandlers({
    drop(event, view) {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return false;

      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) return false;

      event.preventDefault();

      // Get the position where the file was dropped
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return false;

      // Process all image files
      Promise.all(
        imageFiles.map(async (file) => {
          // Validate file size
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            throw new Error(`${file.name} is too large (max 10MB)`);
          }

          return imageStorage.save(file);
        })
      )
        .then((storedImages) => {
          // Create markdown for all images
          const markdownImages = storedImages
            .map((img) => `![${img.name}](image:${img.id})`)
            .join("\n");

          // Insert at drop position
          view.dispatch({
            changes: {
              from: pos,
              to: pos,
              insert: markdownImages,
            },
            selection: { anchor: pos + markdownImages.length },
          });

          showToast(
            `${storedImages.length} image${storedImages.length > 1 ? "s" : ""} uploaded`,
            "default"
          );
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : "Failed to upload images";
          showToast(message, "error");
        });

      return true;
    },

    dragover(event) {
      // Check if dragging files
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        return true;
      }
      return false;
    },
  });
};