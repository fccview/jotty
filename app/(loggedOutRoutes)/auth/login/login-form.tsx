"use client";

import { useEffect, useState } from "react";
import { login } from "@/app/_server/actions/auth";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export default function LoginForm() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { isDemoMode } = useAppMode();
  const { isRwMarkable } = useAppMode();
  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError("");

    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access{" "}
          {isRwMarkable
            ? "rwMarkable"
            : "jotty·page"}
        </p>

        {isDemoMode && (
          <div className="bg-muted p-4">
            <strong>username: </strong>demo <br />
            <strong>password: </strong>demodemo
          </div>
        )}
      </div>

      <form action={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Enter your username"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Enter your password"
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
