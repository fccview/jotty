"use client";

import { ReactNode } from "react";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";

interface HomeHeroProps {
  kicker: ReactNode;
  title: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
  dismiss?: ReactNode;
}

export const HomeHero = ({ kicker, title, summary, children, dismiss }: HomeHeroProps) => (
  <section className="jotty-home-hero group/widget relative overflow-hidden rounded-jotty text-primary-foreground p-6 sm:p-8 min-w-0">
    <Logo
      className="pointer-events-none absolute -right-10 -bottom-16 h-72 w-72 opacity-[0.08] bg-transparent p-0"
      pathClassName="fill-current"
    />
    {dismiss && <div className="absolute right-3 top-3 z-10">{dismiss}</div>}
    <p
      className="relative font-mono text-xs uppercase tracking-[0.2em] opacity-80"
      suppressHydrationWarning
    >
      {kicker}
    </p>
    <h1
      className="relative text-4xl sm:text-5xl font-bold tracking-tight mt-2 [overflow-wrap:anywhere]"
      suppressHydrationWarning
    >
      {title}
    </h1>
    {summary && <p className="relative mt-2 opacity-90 max-w-xl">{summary}</p>}
    {children && <div className="relative mt-6">{children}</div>}
  </section>
);
