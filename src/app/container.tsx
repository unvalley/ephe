// import type { Metadata } from "next";
import "./globals.css";
// import { spaceMono } from "./fonts";
import { ThemeProvider } from "../hooks/use-theme";
import { Page } from "./page";

// export const metadata: Metadata = {
//   title: "Ephe",
//   description: "An ephemeral note taking app",
// };

export const Container = () => {
  return (
    <div className="h-full w-full">
      <div className="antialiased h-full w-full">
        <ThemeProvider>
          <Page />
        </ThemeProvider>
      </div>
    </div>
  );
};
