/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const zlib = require("zlib");
const { promisify } = require("util");

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const TASKCLUSTER_BASE_URL =
  process.env.TASKCLUSTER_PROXY_URL ||
  process.env.TASKCLUSTER_ROOT_URL ||
  "https://firefox-ci-tc.services.mozilla.com";

const REPOSITORY = "mozilla-central";
const OUTPUT_DIR = (() => {
  const outputDirIndex = process.argv.findIndex(arg => arg === "--output-dir");
  if (outputDirIndex !== -1 && outputDirIndex + 1 < process.argv.length) {
    return process.argv[outputDirIndex + 1];
  }
  return "./manifest-data";
})();
const CACHE_DIR = "./errorsummary-cache";

if (!fsSync.existsSync(OUTPUT_DIR)) {
  fsSync.mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (!fsSync.existsSync(CACHE_DIR)) {
  fsSync.mkdirSync(CACHE_DIR, { recursive: true });
}

async function writeJsonFile(filename, data) {
  const filePath = path.join(OUTPUT_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data));
  const stats = await fs.stat(filePath);
  console.log(`Saved ${filePath} - ${Math.round(stats.size / 1024)}KB`);
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

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return response.text();
}

function getTaskPath(taskId, retryId) {
  return retryId === 0 ? taskId : `${taskId}/runs/${retryId}`;
}

function getTaskIdString(taskId, retryId) {
  return retryId === 0 ? taskId : `${taskId}.${retryId}`;
}

function getArtifactPrefix(jobName) {
  const match = jobName.match(/\/(opt|debug)-(.+?)(?:-\d+)?$/);
  if (!match) {
    return null;
  }

  let testType = match[2];

  if (testType.includes("geckoview-")) {
    testType = testType
      .replace(/^isolated-process-geckoview-/, "")
      .replace(/^geckoview-/, "");
  }

  if (testType.startsWith("web-platform-tests")) {
    return "wpt";
  }

  const prefixes = [
    "mochitest-browser-chrome",
    "mochitest-devtools-chrome",
    "mochitest-browser-media",
    "mochitest-browser-a11y",
    "mochitest-browser-translations",
    "mochitest-plain-gpu",
    "mochitest-plain",
    "mochitest-chrome-gpu",
    "mochitest-chrome",
    "mochitest-media",
    "mochitest-webgl1-core",
    "mochitest-webgl1-ext",
    "mochitest-webgl2-core",
    "mochitest-webgl2-ext",
    "mochitest-webgpu",
    "mochitest-remote",
    "mochitest-a11y",
    "crashtest-qr",
    "crashtest",
    "reftest-qr",
    "reftest",
    "jsreftest",
    "xpcshell",
    "marionette",
  ];

  for (const prefix of prefixes) {
    if (testType.startsWith(prefix)) {
      return prefix;
    }
  }

  return null;
}

async function fetchPushesForDate(project, targetDate) {
  console.log(`Fetching pushes for ${project} on ${targetDate}...`);

  const startDate = new Date(targetDate + "T00:00:00.000Z");
  const endDate = new Date(targetDate + "T23:59:59.999Z");

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  const url = `https://treeherder.mozilla.org/api/project/${project}/push/?full=true&count=100&push_timestamp__gte=${startTimestamp}&push_timestamp__lte=${endTimestamp}`;

  const result = await fetchJson(url);
  if (!result || !result.results) {
    throw new Error(`Failed to fetch pushes for ${project} on ${targetDate}`);
  }

  console.log(`Found ${result.results.length} pushes`);
  return result.results;
}

async function fetchTestJobsForPush(project, pushId) {
  let allJobs = [];
  let propertyNames = [];
  let url = `https://treeherder.mozilla.org/api/jobs/?push_id=${pushId}`;

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

  const jobTypeNameIndex = propertyNames.indexOf("job_type_name");
  const taskIdIndex = propertyNames.indexOf("task_id");
  const retryIdIndex = propertyNames.indexOf("retry_id");
  const stateIndex = propertyNames.indexOf("state");
  const resultIndex = propertyNames.indexOf("result");

  return allJobs
    .filter(job => {
      const state = job[stateIndex];
      const result = job[resultIndex];
      const jobName = job[jobTypeNameIndex];
      return (
        state === "completed" &&
        (result === "success" || result === "testfailed") &&
        jobName.startsWith("test-") &&
        !jobName.endsWith("-cf")
      );
    })
    .map(job => ({
      name: job[jobTypeNameIndex],
      taskId: job[taskIdIndex],
      retryId: job[retryIdIndex] || 0,
    }));
}

async function listTaskArtifacts(taskId, retryId) {
  const url = `${TASKCLUSTER_BASE_URL}/api/queue/v1/task/${getTaskPath(taskId, retryId)}/artifacts`;

  const result = await fetchJson(url);
  if (!result || !result.artifacts) {
    return [];
  }

  return result.artifacts.map(a => a.name);
}

async function fetchErrorsummaryLog(job, prefix) {
  const artifactName = `${prefix}_errorsummary.log`;
  const taskString = getTaskIdString(job.taskId, job.retryId);
  const cacheKey = `${taskString}_${artifactName}`;
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.gz`);

  let text = null;

  try {
    const compressed = await fs.readFile(cachePath);
    const decompressed = await gunzip(compressed);
    text = decompressed.toString("utf-8");
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.error(
        `Error reading cache for ${job.name} (${taskString}): ${e.message}`
      );
      await fs.unlink(cachePath).catch(() => {});
    }
  }

  if (!text) {
    const url = `${TASKCLUSTER_BASE_URL}/api/queue/v1/task/${getTaskPath(job.taskId, job.retryId)}/artifacts/public/test_info/${artifactName}`;

    text = await fetchText(url);
    if (!text) {
      const artifacts = await listTaskArtifacts(job.taskId, job.retryId);
      const errorsummaryLogs = artifacts.filter(a =>
        a.endsWith("errorsummary.log")
      );

      if (errorsummaryLogs.length) {
        console.error(
          `Error fetching ${artifactName} for ${job.name} (${taskString}): Not found, but task has: ${errorsummaryLogs.join(", ")}`
        );
      } else {
        console.error(
          `Error fetching ${artifactName} for ${job.name} (${taskString}): Not found (task has no errorsummary logs)`
        );
      }
      return null;
    }

    try {
      const compressed = await gzip(text);
      await fs.writeFile(cachePath, compressed);
    } catch (e) {
      console.error(
        `Error caching ${artifactName} for ${job.name} (${taskString}): ${e.message}`
      );
    }
  }

  const manifestTimings = [];
  const lines = text.split("\n");
  let parseErrors = 0;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    try {
      const data = JSON.parse(line);
      if (
        data.action === "group_result" &&
        data.group &&
        data.duration !== undefined
      ) {
        manifestTimings.push({
          group: data.group,
          duration: data.duration,
        });
      }
    } catch (e) {
      parseErrors++;
    }
  }

  if (parseErrors > 0) {
    console.warn(
      `Warning: ${parseErrors} JSON parse errors in ${artifactName} for ${job.name} (${taskString})`
    );
  }

  if (manifestTimings.length === 0) {
    console.error(
      `Error parsing ${artifactName} for ${job.name} (${taskString}): No group_result entries found`
    );
  }

  return manifestTimings;
}

async function processDate(targetDate) {
  console.log(`\n=== Processing ${targetDate} ===`);

  const pushes = await fetchPushesForDate(REPOSITORY, targetDate);

  const tables = {
    manifest: { array: [], map: new Map() },
    jobName: { array: [], map: new Map() },
    commit: { array: [], map: new Map() },
    prefix: { array: [], map: new Map() },
  };

  function getId(tableName, value) {
    const table = tables[tableName];
    let id = table.map.get(value);
    if (id === undefined) {
      id = table.array.length;
      table.array.push(value);
      table.map.set(value, id);
    }
    return id;
  }

  const manifestIds = [];
  const jobNameIds = [];
  const durations = [];
  const allTimings = [];

  let processedJobs = 0;
  let failedJobs = 0;

  const testJobs = [];
  for (const push of pushes) {
    console.log(`Collecting jobs from push ${push.id}...`);
    const jobs = await fetchTestJobsForPush(REPOSITORY, push.id);
    for (const job of jobs) {
      testJobs.push({ ...job, commit: push.revision });
    }
  }

  console.log(`\nFetching errorsummary logs for ${testJobs.length} jobs...`);

  const CONCURRENCY = 50;
  const jobQueue = [...testJobs];
  let completedJobs = 0;
  let lastPrintTime = 0;

  async function processJob(job) {
    const prefix = getArtifactPrefix(job.name);
    if (!prefix) {
      completedJobs++;
      return;
    }

    const manifestTimings = await fetchErrorsummaryLog(job, prefix);

    completedJobs++;

    const now = Date.now();
    if (now - lastPrintTime >= 1000) {
      const percentage = Math.round((completedJobs / testJobs.length) * 100);
      console.log(`  ${percentage}% (${completedJobs}/${testJobs.length})`);
      lastPrintTime = now;
    }

    if (!manifestTimings || manifestTimings.length === 0) {
      failedJobs++;
      return;
    }

    const jobNameId = getId("jobName", job.name.replace(/-\d+$/, ""));
    const taskIdString = getTaskIdString(job.taskId, job.retryId);

    for (const timing of manifestTimings) {
      const manifestId = getId("manifest", timing.group);
      manifestIds.push(manifestId);
      jobNameIds.push(jobNameId);
      durations.push(timing.duration);
      allTimings.push({
        manifestId,
        jobNameId,
        duration: timing.duration,
        taskId: taskIdString,
        jobName: job.name,
        commit: job.commit,
        artifactPrefix: prefix,
      });
    }

    processedJobs++;
  }

  const tasks = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    tasks.push(
      (async () => {
        while (jobQueue.length) {
          const job = jobQueue.shift();
          if (job) {
            await processJob(job);
          }
        }
      })()
    );
  }

  await Promise.all(tasks);

  console.log(`  100% (${completedJobs}/${testJobs.length})`);
  console.log(`Processed ${processedJobs} jobs, ${failedJobs} failed`);
  console.log(
    `Collected ${durations.length} manifest timings across ${tables.manifest.array.length} unique manifests and ${tables.jobName.array.length} job types`
  );

  const taskIds = [];
  const taskJobNameIds = [];
  const taskCommitIds = [];
  const taskPrefixes = [];
  const taskMap = new Map();

  const runTaskIds = [];

  function getTaskId(taskId, jobName, commit, artifactPrefix) {
    let id = taskMap.get(taskId);
    if (id === undefined) {
      id = taskIds.length;
      taskIds.push(taskId);
      taskJobNameIds.push(getId("jobName", jobName));
      taskCommitIds.push(getId("commit", commit));
      taskPrefixes.push(getId("prefix", artifactPrefix));
      taskMap.set(taskId, id);
    }
    return id;
  }

  // Collect task data for each timing
  for (let i = 0; i < durations.length; i++) {
    const timing = allTimings[i];
    const taskId = getTaskId(
      timing.taskId,
      timing.jobName,
      timing.commit,
      timing.artifactPrefix
    );
    runTaskIds.push(taskId);
  }

  // Create detailed file with parallel arrays
  const detailedData = {
    metadata: {
      date: targetDate,
      repository: REPOSITORY,
      generatedAt: new Date().toISOString(),
      processedJobCount: processedJobs,
      failedJobCount: failedJobs,
    },
    manifests: tables.manifest.array,
    jobNames: tables.jobName.array,
    commits: tables.commit.array,
    prefixes: tables.prefix.array,
    tasks: {
      id: taskIds,
      jobName: taskJobNameIds,
      commitId: taskCommitIds,
      prefix: taskPrefixes,
    },
    runs: {
      manifestIds,
      jobNameIds,
      taskIds: runTaskIds,
      durations,
    },
  };

  await writeJsonFile("manifests.json", detailedData);

  // Create aggregated file grouped by manifest and job
  const manifestJobMap = new Map();

  for (let i = 0; i < durations.length; i++) {
    const manifestName = tables.manifest.array[manifestIds[i]];
    const jobNameId = jobNameIds[i];
    const duration = durations[i];

    if (!manifestJobMap.has(manifestName)) {
      manifestJobMap.set(manifestName, new Map());
    }

    const jobMap = manifestJobMap.get(manifestName);
    if (!jobMap.has(jobNameId)) {
      jobMap.set(jobNameId, []);
    }

    jobMap.get(jobNameId).push(duration);
  }

  const manifests = {};
  for (const [manifestName, jobMap] of manifestJobMap) {
    const jobs = [];
    const runtimes = [];
    for (const [jobNameId, jobRuntimes] of jobMap) {
      jobs.push(jobNameId);
      runtimes.push(jobRuntimes.sort((a, b) => a - b));
    }
    manifests[manifestName] = { jobs, runtimes };
  }

  const aggregatedData = {
    metadata: {
      date: targetDate,
      repository: REPOSITORY,
      generatedAt: new Date().toISOString(),
    },
    jobNames: tables.jobName.array,
    manifests,
  };

  await writeJsonFile("manifests-runtimes.json", aggregatedData);

  return detailedData;
}

async function main() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const yesterday = date.toISOString().split("T")[0];

  console.log(`Fetching manifest data for ${yesterday}`);

  await processDate(yesterday);
}

main().catch(console.error);
