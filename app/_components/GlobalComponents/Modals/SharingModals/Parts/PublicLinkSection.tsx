import { ComponentType, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Copy01Icon,
  Facebook01Icon,
  Globe02Icon,
  LinkSquare02Icon,
  Mail01Icon,
  RedditIcon,
  Tick02Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useToast } from "@/app/_providers/ToastProvider";
import { copyTextToClipboard } from "@/app/_utils/global-utils";
import { ShareSection } from "./ShareSection";
import { ShareToggleRow } from "./ShareToggleRow";

interface PublicLinkSectionProps {
  isLoading: boolean;
  isLocked?: boolean;
  isPubliclyShared: boolean;
  publicUrl: string;
  handlePublicToggle: () => void;
  itemType: string;
  itemTitle: string;
}

interface SocialTarget {
  name: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
}

const COPIED_MS = 1800;
const MAILTO = "mailto:";

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const useCopied = () => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  return [isCopied, setIsCopied] as const;
};

export const PublicLinkSection = ({
  isLoading,
  isLocked,
  isPubliclyShared,
  publicUrl,
  handlePublicToggle,
  itemType,
  itemTitle,
}: PublicLinkSectionProps) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [isCopied, setIsCopied] = useCopied();
  const url = encodeURIComponent(publicUrl);
  const blurb = t("sharing.checkOutThisItem", { itemType, itemTitle });

  const socials: SocialTarget[] = [
    {
      name: t("sharing.xTwitter"),
      icon: XIcon,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(blurb)}&url=${url}`,
    },
    {
      name: t("sharing.reddit"),
      icon: RedditIcon,
      href: `https://www.reddit.com/submit?url=${url}&title=${encodeURIComponent(itemTitle)}`,
    },
    {
      name: t("sharing.facebook"),
      icon: Facebook01Icon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    },
    {
      name: t("sharing.email"),
      icon: Mail01Icon,
      href: `${MAILTO}?subject=${encodeURIComponent(
        t("sharing.emailSubject", { itemType, itemTitle }),
      )}&body=${encodeURIComponent(t("sharing.emailBody", { itemType, itemTitle, publicUrl }))}`,
    },
  ];

  const handleCopy = async () => {
    if (await copyTextToClipboard(publicUrl)) {
      setIsCopied(true);
      return;
    }
    showToast({
      type: "error",
      title: t("common.error"),
      message: t("sharing.failedToCopyUrl"),
    });
  };

  return (
    <ShareSection id="share-section-public" title={t("sharing.publicLinkTab")}>
      <div className="px-6 py-1">
        <ShareToggleRow
          id="share-public-toggle"
          icon={Globe02Icon}
          label={t("sharing.publicAccess")}
          hint={t("sharing.makeItemAccessible", { itemType })}
          checked={isPubliclyShared}
          onChange={handlePublicToggle}
          disabled={isLoading || isLocked}
        />

        {isPubliclyShared && publicUrl && (
          <div className="mt-3 space-y-3 pl-11">
            <div className="flex items-center gap-1 rounded-jotty border border-border bg-background p-1 pl-3">
              <input
                type="text"
                value={publicUrl}
                readOnly
                aria-label={t("sharing.publicLink")}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 bg-transparent font-mono text-sm lg:text-xs text-foreground focus:outline-none"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(publicUrl, "_blank", "noopener")}
                title={t("sharing.openLink")}
                aria-label={t("sharing.openLink")}
                className="h-8 w-8 p-0 text-muted-foreground"
              >
                <LinkSquare02Icon className="h-4 w-4" />
              </Button>
              <Button
                variant="soft"
                size="xs"
                onClick={handleCopy}
                aria-live="polite"
                className="gap-1.5 px-2.5"
              >
                {isCopied ? (
                  <Tick02Icon className="h-3.5 w-3.5" />
                ) : (
                  <Copy01Icon className="h-3.5 w-3.5" />
                )}
                {t(isCopied ? "sharing.copied" : "sharing.copyLink")}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {socials.map(({ name, icon: Icon, href }) => (
                <a
                  key={name}
                  href={href}
                  target={href.startsWith(MAILTO) ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  title={t("sharing.shareOn", { name })}
                  aria-label={t("sharing.shareOn", { name })}
                  className="flex h-8 w-8 items-center justify-center rounded-jotty text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </ShareSection>
  );
};
