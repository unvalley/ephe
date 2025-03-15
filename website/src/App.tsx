export function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 font-mono">
      <nav className="flex items-center gap-8 mb-16">
        <a href="#" className="hover:underline">
          Readme
        </a>
        <a href="#" className="hover:underline">
          Pricing (Free now)
        </a>
      </nav>

      <div className="max-w-3xl w-full space-y-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-normal flex items-center">
            #&nbsp;
            <img src="./icon.png" alt="Brace" className="w-8 h-8 mr-3" />
            Ephe the Ephemeral Note Pad
          </h1>

          <p className="text-gray-600">Control your notes without effort.</p>
        </div>

        <div className="flex gap-4">
          <a
            href="#"
            className="inline-flex items-center justify-center border border-black rounded px-3 py-1 hover:bg-black hover:text-white transition-colors"
          >
            Try now
          </a>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-normal">## Features</h2>

          <div className="space-y-2">
            <h3 className="text-xl">### Without Effort</h3>
            <p className="text-gray-600">Typeless to take your notes.</p>
          </div>
        </div>
      </div>

      <footer className="mt-40 text-gray-600 text-center">
        This project is built by{" "}
        <a href="https://github.com/unvalley" className="text-blue-400">
          unvalley
        </a>
      </footer>
    </div>
  );
}
