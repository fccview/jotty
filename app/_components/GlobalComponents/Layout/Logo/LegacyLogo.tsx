"use client";

export const LegacyLogo = ({
  className = "h-8 w-8",
  fillClass = "fill-current",
  strokeClass = "stroke-current",
}: {
  className?: string;
  fillClass?: string;
  strokeClass?: string;
}) => {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="100" height="100" rx="20" className={fillClass} />
      <path
        d="M25 65L40 80L75 45"
        className={strokeClass}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25 45L40 30L75 65"
        className={strokeClass}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
