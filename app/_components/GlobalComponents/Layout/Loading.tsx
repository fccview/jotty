import { Logo } from "./Logo/Logo";

export const Loading = () => {
  return (
    <div className="flex h-screen bg-background w-full">
      <div className="flex-1 flex items-center justify-center animate-pulse">
        <Logo />
      </div>
    </div>
  );
};
