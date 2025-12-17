import { cn } from "@/app/_utils/global-utils";
import { Button } from "../../../Buttons/Button";
import {
  Orbit01Icon,
  RedditIcon,
  Facebook01Icon,
  Mail01Icon,
} from "hugeicons-react";
import { Copy01Icon } from "hugeicons-react";

interface PublicShareTabProps {
  isLoading: boolean;
  isPubliclyShared: boolean;
  publicUrl: string;
  handlePublicToggle: () => void;
  itemType: string;
  itemTitle: string;
}

export const PublicShareTab = ({
  isLoading,
  isPubliclyShared,
  publicUrl,
  handlePublicToggle,
  itemType,
  itemTitle,
}: PublicShareTabProps) => {
  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = publicUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("Fallback copy failed");
        }
      }
    } catch (error) {
      console.error("Failed to copy URL:", error);
      alert("Failed to copy URL to clipboard");
    }
  };
  const socialButtons = [
    {
      name: "X (Twitter)",
      Icon: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      onClick: () =>
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `Check out this ${itemType}: ${itemTitle}`
          )}&url=${encodeURIComponent(publicUrl)}`,
          "_blank"
        ),
    },
    {
      name: "Reddit",
      Icon: RedditIcon,
      color: "text-[#FF4500]",
      onClick: () =>
        window.open(
          `https://www.reddit.com/submit?url=${encodeURIComponent(
            publicUrl
          )}&title=${encodeURIComponent(itemTitle)}`,
          "_blank"
        ),
    },
    {
      name: "Facebook",
      Icon: Facebook01Icon,
      color: "text-[#1877F2]",
      onClick: () =>
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            publicUrl
          )}`,
          "_blank"
        ),
    },
    {
      name: "Email",
      Icon: Mail01Icon,
      onClick: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(
          `Check out this ${itemType}: ${itemTitle}`
        )}&body=${encodeURIComponent(
          `I wanted to share this ${itemType} with you:\n\n${itemTitle}\n${publicUrl}`
        )}`;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <h4 className="font-medium">Public Access</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Make this {itemType} accessible to anyone with the link.
        </p>
        <Button
          onClick={handlePublicToggle}
          disabled={isLoading}
          variant={isPubliclyShared ? "destructive" : "default"}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Orbit01Icon className="h-4 w-4 animate-spin mr-2" />
              Updating...
            </>
          ) : isPubliclyShared ? (
            "Make Private"
          ) : (
            "Make Public"
          )}
        </Button>
      </div>
      {isPubliclyShared && publicUrl && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-background border rounded-md text-sm font-mono"
            />
            <Button
              onClick={handleCopyUrl}
              size="sm"
              variant="outline"
              title="Copy URL"
            >
              <Copy01Icon className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            {socialButtons.map(({ name, Icon, color, onClick }) => (
              <Button
                key={name}
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={onClick}
                title={`Share on ${name}`}
              >
                <Icon className={cn("h-4 w-4", color)} />
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
