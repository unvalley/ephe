export const LandingPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-graph-paper px-4 py-20 antialiased">
      <div className="w-full max-w-lg space-y-12 sm:space-y-12">
        <div className="space-y-2 sm:space-y-2">
          <p className="">Ephe is :</p>
          <ol className="list-inside list-decimal">
            <li>A markdown paper to stay focused.</li>
            <li>A paper to dump and capture the thoughts.</li>
            <li>
              <a
                href="https://github.com/unvalley/ephe"
                target="_blank"
                className="text-blue-400 hover:underline"
                rel="noopener"
              >
                OSS
              </a>
              , and free.
            </li>
          </ol>

          <p>No installs. No sign-up. No noise.</p>
          <p>You get one page, write what matters today.</p>
        </div>

        {/* <div>
          <img src="./ephe-demo.jpeg" alt="Ephe Screenshot" className="mx-auto w-full max-w-lg rounded-lg shadow-md" />
        </div> */}

        <div className="space-y-2 sm:space-y-2">
          <h2 className="font-normal">Why :</h2>
          <ul className="space-y-2">
            <li>- Most note and todo apps are overloaded.</li>
            <li>- I believe, just one writable page is enough for organizging.</li>
          </ul>
          <p>Quickly capture thoughts, lists, and ideas—then move on.</p>
        </div>

        <div className="my-10 flex justify-center">
          <a
            href="/"
            className="rounded-md border border-neutral-400 px-3 py-1 text-neutral-400 transition-colors duration-300 hover:text-neutral-900 dark:border-netural-600 dark:text-neutral-400 dark:hover:border-neutral-100 dark:hover:text-neutral-100"
          >
            Try it out
          </a>
        </div>
      </div>

      <footer className="text-center text-neutral-600 text-sm sm:text-base dark:text-neutral-400">
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
