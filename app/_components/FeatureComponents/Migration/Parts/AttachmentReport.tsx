import { useTranslations } from "next-intl";
import type { AttachmentMigrationReport } from "@/app/_types";
import { LinkModes, ResidueKinds } from "@/app/_consts/attachment-migration";
import { formatFileSize } from "@/app/_utils/file-icon-utils";

interface AttachmentReportProps {
  report: AttachmentMigrationReport;
}

const RESIDUE_ORDER: ResidueKinds[] = [
  ResidueKinds.ENCRYPTED,
  ResidueKinds.LOCKED,
  ResidueKinds.READ_ONLY,
  ResidueKinds.CLASH,
  ResidueKinds.UNPARSABLE,
  ResidueKinds.MISSING,
  ResidueKinds.NOT_FILE,
  ResidueKinds.CROSS_OWNER,
  ResidueKinds.FOREIGN,
  ResidueKinds.LOOSE,
  ResidueKinds.CHANGING,
  ResidueKinds.AVATAR_MISSING,
  ResidueKinds.AVATAR_FOREIGN,
];

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="p-3 bg-muted/50 rounded-jotty">
    <p className="text-xl font-semibold text-foreground">{value}</p>
    <p className="text-md lg:text-xs text-muted-foreground">{label}</p>
  </div>
);

const Entries = ({ title, hint, entries }: { title: string; hint: string; entries: string[] }) => (
  <details className="bg-muted/30 rounded-jotty p-3">
    <summary className="cursor-pointer text-md lg:text-sm font-medium text-foreground">
      {title} ({entries.length})
    </summary>
    <p className="text-md lg:text-xs text-muted-foreground mt-2">{hint}</p>
    <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto">
      {entries.map((entry) => (
        <li key={entry} className="text-md lg:text-xs font-mono text-muted-foreground break-all">
          {entry}
        </li>
      ))}
    </ul>
  </details>
);

export const flatResidue = (report: AttachmentMigrationReport): string[] =>
  RESIDUE_ORDER.flatMap((kind) => (report.residue[kind] || []).map((entry) => `${kind}: ${entry}`));

export const AttachmentReport = ({ report }: AttachmentReportProps) => {
  const t = useTranslations();
  const residue = RESIDUE_ORDER.filter((kind) => (report.residue[kind] || []).length > 0);
  const short =
    report.linkMode === LinkModes.COPY &&
    report.freeBytes !== null &&
    report.copyBytes > report.freeBytes;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label={t("migration.attachments.statItems")} value={report.rewritten} />
        <Stat label={t("migration.attachments.statUrls")} value={report.urls} />
        <Stat
          label={
            report.linkMode === LinkModes.LINK
              ? t("migration.attachments.statLinked")
              : t("migration.attachments.statCopied")
          }
          value={report.linked + report.copied}
        />
        <Stat label={t("migration.attachments.statReused")} value={report.reused} />
        <Stat label={t("migration.attachments.statAvatars")} value={report.avatars} />
        <Stat label={t("migration.attachments.statUuids")} value={report.uuids} />
        {!report.dryRun && <Stat label={t("migration.attachments.statPasses")} value={report.passes} />}
      </div>

      {report.linkMode === LinkModes.COPY && (
        <p className={short ? "text-md lg:text-sm text-destructive" : "text-md lg:text-sm text-muted-foreground"}>
          {t("migration.attachments.copyMode", {
            size: formatFileSize(report.copyBytes),
            free: report.freeBytes === null ? "?" : formatFileSize(report.freeBytes),
          })}
        </p>
      )}

      {report.crossOwner.length > 0 && (
        <Entries
          title={t("migration.attachments.crossOwnerTitle")}
          hint={t("migration.attachments.crossOwnerHint")}
          entries={report.crossOwner}
        />
      )}

      {residue.map((kind) => (
        <Entries
          key={kind}
          title={t(`migration.attachments.residue.${kind}.title`)}
          hint={t(`migration.attachments.residue.${kind}.hint`)}
          entries={report.residue[kind] || []}
        />
      ))}
    </div>
  );
};
