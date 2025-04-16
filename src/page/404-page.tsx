import type { FC } from "react";

export const NotFound: FC = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-3xl">404</h1>
        <h2 className="mb-4">Page not found</h2>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Back to Editor
        </a>
      </div>
    </div>
  );
};
