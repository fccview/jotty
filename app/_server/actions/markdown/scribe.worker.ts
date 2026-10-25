import { parentPort } from "node:worker_threads";
import { htmlToMarkdown, type HtmlImport } from "./from-html";

parentPort?.on("message", async (job: HtmlImport) => {
  try {
    parentPort?.postMessage({ markdown: await htmlToMarkdown(job) });
  } catch (error) {
    console.error("Scribe could not convert html:", error);
    parentPort?.postMessage({ error: String(error) });
  }
});
