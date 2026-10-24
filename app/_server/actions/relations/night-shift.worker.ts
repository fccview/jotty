import "./night-shift.setup";
import { parentPort } from "node:worker_threads";
import { ShiftNotes } from "@/app/_consts/relations";
import { workShift, type Shift } from "./sweep";

let line: Promise<void> = Promise.resolve();

parentPort?.on("message", ({ id, shift }: { id: number; shift: Shift }) => {
  line = line.then(async () => {
    try {
      parentPort?.postMessage({ kind: ShiftNotes.DONE, id, result: await workShift(shift) });
    } catch (error) {
      console.error(`Relations night shift dropped a ${shift.kind} sweep:`, error);
      parentPort?.postMessage({ kind: ShiftNotes.FAILED, id, error: String(error) });
    }
  });
});
