import type { Metadata } from "next";
import "./globals.css";
import { spaceMono } from "./fonts";

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
                {children}
            </body>
        </html>
    );
}

