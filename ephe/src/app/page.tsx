"use client"; // Need to add this for client components

import Image from "next/image";
import dynamic from "next/dynamic";

// Dynamically import the Tiptap editor to avoid SSR issues
const TiptapEditor = dynamic(() => import("../components/tiptap"), {
    ssr: false,
    loading: () => <div className="h-64 border rounded-md p-4">Loading editor...</div>
});

export default function Home() {
    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-3xl">

                <div className="w-full shadow-2xl">
                    <TiptapEditor />
                </div>
            </main>

            <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
                <a
                    className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image
                        aria-hidden
                        src="/globe.svg"
                        alt="Globe icon"
                        width={16}
                        height={16}
                    />
                    Ephe
                </a>
            </footer>
        </div>
    );
}
