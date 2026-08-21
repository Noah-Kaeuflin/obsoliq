(function () {
  const tests = [];
  const results = [];
  let running = false;

  function formatDuration(ms) {
    return `${Math.round(ms)} ms`;
  }

  function renderSummary(summary) {
    const target = document.getElementById("summary");
    if (!target) return;
    target.innerHTML = `
      <strong>${summary.status}</strong>
      <span>Total: ${summary.total}</span>
      <span>Passed: ${summary.passed}</span>
      <span>Failed: ${summary.failed}</span>
      <span>Duration: ${formatDuration(summary.durationMs)}</span>
    `;
  }

  function renderResult(result) {
    const list = document.getElementById("results");
    if (!list) return;
    const item = document.createElement("li");
    item.className = `result ${result.status}`;
    item.innerHTML = `
      <div class="result-title">${result.status.toUpperCase()} · ${result.name}</div>
      <div class="result-meta">${formatDuration(result.durationMs)} · ${result.assertions} assertions</div>
      ${result.error ? `<div class="error">${result.error}</div>` : ""}
    `;
    list.appendChild(item);
  }

  function fail(message) {
    throw new Error(message);
  }

  function createAssert() {
    let count = 0;
    return {
      get count() {
        return count;
      },
      ok(value, message = "Expected value to be truthy") {
        count += 1;
        if (!value) fail(message);
      },
      equal(actual, expected, message = "Expected values to be equal") {
        count += 1;
        if (actual !== expected) fail(`${message}\nExpected: ${expected}\nActual: ${actual}`);
      },
      notEqual(actual, expected, message = "Expected values to differ") {
        count += 1;
        if (actual === expected) fail(`${message}\nBoth: ${actual}`);
      },
      deepEqual(actual, expected, message = "Expected values to be deeply equal") {
        count += 1;
        const actualText = JSON.stringify(actual);
        const expectedText = JSON.stringify(expected);
        if (actualText !== expectedText) fail(`${message}\nExpected: ${expectedText}\nActual: ${actualText}`);
      },
      includes(values, expected, message = "Expected collection to include value") {
        count += 1;
        if (![...values].includes(expected)) fail(`${message}\nExpected member: ${expected}`);
      },
      throws(fn, message = "Expected function to throw") {
        count += 1;
        let thrown = false;
        try {
          fn();
        } catch {
          thrown = true;
        }
        if (!thrown) fail(message);
      }
    };
  }

  function test(name, fn) {
    tests.push({ name, fn });
  }

  async function run() {
    if (running) return window.__OBSOLIQ_TEST_RESULTS__;
    running = true;
    results.length = 0;
    const list = document.getElementById("results");
    if (list) list.innerHTML = "";
    const started = performance.now();
    renderSummary({ status: "RUNNING", total: tests.length, passed: 0, failed: 0, durationMs: 0 });
    for (const testCase of tests) {
      const assert = createAssert();
      const testStarted = performance.now();
      try {
        await testCase.fn(assert);
        const result = {
          name: testCase.name,
          status: "pass",
          assertions: assert.count,
          durationMs: performance.now() - testStarted,
          error: ""
        };
        results.push(result);
        renderResult(result);
      } catch (error) {
        const result = {
          name: testCase.name,
          status: "fail",
          assertions: assert.count,
          durationMs: performance.now() - testStarted,
          error: error?.stack || error?.message || String(error)
        };
        results.push(result);
        renderResult(result);
      }
    }
    const failedResults = results.filter(result => result.status === "fail");
    const passedResults = results.filter(result => result.status === "pass");
    const status = failedResults.length ? "failed" : "passed";
    const summary = {
      status,
      total: tests.length,
      passed: passedResults.length,
      failed: failedResults.length,
      skipped: 0,
      durationMs: performance.now() - started,
      failures: failedResults.map(result => ({
        name: result.name,
        error: result.error
      })),
      results: [...results]
    };
    const legacySummary = {
      ...summary,
      status: status === "passed" ? "PASS" : "FAIL"
    };
    window.__OBSOLIQ_TEST_RESULT__ = summary;
    window.__OBSOLIQ_TEST_RESULTS__ = legacySummary;
    document.title = `ObsoliQ Tests ${legacySummary.status}`;
    renderSummary(legacySummary);
    running = false;
    return summary;
  }

  window.ObsoliQTests = {
    test,
    run,
    get tests() {
      return [...tests];
    },
    get results() {
      return [...results];
    }
  };
})();
