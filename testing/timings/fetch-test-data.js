#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const fs = require("fs");
const path = require("path");
const { Worker } = require("worker_threads");
const os = require("os");

const MAX_WORKERS = Math.min(32, os.cpus().length);

const TASKCLUSTER_BASE_URL =
  process.env.TASKCLUSTER_PROXY_URL ||
  process.env.TASKCLUSTER_ROOT_URL ||
  "https://firefox-ci-tc.services.mozilla.com";

// Check for --harness parameter
const HARNESS = (() => {
  const harnessIndex = process.argv.findIndex(arg => arg === "--harness");
  if (harnessIndex !== -1 && harnessIndex + 1 < process.argv.length) {
    return process.argv[harnessIndex + 1];
  }
  return "xpcshell";
})();

// Firefox-CI ETL Query for test job data (contains xpcshell, mochitest, reftest)
const FIREFOX_CI_ETL_URL =
  "https://sql.telemetry.mozilla.org/api/queries/114029/results.json?api_key=6LTIeXwlJ5YTlmtbRXmlr5vfSEKVmzsNEyhr4VxO";

// Treeherder query for list of tasks to ignore (broken patches that were reverted)
const IGNORE_LIST_URL =
  "https://sql.telemetry.mozilla.org/api/queries/114030/results.json?api_key=8Q6UgAs8l8MdhmZD8bmW9VNcWpZ8MMwyhyOchslh";

// Check for --output-dir parameter
const OUTPUT_DIR = (() => {
  const outputDirIndex = process.argv.findIndex(arg => arg === "--output-dir");
  if (outputDirIndex !== -1 && outputDirIndex + 1 < process.argv.length) {
    return process.argv[outputDirIndex + 1];
  }
  return `./${HARNESS}-data`;
})();

const PROFILE_CACHE_DIR = "./profile-cache";

let previousRunData = null;
let allJobsCache = null;
let ignoreTasksCache = null;
let componentsData = null;
let dailyStatsMap = new Map();

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(PROFILE_CACHE_DIR)) {
  fs.mkdirSync(PROFILE_CACHE_DIR, { recursive: true });
}

// Get date in YYYY-MM-DD format
function getDateString(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(
      `Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`
    );
    return null;
  }
  return response.json();
}

// Fetch commit push data from Treeherder API
async function fetchCommitData(project, revision) {
  console.log(`Fetching commit data for ${project}:${revision}...`);

  const result = await fetchJson(
    `https://treeherder.mozilla.org/api/project/${project}/push/?full=true&count=10&revision=${revision}`
  );

  if (!result || !result.results || result.results.length === 0) {
    throw new Error(
      `No push found for revision ${revision} on project ${project}`
    );
  }

  const pushId = result.results[0].id;
  console.log(`Found push ID: ${pushId}`);
  return pushId;
}

// Fetch jobs from push
async function fetchPushJobs(project, pushId) {
  console.log(`Fetching jobs for push ID ${pushId}...`);

  let allJobs = [];
  let propertyNames = [];
  let url = `https://treeherder.mozilla.org/api/jobs/?push_id=${pushId}`;

  // The /jobs/ API is paginated, keep fetching until next is null
  while (url) {
    const result = await fetchJson(url);
    if (!result) {
      throw new Error(`Failed to fetch jobs for push ID ${pushId}`);
    }

    allJobs = allJobs.concat(result.results || []);
    if (!propertyNames.length) {
      propertyNames = result.job_property_names || [];
    }

    url = result.next;
  }

  // Get field indices dynamically
  const jobTypeNameIndex = propertyNames.indexOf("job_type_name");
  const taskIdIndex = propertyNames.indexOf("task_id");
  const retryIdIndex = propertyNames.indexOf("retry_id");
  const lastModifiedIndex = propertyNames.indexOf("last_modified");

  const harnessJobs = allJobs
    .filter(
      job => job[jobTypeNameIndex] && job[jobTypeNameIndex].includes(HARNESS)
    )
    .map(job => {
      const taskId = job[taskIdIndex];
      const retryId = job[retryIdIndex] || 0;
      const task = retryId === 0 ? taskId : `${taskId}.${retryId}`;
      return {
        name: job[jobTypeNameIndex],
        task,
        start_time: job[lastModifiedIndex],
        repository: project,
      };
    });

  console.log(
    `Found ${harnessJobs.length} ${HARNESS} jobs out of ${allJobs.length} total jobs`
  );
  return harnessJobs;
}

// Fetch test data from Firefox-CI ETL for a specific date
async function fetchHarnessData(targetDate) {
  console.log(`Fetching ${HARNESS} test data for ${targetDate}...`);

  // Fetch data from Firefox-CI ETL if not already cached
  if (!allJobsCache || !ignoreTasksCache) {
    console.log(`Querying Firefox-CI ETL and loading ignore list...`);

    // Fetch both Firefox-CI ETL data and ignore list in parallel
    const [etlResult, ignoreListResult] = await Promise.all([
      fetchJson(FIREFOX_CI_ETL_URL),
      fetchJson(IGNORE_LIST_URL),
    ]);

    if (!etlResult) {
      throw new Error("Failed to fetch data from Firefox-CI ETL");
    }

    if (!ignoreListResult) {
      throw new Error("Failed to fetch ignore list from Treeherder");
    }

    // Build set of tasks to ignore
    ignoreTasksCache = new Set();
    for (const row of ignoreListResult.query_result.data.rows) {
      ignoreTasksCache.add(row.task);
    }
    console.log(`Loaded ${ignoreTasksCache.size} tasks to ignore`);

    const allJobs = etlResult.query_result.data.rows;

    // Cache all harness jobs (don't filter by ignore list yet)
    allJobsCache = allJobs.filter(job => job.name?.includes(HARNESS));

    console.log(
      `Cached ${allJobsCache.length} ${HARNESS} jobs from Firefox-CI ETL (out of ${allJobs.length} total jobs)`
    );
  }

  // Filter cached jobs for the target date
  return allJobsCache.filter(job => job.start_time.startsWith(targetDate));
}

// Process jobs using worker threads with dynamic job distribution
async function processJobsWithWorkers(jobs, targetDate = null) {
  if (jobs.length === 0) {
    return [];
  }

  const dateStr = targetDate ? ` for ${targetDate}` : "";
  console.log(
    `Processing ${jobs.length} jobs${dateStr} using ${MAX_WORKERS} workers...`
  );

  const jobQueue = [...jobs];
  const results = [];
  let invalidJobCount = 0;
  const workers = [];
  let completedJobs = 0;
  let lastProgressTime = 0;

  return new Promise((resolve, reject) => {
    // Track worker states
    const workerStates = new Map();

    // Create workers
    for (let i = 0; i < MAX_WORKERS; i++) {
      const worker = new Worker(path.join(__dirname, "profile-worker.js"), {
        workerData: {
          profileCacheDir: PROFILE_CACHE_DIR,
          taskclusterBaseUrl: TASKCLUSTER_BASE_URL,
        },
      });

      workers.push(worker);
      workerStates.set(worker, { id: i + 1, ready: false, jobsProcessed: 0 });

      worker.on("message", message => {
        const workerState = workerStates.get(worker);

        if (message.type === "ready") {
          workerState.ready = true;
          assignNextJob(worker);
        } else if (message.type === "jobComplete") {
          workerState.jobsProcessed++;
          completedJobs++;

          if (message.result) {
            if (message.result.error) {
              // Only network_error is retryable, permanent errors count as invalid
              if (message.result.error !== "network_error") {
                invalidJobCount++;
              }
            } else {
              results.push(message.result);
            }
          }

          // Show progress at most once per second, or on first/last job
          const now = Date.now();
          if (
            completedJobs === 1 ||
            completedJobs === jobs.length ||
            now - lastProgressTime >= 1000
          ) {
            const percentage = Math.round((completedJobs / jobs.length) * 100);
            const paddedCompleted = completedJobs
              .toString()
              .padStart(jobs.length.toString().length);
            const paddedPercentage = percentage.toString().padStart(3); // Pad to 3 chars for alignment (0-100%)
            console.log(
              ` ${paddedPercentage}% ${paddedCompleted}/${jobs.length}`
            );
            lastProgressTime = now;
          }

          // Assign next job or finish
          assignNextJob(worker);
        } else if (message.type === "finished") {
          checkAllComplete();
        } else if (message.type === "error") {
          reject(new Error(`Worker ${workerState.id} error: ${message.error}`));
        }
      });

      worker.on("error", error => {
        reject(
          new Error(
            `Worker ${workerStates.get(worker).id} thread error: ${error.message}`
          )
        );
      });

      worker.on("exit", code => {
        if (code !== 0) {
          reject(
            new Error(
              `Worker ${workerStates.get(worker).id} stopped with exit code ${code}`
            )
          );
        }
      });
    }

    function assignNextJob(worker) {
      if (jobQueue.length) {
        const job = jobQueue.shift();
        worker.postMessage({ type: "job", job });
      } else {
        // No more jobs, tell worker to finish
        worker.postMessage({ type: "shutdown" });
      }
    }

    let resolved = false;
    let workersFinished = 0;

    function checkAllComplete() {
      if (resolved) {
        return;
      }

      workersFinished++;

      if (workersFinished >= MAX_WORKERS) {
        resolved = true;

        // Terminate all workers to ensure clean exit
        workers.forEach(worker => worker.terminate());

        resolve({ results, invalidJobCount });
      }
    }
  });
}

// Fetch Bugzilla component mapping data
async function fetchComponentsData() {
  if (componentsData) {
    return componentsData;
  }

  console.log("Fetching Bugzilla component mapping...");
  const url = `${TASKCLUSTER_BASE_URL}/api/index/v1/task/gecko.v2.mozilla-central.latest.source.source-bugzilla-info/artifacts/public/components-normalized.json`;

  try {
    componentsData = await fetchJson(url);
    console.log("Component mapping loaded successfully");
    return componentsData;
  } catch (error) {
    console.error("Failed to fetch component mapping:", error);
    return null;
  }
}

// Look up component for a test path
function findComponentForPath(testPath) {
  if (!componentsData || !componentsData.paths) {
    return null;
  }

  const parts = testPath.split("/");
  let current = componentsData.paths;

  for (const part of parts) {
    if (typeof current === "number") {
      return current;
    }
    if (typeof current === "object" && current !== null && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  return typeof current === "number" ? current : null;
}

// Get component string from component ID
function getComponentString(componentId) {
  if (!componentsData || !componentsData.components || componentId == null) {
    return null;
  }

  const component = componentsData.components[String(componentId)];
  if (!component || !Array.isArray(component) || component.length !== 2) {
    return null;
  }

  return `${component[0]} :: ${component[1]}`;
}

// Helper function to determine if a status should include message data
function shouldIncludeMessage(status) {
  return status === "SKIP" || status.startsWith("FAIL");
}

// Create string tables and store raw data efficiently
function createDataTables(jobResults) {
  const tables = {
    jobNames: [],
    testPaths: [],
    testNames: [],
    repositories: [],
    statuses: [],
    taskIds: [],
    messages: [],
    crashSignatures: [],
    components: [],
    commitIds: [],
  };

  // Maps for O(1) string lookups
  const stringMaps = {
    jobNames: new Map(),
    testPaths: new Map(),
    testNames: new Map(),
    repositories: new Map(),
    statuses: new Map(),
    taskIds: new Map(),
    messages: new Map(),
    crashSignatures: new Map(),
    components: new Map(),
    commitIds: new Map(),
  };

  // Task info maps task ID index to repository and job name indexes
  const taskInfo = {
    repositoryIds: [],
    jobNameIds: [],
    commitIds: [],
  };

  // Test info maps test ID index to test path and name indexes
  const testInfo = {
    testPathIds: [],
    testNameIds: [],
    componentIds: [],
  };

  // Map for fast testId lookup: fullPath -> testId
  const testIdMap = new Map();

  // Test runs grouped by test ID, then by status ID
  // testRuns[testId] = array of status groups for that test
  const testRuns = [];

  function findStringIndex(tableName, string) {
    const table = tables[tableName];
    const map = stringMaps[tableName];

    let index = map.get(string);
    if (index === undefined) {
      index = table.length;
      table.push(string);
      map.set(string, index);
    }
    return index;
  }

  for (const result of jobResults) {
    if (!result || !result.timings) {
      continue;
    }

    const jobNameId = findStringIndex("jobNames", result.jobName);
    const repositoryId = findStringIndex("repositories", result.repository);
    const commitId = result.commitId
      ? findStringIndex("commitIds", result.commitId)
      : null;

    for (const timing of result.timings) {
      const fullPath = timing.path;

      // Check if we already have this test
      let testId = testIdMap.get(fullPath);
      if (testId === undefined) {
        // New test - need to process path/name split and create entry
        const lastSlashIndex = fullPath.lastIndexOf("/");

        let testPath, testName;
        if (lastSlashIndex === -1) {
          // No directory, just the filename
          testPath = "";
          testName = fullPath;
        } else {
          testPath = fullPath.substring(0, lastSlashIndex);
          testName = fullPath.substring(lastSlashIndex + 1);
        }

        const testPathId = findStringIndex("testPaths", testPath);
        const testNameId = findStringIndex("testNames", testName);

        // Look up the component for this test
        const componentIdRaw = findComponentForPath(fullPath);
        const componentString = getComponentString(componentIdRaw);
        const componentId = componentString
          ? findStringIndex("components", componentString)
          : null;

        testId = testInfo.testPathIds.length;
        testInfo.testPathIds.push(testPathId);
        testInfo.testNameIds.push(testNameId);
        testInfo.componentIds.push(componentId);
        testIdMap.set(fullPath, testId);
      }

      const statusId = findStringIndex("statuses", timing.status || "UNKNOWN");
      const taskIdString = `${result.taskId}.${result.retryId}`;
      const taskIdId = findStringIndex("taskIds", taskIdString);

      // Store task info only once per unique task ID
      if (taskInfo.repositoryIds[taskIdId] === undefined) {
        taskInfo.repositoryIds[taskIdId] = repositoryId;
        taskInfo.jobNameIds[taskIdId] = jobNameId;
        taskInfo.commitIds[taskIdId] = commitId;
      }

      // Initialize test group if it doesn't exist
      if (!testRuns[testId]) {
        testRuns[testId] = [];
      }

      // Initialize status group within test if it doesn't exist
      let statusGroup = testRuns[testId][statusId];
      if (!statusGroup) {
        statusGroup = {
          taskIdIds: [],
          durations: [],
          timestamps: [],
        };
        // Include messageIds array for statuses that should have messages
        if (shouldIncludeMessage(timing.status)) {
          statusGroup.messageIds = [];
        }
        // Only include crash data arrays for CRASH status
        if (timing.status === "CRASH") {
          statusGroup.crashSignatureIds = [];
          statusGroup.minidumps = [];
        }
        testRuns[testId][statusId] = statusGroup;
      }

      // Add test run to the appropriate test/status group
      statusGroup.taskIdIds.push(taskIdId);
      statusGroup.durations.push(Math.round(timing.duration));
      statusGroup.timestamps.push(timing.timestamp);

      // Store message ID for statuses that should include messages (or null if no message)
      if (shouldIncludeMessage(timing.status)) {
        const messageId = timing.message
          ? findStringIndex("messages", timing.message)
          : null;
        statusGroup.messageIds.push(messageId);
      }

      // Store crash data for CRASH status (or null if not available)
      if (timing.status === "CRASH") {
        const crashSignatureId = timing.crashSignature
          ? findStringIndex("crashSignatures", timing.crashSignature)
          : null;
        statusGroup.crashSignatureIds.push(crashSignatureId);
        statusGroup.minidumps.push(timing.minidump || null);
      }
    }
  }

  return {
    tables,
    taskInfo,
    testInfo,
    testRuns,
  };
}

// Sort string tables by frequency and remap all indices for deterministic output and better compression
function sortStringTablesByFrequency(dataStructure) {
  const { tables, taskInfo, testInfo, testRuns } = dataStructure;

  // Count frequency of each index for each table
  const frequencyCounts = {
    jobNames: new Array(tables.jobNames.length).fill(0),
    testPaths: new Array(tables.testPaths.length).fill(0),
    testNames: new Array(tables.testNames.length).fill(0),
    repositories: new Array(tables.repositories.length).fill(0),
    statuses: new Array(tables.statuses.length).fill(0),
    taskIds: new Array(tables.taskIds.length).fill(0),
    messages: new Array(tables.messages.length).fill(0),
    crashSignatures: new Array(tables.crashSignatures.length).fill(0),
    components: new Array(tables.components.length).fill(0),
    commitIds: new Array(tables.commitIds.length).fill(0),
  };

  // Count taskInfo references
  for (const jobNameId of taskInfo.jobNameIds) {
    if (jobNameId !== undefined) {
      frequencyCounts.jobNames[jobNameId]++;
    }
  }
  for (const repositoryId of taskInfo.repositoryIds) {
    if (repositoryId !== undefined) {
      frequencyCounts.repositories[repositoryId]++;
    }
  }
  for (const commitId of taskInfo.commitIds) {
    if (commitId !== null) {
      frequencyCounts.commitIds[commitId]++;
    }
  }

  // Count testInfo references
  for (const testPathId of testInfo.testPathIds) {
    frequencyCounts.testPaths[testPathId]++;
  }
  for (const testNameId of testInfo.testNameIds) {
    frequencyCounts.testNames[testNameId]++;
  }
  for (const componentId of testInfo.componentIds) {
    if (componentId !== null) {
      frequencyCounts.components[componentId]++;
    }
  }

  // Count testRuns references
  for (const testGroup of testRuns) {
    if (!testGroup) {
      continue;
    }

    testGroup.forEach((statusGroup, statusId) => {
      if (!statusGroup) {
        return;
      }

      // Handle both aggregated format (counts/days) and detailed format (taskIdIds)
      if (statusGroup.taskIdIds) {
        // Check if taskIdIds is array of arrays (aggregated) or flat array (daily)
        const isArrayOfArrays =
          !!statusGroup.taskIdIds.length &&
          Array.isArray(statusGroup.taskIdIds[0]);

        if (isArrayOfArrays) {
          // Aggregated format: array of arrays
          const totalRuns = statusGroup.taskIdIds.reduce(
            (sum, arr) => sum + arr.length,
            0
          );
          frequencyCounts.statuses[statusId] += totalRuns;

          for (const taskIdIdsArray of statusGroup.taskIdIds) {
            for (const taskIdId of taskIdIdsArray) {
              frequencyCounts.taskIds[taskIdId]++;
            }
          }
        } else {
          // Daily format: flat array
          frequencyCounts.statuses[statusId] += statusGroup.taskIdIds.length;

          for (const taskIdId of statusGroup.taskIdIds) {
            frequencyCounts.taskIds[taskIdId]++;
          }
        }
      } else if (statusGroup.counts) {
        // Aggregated passing tests - count total runs
        const totalRuns = statusGroup.counts.reduce((a, b) => a + b, 0);
        frequencyCounts.statuses[statusId] += totalRuns;
      }

      if (statusGroup.messageIds) {
        for (const messageId of statusGroup.messageIds) {
          if (messageId !== null) {
            frequencyCounts.messages[messageId]++;
          }
        }
      }

      if (statusGroup.crashSignatureIds) {
        for (const crashSigId of statusGroup.crashSignatureIds) {
          if (crashSigId !== null) {
            frequencyCounts.crashSignatures[crashSigId]++;
          }
        }
      }
    });
  }

  // Create sorted tables and index mappings (sorted by frequency descending)
  const sortedTables = {};
  const indexMaps = {};

  for (const [tableName, table] of Object.entries(tables)) {
    const counts = frequencyCounts[tableName];

    // Create array with value, oldIndex, and count
    const indexed = table.map((value, oldIndex) => ({
      value,
      oldIndex,
      count: counts[oldIndex],
    }));

    // Sort by count descending, then by value for deterministic order when counts are equal
    indexed.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.value.localeCompare(b.value);
    });

    // Extract sorted values and create mapping
    sortedTables[tableName] = indexed.map(item => item.value);
    indexMaps[tableName] = new Map(
      indexed.map((item, newIndex) => [item.oldIndex, newIndex])
    );
  }

  // Remap taskInfo indices
  // taskInfo arrays are indexed by taskIdId, and when taskIds get remapped,
  // we need to rebuild the arrays at the new indices
  const sortedTaskInfo = {
    repositoryIds: [],
    jobNameIds: [],
    commitIds: [],
  };

  for (
    let oldTaskIdId = 0;
    oldTaskIdId < taskInfo.repositoryIds.length;
    oldTaskIdId++
  ) {
    const newTaskIdId = indexMaps.taskIds.get(oldTaskIdId);
    sortedTaskInfo.repositoryIds[newTaskIdId] = indexMaps.repositories.get(
      taskInfo.repositoryIds[oldTaskIdId]
    );
    sortedTaskInfo.jobNameIds[newTaskIdId] = indexMaps.jobNames.get(
      taskInfo.jobNameIds[oldTaskIdId]
    );
    sortedTaskInfo.commitIds[newTaskIdId] =
      taskInfo.commitIds[oldTaskIdId] === null
        ? null
        : indexMaps.commitIds.get(taskInfo.commitIds[oldTaskIdId]);
  }

  // Remap testInfo indices
  const sortedTestInfo = {
    testPathIds: testInfo.testPathIds.map(oldId =>
      indexMaps.testPaths.get(oldId)
    ),
    testNameIds: testInfo.testNameIds.map(oldId =>
      indexMaps.testNames.get(oldId)
    ),
    componentIds: testInfo.componentIds.map(oldId =>
      oldId === null ? null : indexMaps.components.get(oldId)
    ),
  };

  // Remap testRuns indices
  const sortedTestRuns = testRuns.map(testGroup => {
    if (!testGroup) {
      return testGroup;
    }

    return testGroup.map(statusGroup => {
      if (!statusGroup) {
        return statusGroup;
      }

      // Handle aggregated format (counts/days) differently from detailed format
      if (statusGroup.counts) {
        // Aggregated passing tests - no remapping needed
        return {
          counts: statusGroup.counts,
          days: statusGroup.days,
        };
      }

      // Check if this is aggregated format (array of arrays) or daily format (flat array)
      const isArrayOfArrays =
        !!statusGroup.taskIdIds.length &&
        Array.isArray(statusGroup.taskIdIds[0]);

      const remapped = {};

      if (isArrayOfArrays) {
        // Aggregated format: array of arrays with days
        remapped.taskIdIds = statusGroup.taskIdIds.map(taskIdIdsArray =>
          taskIdIdsArray.map(oldId => indexMaps.taskIds.get(oldId))
        );
        remapped.days = statusGroup.days;
      } else {
        // Daily format: flat array with durations and timestamps
        remapped.taskIdIds = statusGroup.taskIdIds.map(oldId =>
          indexMaps.taskIds.get(oldId)
        );
        remapped.durations = statusGroup.durations;
        remapped.timestamps = statusGroup.timestamps;
      }

      // Remap message IDs for status groups that have messages
      if (statusGroup.messageIds) {
        remapped.messageIds = statusGroup.messageIds.map(oldId =>
          oldId === null ? null : indexMaps.messages.get(oldId)
        );
      }

      // Remap crash data for CRASH status
      if (statusGroup.crashSignatureIds) {
        remapped.crashSignatureIds = statusGroup.crashSignatureIds.map(oldId =>
          oldId === null ? null : indexMaps.crashSignatures.get(oldId)
        );
      }
      if (statusGroup.minidumps) {
        remapped.minidumps = statusGroup.minidumps;
      }

      return remapped;
    });
  });

  // Remap statusId positions in testRuns (move status groups to their new positions)
  const finalTestRuns = sortedTestRuns.map(testGroup => {
    if (!testGroup) {
      return testGroup;
    }

    const remappedGroup = [];
    testGroup.forEach((statusGroup, oldStatusId) => {
      if (!statusGroup) {
        return;
      }
      const newStatusId = indexMaps.statuses.get(oldStatusId);
      remappedGroup[newStatusId] = statusGroup;
    });

    return remappedGroup;
  });

  return {
    tables: sortedTables,
    taskInfo: sortedTaskInfo,
    testInfo: sortedTestInfo,
    testRuns: finalTestRuns,
  };
}

// Create resource usage data structure
function createResourceUsageData(jobResults) {
  const jobNames = [];
  const jobNameMap = new Map();
  const repositories = [];
  const repositoryMap = new Map();
  const machineInfos = [];
  const machineInfoMap = new Map();

  // Collect all job data first
  const jobDataList = [];

  for (const result of jobResults) {
    if (!result || !result.resourceUsage) {
      continue;
    }

    // Extract chunk number from job name (e.g., "test-linux1804-64/opt-xpcshell-1" -> "test-linux1804-64/opt-xpcshell", chunk: 1)
    let jobNameBase = result.jobName;
    let chunkNumber = null;
    const match = result.jobName.match(/^(.+)-(\d+)$/);
    if (match) {
      jobNameBase = match[1];
      chunkNumber = parseInt(match[2], 10);
    }

    // Get or create job name index
    let jobNameId = jobNameMap.get(jobNameBase);
    if (jobNameId === undefined) {
      jobNameId = jobNames.length;
      jobNames.push(jobNameBase);
      jobNameMap.set(jobNameBase, jobNameId);
    }

    // Get or create repository index
    let repositoryId = repositoryMap.get(result.repository);
    if (repositoryId === undefined) {
      repositoryId = repositories.length;
      repositories.push(result.repository);
      repositoryMap.set(result.repository, repositoryId);
    }

    // Get or create machine info index
    const machineInfo = result.resourceUsage.machineInfo;
    const machineInfoKey = JSON.stringify(machineInfo);
    let machineInfoId = machineInfoMap.get(machineInfoKey);
    if (machineInfoId === undefined) {
      machineInfoId = machineInfos.length;
      machineInfos.push(machineInfo);
      machineInfoMap.set(machineInfoKey, machineInfoId);
    }

    // Combine taskId and retryId (omit .0 for retry 0)
    const taskIdString =
      result.retryId === 0
        ? result.taskId
        : `${result.taskId}.${result.retryId}`;

    jobDataList.push({
      jobNameId,
      chunk: chunkNumber,
      taskId: taskIdString,
      repositoryId,
      startTime: result.startTime,
      machineInfoId,
      maxMemory: result.resourceUsage.maxMemory,
      idleTime: result.resourceUsage.idleTime,
      singleCoreTime: result.resourceUsage.singleCoreTime,
      cpuBuckets: result.resourceUsage.cpuBuckets,
    });
  }

  // Sort by start time
  jobDataList.sort((a, b) => a.startTime - b.startTime);

  // Apply differential compression to start times and build parallel arrays
  const jobs = {
    jobNameIds: [],
    chunks: [],
    taskIds: [],
    repositoryIds: [],
    startTimes: [],
    machineInfoIds: [],
    maxMemories: [],
    idleTimes: [],
    singleCoreTimes: [],
    cpuBuckets: [],
  };

  let previousStartTime = 0;
  for (const jobData of jobDataList) {
    jobs.jobNameIds.push(jobData.jobNameId);
    jobs.chunks.push(jobData.chunk);
    jobs.taskIds.push(jobData.taskId);
    jobs.repositoryIds.push(jobData.repositoryId);

    // Differential compression: store difference from previous
    const timeDiff = jobData.startTime - previousStartTime;
    jobs.startTimes.push(timeDiff);
    previousStartTime = jobData.startTime;

    jobs.machineInfoIds.push(jobData.machineInfoId);
    jobs.maxMemories.push(jobData.maxMemory);
    jobs.idleTimes.push(jobData.idleTime);
    jobs.singleCoreTimes.push(jobData.singleCoreTime);
    jobs.cpuBuckets.push(jobData.cpuBuckets);
  }

  return {
    jobNames,
    repositories,
    machineInfos,
    jobs,
  };
}

// Helper to save a JSON file and log its size
function saveJsonFile(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data));

  const stats = fs.statSync(filePath);
  const fileSizeBytes = stats.size;

  // Use MB for files >= 1MB, otherwise KB
  if (fileSizeBytes >= 1024 * 1024) {
    const fileSizeMB = Math.round(fileSizeBytes / (1024 * 1024));
    const formattedBytes = fileSizeBytes.toLocaleString();
    console.log(
      `Saved ${filePath} - ${fileSizeMB}MB (${formattedBytes} bytes)`
    );
  } else {
    const fileSizeKB = Math.round(fileSizeBytes / 1024);
    console.log(`Saved ${filePath} - ${fileSizeKB}KB`);
  }
}

// Common function to process jobs and create data structure
async function processJobsAndCreateData(
  jobs,
  targetLabel,
  startTime,
  metadata
) {
  if (jobs.length === 0) {
    console.log(`No jobs found for ${targetLabel}.`);
    return null;
  }

  // Process jobs to extract test timings
  const jobProcessingStart = Date.now();
  const { results: jobResults, invalidJobCount } = await processJobsWithWorkers(
    jobs,
    targetLabel
  );
  const jobProcessingTime = Date.now() - jobProcessingStart;
  console.log(
    `Successfully processed ${jobResults.length} jobs in ${jobProcessingTime}ms`
  );

  // Create efficient data tables
  const dataTablesStart = Date.now();
  let dataStructure = createDataTables(jobResults);
  const dataTablesTime = Date.now() - dataTablesStart;
  console.log(`Created data tables in ${dataTablesTime}ms:`);

  // Check if any test runs were extracted
  const hasTestRuns = !!dataStructure.testRuns.length;
  if (!hasTestRuns) {
    console.log(`No test run data extracted for ${targetLabel}`);
    return null;
  }

  const totalRuns = dataStructure.testRuns.reduce((sum, testGroup) => {
    if (!testGroup) {
      return sum;
    }
    return (
      sum +
      testGroup.reduce(
        (testSum, statusGroup) =>
          testSum + (statusGroup ? statusGroup.taskIdIds.length : 0),
        0
      )
    );
  }, 0);
  console.log(
    `  ${dataStructure.testInfo.testPathIds.length} tests, ${totalRuns} runs, ${dataStructure.tables.taskIds.length} tasks, ${dataStructure.tables.jobNames.length} job names, ${dataStructure.tables.statuses.length} statuses`
  );

  // Sort string tables by frequency for deterministic output and better compression
  const sortingStart = Date.now();
  dataStructure = sortStringTablesByFrequency(dataStructure);
  const sortingTime = Date.now() - sortingStart;
  console.log(`Sorted string tables by frequency in ${sortingTime}ms`);

  // Convert absolute timestamps to relative and apply differential compression (in place)
  for (const testGroup of dataStructure.testRuns) {
    if (!testGroup) {
      continue;
    }

    for (const statusGroup of testGroup) {
      if (!statusGroup) {
        continue;
      }

      // Convert timestamps to relative in place
      for (let i = 0; i < statusGroup.timestamps.length; i++) {
        statusGroup.timestamps[i] =
          Math.floor(statusGroup.timestamps[i] / 1000) - startTime;
      }

      // Map to array of objects including crash data if present
      const runs = statusGroup.timestamps.map((ts, i) => {
        const run = {
          timestamp: ts,
          taskIdId: statusGroup.taskIdIds[i],
          duration: statusGroup.durations[i],
        };
        // Include crash data if this is a CRASH status group
        if (statusGroup.crashSignatureIds) {
          run.crashSignatureId = statusGroup.crashSignatureIds[i];
        }
        if (statusGroup.minidumps) {
          run.minidump = statusGroup.minidumps[i];
        }
        // Include message data if this status group has messages
        if (statusGroup.messageIds) {
          run.messageId = statusGroup.messageIds[i];
        }
        return run;
      });

      // Sort by timestamp
      runs.sort((a, b) => a.timestamp - b.timestamp);

      // Apply differential compression in place for timestamps
      let previousTimestamp = 0;
      for (const run of runs) {
        const currentTimestamp = run.timestamp;
        run.timestamp = currentTimestamp - previousTimestamp;
        previousTimestamp = currentTimestamp;
      }

      // Update in place
      statusGroup.taskIdIds = runs.map(run => run.taskIdId);
      statusGroup.durations = runs.map(run => run.duration);
      statusGroup.timestamps = runs.map(run => run.timestamp);
      // Update crash data arrays if present
      if (statusGroup.crashSignatureIds) {
        statusGroup.crashSignatureIds = runs.map(run => run.crashSignatureId);
      }
      if (statusGroup.minidumps) {
        statusGroup.minidumps = runs.map(run => run.minidump);
      }
      // Update message data arrays if present
      if (statusGroup.messageIds) {
        statusGroup.messageIds = runs.map(run => run.messageId);
      }
    }
  }

  // Build output with metadata
  return {
    testData: {
      metadata: {
        ...metadata,
        startTime,
        generatedAt: new Date().toISOString(),
        jobCount: jobs.length,
        processedJobCount: jobResults.length,
        invalidJobCount,
      },
      tables: dataStructure.tables,
      taskInfo: dataStructure.taskInfo,
      testInfo: dataStructure.testInfo,
      testRuns: dataStructure.testRuns,
    },
    resourceData: createResourceUsageData(jobResults),
  };
}

async function processRevisionData(project, revision, forceRefetch = false) {
  console.log(`Fetching ${HARNESS} test data for ${project}:${revision}`);
  console.log(`=== Processing ${project}:${revision} ===`);

  const cacheFile = path.join(
    OUTPUT_DIR,
    `${HARNESS}-${project}-${revision}.json`
  );

  // Check if we already have data for this revision
  if (fs.existsSync(cacheFile) && !forceRefetch) {
    console.log(`Data for ${project}:${revision} already exists. Skipping.`);
    return null;
  }

  if (forceRefetch) {
    console.log(
      `Force flag detected, re-fetching data for ${project}:${revision}...`
    );
  }

  try {
    // Fetch push ID from revision
    const pushId = await fetchCommitData(project, revision);

    // Fetch jobs for the push
    const jobs = await fetchPushJobs(project, pushId);

    if (jobs.length === 0) {
      console.log(`No ${HARNESS} jobs found for ${project}:${revision}.`);
      return null;
    }

    // Use the last_modified time of the first job as start time
    const startTime = jobs.length
      ? Math.floor(new Date(jobs[0].start_time).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    const output = await processJobsAndCreateData(
      jobs,
      `${project}-${revision}`,
      startTime,
      {
        project,
        revision,
        pushId,
      }
    );

    if (!output) {
      return null;
    }

    saveJsonFile(output.testData, cacheFile);
    const resourceCacheFile = path.join(
      OUTPUT_DIR,
      `${HARNESS}-${project}-${revision}-resources.json`
    );
    saveJsonFile(output.resourceData, resourceCacheFile);

    return output;
  } catch (error) {
    console.error(`Error processing ${project}:${revision}:`, error);
    return null;
  }
}

// Fetch previous run metadata from Taskcluster
async function fetchPreviousRunData() {
  try {
    // Fetch task info for the current task to get the index name from the routes.
    const taskUrl = `${TASKCLUSTER_BASE_URL}/api/queue/v1/task/${process.env.TASK_ID}`;
    const taskData = await fetchJson(taskUrl);
    if (!taskData) {
      console.log(`Failed to fetch task info from ${taskUrl}`);
      return;
    }

    const routes = taskData.routes || [];
    // Find a route that starts with "index." and contains ".latest."
    const latestRoute = routes.find(
      route => route.startsWith("index.") && route.includes(".latest.")
    );
    if (!latestRoute) {
      console.log(
        `No route found with 'index.' prefix and '.latest.' in name. Available routes: ${JSON.stringify(routes)}`
      );
      return;
    }

    // Remove "index." prefix from route to get index name
    const indexName = latestRoute.replace(/^index\./, "");
    console.log(`Using index: ${indexName}`);

    // Store artifacts URL for later use by processDateData
    const artifactsUrl = `${TASKCLUSTER_BASE_URL}/api/index/v1/task/${indexName}/artifacts/public`;

    // Fetch the index.json from the previous run
    const indexUrl = `${artifactsUrl}/index.json`;
    console.log(`Fetching previous run data from ${indexUrl}`);
    const indexData = await fetchJson(indexUrl);
    if (!indexData) {
      console.log(`Failed to fetch index.json from ${indexUrl}`);
      return;
    }

    const dates = indexData.dates || [];

    console.log(`Found ${dates.length} dates in previous run`);

    previousRunData = {
      dates: new Set(dates),
      artifactsUrl,
    };

    // Fetch previous stats and populate dailyStatsMap
    const statsUrl = `${artifactsUrl}/${HARNESS}-stats.json`;
    console.log(`Fetching previous stats from ${statsUrl}...`);
    const previousStats = await fetchJson(statsUrl);
    if (previousStats && previousStats.dates) {
      console.log(`Found ${previousStats.dates.length} days of previous stats`);
      for (let i = 0; i < previousStats.dates.length; i++) {
        const date = previousStats.dates[i];
        dailyStatsMap.set(date, {
          totalTestRuns: previousStats.totalTestRuns[i],
          failedTestRuns: previousStats.failedTestRuns[i],
          skippedTestRuns: previousStats.skippedTestRuns[i],
          processedJobCount: previousStats.processedJobCount[i],
          failedJobs: previousStats.failedJobs[i],
          invalidJobs: previousStats.invalidJobs[i],
          ignoredJobs: previousStats.ignoredJobs[i],
        });
      }
    }

    console.log("Previous run metadata loaded\n");
  } catch (error) {
    console.log(`Error fetching previous run metadata: ${error.message}`);
  }
}

// Process data for a single date
async function processDateData(targetDate, forceRefetch = false) {
  const timingsFilename = `${HARNESS}-${targetDate}.json`;
  const resourcesFilename = `${HARNESS}-${targetDate}-resources.json`;
  const timingsPath = path.join(OUTPUT_DIR, timingsFilename);
  const resourcesPath = path.join(OUTPUT_DIR, resourcesFilename);

  // Check if we already have data for this date
  if (fs.existsSync(timingsPath) && !forceRefetch) {
    console.log(`Data for ${targetDate} already exists. Skipping.`);
    return;
  }

  // Fetch jobs list first (needed for verification)
  let allDateJobs;
  try {
    allDateJobs = await fetchHarnessData(targetDate);
    if (allDateJobs.length === 0) {
      console.log(`No jobs found for ${targetDate}.`);
      return;
    }
  } catch (error) {
    console.error(`Error fetching jobs for ${targetDate}:`, error);
    return;
  }

  // Filter out ignored jobs
  const jobs = allDateJobs.filter(job => !ignoreTasksCache.has(job.task));
  const ignoredJobsCount = allDateJobs.length - jobs.length;
  const failedJobsCount = jobs.filter(j => j.state === "failed").length;

  console.log(
    `Found ${allDateJobs.length} jobs for ${targetDate} (${ignoredJobsCount} ignored, ${jobs.length} to process)`
  );

  if (jobs.length === 0) {
    console.log(`No jobs to process for ${targetDate} after filtering.`);
    return;
  }

  // Try to fetch from previous run if available and not forcing refetch
  if (
    !forceRefetch &&
    previousRunData &&
    previousRunData.dates.has(targetDate)
  ) {
    try {
      const [timings, resources] = await Promise.all([
        fetchJson(`${previousRunData.artifactsUrl}/${timingsFilename}`),
        fetchJson(`${previousRunData.artifactsUrl}/${resourcesFilename}`),
      ]);

      if (timings && resources) {
        const expectedJobCount = jobs.length;
        const actualProcessedCount =
          timings.metadata.processedJobCount +
          (timings.metadata.invalidJobCount || 0);

        // Check if previous run processed fewer jobs (had retryable errors or incomplete data)
        if (actualProcessedCount < expectedJobCount) {
          const missingJobs = expectedJobCount - actualProcessedCount;
          console.log(
            `Ignoring artifact from previous run: missing ${missingJobs} jobs (expected ${expectedJobCount}, got ${actualProcessedCount})`
          );
        } else {
          console.log(`Fetched valid artifact from previous run.`);
          saveJsonFile(timings, timingsPath);
          saveJsonFile(resources, resourcesPath);

          calculateStatsFromData(
            timings,
            targetDate,
            ignoredJobsCount,
            failedJobsCount
          );
          return;
        }
      } else {
        console.log(
          `Error fetching artifact from previous run: artifact not found`
        );
      }
    } catch (error) {
      console.log(
        `Error fetching artifact from previous run: ${error.message}`
      );
    }
  }

  if (forceRefetch) {
    console.log(`Force flag detected, re-fetching data for ${targetDate}...`);
  }

  try {
    // Calculate start of day timestamp for relative time calculation
    const startOfDay = new Date(targetDate + "T00:00:00.000Z");
    const startTime = Math.floor(startOfDay.getTime() / 1000); // Convert to seconds

    const output = await processJobsAndCreateData(jobs, targetDate, startTime, {
      date: targetDate,
    });
    if (!output) {
      return;
    }

    saveJsonFile(output.testData, timingsPath);
    saveJsonFile(output.resourceData, resourcesPath);

    calculateStatsFromData(
      output.testData,
      targetDate,
      ignoredJobsCount,
      failedJobsCount
    );
  } catch (error) {
    console.error(`Error processing ${targetDate}:`, error);
  }
}

// eslint-disable-next-line complexity
async function createAggregatedFailuresFile(dates) {
  console.log(
    `\n=== Creating aggregated failures file from ${dates.length} days ===`
  );

  const dailyFiles = [];
  for (const date of dates) {
    const filePath = path.join(OUTPUT_DIR, `${HARNESS}-${date}.json`);
    if (fs.existsSync(filePath)) {
      dailyFiles.push({ date, filePath });
    }
  }

  if (dailyFiles.length === 0) {
    console.log("No daily files found to aggregate");
    return;
  }

  console.log(`Found ${dailyFiles.length} daily files to aggregate`);

  const startDate = dates[dates.length - 1];
  const endDate = dates[0];
  const startTime = Math.floor(
    new Date(startDate + "T00:00:00.000Z").getTime() / 1000
  );

  const mergedTables = {
    jobNames: [],
    testPaths: [],
    testNames: [],
    repositories: [],
    statuses: [],
    taskIds: [],
    messages: [],
    crashSignatures: [],
    components: [],
    commitIds: [],
  };

  const stringMaps = {
    jobNames: new Map(),
    testPaths: new Map(),
    testNames: new Map(),
    repositories: new Map(),
    statuses: new Map(),
    taskIds: new Map(),
    messages: new Map(),
    crashSignatures: new Map(),
    components: new Map(),
    commitIds: new Map(),
  };

  function addToMergedTable(tableName, value) {
    if (value === null || value === undefined) {
      return null;
    }
    const map = stringMaps[tableName];
    let index = map.get(value);
    if (index === undefined) {
      index = mergedTables[tableName].length;
      mergedTables[tableName].push(value);
      map.set(value, index);
    }
    return index;
  }

  const mergedTaskInfo = {
    repositoryIds: [],
    jobNameIds: [],
    commitIds: [],
  };

  const mergedTestInfo = {
    testPathIds: [],
    testNameIds: [],
    componentIds: [],
  };

  const testPathMap = new Map();
  const mergedTestRuns = [];

  for (let fileIdx = 0; fileIdx < dailyFiles.length; fileIdx++) {
    const { date, filePath } = dailyFiles[fileIdx];
    console.log(`Processing ${fileIdx + 1}/${dailyFiles.length}: ${date}...`);

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const dayStartTime = data.metadata.startTime;
    const timeOffset = dayStartTime - startTime;

    for (let testId = 0; testId < data.testRuns.length; testId++) {
      const testGroup = data.testRuns[testId];
      if (!testGroup) {
        continue;
      }

      const testPathId = data.testInfo.testPathIds[testId];
      const testNameId = data.testInfo.testNameIds[testId];
      const componentId = data.testInfo.componentIds[testId];

      const testPath = data.tables.testPaths[testPathId];
      const testName = data.tables.testNames[testNameId];
      const fullPath = testPath ? `${testPath}/${testName}` : testName;

      let mergedTestId = testPathMap.get(fullPath);
      if (mergedTestId === undefined) {
        mergedTestId = mergedTestInfo.testPathIds.length;

        const mergedTestPathId = addToMergedTable("testPaths", testPath);
        const mergedTestNameId = addToMergedTable("testNames", testName);
        const component =
          componentId !== null ? data.tables.components[componentId] : null;
        const mergedComponentId = addToMergedTable("components", component);

        mergedTestInfo.testPathIds.push(mergedTestPathId);
        mergedTestInfo.testNameIds.push(mergedTestNameId);
        mergedTestInfo.componentIds.push(mergedComponentId);

        testPathMap.set(fullPath, mergedTestId);
        mergedTestRuns[mergedTestId] = [];
      }

      for (let statusId = 0; statusId < testGroup.length; statusId++) {
        const statusGroup = testGroup[statusId];
        if (!statusGroup) {
          continue;
        }

        const status = data.tables.statuses[statusId];
        const mergedStatusId = addToMergedTable("statuses", status);
        const isPass = status.startsWith("PASS");
        const isCrash = status === "CRASH";

        let group = mergedTestRuns[mergedTestId][mergedStatusId];
        if (!group) {
          group = {
            repositoryIds: [],
            jobNameIds: [],
            timestamps: [],
            durations: [],
          };

          if (!isPass) {
            group.taskIdIds = [];
            if (statusGroup.messageIds) {
              group.messageIds = [];
            }
          }

          if (isCrash) {
            group.crashSignatureIds = [];
            group.minidumps = [];
          }

          mergedTestRuns[mergedTestId][mergedStatusId] = group;
        }

        let absoluteTimestamp = 0;
        for (let i = 0; i < statusGroup.taskIdIds.length; i++) {
          absoluteTimestamp += statusGroup.timestamps[i];

          // Skip platform-irrelevant tests (SKIP with run-if messages)
          if (
            status === "SKIP" &&
            data.tables.messages[statusGroup.messageIds?.[i]]?.startsWith(
              "run-if"
            )
          ) {
            continue;
          }

          const taskIdId = statusGroup.taskIdIds[i];
          const taskIdString = data.tables.taskIds[taskIdId];
          const repositoryId = data.taskInfo.repositoryIds[taskIdId];
          const jobNameId = data.taskInfo.jobNameIds[taskIdId];
          const commitId = data.taskInfo.commitIds[taskIdId];

          const repository = data.tables.repositories[repositoryId];
          const jobName = data.tables.jobNames[jobNameId];
          const commitIdString =
            commitId !== null ? data.tables.commitIds[commitId] : null;

          const mergedRepositoryId = addToMergedTable(
            "repositories",
            repository
          );
          const mergedJobNameId = addToMergedTable("jobNames", jobName);
          const mergedCommitId = addToMergedTable("commitIds", commitIdString);

          group.repositoryIds.push(mergedRepositoryId);
          group.jobNameIds.push(mergedJobNameId);
          group.timestamps.push(absoluteTimestamp + timeOffset);
          group.durations.push(statusGroup.durations[i]);

          if (isPass) {
            continue;
          }

          const mergedTaskIdId = addToMergedTable("taskIds", taskIdString);

          if (mergedTaskInfo.repositoryIds[mergedTaskIdId] === undefined) {
            mergedTaskInfo.repositoryIds[mergedTaskIdId] = mergedRepositoryId;
            mergedTaskInfo.jobNameIds[mergedTaskIdId] = mergedJobNameId;
            mergedTaskInfo.commitIds[mergedTaskIdId] = mergedCommitId;
          }

          group.taskIdIds.push(mergedTaskIdId);

          if (group.messageIds) {
            const messageId = statusGroup.messageIds?.[i];
            if (typeof messageId === "number") {
              const message = data.tables.messages[messageId];
              group.messageIds.push(addToMergedTable("messages", message));
            } else {
              group.messageIds.push(null);
            }
          } else if (statusGroup.messageIds) {
            console.warn(
              `Losing messageIds data for test ${testPath}, status ${status} (not present in first day)`
            );
          }

          if (isCrash) {
            const crashSigId = statusGroup.crashSignatureIds?.[i];
            if (typeof crashSigId === "number") {
              const crashSig = data.tables.crashSignatures[crashSigId];
              group.crashSignatureIds.push(
                addToMergedTable("crashSignatures", crashSig)
              );
            } else {
              group.crashSignatureIds.push(null);
            }

            group.minidumps.push(statusGroup.minidumps?.[i] ?? null);
          }
        }
      }
    }
  }

  function aggregateRunsByDay(
    statusGroup,
    includeMessages = false,
    returnTaskIds = false
  ) {
    const buckets = new Map();
    const length = statusGroup.timestamps.length;

    for (let i = 0; i < length; i++) {
      const dayBucket = Math.floor(statusGroup.timestamps[i] / 86400);
      let key = dayBucket;

      const messageId = statusGroup.messageIds?.[i];
      const crashSignatureId = statusGroup.crashSignatureIds?.[i];

      if (includeMessages && typeof messageId === "number") {
        key = `${dayBucket}:m${messageId}`;
      } else if (includeMessages && typeof crashSignatureId === "number") {
        key = `${dayBucket}:c${crashSignatureId}`;
      }

      if (!buckets.has(key)) {
        buckets.set(key, {
          day: dayBucket,
          count: 0,
          taskIdIds: [],
          minidumps: [],
          messageId,
          crashSignatureId,
        });
      }
      const bucket = buckets.get(key);
      bucket.count++;
      if (returnTaskIds && statusGroup.taskIdIds) {
        bucket.taskIdIds.push(statusGroup.taskIdIds[i]);
      }
      if (returnTaskIds && statusGroup.minidumps) {
        bucket.minidumps.push(statusGroup.minidumps[i] ?? null);
      }
    }

    const aggregated = Array.from(buckets.values()).sort((a, b) => {
      if (a.day !== b.day) {
        return a.day - b.day;
      }
      if (a.messageId !== b.messageId) {
        if (a.messageId === null || a.messageId === undefined) {
          return 1;
        }
        if (b.messageId === null || b.messageId === undefined) {
          return -1;
        }
        return a.messageId - b.messageId;
      }
      if (a.crashSignatureId !== b.crashSignatureId) {
        if (a.crashSignatureId === null || a.crashSignatureId === undefined) {
          return 1;
        }
        if (b.crashSignatureId === null || b.crashSignatureId === undefined) {
          return -1;
        }
        return a.crashSignatureId - b.crashSignatureId;
      }
      return 0;
    });

    const days = [];
    let previousBucket = 0;
    for (const item of aggregated) {
      days.push(item.day - previousBucket);
      previousBucket = item.day;
    }

    const result = {
      days,
    };

    if (returnTaskIds) {
      result.taskIdIds = aggregated.map(a => a.taskIdIds);
    } else {
      result.counts = aggregated.map(a => a.count);
    }

    if (includeMessages) {
      if (aggregated.some(a => "messageId" in a && a.messageId !== undefined)) {
        result.messageIds = aggregated.map(a => a.messageId ?? null);
      }
      if (
        aggregated.some(
          a => "crashSignatureId" in a && a.crashSignatureId !== undefined
        )
      ) {
        result.crashSignatureIds = aggregated.map(
          a => a.crashSignatureId ?? null
        );
      }
      if (returnTaskIds && aggregated.some(a => a.minidumps?.length)) {
        result.minidumps = aggregated.map(a => a.minidumps);
      }
    }

    return result;
  }

  console.log("Aggregating passing test runs by day...");

  const finalTestRuns = [];

  for (let testId = 0; testId < mergedTestRuns.length; testId++) {
    const testGroup = mergedTestRuns[testId];
    if (!testGroup) {
      continue;
    }

    finalTestRuns[testId] = [];

    for (let statusId = 0; statusId < testGroup.length; statusId++) {
      const statusGroup = testGroup[statusId];
      if (!statusGroup?.timestamps?.length) {
        continue;
      }

      const status = mergedTables.statuses[statusId];
      const isPass = status.startsWith("PASS");

      if (isPass) {
        finalTestRuns[testId][statusId] = aggregateRunsByDay(statusGroup);
      } else {
        finalTestRuns[testId][statusId] = aggregateRunsByDay(
          statusGroup,
          true,
          true
        );
      }
    }
  }

  const testsWithFailures = finalTestRuns.filter(testGroup =>
    testGroup?.some(
      (sg, idx) => sg && !mergedTables.statuses[idx].startsWith("PASS")
    )
  ).length;

  console.log("Sorting string tables by frequency...");

  // Sort string tables by frequency for better compression
  const dataStructure = {
    tables: mergedTables,
    taskInfo: mergedTaskInfo,
    testInfo: mergedTestInfo,
    testRuns: finalTestRuns,
  };

  const sortedData = sortStringTablesByFrequency(dataStructure);

  const outputData = {
    metadata: {
      startDate,
      endDate,
      days: dates.length,
      startTime,
      generatedAt: new Date().toISOString(),
      totalTestCount: mergedTestInfo.testPathIds.length,
      testsWithFailures,
      aggregatedFrom: dailyFiles.map(f => path.basename(f.filePath)),
    },
    tables: sortedData.tables,
    taskInfo: sortedData.taskInfo,
    testInfo: sortedData.testInfo,
    testRuns: sortedData.testRuns,
  };

  const outputFileWithDetails = path.join(
    OUTPUT_DIR,
    `${HARNESS}-issues-with-taskids.json`
  );
  saveJsonFile(outputData, outputFileWithDetails);

  // Create small file with all statuses aggregated
  console.log("Creating small aggregated version...");

  const smallTestRuns = sortedData.testRuns.map(testGroup => {
    if (!testGroup) {
      return testGroup;
    }
    return testGroup.map(statusGroup => {
      if (!statusGroup) {
        return statusGroup;
      }
      if (statusGroup.counts) {
        return statusGroup;
      }

      const result = {
        counts: statusGroup.taskIdIds.map(arr => arr.length),
        days: statusGroup.days,
      };

      if (statusGroup.messageIds) {
        result.messageIds = statusGroup.messageIds;
      }

      if (statusGroup.crashSignatureIds) {
        result.crashSignatureIds = statusGroup.crashSignatureIds;
      }

      return result;
    });
  });

  const smallOutput = {
    metadata: outputData.metadata,
    tables: {
      testPaths: sortedData.tables.testPaths,
      testNames: sortedData.tables.testNames,
      statuses: sortedData.tables.statuses,
      messages: sortedData.tables.messages,
      crashSignatures: sortedData.tables.crashSignatures,
      components: sortedData.tables.components,
    },
    testInfo: sortedData.testInfo,
    testRuns: smallTestRuns,
  };

  const outputFileSmall = path.join(OUTPUT_DIR, `${HARNESS}-issues.json`);
  saveJsonFile(smallOutput, outputFileSmall);

  console.log(
    `Successfully created aggregated files with ${outputData.metadata.totalTestCount} tests`
  );
  console.log(`  Tests with failures: ${testsWithFailures}`);
}

function calculateStatsFromData(
  testData,
  targetDate,
  ignoredJobsCount = 0,
  failedJobsCount = 0
) {
  const stats = {
    totalTestRuns: 0,
    failedTestRuns: 0,
    skippedTestRuns: 0,
    processedJobCount: testData.metadata.processedJobCount || 0,
    failedJobs: failedJobsCount,
    invalidJobs: testData.metadata.invalidJobCount || 0,
    ignoredJobs: ignoredJobsCount,
  };

  for (const testGroup of testData.testRuns) {
    for (let statusId = 0; statusId < testGroup.length; statusId++) {
      const statusGroup = testGroup[statusId];
      if (!statusGroup) {
        continue;
      }

      const status = testData.tables.statuses[statusId];
      const runCount = statusGroup.taskIdIds.length;
      stats.totalTestRuns += runCount;

      if (
        status.startsWith("FAIL") ||
        status === "CRASH" ||
        status === "TIMEOUT"
      ) {
        stats.failedTestRuns += runCount;
      } else if (status === "SKIP") {
        if (statusGroup.messageIds) {
          for (const messageId of statusGroup.messageIds) {
            if (
              messageId == null ||
              !testData.tables.messages[messageId].startsWith("run-if")
            ) {
              stats.skippedTestRuns++;
            }
          }
        } else {
          stats.skippedTestRuns += runCount;
        }
      }
    }
  }

  console.log(
    `  Stats: ${stats.totalTestRuns} runs, ${stats.failedTestRuns} failed, ${stats.failedJobs} failed jobs, ${stats.invalidJobs} invalid jobs, ${stats.ignoredJobs} ignored jobs`
  );

  dailyStatsMap.set(targetDate, stats);

  return stats;
}

async function saveStatsFile() {
  console.log(`\n=== Generating statistics summary file ===`);

  const allDates = Array.from(dailyStatsMap.keys()).sort();
  if (allDates.length === 0) {
    console.log("No daily stats to save");
    return;
  }

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      harness: HARNESS,
    },
    dates: allDates,
    totalTestRuns: [],
    failedTestRuns: [],
    skippedTestRuns: [],
    processedJobCount: [],
    failedJobs: [],
    invalidJobs: [],
    ignoredJobs: [],
  };

  for (const date of allDates) {
    const stats = dailyStatsMap.get(date);
    output.totalTestRuns.push(stats.totalTestRuns);
    output.failedTestRuns.push(stats.failedTestRuns);
    output.skippedTestRuns.push(stats.skippedTestRuns);
    output.processedJobCount.push(stats.processedJobCount);
    output.failedJobs.push(stats.failedJobs);
    output.invalidJobs.push(stats.invalidJobs);
    output.ignoredJobs.push(stats.ignoredJobs);
  }

  const statsFileName = `${HARNESS}-stats.json`;
  saveJsonFile(output, path.join(OUTPUT_DIR, statsFileName));
  console.log(`${allDates.length} days (${allDates[0]} to ${allDates.at(-1)})`);
}

async function main() {
  const scriptStartTime = Date.now();

  // Log heap limit at startup
  const heapStats = require("v8").getHeapStatistics();
  const heapLimitMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);
  console.log(`Node heap limit: ${heapLimitMB}MB`);

  const forceRefetch = process.argv.includes("--force");

  // Check for --days parameter
  let numDays = 3;
  const daysIndex = process.argv.findIndex(arg => arg === "--days");
  if (daysIndex !== -1 && daysIndex + 1 < process.argv.length) {
    const daysValue = parseInt(process.argv[daysIndex + 1]);
    if (!isNaN(daysValue) && daysValue > 0 && daysValue <= 30) {
      numDays = daysValue;
    } else {
      console.error("Error: --days must be a number between 1 and 30");
      process.exit(1);
    }
  }

  if (process.env.TASK_ID) {
    await fetchPreviousRunData();
  }

  // Fetch component mapping data
  await fetchComponentsData();

  // Check for --revision parameter (format: project:revision)
  const revisionIndex = process.argv.findIndex(arg => arg === "--revision");
  if (revisionIndex !== -1 && revisionIndex + 1 < process.argv.length) {
    const revisionArg = process.argv[revisionIndex + 1];
    const parts = revisionArg.split(":");

    if (parts.length !== 2) {
      console.error(
        "Error: --revision must be in format project:revision (e.g., try:abc123 or autoland:def456)"
      );
      process.exit(1);
    }

    const [project, revision] = parts;
    const output = await processRevisionData(project, revision, forceRefetch);

    if (output) {
      console.log("Successfully processed revision data.");
    } else {
      console.log("\nNo data was successfully processed.");
    }
    return;
  }

  // Check for --try option (shortcut for --revision try:...)
  const tryIndex = process.argv.findIndex(arg => arg === "--try");
  if (tryIndex !== -1 && tryIndex + 1 < process.argv.length) {
    const revision = process.argv[tryIndex + 1];
    const output = await processRevisionData("try", revision, forceRefetch);

    if (output) {
      console.log("Successfully processed try commit data.");
    } else {
      console.log("\nNo data was successfully processed.");
    }
    return;
  }

  // Fetch data for the specified number of days
  const dates = [];
  for (let i = 1; i <= numDays; i++) {
    dates.push(getDateString(i));
  }

  console.log(
    `Fetching ${HARNESS} test data for the last ${numDays} day${numDays > 1 ? "s" : ""}: ${dates.join(", ")}`
  );

  const processedDates = [];
  const ONE_HOUR_MS = 60 * 60 * 1000;

  for (const date of dates) {
    console.log(`\n=== Processing ${date} ===`);
    await processDateData(date, forceRefetch);
    processedDates.push(date);

    // Check if we've been running for more than 1 hour
    const elapsedTime = Date.now() - scriptStartTime;
    if (elapsedTime > ONE_HOUR_MS) {
      const remainingDates = dates.length - processedDates.length;
      if (remainingDates > 0) {
        console.log(
          `\nStopping after 1 hour of processing. Skipping ${remainingDates} remaining date${remainingDates > 1 ? "s" : ""}.`
        );
      }
      break;
    }
  }

  // Clear caches to free memory before aggregation
  allJobsCache = null;
  componentsData = null;

  // Create index file with available dates
  const indexFile = path.join(OUTPUT_DIR, "index.json");
  const availableDates = [];

  // Scan for all harness-*.json files in the output directory
  const files = fs.readdirSync(OUTPUT_DIR);
  const pattern = new RegExp(`^${HARNESS}-(\\d{4}-\\d{2}-\\d{2})\\.json$`);
  files.forEach(file => {
    const match = file.match(pattern);
    if (match) {
      availableDates.push(match[1]);
    }
  });

  // Sort dates in descending order (newest first)
  availableDates.sort((a, b) => b.localeCompare(a));

  fs.writeFileSync(
    indexFile,
    JSON.stringify({ dates: availableDates }, null, 2)
  );
  console.log(
    `\nIndex file saved as ${indexFile} with ${availableDates.length} dates`
  );

  // Generate statistics summary file
  await saveStatsFile();

  // Create aggregated failures file if processing multiple days
  if (processedDates.length > 1) {
    await createAggregatedFailuresFile(processedDates);
  }
}

main().catch(console.error);
