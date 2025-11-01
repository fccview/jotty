import { useEffect, useState } from "react";

interface DelayProps {
  children: React.ReactNode;
  delay?: number;
  fallback?: React.ReactNode;
}

export const Delay = ({ children, delay, fallback }: DelayProps) => {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsShown(true);
    }, delay || 100);
  }, [delay]);

  return isShown ? children : fallback || null;
};
