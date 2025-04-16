import "./utils/theme-initializer";
import "./globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LandingPage } from "./page/landing-page";
import { HistoryPage } from "./page/history-page";
import { ToastContainer } from "./utils/components/toast";
import { NotFound } from "./page/404-page";
import { CodeMirrorEditorPage } from "./page/editor-page";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<CodeMirrorEditorPage />} />
        <Route path="landing" element={<LandingPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>,
);
