import type { Metadata } from "next";
import "./globals.css";
import { spaceMono } from "./fonts";
import { ThemeProvider } from "../hooks/use-theme";

export const metadata: Metadata = {
    title: "Ephe",
    description: "An ephemeral note taking app",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full w-full">
            <body
                className={`
                    ${spaceMono.variable} antialiased h-full w-full`}
            >
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
