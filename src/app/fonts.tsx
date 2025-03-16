import { Inter, Space_Mono } from "next/font/google";

export const spaceMono = Space_Mono({
    variable: "--font-space-mono",
    subsets: ["latin"],
    weight: ["400", "700"],
});

export const inter = Inter({
    subsets: ["latin"],
    display: "swap",
});

