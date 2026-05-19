(function() {
  'use strict';

  // Prevent multiple initializations if script runs multiple times
  if (window.__taintExportInitialized) {
    return;
  }
  window.__taintExportInitialized = true;

  // Cache the export URL and single-mode flag to avoid repeated API calls
  let cachedExportUrl = null;
  let cachedSingleMode = false;
  let initPromise = null;

  // Track in-flight requests to serialize network calls
  let fetchInProgress = false;
  let pendingReports = [];

  // Validate that a string is a valid URL
  function isValidUrl(urlString) {
    if (!urlString || urlString === "") {
      return false;
    }
    try {
      const url = new URL(urlString);
      // Only allow http and https protocols for security
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  // Initialize the export URL and single-mode flag (called once at startup)
  function initializeConfig() {
    if (!initPromise) {
      initPromise = Promise.all([
        browser.tainting.getTaintExportUrl(),
        browser.tainting.getTaintExportSingleMode()
      ])
        .then(([url, singleMode]) => {
          // Validate the URL
          if (!url || url === "") {
            cachedExportUrl = "";
            console.info("[Taint-Export] No export URL configured");
            return { url: "", singleMode: false };
          }

          if (!isValidUrl(url)) {
            console.error("[Taint-Export] Invalid URL provided:", url);
            cachedExportUrl = "";
            cachedSingleMode = false;
            return { url: "", singleMode: false };
          }

          cachedExportUrl = url;
          cachedSingleMode = singleMode;
          console.info("[Taint-Export] Initialized with valid URL, single-mode:", singleMode);
          return { url: cachedExportUrl, singleMode: cachedSingleMode };
        })
        .catch((e) => {
          console.error("[Taint-Export] Failed to initialize configuration:", e);
          cachedExportUrl = "";
          cachedSingleMode = false;
          return { url: "", singleMode: false };
        });
    }
    return initPromise;
  }

  // Send a batch of taint reports to the server
  async function sendReports(reports) {
    if (fetchInProgress) {
      // Queue reports if a fetch is already in progress
      pendingReports.push(...reports);
      return;
    }

    fetchInProgress = true;

    try {
      let body_string;

      // Check if single-mode is enabled (legacy format)
      if (cachedSingleMode && reports.length > 0) {
        // Send only the first report in legacy format
        body_string = JSON.stringify(reports[0]);

        // Queue remaining reports for next iteration
        if (reports.length > 1) {
          pendingReports.push(...reports.slice(1));
        }

        console.debug("[Taint-Export] Sending single taint flow (legacy mode) to " + cachedExportUrl);
      } else {
        // Send all reports in batch format
        body_string = JSON.stringify({
          findings: reports
        });

        console.debug("[Taint-Export] Sending " + reports.length + " taint flow(s) to " + cachedExportUrl);
      }

      // fetch is a sink, so untaint to prevent recursive events
      body_string.untaint();

      const response = await fetch(cachedExportUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body_string
      });

      // Only print something if there is an error response code
      if (response.status < 200 || response.status >= 300) {
        console.error("[Taint-Export] Response:", response.status, "from:", cachedExportUrl);
      }
    } catch (e) {
      console.error("[Taint-Export] Error exporting taint flows:", e);
    } finally {
      fetchInProgress = false;

      // Process any reports that queued up during the fetch
      if (pendingReports.length > 0) {
        const nextBatch = pendingReports.splice(0);
        sendReports(nextBatch);
      }
    }
  }

  // Event handler for Tainfox taint report
  function handleTaintReport(report) {
    // Skip if still initializing
    if (cachedExportUrl === null) {
      console.warn("[Taint-Export] Still initializing, skipping report");
      return;
    }

    // Skip if not configured
    if (cachedExportUrl === "") {
      return;
    }

    try {
      // Create report data
      const reportData = {
        detail: report.detail,
        taint: report.detail.str.taint,
        timestamp: Date.now()
      };

      // Send immediately (no batching by default)
      sendReports([reportData]);
    } catch (e) {
      console.error("[Taint-Export] Error handling taint report:", e);
    }
  }

  // Initialize and start listening for events
  console.info("[Taint-Export] Starting Taint Export Service");

  initializeConfig().then(() => {
    // Only add listener after initialization completes
    window.addEventListener('__taintreport', handleTaintReport);
    console.info("[Taint-Export] Ready to export taint flows");
  });

})(window);