"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown01Icon, ArrowRight01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Textarea } from "@/app/_components/GlobalComponents/FormElements/Textarea";
import { cn } from "@/app/_utils/global-utils";
import {
  ExplorerMethod,
  ExplorerSpec,
  Operation,
  bodySchemaOf,
  buildUrl,
  resolve,
  sampleOf,
} from "./api-explorer-utils";
import { useTryIt } from "./useTryIt";

interface OperationCardProps {
  spec: ExplorerSpec;
  operation: Operation;
  apiKey: string;
  apiBase: string;
}

const METHOD_TONES: Record<string, string> = {
  [ExplorerMethod.GET]: "bg-primary/10 text-primary",
  [ExplorerMethod.DELETE]: "bg-destructive/10 text-destructive",
};

const DEFAULT_TONE = "bg-accent text-accent-foreground";
const FIRST_ERROR_STATUS = 400;

export const OperationCard = ({ spec, operation, apiKey, apiBase }: OperationCardProps) => {
  const t = useTranslations("apiExplorer");
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const bodySchema = bodySchemaOf(operation);
  const [body, setBody] = useState(() =>
    bodySchema ? JSON.stringify(sampleOf(spec, bodySchema), null, 2) : "",
  );
  const [showSchema, setShowSchema] = useState(false);
  const { result, isSending, failure, send } = useTryIt();

  const setValue = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  const handleSend = () =>
    send(
      operation.method,
      buildUrl(apiBase, operation.path, values, operation.parameters),
      apiKey,
      bodySchema ? body : undefined,
    );

  const Chevron = isOpen ? ArrowDown01Icon : ArrowRight01Icon;

  return (
    <div className="border border-border rounded-jotty bg-card">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors rounded-jotty"
      >
        <span
          className={cn(
            "w-16 shrink-0 rounded-jotty px-2 py-1 text-center font-mono text-xs font-semibold uppercase",
            METHOD_TONES[operation.method] ?? DEFAULT_TONE,
          )}
        >
          {operation.method}
        </span>
        <span className="font-mono text-sm text-foreground break-all">{operation.path}</span>
        <span className="hidden md:inline text-sm text-muted-foreground truncate">
          {operation.summary}
        </span>
        {operation.deprecated && (
          <span className="text-xs text-muted-foreground">{t("deprecated")}</span>
        )}
        <Chevron className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-border/70 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{operation.summary}</p>
            {operation.description && (
              <p className="text-sm text-muted-foreground">{operation.description}</p>
            )}
            <p className="font-mono text-xs text-muted-foreground">
              {operation.operationId}
              {operation.isPublic && ` · ${t("noKeyNeeded")}`}
            </p>
          </div>

          {operation.parameters.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {operation.parameters.map((param) => (
                <Input
                  key={`${param.in}-${param.name}`}
                  id={`${operation.operationId}-${param.name}`}
                  type="text"
                  label={`${param.name}${param.required ? " *" : ""} (${param.in})`}
                  description={param.description}
                  placeholder={resolve(spec, param.schema).enum?.join(" | ")}
                  value={values[param.name] ?? ""}
                  onChange={(event) => setValue(param.name, event.target.value)}
                />
              ))}
            </div>
          )}

          {bodySchema && (
            <div className="space-y-2">
              <Textarea
                id={`${operation.operationId}-body`}
                label={t("body")}
                value={body}
                rows={8}
                className="font-mono text-xs"
                onChange={(event) => setBody(event.target.value)}
              />
              <Button variant="link" size="xs" onClick={() => setShowSchema(!showSchema)}>
                {showSchema ? t("hideSchema") : t("showSchema")}
              </Button>
              {showSchema && (
                <pre className="max-h-72 overflow-auto rounded-jotty bg-muted p-3 font-mono text-xs">
                  {JSON.stringify(resolve(spec, bodySchema), null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSending || (!apiKey && !operation.isPublic)}
            >
              {isSending ? t("sending") : t("send")}
            </Button>
            {!apiKey && !operation.isPublic && (
              <span className="text-xs text-muted-foreground">{t("keyRequired")}</span>
            )}
          </div>

          {failure && <p className="text-sm text-destructive">{t("requestFailed")}</p>}

          {result && (
            <div className="space-y-2">
              <p
                className={cn(
                  "font-mono text-xs",
                  result.status < FIRST_ERROR_STATUS ? "text-primary" : "text-destructive",
                )}
              >
                {t("responseMeta", { status: result.status, ms: result.ms })}
              </p>
              <pre className="max-h-96 overflow-auto rounded-jotty bg-muted p-3 font-mono text-xs">
                {result.body}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
