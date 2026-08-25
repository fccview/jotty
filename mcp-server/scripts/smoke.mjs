/*
 * Smoke test for the jotty-mcp stdio server. Spawns the built server with dummy
 * credentials and drives the MCP JSON-RPC protocol over stdin, checking that
 * initialize, tools/list and a tools/call (health, against an unreachable URL)
 * behave correctly. No real Jotty instance is required.
 */
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  JOTTY_URL: "http://127.0.0.1:9", // port 9 = discard; guarantees a connection failure
  JOTTY_API_KEY: "ck_dummy_key_for_smoke_test",
};

const child = spawn("node", ["dist/index.js"], {
  cwd: process.cwd(),
  env,
  stdio: ["pipe", "pipe", "pipe"],
});

let buf = "";
const responses = [];
child.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (line) {
      try {
        responses.push(JSON.parse(line));
      } catch {
        responses.push({ _raw: line });
      }
    }
  }
});

const stderr = [];
child.stderr.on("data", (c) => stderr.push(c.toString()));

const send = (obj) => child.stdin.write(JSON.stringify(obj) + "\n");

// 1. initialize
send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke-test", version: "0.0.1" },
  },
});

// 2. initialized notification (no response expected)
send({ jsonrpc: "2.0", method: "notifications/initialized" });

// 3. tools/list
send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

setTimeout(() => {
  // 4. tools/call health — should fail gracefully (network error) with isError
  send({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "health", arguments: {} },
  });
}, 200);

setTimeout(() => {
  child.stdin.end();
}, 800);

child.on("close", (code) => {
  const init = responses.find((r) => r.id === 1);
  const list = responses.find((r) => r.id === 2);
  const call = responses.find((r) => r.id === 3);

  let ok = true;
  const check = (cond, msg) => {
    if (!cond) {
      ok = false;
      console.error("  FAIL:", msg);
    } else {
      console.log("  ok:", msg);
    }
  };

  console.log("initialize:");
  check(!!init, "initialize returned a result");
  check(init?.result?.serverInfo?.name === "jotty", "server name is jotty");
  check(!!init?.result?.capabilities?.tools, "advertises tools capability");

  console.log("tools/list:");
  check(!!list, "tools/list returned a result");
  const names = (list?.result?.tools ?? []).map((t) => t.name);
  check(names.length >= 40, `tools/list returned ${names.length} tools (>=40)`);
  check(names.includes("list_checklists"), "includes list_checklists");
  check(names.includes("create_note"), "includes create_note");
  check(names.includes("move_board_item"), "includes move_board_item");
  check(
    !!list?.result?.tools?.find((t) => t.name === "list_checklists")?.inputSchema,
    "list_checklists has an inputSchema",
  );

  console.log("tools/call health (unreachable URL):");
  check(!!call, "health call returned a result");
  check(call?.result?.isError === true, "health call reports isError (network failed)");
  check(
    typeof call?.result?.content?.[0]?.text === "string",
    "health call returns a text content block",
  );

  console.log("stderr:", stderr.join("").trim() || "(empty)");
  console.log("exit code:", code);
  console.log(ok ? "\nSMOKE TEST PASSED" : "\nSMOKE TEST FAILED");
  process.exit(ok ? 0 : 1);
});