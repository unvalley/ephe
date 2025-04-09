import Avatar from "boring-avatars";

export const LandingPage = () => {
  return (
    <div className="antialiased min-h-screen flex flex-col items-center justify-center px-4 py-6 font-mono bg-graph-paper">
      <div className="max-w-3xl w-full space-y-8 sm:space-y-12">
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-2xl sm:text-3xl font-normal flex items-center">
            <Avatar
              size={28}
              name="Georgia O"
              colors={["#6c788e", "#a6aec1", "#cfd5e1", "#ededf2", "#fcfdff"]}
              variant="marble"
              className="mr-2"
            />
            Ephe
            <span className="hidden sm:inline">&nbsp;-&nbsp;An ephemeral markdown paper</span>
          </h1>

          <p className="text-sm sm:text-base">You can write ephemeral notes on this app.</p>

          <p className="text-sm sm:text-base">
            Ephe stores your notes on browser's local storage, nothing is sent to a server. No tracking, no ads, no
            login.
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-normal">Why Ephe?</h2>

          <ul className="text-sm sm:text-base space-y-2">
            <li>- Traditional to-do apps can be time-consuming and quickly overwhelming.</li>
            <li>- A single page is all you need to organize your day.</li>
            <li>- Focus on easily capturing your todos, thoughts, and ideas.</li>
          </ul>
        </div>

        <div className="">
          <p>
            You can see the source code on{" "}
            <a href="https://github.com/unvalley/ephe" className="text-blue-400 hover:underline">
              GitHub
            </a>
          </p>
        </div>

        <div className="my-20 flex gap-2 justify-center">
          <a
            href="/"
            className="px-4 py-2 rounded-md border border-primary-400 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500 dark:hover:text-white transition-colors"
          >
            Try Ephe
          </a>
        </div>
      </div>

      <footer className="text-gray-600 dark:text-gray-400 text-center text-sm sm:text-base">
        This project is built by{" "}
        <a href="https://github.com/unvalley" className="text-blue-400 hover:underline">
          unvalley
        </a>
      </footer>
    </div>
  );
};
