/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Normalize failure messages to remove task-specific and time-specific information
function normalizeMessage(message) {
  return message
    ?.replace(/task_\d+/g, "task_id")
    .replace(/\nRejection date: [^\n]+/g, "")
    .replace(/Test ran for \d+s/g, "Test ran for Xs");
}

function formatTaskMessage(taskId, message) {
  return `      Task ${taskId}: ${message}`;
}

// Extract parallel execution time ranges from markers
function extractParallelRanges(markers) {
  const parallelRanges = [];

  for (let i = 0; i < markers.length; i++) {
    const data = markers.data[i];
    // Look for markers with type: "Text" and text: "parallel"
    if (data?.type === "Text" && data.text === "parallel") {
      parallelRanges.push({
        start: markers.startTime[i],
        end: markers.endTime[i],
      });
    }
  }

  return parallelRanges;
}

// Check if a test time overlaps with any parallel execution range
function isInParallelRange(testStart, testEnd, parallelRanges) {
  for (const range of parallelRanges) {
    // Check if test overlaps with parallel range
    if (testStart < range.end && testEnd > range.start) {
      return true;
    }
  }
  return false;
}

// Extract resource usage information from profile
function extractResourceUsage(profile) {
  if (!profile || !profile.threads || !profile.threads[0]) {
    return null;
  }

  const thread = profile.threads[0];
  const { markers } = thread;

  if (!markers || !markers.data) {
    return null;
  }

  // Extract machine info from profile metadata
  // Convert memory to GB with 1 decimal place to avoid grouping issues from tiny variations
  const machineInfo = {
    logicalCPUs: profile.meta?.logicalCPUs || null,
    physicalCPUs: profile.meta?.physicalCPUs || null,
    mainMemory: profile.meta?.mainMemory
      ? parseFloat((profile.meta.mainMemory / (1024 * 1024 * 1024)).toFixed(1))
      : null,
  };

  let maxMemory = 0;
  let idleTime = 0;
  let singleCoreTime = 0;
  // CPU buckets: [0-10%, 10-20%, 20-30%, ..., 90-100%]
  const cpuBuckets = new Array(10).fill(0);

  // Calculate thresholds based on core count
  const oneCorePct = machineInfo.logicalCPUs
    ? 100 / machineInfo.logicalCPUs
    : 12.5;
  const idleThreshold = oneCorePct / 2;
  // Single-core range: 0.75 to 1.25 cores (to account for slight variations)
  const singleCoreMin = oneCorePct * 0.75;
  const singleCoreMax = oneCorePct * 1.25;

  // Process markers to gather resource usage
  for (let i = 0; i < markers.length; i++) {
    const data = markers.data[i];
    if (!data) {
      continue;
    }

    const duration = markers.endTime[i] - markers.startTime[i];

    if (data.type === "Mem") {
      if (data.used > maxMemory) {
        maxMemory = data.used;
      }
    } else if (data.type === "CPU") {
      // Parse CPU percentage (e.g., "21.4%" -> 21.4)
      const cpuPercent = parseFloat(data.cpuPercent);
      if (isNaN(cpuPercent)) {
        continue;
      }

      if (cpuPercent < idleThreshold) {
        idleTime += duration;
      }

      // Check if it's in the single-core range
      if (cpuPercent >= singleCoreMin && cpuPercent <= singleCoreMax) {
        singleCoreTime += duration;
      }

      // Compute bucket index: 0-10% -> bucket 0, 10-20% -> bucket 1, etc.
      const bucketIndex = Math.min(Math.floor(cpuPercent / 10), 9);
      cpuBuckets[bucketIndex] += duration;
    }
  }

  return {
    machineInfo,
    maxMemory,
    idleTime,
    singleCoreTime,
    cpuBuckets,
  };
}

// Extract test timings from profile
// eslint-disable-next-line complexity
function extractTestTimings(profile) {
  if (!profile || !profile.threads || !profile.threads[0]) {
    return [];
  }

  const thread = profile.threads[0];
  const { markers, stringArray } = thread;

  if (!markers || !markers.data || !markers.name || !stringArray) {
    return [];
  }

  // First, extract parallel execution ranges
  const parallelRanges = extractParallelRanges(markers);

  // Extract crash markers for later matching with CRASH status tests
  const crashMarkers = [];
  for (let i = 0; i < markers.length; i++) {
    const data = markers.data[i];
    if (data?.type !== "Crash" || !data.test) {
      continue;
    }
    crashMarkers.push({
      testPath: data.test,
      startTime: markers.startTime[i],
      signature: data.signature || null,
      minidump: data.minidump || null,
    });
  }

  // Extract TestStatus markers (FAIL, ERROR) for failure messages
  const failStringId = stringArray.indexOf("FAIL");
  const errorStringId = stringArray.indexOf("ERROR");
  const testStatusMarkers = [];

  for (let i = 0; i < markers.length; i++) {
    const nameId = markers.name[i];
    if (nameId !== failStringId && nameId !== errorStringId) {
      continue;
    }
    const data = markers.data[i];
    if (!data || data.type !== "TestStatus" || !data.test) {
      continue;
    }

    testStatusMarkers.push({
      test: data.test,
      nameId,
      time: markers.startTime[i],
      message: normalizeMessage(data.message),
    });
  }

  // Sort TestStatus markers by test and then time for efficient lookup
  testStatusMarkers.sort(
    (a, b) => a.test.localeCompare(b.test) || a.time - b.time
  );

  const testStringId = stringArray.indexOf("test");
  const timings = [];

  for (let i = 0; i < markers.length; i++) {
    if (markers.name[i] !== testStringId) {
      continue;
    }

    const data = markers.data[i];
    if (!data) {
      continue;
    }

    let testPath = null;
    let status = "UNKNOWN";
    let message = null;

    // Handle both structured and plain text logs
    if (data.type === "Test") {
      // Structured log format
      const fullTestId = data.test || data.name;
      testPath = fullTestId;
      status = data.status || "UNKNOWN";
      // Normalize line breaks in message (convert \r\n to \n) and apply normalizations
      message = normalizeMessage(
        data.message ? data.message.replace(/\r\n/g, "\n") : null
      );

      // Check if this is an expected failure (FAIL status but green color)
      if (status === "FAIL" && data.color === "green") {
        status = "EXPECTED-FAIL";
      }
      // Check if this is an unexpected pass (PASS status with expected field present)
      else if (status === "PASS" && data.expected && data.expected !== "PASS") {
        status = "UNEXPECTED-PASS";
      }
      // Add execution context suffix to timeout, fail, and pass statuses
      else if (
        ["TIMEOUT", "FAIL", "PASS"].includes(status) &&
        parallelRanges.length
      ) {
        status += isInParallelRange(
          markers.startTime[i],
          markers.endTime[i],
          parallelRanges
        )
          ? "-PARALLEL"
          : "-SEQUENTIAL";
      }
      // Keep other statuses as-is

      // For failure statuses, look up the message from TestStatus markers
      if (status.startsWith("FAIL")) {
        const testStartTime = markers.startTime[i];
        const statusMarker = testStatusMarkers.find(
          m => m.test === fullTestId && m.time >= testStartTime
        );
        if (statusMarker && statusMarker.message) {
          message = statusMarker.message;
        }
      }

      // Extract the actual test file path from the test field
      // Format: "xpcshell-parent-process.toml:dom/indexedDB/test/unit/test_fileListUpgrade.js"
      if (testPath && testPath.includes(":")) {
        testPath = testPath.split(":")[1];
      }
    } else if (data.type === "Text") {
      // Plain text log format
      testPath = data.text;

      // Skip text markers like "replaying full log for ..."
      if (testPath?.startsWith("replaying full log for ")) {
        continue;
      }

      // We don't have status information in markers from plain text logs
      status = "UNKNOWN";
    } else {
      continue;
    }

    // Filter out non-test paths (allow common test file extensions)
    if (!testPath || !/\.(js|html|xhtml)$/.test(testPath)) {
      continue;
    }

    const testStartTime = markers.startTime[i];
    const testEndTime = markers.endTime[i];

    const timing = {
      path: testPath,
      duration: testEndTime - testStartTime,
      status,
      timestamp: profile.meta.startTime + testStartTime,
    };
    if (message) {
      timing.message = message;
    }

    // For CRASH status, find matching crash marker within the test's time range
    if (status === "CRASH") {
      const matchingCrash = crashMarkers.find(
        crash =>
          crash.testPath === data.test &&
          crash.startTime >= testStartTime &&
          crash.startTime <= testEndTime
      );
      if (matchingCrash) {
        if (matchingCrash.signature) {
          timing.crashSignature = matchingCrash.signature;
        }
        if (matchingCrash.minidump) {
          timing.minidump = matchingCrash.minidump;
        }
      }
    }

    timings.push(timing);
  }

  return timings;
}

// Fetch resource profile from TaskCluster with local caching
async function fetchResourceProfile(taskId, retryId = 0) {
  const cacheFileGz = path.join(
    workerData.profileCacheDir,
    `${taskId}-${retryId}.json.gz`
  );

  // Check if we have a cached gzipped version
  if (fs.existsSync(cacheFileGz)) {
    try {
      const compressedData = fs.readFileSync(cacheFileGz);
      const decompressedData = zlib.gunzipSync(compressedData);
      return JSON.parse(decompressedData.toString("utf-8"));
    } catch (error) {
      console.warn(
        `Error reading cached gzipped profile ${taskId}: ${error.message}`
      );
      // Continue to fetch from network
    }
  }

  const url = `${workerData.taskclusterBaseUrl}/api/queue/v1/task/${taskId}/runs/${retryId}/artifacts/public/test_info/profile_resource-usage.json`;

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    // Network error (timeout, connection refused, etc.)
    let message = error.message;
    if (error.cause) {
      message += ` (${error.cause.code || error.cause.message})`;
    }
    console.error(formatTaskMessage(taskId, `Network error - ${message}`));
    return { error: "network_error" };
  }

  if (!response.ok) {
    const errorType = response.status === 404 ? "not_found" : "http_error";
    console.error(
      formatTaskMessage(
        taskId,
        `HTTP error ${response.status} ${response.statusText}`
      )
    );
    return { error: errorType };
  }

  let profile;
  try {
    profile = await response.json();
  } catch (error) {
    console.error(
      formatTaskMessage(taskId, `JSON parse error - ${error.message}`)
    );
    return { error: "parse_error" };
  }

  // Cache the profile for future use (gzipped)
  try {
    const compressed = zlib.gzipSync(JSON.stringify(profile));
    fs.writeFileSync(cacheFileGz, compressed);
  } catch (error) {
    console.warn(
      formatTaskMessage(taskId, `Error caching profile - ${error.message}`)
    );
  }

  return profile;
}

// Process a single job to extract test timings
async function processJob(job) {
  // Parse task field: "<task_id>.<retry_id>" or just "<task_id>"
  const parts = job.task.split(".");
  const taskId = parts[0];
  const retryId = parts.length === 2 ? parseInt(parts[1], 10) : 0;
  const jobName = job.name;

  if (!taskId) {
    console.error(`      Job has no task ID: ${JSON.stringify(job)}`);
    return { error: "invalid_job" };
  }

  const profile = await fetchResourceProfile(taskId, retryId);
  if (!profile) {
    console.error(
      formatTaskMessage(taskId, "No profile returned (unexpected null)")
    );
    return { error: "no_profile" };
  }

  // Check if profile is an error object
  if (profile.error) {
    return { error: profile.error };
  }

  const timings = extractTestTimings(profile);
  if (timings.length === 0) {
    console.warn(
      formatTaskMessage(taskId, "No test timings extracted from profile")
    );
    return { error: "no_timings" };
  }

  const resourceUsage = extractResourceUsage(profile);

  // Extract commit ID from profile.meta.sourceURL
  // Format: "https://hg.mozilla.org/integration/autoland/rev/f37a6863f87aeeb870b16223045ea7614b1ba0a7"
  let commitId = null;
  if (profile.meta.sourceURL) {
    const match = profile.meta.sourceURL.match(/\/rev\/([a-f0-9]+)$/i);
    if (match) {
      commitId = match[1];
    }
  }

  // Convert start_time to timestamp in seconds if it's a string
  const startTime =
    typeof job.start_time === "string"
      ? Math.floor(new Date(job.start_time).getTime() / 1000)
      : job.start_time;

  return {
    jobName,
    taskId,
    retryId,
    repository: job.repository,
    startTime,
    timings,
    resourceUsage,
    commitId,
  };
}

// Main worker function
async function main() {
  try {
    const results = [];

    // Signal worker is ready for jobs
    parentPort.postMessage({ type: "ready" });

    // Listen for job assignments
    parentPort.on("message", async message => {
      if (message.type === "job") {
        const result = await processJob(message.job);
        if (result) {
          results.push(result);
        }
        // Request next job
        parentPort.postMessage({ type: "jobComplete", result });
      } else if (message.type === "shutdown") {
        // Send final results and exit
        parentPort.postMessage({ type: "finished", results });
      }
    });
  } catch (error) {
    parentPort.postMessage({ type: "error", error: error.message });
  }
}

main();
