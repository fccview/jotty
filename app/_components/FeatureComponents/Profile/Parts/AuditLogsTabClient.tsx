"use client";

import { useState, useEffect } from "react";
import { AuditLogEntry, AuditLogFilters } from "@/app/_types";
import { AuditLogCard } from "@/app/_components/GlobalComponents/Cards/AuditLogCard";
import { AuditLogsFilters } from "@/app/_components/GlobalComponents/Filters/AuditLogsFilters";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Download01Icon, ArrowLeft01Icon, ArrowRight01Icon, AlertCircleIcon } from "hugeicons-react";
import { Logo } from "@/app/_components/GlobalComponents/Layout/Logo/Logo";
import { useTranslations } from "next-intl";
import { getAuditLogs, exportAuditLogs, cleanupOldLogs } from "@/app/_server/actions/log";
import { useToast } from "@/app/_providers/ToastProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface AuditLogsTabClientProps {
    initialLogs: AuditLogEntry[];
    initialTotal: number;
    cleanupNeeded: boolean;
    oldLogsCount: number;
    maxLogAge: number;
}

export const AuditLogsTabClient = ({
    initialLogs,
    initialTotal,
    cleanupNeeded,
    oldLogsCount,
    maxLogAge
}: AuditLogsTabClientProps) => {
    const t = useTranslations();
    const { showToast } = useToast();
    const { user } = useAppMode();
    const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
    const [filters, setFilters] = useState<AuditLogFilters>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(1);
    const [showCleanupCard, setShowCleanupCard] = useState(cleanupNeeded);
    const limit = 20;

    useEffect(() => {
        fetchLogs();
    }, [filters, page]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const result = await getAuditLogs({
                ...filters,
                limit,
                offset: (page - 1) * limit,
            });

            setLogs(result.logs || []);
            setTotal(result.total || 0);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async (format: "json" | "csv") => {
        setIsExporting(true);
        try {
            const result = await exportAuditLogs(format, filters);

            if (result.success && result.data) {
                const blob = new Blob([result.data], {
                    type: format === "json" ? "application/json" : "text/csv",
                });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error("Error exporting logs:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleCleanupNow = async () => {
        setIsCleaning(true);
        try {
            const result = await cleanupOldLogs(user?.username);

            if (result.success) {
                showToast({
                    type: "success",
                    title: t("auditLogs.cleanupSuccess"),
                    message: t("auditLogs.cleanupSuccessMessage", {
                        count: result.deletedFiles
                    })
                });
                setShowCleanupCard(false);
                fetchLogs();
            } else {
                showToast({
                    type: "error",
                    title: t("auditLogs.cleanupError"),
                    message: result.error || t("auditLogs.cleanupError")
                });
            }
        } catch (error) {
            console.error("Error cleaning up logs:", error);
            showToast({
                type: "error",
                title: t("auditLogs.cleanupError"),
                message: error instanceof Error ? error.message : t("auditLogs.cleanupError")
            });
        } finally {
            setIsCleaning(false);
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <AuditLogsFilters
                filters={filters}
                onFiltersChange={(newFilters) => {
                    setFilters(newFilters);
                    setPage(1);
                }}
                showUserFilter={false}
            />

            {showCleanupCard && maxLogAge > 0 && (
                <div className="bg-warning/10 border border-warning rounded-jotty p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircleIcon className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                                {t("auditLogs.oldLogsFound", {
                                    count: oldLogsCount,
                                    days: maxLogAge
                                })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t("auditLogs.oldLogsFoundDescription")}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                size="sm"
                                onClick={handleCleanupNow}
                                disabled={isCleaning}
                            >
                                {isCleaning ? (
                                    <>
                                        <Logo className="h-4 w-4 mr-2 animate-pulse" />
                                        {t("common.cleaning")}
                                    </>
                                ) : (
                                    t("auditLogs.cleanUpNow")
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCleanupCard(false)}
                                disabled={isCleaning}
                            >
                                {t("common.dismiss")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-end">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none w-full sm:w-auto"
                        onClick={() => handleExport("json")}
                        disabled={isExporting || logs.length === 0}
                    >
                        {isExporting ? (
                            <Logo className="h-4 w-4 mr-2 animate-pulse" />
                        ) : (
                            <Download01Icon className="h-4 w-4 mr-2" />
                        )}
                        {t("common.exportJson")}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none w-full sm:w-auto"
                        onClick={() => handleExport("csv")}
                        disabled={isExporting || logs.length === 0}
                    >
                        {isExporting ? (
                            <Logo className="h-4 w-4 mr-2 animate-pulse" />
                        ) : (
                            <Download01Icon className="h-4 w-4 mr-2" />
                        )}
                        {t("common.exportCsv")}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Logo className="h-8 w-8 animate-pulse" />
                </div>
            ) : logs.length === 0 ? (
                <div className="bg-card border border-border rounded-jotty p-8 text-center">
                    <p className="text-muted-foreground">{t("auditLogs.noLogsFound")}</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <AuditLogCard key={log.uuid} log={log} showUsername={false} />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {t("common.showingResults", {
                                    start: (page - 1) * limit + 1,
                                    end: Math.min(page * limit, total),
                                    total,
                                })}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ArrowLeft01Icon className="h-4 w-4 mr-2" />
                                    {t("common.previous")}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    {t("common.next")}
                                    <ArrowRight01Icon className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
