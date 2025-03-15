import { Courier_Prime, Fira_Code, Inter, Space_Mono } from 'next/font/google'

export const spaceMono = Space_Mono({
    variable: "--font-space-mono",
    subsets: ["latin"],
    weight: ["400", "700"],
});

export const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
})

export const firaCode = Fira_Code({
    variable: "--font-fira-code",
    subsets: ["latin"],
});

export const courierPrime = Courier_Prime({
    variable: "--font-courier-prime",
    subsets: ["latin"],
    weight: ["400", "700"],
});