import { loadConfig } from "./config/load.ts";
import { Transport } from "./config/schema.ts";
import { createClient } from "./jotty/client.ts";
import { createSpecSource } from "./jotty/spec.ts";
import { createSidecar, startHttp } from "./server/http.ts";
import { startStdio } from "./server/stdio.ts";
import type { ToolContext } from "./tools/context.ts";
import { logger } from "./utils/logger.ts";

const LOG_NS = "main";

export const bootstrap = (): ToolContext => {
  const config = loadConfig();
  return {
    config,
    client: createClient(config.jotty),
    specs: createSpecSource(config.specTtlMs),
    startedAt: Date.now(),
  };
};

export const main = async (): Promise<void> => {
  const ctx = bootstrap();
  const running =
    ctx.config.server.transport === Transport.Http
      ? startHttp(createSidecar(ctx), ctx.config)
      : await startStdio(ctx);

  const shutdown = (signal: string): void => {
    logger.info(LOG_NS, `${signal} received, shutting down`);
    void running.stop().then(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

if (import.meta.main) {
  await main();
}
