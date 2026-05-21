type LoadingProps = {
  className?: string;
};

export const Loading = ({ className }: LoadingProps) => {
  return (
    <div className={className}>
      <div className="size-4 animate-ping rounded-full bg-neutral-300 dark:bg-neutral-100" />
    </div>
  );
};
