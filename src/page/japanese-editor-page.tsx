import "../globals.css";
import { JapaneseEditor } from "../features/japanese-editor/japanese-editor";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { useTheme } from "../utils/hooks/use-theme";
import { Footer } from "../utils/components/footer";

export const JapaneseEditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { isDarkMode } = useTheme();

  const backgroundClass = isDarkMode 
    ? "bg-gradient-to-b from-gray-900 to-gray-800" 
    : "bg-gradient-to-b from-gray-50 to-gray-100";

  return (
    <div className={`h-screen flex flex-col ${backgroundClass} antialiased ${paperModeClass} overflow-hidden`}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <JapaneseEditor />
      </div>
      
      <div className="w-full">
        <Footer />
      </div>
    </div>
  );
}; 