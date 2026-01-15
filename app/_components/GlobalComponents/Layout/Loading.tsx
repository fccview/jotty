import { JottyIcon } from "./CustomIcons/JottyIcon";

export const Loading = () => {
  return (
    <div className="flex h-screen bg-background w-full">
      <div className="flex-1 flex items-center justify-center">
        <JottyIcon
          className="h-32 w-32 lg:h-16 lg:w-16 text-primary"
          animated={true}
        />
      </div>
    </div>
  );
};
