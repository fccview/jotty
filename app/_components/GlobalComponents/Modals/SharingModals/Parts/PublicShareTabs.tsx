import { cn } from "@/app/_utils/global-utils";
import { Button } from "../../../Buttons/Button";
import {
  Orbit01Icon,
  RedditIcon,
  Facebook01Icon,
  Mail01Icon,
} from "hugeicons-react";
import { Copy01Icon } from "hugeicons-react";
import { Logo } from "../../../Layout/Logo/Logo";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/_providers/ToastProvider";

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
  const t = useTranslations();
  const { showToast } = useToast();

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
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("sharing.failedToCopyUrl"),
      });
    }
  };
  const socialButtons = [
    {
      name: t("sharing.xTwitter"),
      Icon: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      onClick: () =>
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            t("sharing.checkOutThisItem", { itemType, itemTitle })
          )}&url=${encodeURIComponent(publicUrl)}`,
          "_blank"
        ),
    },
    {
      name: t("sharing.reddit"),
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
      name: t("sharing.facebook"),
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
      name: t("sharing.email"),
      Icon: Mail01Icon,
      onClick: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(
          t("sharing.emailSubject", { itemType, itemTitle })
        )}&body=${encodeURIComponent(
          t("sharing.emailBody", { itemType, itemTitle, publicUrl })
        )}`;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/30 rounded-jotty border border-border">
        <h4 className="font-medium">{t('sharing.publicAccess')}</h4>
        <p className="text-md lg:text-sm text-muted-foreground mb-3">
          {t("sharing.makeItemAccessible", { itemType })}
        </p>
        <Button
          onClick={handlePublicToggle}
          disabled={isLoading}
          variant={isPubliclyShared ? "destructive" : "default"}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Logo className="h-4 w-4 bg-background mr-2 animate-pulse" pathClassName="fill-primary" />
              {t("checklists.updating")}
            </>
          ) : isPubliclyShared ? (
            t("sharing.makePrivate")
          ) : (
            t("sharing.makePublic")
          )}
        </Button>
      </div>
      {isPubliclyShared && publicUrl && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-jotty space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-background border rounded-jotty text-md lg:text-sm font-mono"
            />
            <Button
              onClick={handleCopyUrl}
              size="sm"
              variant="outline"
              title={t('sharing.copyUrl')}
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
