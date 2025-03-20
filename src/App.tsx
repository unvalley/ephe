import { Routes, Route } from "react-router-dom";
import { EditorContainer } from "./app/editor-container";
import { LandingPage } from "./components/landing-page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EditorContainer />} />
      <Route path="/landing" element={<LandingPage />} />
    </Routes>
  );
}
