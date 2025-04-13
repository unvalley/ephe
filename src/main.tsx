import "./utils/theme-initializer";
import "./globals.css";
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "./components/toast";
import { Loading } from "./components/loading";

// Lazy load page components
const LandingPage = lazy(() => import("./page/landing-page").then(module => ({ default: module.LandingPage })));
const EditorPage = lazy(() => import("./page/editor-page").then(module => ({ default: module.EditorPage })));
const HistoryPage = lazy(() => import("./page/history-page").then(module => ({ default: module.HistoryPage })));
const NotFound = lazy(() => import("./page/404-page").then(module => ({ default: module.NotFound })));

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
      <Suspense fallback={<Loading className="h-screen w-screen flex items-center justify-center" />}>
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="landing" element={<LandingPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>,
);
