import { EnvVar, readEnv } from "../config/env.ts";

export enum LogLevel {
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
  Silent = "silent",
}

const RANKS: Record<LogLevel, number> = {
  [LogLevel.Debug]: 10,
  [LogLevel.Info]: 20,
  [LogLevel.Warn]: 30,
  [LogLevel.Error]: 40,
  [LogLevel.Silent]: 99,
};

const currentLevel = (): LogLevel =>
  Object.values(LogLevel).find((level) => level === readEnv(EnvVar.LogLevel).toLowerCase()) ??
  LogLevel.Info;

const emit = (level: LogLevel, namespace: string, message: string, extra?: unknown): void => {
  if (RANKS[level] < RANKS[currentLevel()]) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase()} [${namespace}] ${message}`;
  if (extra === undefined) console.error(line);
  else console.error(line, extra instanceof Error ? extra.message : extra);
};

export const logger = {
  debug: (namespace: string, message: string, extra?: unknown) =>
    emit(LogLevel.Debug, namespace, message, extra),
  info: (namespace: string, message: string, extra?: unknown) =>
    emit(LogLevel.Info, namespace, message, extra),
  warn: (namespace: string, message: string, extra?: unknown) =>
    emit(LogLevel.Warn, namespace, message, extra),
  error: (namespace: string, message: string, extra?: unknown) =>
    emit(LogLevel.Error, namespace, message, extra),
};
