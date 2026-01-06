"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Home05Icon, RefreshIcon } from "hugeicons-react";
import { generateHaiku } from "@/app/_utils/haiku-utils";

export const NotFoundClient = () => {
  const router = useRouter();
  const t = useTranslations("notFound");
  const [currentPoem, setCurrentPoem] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [quoteCount, setQuoteCount] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const changePoem = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPoem(generateHaiku());
      setQuoteCount((prev) => prev + 1);
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning]);

  useEffect(() => {
    setCurrentPoem(generateHaiku());
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      changePoem();
    }, 10000); 

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [changePoem]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !isTransitioning &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        changePoem();
      } else if (
        e.code === "Enter" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        router.push("/");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [changePoem, router, isTransitioning]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-secondary">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="relative">
          <h1 className="text-9xl md:text-[12rem] font-bold text-primary/20 select-none pointer-events-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl md:text-8xl font-bold text-primary animate-pulse">
              404
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            {t("title")}
          </h2>
          <span className="text-sm italic">
            {t('imNoPoet')}
          </span>
          <div className="relative w-full overflow-y-auto max-h-[40vh] py-4">
            <pre
              className={`text-lg md:text-xl text-muted-foreground transition-all duration-300 transform whitespace-pre-wrap ${isTransitioning
                  ? "opacity-0 translate-y-2"
                  : "opacity-100 translate-y-0"
                }`}
            >
              &ldquo;{currentPoem}&rdquo;
            </pre>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={changePoem}
            disabled={isTransitioning}
            variant="outline"
            size="lg"
            className="group relative overflow-hidden"
          >
            <RefreshIcon
              className={`h-5 w-5 mr-2 transition-transform duration-300 ${isTransitioning ? "animate-spin" : "group-hover:rotate-180"
                }`}
            />
            {t("newHaiku")}
            <span className="ml-2 text-xs opacity-60 hidden sm:inline">
              (Space)
            </span>
          </Button>
          <Button onClick={() => router.push("/")} size="lg" className="group">
            <Home05Icon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
            {t("goHome")}
            <span className="ml-2 text-xs opacity-60 hidden sm:inline">
              (Enter)
            </span>
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground/70">
            {t("seenCount", { count: quoteCount })}
          </div>
        </div>
      </div>
    </div>
  );
};
