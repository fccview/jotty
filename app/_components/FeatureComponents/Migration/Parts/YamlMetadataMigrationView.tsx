import { MigrationHeader } from "./MigrationHeader";
import { InfoCard } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import { InfoCardVariant } from "@/app/_components/GlobalComponents/Cards/InfoCard";
import {
  Database01Icon,
  InformationCircleIcon,
  File02Icon,
  SourceCodeIcon,
  ShieldUserIcon,
} from "hugeicons-react";
import { useState } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { RefreshIcon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { migrateToYamlMetadataFormat } from "@/app/_server/actions/migration/index";
import { useTranslations } from "next-intl";

interface YamlMetadataMigrationViewProps {
  onMigrate: () => void;
  isMigrating: boolean;
  error: string | null;
  migrationResult: {
    migrated: boolean;
    changes: string[];
  } | null;
}

export const YamlMetadataMigrationView = ({
  onMigrate,
  isMigrating,
  error,
  migrationResult,
}: YamlMetadataMigrationViewProps) => {
  const t = useTranslations();
  const [hasBackedUp, setHasBackedUp] = useState(false);

  const isMigrationComplete = migrationResult !== null;

  const handleMigrate = async () => {
    const result = await migrateToYamlMetadataFormat();
    if (result.success) {
      onMigrate();
    }
  };

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        <MigrationHeader
          icon={<SourceCodeIcon className="h-12 w-12 text-primary" />}
          title={
            isMigrationComplete
              ? "YAML Metadata Migration Complete"
              : "Document Metadata Update Required"
          }
          description={
            isMigrationComplete
              ? "Your documents have been successfully migrated to use YAML metadata format."
              : `I've improved how document titles and checklist types are stored. This update introduces YAML metadata at the top of documents for better organization and future extensibility.`
          }
        />

        {!isMigrationComplete && (
          <>
            <InfoCard
              icon={<InformationCircleIcon className="h-5 w-5 text-primary" />}
              title={t("migration.whatsChanging")}
            >
              <p className="text-md lg:text-sm">
                We&apos;re moving from inline title extraction (first{" "}
                <code className="bg-muted px-1 rounded text-xs"># heading</code>{" "}
                and{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  &lt;!-- type:task --&gt;
                </code>{" "}
                comments) to structured YAML metadata at the top of each
                document.
              </p>
            </InfoCard>

            <div className="bg-card border border-border rounded-md p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Migration Changes
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-jotty">
                  <File02Icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-md lg:text-sm font-medium">YAML Metadata Format</p>
                    <p className="text-md lg:text-xs text-muted-foreground">
                      Documents will now use YAML frontmatter for metadata:
                    </p>
                    <pre className="mt-2 text-sm lg:text-xs bg-muted p-2 rounded overflow-x-auto">
                      {`---
uuid: unique-immutable-identifier
title: Document Title
checklistType: task|simple
---`}
                    </pre>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-jotty">
                  <Database01Icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-md lg:text-sm font-medium">
                      UUID-based Identification
                    </p>
                    <p className="text-md lg:text-xs text-muted-foreground">
                      Each document gets a unique, immutable UUID for better
                      identification and linking across the system.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-jotty">
                  <ShieldUserIcon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-md lg:text-sm font-medium">
                      Preserves Existing Metadata
                    </p>
                    <p className="text-md lg:text-xs text-muted-foreground">
                      If your documents already have YAML metadata (from other
                      tools), we only add missing fields like{" "}
                      <code className="bg-muted px-1 rounded text-xs">
                        uuid
                      </code>{" "}
                      and{" "}
                      <code className="bg-muted px-1 rounded text-xs">
                        checklistType
                      </code>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <InfoCard
              icon={<ShieldUserIcon className="h-5 w-5 text-amber-600" />}
              title={t("migration.automaticBackupIncluded")}
              variant={InfoCardVariant.WARNING}
            >
              <p>
                This migration automatically creates a complete backup of your
                data folder before making any changes. The backup will be saved
                within your data directory for safety.
              </p>
            </InfoCard>

            <InfoCard
              icon={<File02Icon className="h-5 w-5 text-primary" />}
              title={t("migration.yamlFrontmatterIndustryStandard")}
            >
              <p className="text-md lg:text-sm mb-3">
                YAML metadata at the top of documents is a widely adopted
                standard used by many popular tools:
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-medium text-foreground mb-1">
                    Static Site Generators
                  </p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>
                      • Jekyll (
                      <a
                        href="https://jekyllrb.com/docs/front-matter/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                    <li>
                      • Hugo (
                      <a
                        href="https://gohugo.io/content-management/front-matter/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                    <li>
                      • Eleventy (
                      <a
                        href="https://www.11ty.dev/docs/data-frontmatter/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">
                    Documentation Tools
                  </p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>
                      • Docusaurus (
                      <a
                        href="https://docusaurus.io/docs/markdown-features"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                    <li>
                      • VuePress (
                      <a
                        href="https://vuepress.vuejs.org/guide/page.html#frontmatter"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                    <li>
                      • MkDocs (
                      <a
                        href="https://www.mkdocs.org/user-guide/writing-your-docs/#meta-data"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">
                    Note-Taking Apps
                  </p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>
                      • Obsidian (
                      <a
                        href="https://help.obsidian.md/Editing+and+formatting/Properties"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                    <li>
                      • Zettlr (
                      <a
                        href="https://docs.zettlr.com/en/advanced/yaml-frontmatter/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                    <li>
                      • Joplin (
                      <a
                        href="https://joplinapp.org/help/dev/spec/interop_with_frontmatter/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">
                    Blogging Platforms
                  </p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>
                      • Hexo (
                      <a
                        href="https://hexo.io/docs/front-matter.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                    <li>
                      • Ghost (
                      <a
                        href="https://ghost.org/docs/themes/structure/frontmatter/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                      )
                    </li>
                  </ul>
                </div>
              </div>
            </InfoCard>

            {error && (
              <InfoCard
                icon={
                  <InformationCircleIcon className="h-4 w-4 text-destructive" />
                }
                title={t('migration.migrationFailed')}
                variant={InfoCardVariant.DESTRUCTIVE}
              >
                <p>{error}</p>
              </InfoCard>
            )}

            <div className="bg-card border border-border rounded-md p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="backup-confirmation"
                  checked={hasBackedUp}
                  onChange={(e) => setHasBackedUp(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <div>
                  <label
                    htmlFor="backup-confirmation"
                    className="text-md lg:text-sm font-medium text-foreground cursor-pointer"
                  >
                    I understand this migration will automatically backup my
                    data and update document formats.
                    <span className="text-md lg:text-xs text-muted-foreground block">
                      The migration is designed to be safe and reversible.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Button
                onClick={handleMigrate}
                disabled={isMigrating || !hasBackedUp}
                size="lg"
                className="min-w-48"
              >
                <RefreshIcon
                  className={cn("h-4 w-4 mr-2", isMigrating && "animate-spin")}
                />
                {isMigrating ? t("migration.migrating") : t("migration.startMigration")}
              </Button>
            </div>
          </>
        )}

        {isMigrationComplete && (
          <div className="space-y-4">
            <InfoCard
              icon={
                migrationResult.migrated ? (
                  <Database01Icon className="h-5 w-5 text-green-600" />
                ) : (
                  <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                )
              }
              title={
                migrationResult.migrated
                  ? t("migration.migrationSuccessful")
                  : "Migration Not Needed"
              }
              variant={InfoCardVariant.DEFAULT}
            >
              <p className="text-md lg:text-sm">
                {migrationResult.migrated
                  ? "Your documents have been successfully migrated to use YAML metadata."
                  : t("migration.noMigrationNeeded")}
              </p>
            </InfoCard>

            {migrationResult.changes.length > 0 && (
              <div className="bg-card border border-border rounded-md p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Migration Details:
                </h3>
                <ul className="space-y-2">
                  {migrationResult.changes.map((change, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <SourceCodeIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-md lg:text-sm text-muted-foreground">
                        {change}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {migrationResult.migrated && (
              <div className="flex justify-center pt-2">
                <Button onClick={() => (window.location.href = "/")} size="lg">{t('migration.returnToApp')}</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
