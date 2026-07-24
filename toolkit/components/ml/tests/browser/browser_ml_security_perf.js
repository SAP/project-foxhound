/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// If metadata here are updated, run:  `./mach lint -l perfdocs --fix .` to update docs
const perfMetadata = {
  owner: "GenAI Team",
  name: "ML Security Orchestrator Performance Tests",
  description: "Template test for latency for ML Security Orchestrator",
  options: {
    default: {
      perfherder: true,
      perfherder_metrics: [
        {
          name: "latency",
          unit: "ms",
          shouldAlert: false,
        },
      ],
      verbose: true,
      manifest: "perftest.toml",
      manifest_flavor: "browser-chrome",
      try_platform: ["linux", "mac", "win"],
    },
  },
};

requestLongerTimeout(20);

add_task(async function test_ml_security() {
  const totalLatencyName = "total_latency";
  const metrics = [totalLatencyName];

  const journal = {};
  for (const name of metrics) {
    journal[name] = [];
  }

  const nIterations = 10;

  for (let i = 0; i < nIterations; i++) {
    await setupSecurity();

    const testSessionId = "test-session";

    const startTime = ChromeUtils.now();

    const orchestrator = await sharedGetSecurityOrchestrator();
    orchestrator.registerSession(testSessionId);
    const ledger = orchestrator.getSessionLedger(testSessionId);
    ledger.forTab("tab-1");

    // tool.execution phase should match our policies
    const decision = await orchestrator.evaluate(testSessionId, {
      phase: "tool.execution",
      action: {
        type: "tool.call",
        tool: "get_page_content",
        urls: ["https://evil.com"],
        tabId: "tab-1",
      },
      context: {
        currentTabId: "tab-1",
        mentionedTabIds: [],
        requestId: "test",
      },
    });

    const evaluatorLatency = ChromeUtils.now() - startTime;

    journal[totalLatencyName].push(evaluatorLatency);

    Assert.notEqual(decision, null);

    await teardownSecurity();
  }

  reportMetrics(journal);
});
