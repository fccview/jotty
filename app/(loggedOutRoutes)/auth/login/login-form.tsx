"use client";

import { useState } from "react";
import { login } from "@/app/_server/actions/auth";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Orbit01Icon } from "hugeicons-react";

export default function LoginForm({ ssoEnabled }: { ssoEnabled: boolean }) {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const { isDemoMode, appVersion, isRwMarkable } = useAppMode();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
    } catch (error: unknown) {
      if (error && typeof error === "object" && "digest" in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith("NEXT_REDIRECT")) {
          throw error;
        }
      }
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          {ssoEnabled
            ? "Choose how to access "
            : "Enter your credentials to access "}{" "}
          {isRwMarkable ? "rwMarkable" : "jotty·page"}
        </p>
      </div>

      {ssoEnabled && (
        <div className="space-y-3">
          <Button
            className="w-full"
            disabled={isLoading || isSsoLoading}
            onClick={() => {
              setIsSsoLoading(true);
              window.location.href = "/api/oidc/login";
            }}
          >
            {isSsoLoading ? (
              <>
                <Orbit01Icon className="h-4 w-4 mr-2 animate-spin" /> Signing
                In...
              </>
            ) : (
              "Sign in with SSO"
            )}
          </Button>
          <div className="relative !mt-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-background px-2">
                or continue with local account
              </span>
            </div>
          </div>
        </div>
      )}

      {isDemoMode && (
        <div className="bg-muted p-3 rounded-jotty">
          <strong>username: </strong>demo <br />
          <strong>password: </strong>demodemo
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-jotty">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Input
            id="username"
            label="Username"
            name="username"
            type="text"
            required
            disabled={isLoading || isSsoLoading}
            className="mt-1"
            placeholder="Enter your username"
            defaultValue=""
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Input
            id="password"
            label="Password"
            name="password"
            type="password"
            required
            disabled={isLoading || isSsoLoading}
            className="mt-1"
            placeholder="Enter your password"
            autoComplete="current-password"
            defaultValue=""
          />
        </div>

        <Button
          type="submit"
          className="w-full !mt-8"
          disabled={isLoading || isSsoLoading}
        >
          {isLoading ? (
            <>
              <Orbit01Icon className="h-4 w-4 mr-2 animate-spin" /> Signing
              In...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      {appVersion && (
        <div className="text-center text-xs text-muted-foreground">
          Version {appVersion}
        </div>
      )}
    </div>
  );
}
