export const LandingPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-graph-paper px-4 py-20 antialiased">
      <div className="w-full max-w-lg space-y-12 sm:space-y-12">
        <div className="space-y-2 sm:space-y-2k">
          <h1 className="flex items-center text-2xl sm:text-2xl">
            Start your day with Ephe, the paper.
            <br />
          </h1>
          <p className="">
            Ephe is{" "}
            <a href="https://github.com/unvalley/ephe" className="text-blue-400 hover:underline">
              OSS
            </a>
            , An ephemeral Markdown Paper.
            <br />
            No install, No sign up, No ads.
            <br />
            Text is in your browser, nothing is sent to servers.
          </p>
        </div>

        {/* <div>
          <img src="./ephe-demo.jpeg" alt="Ephe Screenshot" className="mx-auto w-full max-w-lg rounded-lg shadow-md" />
        </div> */}

        <div className="space-y-2 sm:space-y-2">
          <h2 className="font-normal text-xl">Why Ephe?</h2>
          <ul className="space-y-2">
            <li>- Most note and todo apps are overloaded.</li>
            <li>- Ephe gives you just one page to stay focused. </li>
            <li>- Quickly capture thoughts, lists, and ideas—then move on.</li>
          </ul>
        </div>

        <div className="my-10 flex justify-center">
          <a
            href="/"
            className="rounded-md border border-neutral-400 px-3 py-2 text-neutral-400 transition-colors duration-300 hover:text-neutral-900 dark:border-netural-600 dark:text-neutral-400 dark:hover:border-neutral-100 dark:hover:text-neutral-100"
          >
            Try it out
          </a>
        </div>
      </div>

      <footer className="text-center text-gray-600 text-sm sm:text-base dark:text-gray-400">
        This project is built by{" "}
        <a href="https://x.com/unvalley_" className="text-blue-400 hover:underline">
          unvalley
        </a>
        <p>
          Source Code on{" "}
          <a href="https://github.com/unvalley/ephe" className="text-blue-400 hover:underline">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
};
