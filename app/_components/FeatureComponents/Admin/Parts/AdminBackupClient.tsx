"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/_providers/ToastProvider";
import {
  SanitisedBackupConfig,
  BackupStatus,
  BackupSnapshot,
  BackupSchedulePreset,
  DEFAULT_BACKUP_CONFIG,
} from "@/app/_types/backup";
import {
  getBackupConfig,
  getBackupStatus,
  saveBackupConfig,
  runBackupNow,
  listSnapshots,
  checkRepository,
  initRepository,
  restoreBackup,
} from "@/app/_server/actions/backup";

interface AdminBackupClientProps {
  initialConfig?: SanitisedBackupConfig;
  initialStatus?: BackupStatus;
  initialSnapshots: BackupSnapshot[];
}

const SCHEDULE_OPTIONS: BackupSchedulePreset[] = [
  "disabled",
  "hourly",
  "every6h",
  "every12h",
  "daily",
  "weekly",
];

export const AdminBackupClient = ({
  initialConfig,
  initialStatus,
  initialSnapshots,
}: AdminBackupClientProps) => {
  const t = useTranslations();
  const { showToast } = useToast();

  const [config, setConfig] = useState<SanitisedBackupConfig>(
    initialConfig || {
      enabled: false,
      endpoint: "",
      bucket: "",
      region: "",
      prefix: "jotty",
      accessKey: "",
      hasSecretKey: false,
      hasRepoPassword: false,
      schedule: "disabled",
      keepDaily: DEFAULT_BACKUP_CONFIG.keepDaily,
      keepWeekly: DEFAULT_BACKUP_CONFIG.keepWeekly,
    },
  );
  const [status, setStatus] = useState<BackupStatus | null>(initialStatus || null);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(initialSnapshots);

  const [secretKey, setSecretKey] = useState("");
  const [repoPassword, setRepoPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [running, setRunning] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [cfg, sts, snaps] = await Promise.all([
        getBackupConfig(),
        getBackupStatus(),
        listSnapshots(),
      ]);
      if (cfg.success && cfg.data) setConfig(cfg.data);
      if (sts.success && sts.data) setStatus(sts.data);
      if (snaps.success && snaps.data) setSnapshots(snaps.data);
    } catch (err) {
      console.error("Failed to refresh backup data:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const result = await saveBackupConfig({
        enabled: config.enabled,
        endpoint: config.endpoint,
        bucket: config.bucket,
        region: config.region,
        prefix: config.prefix,
        accessKey: config.accessKey && !config.accessKey.startsWith("•") ? config.accessKey : undefined,
        secretKey: secretKey || undefined,
        repoPassword: repoPassword || undefined,
        schedule: config.schedule,
        keepDaily: config.keepDaily,
        keepWeekly: config.keepWeekly,
      });
      if (result.success) {
        showToast({ type: "success", title: t("admin.backupConfigSaved") });
        setSecretKey("");
        setRepoPassword("");
        await refreshAll();
      } else {
        showToast({ type: "error", title: result.error || "Failed to save" });
      }
    } catch (err: any) {
      showToast({ type: "error", title: err?.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  }, [config, secretKey, repoPassword, showToast, t, refreshAll]);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    try {
      const result = await checkRepository();
      if (result.success) {
        showToast({ type: "success", title: t("admin.backupTestSuccess"), message: result.data });
        await refreshAll();
      } else {
        showToast({ type: "error", title: result.error || "Connection test failed" });
      }
    } catch (err: any) {
      showToast({ type: "error", title: err?.message || "Connection test failed" });
    } finally {
      setTesting(false);
    }
  }, [showToast, t, refreshAll]);

  const handleInitRepo = useCallback(async () => {
    setInitializing(true);
    try {
      const result = await initRepository();
      if (result.success) {
        showToast({ type: "success", title: result.data || "Repository initialised" });
      } else {
        showToast({ type: "error", title: result.error || "Failed to initialise" });
      }
    } catch (err: any) {
      showToast({ type: "error", title: err?.message || "Failed to initialise" });
    } finally {
      setInitializing(false);
    }
  }, [showToast]);

  const handleRunNow = useCallback(async () => {
    setRunning(true);
    try {
      const result = await runBackupNow();
      if (result.success && result.data) {
        showToast({
          type: "success",
          title: t("admin.backupTestSuccess"),
          message: result.data.message,
        });
        await refreshAll();
      } else {
        showToast({ type: "error", title: result.error || "Backup failed" });
        await refreshAll();
      }
    } catch (err: any) {
      showToast({ type: "error", title: err?.message || "Backup failed" });
    } finally {
      setRunning(false);
    }
  }, [showToast, t, refreshAll]);

  const handleRestore = useCallback(
    async (snapshotId: string) => {
      setRestoring(snapshotId);
      setConfirmRestoreId(null);
      try {
        const result = await restoreBackup(snapshotId);
        if (result.success && result.data) {
          showToast({
            type: "success",
            title: t("admin.backupRestoreSuccess", { rollbackDir: result.data.rollbackDir }),
            message: result.data.message,
          });
          await refreshAll();
        } else {
          showToast({ type: "error", title: result.error || "Restore failed" });
        }
      } catch (err: any) {
        showToast({ type: "error", title: err?.message || "Restore failed" });
      } finally {
        setRestoring(null);
      }
    },
    [showToast, t, refreshAll],
  );

  const formatDate = (iso: string | null): string => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t("admin.backupTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.backupDescription")}</p>
      </div>

      {/* Status panel */}
      {status && (
        <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("admin.backupStatus")}</h2>
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshing}>
              {refreshing ? "..." : "↻"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t("admin.backupStatusResticAvailable")}:</span>
              <span className={status.resticAvailable ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {status.resticAvailable
                  ? `✓ ${status.resticVersion || "yes"}`
                  : `✗ ${t("admin.backupStatusResticUnavailable")}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t("admin.backupStatusSchedulerRunning")}:</span>
              <span className={status.schedulerRunning ? "text-green-600 font-medium" : "text-muted-foreground"}>
                {status.schedulerRunning
                  ? t("admin.backupStatusSchedulerRunning")
                  : t("admin.backupStatusSchedulerStopped")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t("admin.backupLastRun")}:</span>
              <span>{formatDate(status.lastRun)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t("admin.backupLastSuccess")}:</span>
              <span>{formatDate(status.lastSuccess)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t("admin.backupNextRun")}:</span>
              <span>{formatDate(status.nextRun)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t("admin.backupSnapshotCount")}:</span>
              <span>{status.snapshotCount}</span>
            </div>
            {status.lastError && (
              <div className="md:col-span-2 flex items-start gap-2">
                <span className="text-muted-foreground">{t("admin.backupLastError")}:</span>
                <span className="text-red-600">{status.lastError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="default" onClick={handleRunNow} disabled={running || !status?.resticAvailable}>
          {running ? t("admin.backupRunning") : t("admin.backupRunNow")}
        </Button>
        <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
          {testing ? "..." : t("admin.backupTestConnection")}
        </Button>
        <Button variant="outline" onClick={handleInitRepo} disabled={initializing}>
          {initializing ? "..." : t("admin.backupInitRepo")}
        </Button>
      </div>

      {/* Config form */}
      <div className="rounded-lg border border-border p-4 space-y-4 bg-card">
        <h2 className="text-lg font-semibold">{t("admin.backupTitle")}</h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">{t("admin.backupEnable")}</span>
        </label>

        <Input
          id="backup-endpoint"
          name="endpoint"
          label={t("admin.backupEndpoint")}
          type="text"
          value={config.endpoint}
          placeholder={t("admin.backupEndpointPlaceholder")}
          onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="backup-bucket"
            name="bucket"
            label={t("admin.backupBucket")}
            type="text"
            value={config.bucket}
            placeholder="my-backup-bucket"
            onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
          />
          <Input
            id="backup-region"
            name="region"
            label={t("admin.backupRegion")}
            type="text"
            value={config.region}
            placeholder="us-east-1"
            onChange={(e) => setConfig({ ...config, region: e.target.value })}
          />
        </div>

        <Input
          id="backup-prefix"
          name="prefix"
          label={t("admin.backupPrefix")}
          type="text"
          value={config.prefix}
          placeholder="jotty"
          onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
        />

        <Input
          id="backup-access-key"
          name="accessKey"
          label={t("admin.backupAccessKey")}
          type="text"
          value={config.accessKey}
          placeholder={config.hasSecretKey ? "••••••••" : "AKIA..."}
          onChange={(e) => setConfig({ ...config, accessKey: e.target.value })}
        />

        <Input
          id="backup-secret-key"
          name="secretKey"
          label={t("admin.backupSecretKey")}
          type="password"
          value={secretKey}
          placeholder={config.hasSecretKey ? "•••••••• (leave blank to keep)" : "Enter secret key"}
          onChange={(e) => setSecretKey(e.target.value)}
          hideEye={false}
        />

        <div>
          <Input
            id="backup-repo-password"
            name="repoPassword"
            label={t("admin.backupRepoPassword")}
            type="password"
            value={repoPassword}
            placeholder={config.hasRepoPassword ? "•••••••• (leave blank to keep)" : "Enter repository password"}
            onChange={(e) => setRepoPassword(e.target.value)}
            hideEye={false}
          />
          <p className="text-xs text-muted-foreground mt-1">{t("admin.backupRepoPasswordHelp")}</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">{t("admin.backupSchedule")}</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={config.schedule}
            onChange={(e) => setConfig({ ...config, schedule: e.target.value as BackupSchedulePreset })}
          >
            {SCHEDULE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`admin.backupSchedule${opt.charAt(0).toUpperCase()}${opt.slice(1)}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{t("admin.backupKeepDaily")}</label>
            <input
              type="number"
              min={0}
              max={365}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={config.keepDaily}
              onChange={(e) => setConfig({ ...config, keepDaily: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t("admin.backupKeepWeekly")}</label>
            <input
              type="number"
              min={0}
              max={52}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={config.keepWeekly}
              onChange={(e) => setConfig({ ...config, keepWeekly: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("admin.backupRetentionHelp")}</p>

        <Button variant="default" onClick={handleSave} disabled={saving}>
          {saving ? "..." : t("admin.backupSave")}
        </Button>
      </div>

      {/* Snapshots list */}
      <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
        <h2 className="text-lg font-semibold">{t("admin.backupSnapshots")}</h2>
        {snapshots.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("admin.backupNoSnapshots")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-medium">{t("admin.backupSnapshotId")}</th>
                  <th className="py-2 pr-4 font-medium">{t("admin.backupSnapshotTime")}</th>
                  <th className="py-2 pr-4 font-medium">{t("admin.backupSnapshotPaths")}</th>
                  <th className="py-2 pr-4 font-medium">{t("admin.backupRestore")}</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs">{snap.short_id}</td>
                    <td className="py-2 pr-4">{formatDate(snap.time)}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {snap.paths.join(", ")}
                    </td>
                    <td className="py-2 pr-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmRestoreId(snap.id)}
                        disabled={restoring !== null}
                      >
                        {restoring === snap.id ? "..." : t("admin.backupRestore")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore confirmation modal */}
      {confirmRestoreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-lg border border-border bg-card p-6 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-semibold">{t("admin.backupRestoreConfirmTitle")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("admin.backupRestoreConfirmMessage", { snapshotId: confirmRestoreId.slice(0, 8) })}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmRestoreId(null)}
                disabled={restoring !== null}
              >
                {t("admin.backupRestoreCancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRestore(confirmRestoreId)}
                disabled={restoring !== null}
              >
                {restoring === confirmRestoreId ? "..." : t("admin.backupRestoreConfirmButton")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};