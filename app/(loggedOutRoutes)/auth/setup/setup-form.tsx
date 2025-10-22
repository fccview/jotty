"use client";

import { useState } from "react";
import { register } from "@/app/_server/actions/auth";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export default function SetupForm() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { isRwMarkable } = useAppMode();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError("");

    try {
      const result = await register(formData);
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
          Welcome to{" "}
          {isRwMarkable
            ? "rwMarkable"
            : "jotty·page"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Create your admin account to get started
        </p>
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
            placeholder="Choose a username"
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
            placeholder="Choose a strong password"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Confirm your password"
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
        >
          {isLoading ? "Creating Account..." : "Create Admin Account"}
        </button>
      </form>
    </div>
  );
}
