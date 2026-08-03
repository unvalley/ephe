import "./utils/theme-initializer";
import "./globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { NotFound } from "./page/404-page";
import { EditorPage } from "./page/editor-page";
import { LandingPage } from "./page/landing-page";
import { ToastContainer } from "./utils/components/toast";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="landing" element={<LandingPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>,
);
