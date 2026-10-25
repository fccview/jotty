import { Worker } from "node:worker_threads";
import { gated } from "@/app/_server/actions/lib/concurrency";
import { htmlToMarkdown, type HtmlImport } from "./from-html";

export enum ScribeRefusal {
  BUSY = "busy",
  TOO_HEAVY = "tooHeavy",
}

export type ScribeResult = { markdown: string } | { refusal: ScribeRefusal };

interface ScribeNote {
  markdown?: string;
  error?: string;
}

declare global {
  var __jottyScribe: Worker | undefined;
}

const SCRIBE_TIMEOUT_MS = 15_000;
const SCRIBE_HEAP_MB = 512;
const SCRIBE_QUEUE = 8;
const OUT_OF_MEMORY = "ERR_WORKER_OUT_OF_MEMORY";
const SCRIBES_INLINE = process.env.NODE_ENV === "test";

const desk = gated(1);
let waiting = 0;

const _hire = (): Worker => {
  const held = globalThis.__jottyScribe;
  if (held) return held;
  const worker = new Worker(new URL("./scribe.worker.ts", import.meta.url), {
    resourceLimits: { maxOldGenerationSizeMb: SCRIBE_HEAP_MB },
  });
  worker.on("exit", () => {
    if (globalThis.__jottyScribe === worker) globalThis.__jottyScribe = undefined;
  });
  worker.unref();
  globalThis.__jottyScribe = worker;
  return worker;
};

const _fire = (worker: Worker) => {
  if (globalThis.__jottyScribe === worker) globalThis.__jottyScribe = undefined;
  worker.terminate().catch((error) => console.error("Scribe would not leave quietly:", error));
};

const _write = (job: HtmlImport): Promise<ScribeResult> =>
  new Promise((resolve, reject) => {
    const worker = _hire();

    const settle = () => {
      clearTimeout(timer);
      worker.off("message", onNote);
      worker.off("error", onError);
      worker.off("exit", onExit);
    };

    const onNote = (note: ScribeNote) => {
      settle();
      if (note.error === undefined) resolve({ markdown: note.markdown ?? "" });
      else reject(new Error(note.error));
    };

    const onError = (error: Error & { code?: string }) => {
      settle();
      _fire(worker);
      if (error.code !== OUT_OF_MEMORY) return reject(error);
      console.warn(`Scribe ran out of its ${SCRIBE_HEAP_MB} MB converting html`);
      resolve({ refusal: ScribeRefusal.TOO_HEAVY });
    };

    const onExit = (code: number) => {
      settle();
      reject(new Error(`Scribe left with code ${code}`));
    };

    const timer = setTimeout(() => {
      settle();
      _fire(worker);
      console.warn(`Scribe gave up on html after ${SCRIBE_TIMEOUT_MS} ms`);
      resolve({ refusal: ScribeRefusal.TOO_HEAVY });
    }, SCRIBE_TIMEOUT_MS);

    worker.on("message", onNote);
    worker.on("error", onError);
    worker.on("exit", onExit);
    worker.postMessage(job);
  });

export const transcribe = async (job: HtmlImport): Promise<ScribeResult> => {
  if (SCRIBES_INLINE) return { markdown: await htmlToMarkdown(job) };
  if (waiting >= SCRIBE_QUEUE) return { refusal: ScribeRefusal.BUSY };
  waiting++;
  try {
    return await desk(() => _write(job));
  } finally {
    waiting--;
  }
};
