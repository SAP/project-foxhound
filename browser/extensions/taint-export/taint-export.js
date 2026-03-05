(function() {
  'use strict';

  // Prevent multiple initializations if script runs multiple times
  if (window.__taintExportInitialized) {
    return;
  }
  window.__taintExportInitialized = true;

  // Cache the export URL to avoid repeated API calls
  let cachedExportUrl = null;
  let urlInitPromise = null;

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

  // Initialize the export URL (called once at startup)
  function initializeExportUrl() {
    if (!urlInitPromise) {
      urlInitPromise = browser.tainting.getTaintExportUrl()
        .then((url) => {
          // Validate the URL
          if (!url || url === "") {
            cachedExportUrl = "";
            console.info("[Taint-Export] No export URL configured");
            return "";
          }

          if (!isValidUrl(url)) {
            console.error("[Taint-Export] Invalid URL provided:", url);
            cachedExportUrl = "";
            return "";
          }

          cachedExportUrl = url;
          console.info("[Taint-Export] Initialized with valid URL");
          return cachedExportUrl;
        })
        .catch((e) => {
          console.error("[Taint-Export] Failed to initialize export URL:", e);
          cachedExportUrl = "";
          return "";
        });
    }
    return urlInitPromise;
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
      // Serialize reports to JSON
      const body_string = JSON.stringify(
        reports.length === 1
          ? reports[0] // Single report - keep backward compatible format
          : { reports: reports } // Multiple reports - batch format
      );

      // fetch is a sink, so untaint to prevent recursive events
      body_string.untaint();

      console.log("[Taint-Export] Sending " + reports.length + " taint flow(s) to " + cachedExportUrl);

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

  initializeExportUrl().then(() => {
    // Only add listener after initialization completes
    window.addEventListener('__taintreport', handleTaintReport);
    console.info("[Taint-Export] Ready to export taint flows");
  });

})(window);