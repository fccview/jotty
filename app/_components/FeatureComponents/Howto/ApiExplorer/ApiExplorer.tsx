"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { getApiKey } from "@/app/_server/actions/api";
import { ExplorerSpec, groupByTag, operationsOf } from "./api-explorer-utils";
import { OperationCard } from "./OperationCard";

interface ApiExplorerProps {
  spec: ExplorerSpec;
}

const API_BASE = "/api";

export const ApiExplorer = ({ spec }: ApiExplorerProps) => {
  const t = useTranslations("apiExplorer");
  const [apiKey, setApiKey] = useState("");
  const [filter, setFilter] = useState("");
  const [keyMissing, setKeyMissing] = useState(false);

  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matches = operationsOf(spec).filter(
      (op) =>
        !needle ||
        [op.path, op.summary, op.operationId, op.method].some((field) =>
          field.toLowerCase().includes(needle),
        ),
    );
    return Object.entries(groupByTag(matches));
  }, [spec, filter]);

  const fillMyKey = async () => {
    const result = await getApiKey();
    const key = result.success ? result.data : null;
    setKeyMissing(!key);
    if (key) setApiKey(key);
  };

  return (
    <div id="api-explorer" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro", { version: spec.info.version })}</p>
        <p className="text-sm text-muted-foreground">{t("realData")}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-end gap-3">
          <Input
            id="api-explorer-key"
            type="password"
            label={t("apiKey")}
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <Button variant="outline" className="h-11 lg:h-10 shrink-0" onClick={fillMyKey}>
            {t("useMyKey")}
          </Button>
        </div>
        <p className="text-md lg:text-xs text-muted-foreground">
          {keyMissing ? t("noKeyYet") : t("apiKeyHint")}
        </p>
      </div>

      <Input
        id="api-explorer-filter"
        type="search"
        label={t("filter")}
        placeholder={t("filterPlaceholder")}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />

      {groups.length === 0 && <p className="text-muted-foreground">{t("noMatches")}</p>}

      {groups.map(([tag, operations]) => (
        <section key={tag} className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{tag}</h2>
          {operations.map((operation) => (
            <OperationCard
              key={operation.operationId}
              spec={spec}
              operation={operation}
              apiKey={apiKey}
              apiBase={API_BASE}
            />
          ))}
        </section>
      ))}
    </div>
  );
};
