"use client";

/*
 ********************************************************
 * THIS IS FOR MY FUCKING SANITY.
 * THE DAMN TIPTAP EDITOR WRAPS EVERYTHING IN <p> AND I CAN'T USE <div> WITHOUT WARNINGS.
 * THIS IS NOT AN ISSUE AS THE ONLY USE I HAVE FOR <divs> WITHIN THE EDITOR IS FOR THE CODE BLOCKS/FILE ATTACHMENTS/TABLES/ETC.
 * IT'S ONLY SET TO WORK IN DEVELOPMENT MODE.
 ********************************************************
 */

if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const originalError = console.error;

  if (!console.error.toString().includes("flushSync was")) {
    console.error = (...args) => {
      if (
        typeof args[0] === "string" &&
        (/validateDOMNesting/.test(args[0]) || /flushSync/.test(args[0]))
      ) {
        return;
      }
      originalError.apply(console, args);
    };
  }
}

export default function SuppressWarnings() {
  return null;
}
