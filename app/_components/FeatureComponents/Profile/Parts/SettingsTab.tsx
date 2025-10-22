"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Key, Copy, Eye, EyeOff } from "lucide-react";
import { generateApiKey, getApiKey } from "@/app/_server/actions/api";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface SettingsTabProps {
  setShowDeleteModal: (show: boolean) => void;
}

export const SettingsTab = ({ setShowDeleteModal }: SettingsTabProps) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { isDemoMode } = useAppMode();

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const result = await getApiKey();
      if (result.success) {
        setApiKey(result.data || null);
      }
    } catch (error) {
      console.error("Error loading API key:", error);
    }
  };

  const handleGenerateApiKey = async () => {
    setIsGenerating(true);
    try {
      const result = await generateApiKey();
      if (result.success && result.data) {
        setApiKey(result.data);
        setShowApiKey(true);
      }
    } catch (error) {
      console.error("Error generating API key:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (apiKey) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(apiKey);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = apiKey;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
      } catch (error) {
        console.error("Failed to copy API key:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Account Settings</h2>
      </div>

      <div className="bg-background border border-border rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-medium">API Key</h3>
              <p className="text-sm text-muted-foreground">
                Generate an API key for programmatic access to your checklists
                and notes
              </p>
            </div>
            <div className="flex items-center gap-2">
              {apiKey && (
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {showApiKey ? apiKey : "••••••••••••••••"}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="h-8 w-8 p-0"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyApiKey}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {isDemoMode ? (
                <span className="text-sm text-muted-foreground">
                  disabled in demo mode
                </span>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleGenerateApiKey}
                  disabled={isGenerating}
                >
                  <Key className="h-4 w-4 mr-2" />
                  {isGenerating
                    ? "Generating..."
                    : apiKey
                      ? "Regenerate"
                      : "Generate"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background border border-border rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-medium">Delete Account</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            {isDemoMode ? (
              <span className="text-sm text-muted-foreground">
                disabled in demo mode
              </span>
            ) : (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Account
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
