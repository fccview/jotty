"use client";

import { useState } from "react";
import { register } from "@/app/_server/actions/auth";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";

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
          Welcome to {isRwMarkable ? "rwMarkable" : "jotty·page"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Create your admin account to get started
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-jotty">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        <Input
          id="username"
          name="username"
          label="Username"
          type="text"
          placeholder="Choose a username"
          required
          disabled={isLoading}
        />

        <Input
          id="password"
          name="password"
          label="Password"
          type="password"
          placeholder="Choose a strong password"
          required
          disabled={isLoading}
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          required
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-jotty text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
        >
          {isLoading ? "Creating Account..." : "Create Admin Account"}
        </button>
      </form>
    </div>
  );
}
