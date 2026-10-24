"use client";

import { useState } from "react";
import { API_KEY_HEADER } from "@/app/_consts/api";
import { pretty } from "./api-explorer-utils";

export interface TryItResult {
  status: number;
  body: string;
  ms: number;
}

const JSON_TYPE = "application/json";

export const useTryIt = () => {
  const [result, setResult] = useState<TryItResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [failure, setFailure] = useState(false);

  const send = async (method: string, url: string, apiKey: string, body?: string) => {
    setIsSending(true);
    setFailure(false);
    const started = performance.now();
    try {
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          [API_KEY_HEADER]: apiKey,
          ...(body !== undefined ? { "Content-Type": JSON_TYPE } : {}),
        },
        body,
        cache: "no-store",
      });
      setResult({
        status: response.status,
        body: pretty(await response.text()),
        ms: Math.round(performance.now() - started),
      });
    } catch (error) {
      console.error("API explorer request failed:", error);
      setResult(null);
      setFailure(true);
    } finally {
      setIsSending(false);
    }
  };

  return { result, isSending, failure, send };
};
