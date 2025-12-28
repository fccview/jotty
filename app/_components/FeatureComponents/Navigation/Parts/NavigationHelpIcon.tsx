"use client";

import { useState, useEffect } from "react";
import {
  HelpCircleIcon,
  SquareLock01Icon,
  SmartPhone01Icon,
  PaintBrush04Icon,
  LaptopProgrammingIcon,
  LockKeyIcon,
  TranslationIcon,
} from "hugeicons-react";
import { NavigationGlobalIcon } from "./NavigationGlobalIcon";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Tabs } from "@/app/_components/GlobalComponents/Tabs/Tabs";
import { readFile } from "@/app/_server/actions/file";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import path from "path";
import { HOWTO_DIR } from "@/app/_consts/files";
import { useTranslations } from "next-intl";

const helpFiles = (t: any) => [
  {
    id: "shortcuts",
    name: t("help.shortcuts"),
    filename: path.join(HOWTO_DIR, "SHORTCUTS.md"),
    icon: <kbd className="text-xs bg-muted px-1 py-0.5 rounded">⌘K</kbd>,
  },
  {
    id: "markdown",
    name: t("help.markdownGuide"),
    filename: path.join(HOWTO_DIR, "MARKDOWN.md"),
    icon: <span className="text-xs font-mono">#</span>,
  },
  {
    id: "api",
    name: t("common.api"),
    filename: path.join(HOWTO_DIR, "API.md"),
    icon: <span className="text-xs font-mono">{t('common.api')}</span>,
  },
  {
    id: "customisations",
    name: t("help.customisations"),
    filename: path.join(HOWTO_DIR, "CUSTOMISATIONS.md"),
    icon: <PaintBrush04Icon className="h-4 w-4" />,
  },
  {
    id: "docker",
    name: t("help.docker"),
    filename: path.join(HOWTO_DIR, "DOCKER.md"),
    icon: <LaptopProgrammingIcon className="h-4 w-4" />,
  },
  {
    id: "env-variables",
    name: t("help.envVariables"),
    filename: path.join(HOWTO_DIR, "ENV-VARIABLES.md"),
    icon: <LockKeyIcon className="h-4 w-4" />,
  },
  {
    id: "pwa",
    name: t("help.pwa"),
    filename: path.join(HOWTO_DIR, "PWA.md"),
    icon: <SmartPhone01Icon className="h-4 w-4" />,
  },
  {
    id: "encryption",
    name: t("help.encryption"),
    filename: path.join(HOWTO_DIR, "ENCRYPTION.md"),
    icon: <LockKeyIcon className="h-4 w-4" />,
  },
  {
    id: "sso",
    name: t("help.sso"),
    filename: path.join(HOWTO_DIR, "SSO.md"),
    icon: <SquareLock01Icon className="h-4 w-4" />,
  },
  {
    id: "translations",
    name: t("help.translations"),
    filename: path.join(HOWTO_DIR, "TRANSLATIONS.md"),
    icon: <TranslationIcon className="h-4 w-4" />,
  },
];

export const NavigationHelpIcon = () => {
  const t = useTranslations();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>("shortcuts");
  const [helpContent, setHelpContent] = useState<string>("");

  useShortcuts([
    {
      code: "KeyH",
      modKey: true,
      shiftKey: true,
      handler: () => setIsHelpOpen(!isHelpOpen),
    },
  ]);

  const loadHelpContent = async (fileId: string) => {
    const file = helpFiles(t).find((f) => f.id === fileId);
    if (!file) return;

    try {
      const content = await readFile(file.filename);
      const htmlContent = convertMarkdownToHtml(content);
      setHelpContent(htmlContent);
    } catch (error) {
      console.error(`Failed to load ${file.name} content:`, error);
      setHelpContent(`<p>Failed to load ${file.name} content.</p>`);
    }
  };

  useEffect(() => {
    if (isHelpOpen && selectedFile) {
      loadHelpContent(selectedFile);
    }
  }, [isHelpOpen, selectedFile]);

  const handleHelpClick = () => {
    setIsHelpOpen(true);
  };

  return (
    <>
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title={t("help.howTo")}
        className="lg:max-h-[80vh] lg:!max-w-[80vw] lg:!w-[80vw]"
      >
        <div className="flex flex-col h-full max-h-[calc(80vh-8rem)]">
          <Tabs
            tabs={helpFiles(t)}
            activeTab={selectedFile}
            onTabClick={setSelectedFile}
          />

          <div className="flex-1 overflow-y-auto">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <UnifiedMarkdownRenderer content={helpContent} />
            </div>
          </div>
        </div>
      </Modal>

      <NavigationGlobalIcon
        icon={<HelpCircleIcon className="h-5 w-5" />}
        onClick={handleHelpClick}
      />
    </>
  );
};
