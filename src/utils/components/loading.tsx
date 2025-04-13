type LoadingProps = {
  className?: string;
};

export const Loading = ({ className }: LoadingProps) => {
  return (
    <div className={className}>
      <div className="animate-ping rounded-full h-4 w-4 bg-gray-300 dark:bg-gray-100" />
    </div>
  );
};
