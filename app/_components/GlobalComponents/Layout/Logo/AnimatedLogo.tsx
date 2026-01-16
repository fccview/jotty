"use client";

import { cn } from "@/app/_utils/global-utils";

export const AnimatedLogo = ({
    className = "h-8 w-8",
}: {
    className?: string;
}) => {
    return (
        <div className={cn(className)}>
            <svg
                version="1.2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 884 884"
                className="w-full h-full"
            >
                <style>
                    {`
            @keyframes animated-logo-draw-stroke {
              0% {
                stroke-dashoffset: 1;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }
            
            @keyframes animated-logo-letter-stroke-color {
              0%, 99% {
                stroke: rgb(var(--primary));
              }
              100% {
                stroke: rgb(var(--primary-foreground));
              }
            }
            
            .animated-logo-background-stroke {
              fill: none;
              stroke: rgb(var(--primary));
              stroke-width: 16;
              stroke-linecap: round;
              stroke-linejoin: round;
              stroke-dasharray: 1;
              stroke-dashoffset: 1;
              animation: animated-logo-draw-stroke 3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            
            .animated-logo-letter-stroke {
              fill: none;
              stroke: rgb(var(--primary));
              stroke-width: 16;
              stroke-linecap: round;
              stroke-linejoin: round;
              stroke-dasharray: 1;
              stroke-dashoffset: 1;
              animation: 
                animated-logo-draw-stroke 3s cubic-bezier(0.4, 0, 0.2, 1) 3s forwards,
                animated-logo-letter-stroke-color 6s ease forwards;
            }
            
            .animated-logo-background-fill {
              fill: rgb(var(--primary));
              opacity: 0;
              animation: animated-logo-fade-in 0.3s ease-in 6s forwards;
            }
            
            .animated-logo-letter-fill {
              fill: rgb(var(--primary-foreground));
              opacity: 0;
              animation: animated-logo-fade-in 0.3s ease-in 6.5s forwards;
            }
            
            @keyframes animated-logo-fade-in {
              to { opacity: 1; }
            }
          `}
                </style>
                <path
                    className="animated-logo-background-fill"
                    d="m32 151.86c0-64.46 52.34-116.86 116.71-116.86h583.58c64.37 0 116.71 52.4 116.71 116.86v584.28c0 64.46-52.34 116.86-116.71 116.86h-583.58c-64.37 0-116.71-52.4-116.71-116.86z"
                />
                <path
                    className="animated-logo-background-stroke"
                    d="m32 151.86c0-64.46 52.34-116.86 116.71-116.86h583.58c64.37 0 116.71 52.4 116.71 116.86v584.28c0 64.46-52.34 116.86-116.71 116.86h-583.58c-64.37 0-116.71-52.4-116.71-116.86z"
                    pathLength="1"
                />
                <path
                    className="animated-logo-letter-fill"
                    d="m601.62 120.7v417.41q0 94.1-66.78 160.89-66.79 66.78-160.89 66.78l-37.95-151.78h37.95q31.11 0 53.12-22.01 22.77-22.77 22.77-53.88v-265.62h-166.96v-151.79z"
                />
                <path
                    className="animated-logo-letter-stroke"
                    d="m601.62 120.7v417.41q0 94.1-66.78 160.89-66.79 66.78-160.89 66.78l-37.95-151.78h37.95q31.11 0 53.12-22.01 22.77-22.77 22.77-53.88v-265.62h-166.96v-151.79z"
                    pathLength="1"
                />
            </svg>
        </div>
    );
};
