import "./app/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./hooks/use-theme";
import { LandingPage } from "./components/landing-page";
import { EditorContainer } from "./app/editor-container";
import { HistoryPage } from "./components/history-page";
import { ToastContainer } from "./components/toast";
import { NotFound } from "./components/not-found";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EditorContainer />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
