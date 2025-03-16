"use client";

import Avatar from "boring-avatars";
import Link from "next/link";

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 font-mono">

            <div className="max-w-4xl w-full space-y-12">
                <div className="space-y-4">
                    <h1 className="text-3xl font-normal flex items-center">
                        <Avatar size={28} name="Georgia O" colors={["#6c788e", "#a6aec1", "#cfd5e1", "#ededf2", "#fcfdff"]} variant="marble" />

                        Ephe - An ephemeral markdown paper
                    </h1>

                    <p className="text-gray-600 dark:text-gray-400">
                        You can write ephemeral notes on this app.
                    </p>

                    <p className="text-gray-600 dark:text-gray-400">
                        Ephe stores your notes on browser's local storage, nothing is sent to a server. No tracking, no ads, no login.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="text-2xl font-normal">Why Ephe?</h2>

                    <ul className="text-gray-600 dark:text-gray-400">
                        <li>- Traditional to-do apps can be time-consuming and quickly overwhelming.</li>
                        <li>- A single page is all you need to organize your day.</li>
                        <li>- Focus on easily capturing your todos, thoughts, and ideas.</li>
                    </ul>
                </div>

                <div className="flex gap-4">
                    <Link
                        href="/app"
                        className="inline-flex items-center justify-center border border-black dark:border-white rounded px-3 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                        Start writing
                    </Link>

                    <Link
                        href="https://github.com/unvalley/ephe#README"
                        className="inline-flex items-center justify-center border border-black dark:border-white rounded px-3 py-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                        Go GitHub
                    </Link>
                </div>
            </div>


            <footer className="mt-40 text-gray-600 dark:text-gray-400 text-center">
                This project is built by{" "}
                <Link href="https://github.com/unvalley" className="text-blue-400 hover:underline">
                    unvalley
                </Link>

            </footer>
        </div >
    );
} 