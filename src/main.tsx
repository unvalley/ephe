import "./app/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./hooks/use-theme";
import { LandingPage } from "./components/landing-page";
import { EditorContainer } from "./app/editor-container";
import { CompletedTasksPage } from "./components/completed-tasks";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<EditorContainer />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/completed-tasks" element={<CompletedTasksPage />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
