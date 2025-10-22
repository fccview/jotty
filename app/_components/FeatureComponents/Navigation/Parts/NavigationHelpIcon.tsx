"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Lock, Palette, Terminal } from "lucide-react";
import { NavigationGlobalIcon } from "./NavigationGlobalIcon";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Tabs } from "@/app/_components/GlobalComponents/Tabs/Tabs";
import { readFile } from "@/app/_server/actions/file";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { useShortcuts } from "@/app/_hooks/useShortcuts";
import path from "path";
import { HOWTO_DIR } from "@/app/_consts/files";

interface TabItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  filename: string;
}

const helpFiles: TabItem[] = [
  {
    id: "shortcuts",
    name: "Shortcuts",
    filename: path.join(HOWTO_DIR, "SHORTCUTS.md"),
    icon: <kbd className="text-xs bg-muted px-1 py-0.5 rounded">⌘K</kbd>,
  },
  {
    id: "markdown",
    name: "Markdown Guide",
    filename: path.join(HOWTO_DIR, "MARKDOWN.md"),
    icon: <span className="text-xs font-mono">#</span>,
  },
  {
    id: "api",
    name: "API",
    filename: path.join(HOWTO_DIR, "API.md"),
    icon: <span className="text-xs font-mono">API</span>,
  },
  {
    id: "customisations",
    name: "Customisations",
    filename: path.join(HOWTO_DIR, "CUSTOMISATIONS.md"),
    icon: <Palette className="h-4 w-4" />,
  },
  {
    id: "docker",
    name: "Docker",
    filename: path.join(HOWTO_DIR, "DOCKER.md"),
    icon: <Terminal className="h-4 w-4" />,
  },
  {
    id: "sso",
    name: "SSO",
    filename: path.join(HOWTO_DIR, "SSO.md"),
    icon: <Lock className="h-4 w-4" />,
  },
];

export const NavigationHelpIcon = () => {
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
    const file = helpFiles.find((f) => f.id === fileId);
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
        title={"How to"}
        titleIcon={<HelpCircle className="h-5 w-5 text-primary" />}
        className="lg:max-h-[80vh] lg:!max-w-[80vw] lg:!w-[80vw]"
      >
        <div className="flex flex-col h-full max-h-[calc(80vh-8rem)]">
          <Tabs
            tabs={helpFiles}
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
        icon={<HelpCircle className="h-5 w-5" />}
        onClick={handleHelpClick}
      />
    </>
  );
};
