// Durable PO regression registration. Logs/screenshots belong to the external caller.
const path = require("node:path"), { spawnSync } = require("node:child_process");
const tests = ["recovery-loop-01a.test.cjs", "recovery-loop-01b.test.cjs", "recovery-loop-01c.test.cjs",
  "recovery-loop-01a-product-smoke.cjs", "recovery-loop-01b-product-smoke.cjs", "recovery-loop-01c-product-smoke.cjs",
  "recovery-loop-01a-milestone.cjs", "history-slow-dead-contract-closure-product-smoke.cjs"];
let passed = 0;
for (const file of tests) {
  console.log("RUN " + file);
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], { cwd: path.resolve(__dirname, ".."), env: process.env, stdio: "inherit" });
  if (result.error || result.status !== 0) { console.error(result.error || "FAILED " + file); process.exitCode = 1; break; }
  passed++;
}
console.log(JSON.stringify({ suite: "RECOVERY-LOOP-01C", passed, total: tests.length }));
