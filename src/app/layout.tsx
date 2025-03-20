import type { Metadata } from "next";
import "./globals.css";
import { Inter, Space_Mono } from "next/font/google";
import { ThemeProvider } from "../hooks/use-theme";

export const metadata: Metadata = {
  title: "Ephe",
  description: "An ephemeral note taking app",
};

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.variable} antialiased h-full w-full`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
