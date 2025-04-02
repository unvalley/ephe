import "./globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./hooks/use-theme";
import { LandingPage } from "./page/landing-page";
import { EditorPage } from "./page/editor-page";
import { HistoryPage } from "./page/history-page";
import { ToastContainer } from "./components/toast";
import { NotFound } from "./page/404-page";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="landing" element={<LandingPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
