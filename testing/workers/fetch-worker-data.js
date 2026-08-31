#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const fs = require("fs");
const path = require("path");

const TASKCLUSTER_BASE_URL =
  process.env.TASKCLUSTER_PROXY_URL ||
  process.env.TASKCLUSTER_ROOT_URL ||
  "https://firefox-ci-tc.services.mozilla.com";

// STMO query for worker pool task data (same as workers.html dashboard)
const DATA_URL =
  "https://sql.telemetry.mozilla.org/api/queries/112377/results.json?api_key=l9PzG0DxDTNPhLWSRtZm9DdUtjjW7XN5i0T85Twy";

const OUTPUT_DIR = (() => {
  const idx = process.argv.findIndex(arg => arg === "--output-dir");
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return "./worker-data";
})();

let previousRunData = null;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

function saveJsonFile(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data));
  const stats = fs.statSync(filePath);
  console.log(`Saved ${filePath} - ${Math.round(stats.size / 1024)}KB`);
}

// Fetch previous run metadata from Taskcluster
async function fetchPreviousRunData() {
  try {
    const taskUrl = `${TASKCLUSTER_BASE_URL}/api/queue/v1/task/${process.env.TASK_ID}`;
    const taskData = await fetchJson(taskUrl);
    if (!taskData) {
      console.log(`Failed to fetch task info from ${taskUrl}`);
      return;
    }

    const routes = taskData.routes || [];
    const latestRoute = routes.find(
      route => route.startsWith("index.") && route.includes(".latest.")
    );
    if (!latestRoute) {
      console.log(
        `No route found with 'index.' prefix and '.latest.' in name. Available routes: ${JSON.stringify(routes)}`
      );
      return;
    }

    const indexName = latestRoute.replace(/^index\./, "");
    console.log(`Using index: ${indexName}`);

    const artifactsUrl = `${TASKCLUSTER_BASE_URL}/api/index/v1/task/${indexName}/artifacts/public`;

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

    console.log("Previous run metadata loaded\n");
  } catch (error) {
    console.log(`Error fetching previous run metadata: ${error.message}`);
  }
}

// The STMO query covers the day before it ran.
function extractDateFromQuery(queryResult) {
  const retrieved = queryResult.retrieved_at;
  if (retrieved) {
    const d = new Date(retrieved);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split("T")[0];
  }
  return null;
}

// Helper: create string table with findId function
function createStringTables(tableNames) {
  const tables = {};
  const maps = {};
  for (const name of tableNames) {
    tables[name] = [];
    maps[name] = new Map();
  }

  function findId(tableName, value) {
    if (value == null || value === "") {
      return null;
    }
    const map = maps[tableName];
    let id = map.get(value);
    if (id === undefined) {
      id = tables[tableName].length;
      tables[tableName].push(value);
      map.set(value, id);
    }
    return id;
  }

  return { tables, findId };
}

// Sort string tables by frequency and remap all id arrays.
// idArrays maps table name to one or more arrays of indices into that table.
// Arrays may have different lengths (e.g. per-task vs per-worker).
function sortAndRemapTables(tables, idArrays) {
  for (const [tableName, table] of Object.entries(tables)) {
    const arrays = idArrays[tableName] || [];
    const freq = new Array(table.length).fill(0);

    for (const arr of arrays) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== null) {
          freq[arr[i]]++;
        }
      }
    }

    const order = table.map((val, idx) => ({ val, idx, count: freq[idx] }));
    order.sort((a, b) => b.count - a.count || a.val.localeCompare(b.val));

    const newTable = new Array(table.length);
    const oldToNew = new Array(table.length);
    for (let j = 0; j < order.length; j++) {
      newTable[j] = order[j].val;
      oldToNew[order[j].idx] = j;
    }

    tables[tableName] = newTable;

    for (const arr of arrays) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== null) {
          arr[i] = oldToNew[arr[i]];
        }
      }
    }
  }
}

// Encode both summary and full task data in a single pass over the rows.
// Returns { summary, taskData } ready to be serialized.
function encodeData(rows, date) {
  const { tables, findId } = createStringTables([
    "labels",
    "projects",
    "taskQueueIds",
    "resolutions",
    "workerGroups",
    "workerIds",
    "priorities",
    "users",
    "taskGroupIds",
  ]);

  rows.sort((a, b) => Number(a.scheduled || 0) - Number(b.scheduled || 0));

  const n = rows.length;
  const metadata = {
    date,
    generatedAt: new Date().toISOString(),
    taskCount: n,
  };

  const scheduled = new Array(n);
  const started = new Array(n);
  const resolved = new Array(n);
  const resolutionIds = new Array(n);
  const taskQueueIdIds = new Array(n);
  const projectIds = new Array(n);
  const taskIds = new Array(n);
  const labelIds = new Array(n);
  const priorityIds = new Array(n);
  const taskGroupIdIds = new Array(n);
  const userIds = new Array(n);
  const workerIdIds = new Array(n);
  const runCosts = new Array(n);

  const workerGroupIds = new Array(n);
  const rawProjectIds = new Array(n);

  const absScheduled = new Array(n);
  for (let i = 0; i < n; i++) {
    absScheduled[i] = Number(rows[i].scheduled || 0);
  }

  // Differential compression for scheduled times
  if (n > 0) {
    scheduled[0] = absScheduled[0];
    for (let i = 1; i < n; i++) {
      scheduled[i] = absScheduled[i] - absScheduled[i - 1];
    }
  }

  for (let i = 0; i < n; i++) {
    const row = rows[i];
    const absStarted = row.started ? Number(row.started) : null;
    const absResolved = Number(row.resolved || 0);

    started[i] = absStarted !== null ? absStarted - absScheduled[i] : null;
    resolved[i] = absResolved - absScheduled[i];

    const state = row.state || "";
    const reason = row.reason_resolved || "";
    resolutionIds[i] = findId(
      "resolutions",
      state === reason ? state : `${state} - ${reason}`
    );
    taskQueueIdIds[i] = findId("taskQueueIds", row.task_queue_id);

    const runId = parseInt(row.run_id) || 0;
    taskIds[i] = runId ? `${row.task_id || ""}.${runId}` : row.task_id || "";

    labelIds[i] = findId("labels", row.label);
    priorityIds[i] = findId("priorities", row.priority);

    taskGroupIdIds[i] = findId("taskGroupIds", row.task_group_id);
    rawProjectIds[i] = findId("projects", row.project);

    userIds[i] = findId("users", row.created_for_user);

    workerIdIds[i] = findId("workerIds", row.worker_id);
    workerGroupIds[i] = findId("workerGroups", row.worker_group);

    runCosts[i] =
      row.run_cost != null
        ? Math.round(parseFloat(row.run_cost) * 1e6) / 1e6
        : 0;
  }

  sortAndRemapTables(tables, {
    labels: [labelIds],
    projects: [rawProjectIds],
    taskQueueIds: [taskQueueIdIds],
    resolutions: [resolutionIds],
    workerIds: [workerIdIds],
    workerGroups: [workerGroupIds],
    priorities: [priorityIds],
    users: [userIds],
    taskGroupIds: [taskGroupIdIds],
  });

  // Build per-worker and per-task-group arrays from the remapped per-task arrays.
  const workerGroupForWorkerId = new Array(tables.workerIds.length).fill(null);
  const projectForTaskGroup = new Array(tables.taskGroupIds.length).fill(null);
  for (let i = 0; i < n; i++) {
    if (workerIdIds[i] !== null) {
      workerGroupForWorkerId[workerIdIds[i]] = workerGroupIds[i];
    }
    if (taskGroupIdIds[i] !== null && rawProjectIds[i] !== null) {
      projectForTaskGroup[taskGroupIdIds[i]] = rawProjectIds[i];
    }
  }

  // Derive per-task projectIds for the summary from the per-task-group mapping.
  for (let i = 0; i < n; i++) {
    const tgid = taskGroupIdIds[i];
    projectIds[i] = tgid !== null ? projectForTaskGroup[tgid] : null;
  }

  const summary = {
    metadata,
    tables: {
      taskQueueIds: tables.taskQueueIds,
      resolutions: tables.resolutions,
      projects: tables.projects,
    },
    tasks: {
      scheduled,
      started,
      resolved,
      resolutionIds,
      taskQueueIdIds,
      projectIds,
    },
  };

  const taskData = {
    metadata,
    tables,
    tasks: {
      scheduled,
      started,
      resolved,
      resolutionIds,
      taskIds,
      labelIds,
      priorityIds,
      taskGroupIdIds,
      userIds,
      taskQueueIdIds,
      workerIdIds,
      runCosts,
    },
    workerInfo: {
      workerGroupIds: workerGroupForWorkerId,
    },
    taskGroupInfo: {
      projectIds: projectForTaskGroup,
    },
  };

  return { summary, taskData };
}

async function main() {
  const scriptStartTime = Date.now();

  if (process.env.TASK_ID) {
    await fetchPreviousRunData();
  }

  // Fetch current data from STMO
  console.log("Fetching worker task data from STMO...");
  const stmoData = await fetchJson(DATA_URL);
  if (!stmoData) {
    console.error("Failed to fetch data from STMO");
    process.exit(1);
  }

  const queryResult = stmoData.query_result;
  const rows = queryResult.data.rows;
  if (!rows || rows.length === 0) {
    console.error("No data rows found");
    process.exit(1);
  }

  const date = extractDateFromQuery(queryResult);
  if (!date) {
    console.error("Could not determine date from query result");
    process.exit(1);
  }

  console.log(`Processing ${rows.length} tasks for ${date}...`);
  const { summary, taskData } = encodeData(rows, date);

  saveJsonFile(summary, path.join(OUTPUT_DIR, `workers-${date}.json`));
  saveJsonFile(taskData, path.join(OUTPUT_DIR, `workers-${date}-tasks.json`));

  // Fetch previous run's files to build up history
  if (previousRunData) {
    const MAX_HISTORY_DAYS = 21;
    const fetches = [];
    for (const prevDate of previousRunData.dates) {
      const daysDiff = Math.round(
        (new Date(date) - new Date(prevDate)) / (24 * 60 * 60 * 1000)
      );
      if (daysDiff <= 0 || daysDiff >= MAX_HISTORY_DAYS) {
        console.log(
          `Skipping ${prevDate} (outside ${MAX_HISTORY_DAYS}-day window)`
        );
        continue;
      }

      for (const suffix of ["", "-tasks"]) {
        const filename = `workers-${prevDate}${suffix}.json`;
        const filePath = path.join(OUTPUT_DIR, filename);

        fetches.push(
          fetch(`${previousRunData.artifactsUrl}/${filename}`).then(
            async response => {
              if (!response.ok) {
                console.log(`  Failed to fetch ${filename}`);
                return;
              }
              const buffer = Buffer.from(await response.arrayBuffer());
              fs.writeFileSync(filePath, buffer);
              console.log(
                `Fetched ${filename} - ${Math.round(buffer.length / 1024)}KB`
              );
            }
          )
        );
      }
    }

    await Promise.all(fetches);
    if (fetches.length) {
      console.log(`Fetched ${fetches.length} previous files`);
    }
  }

  // Build index.json from available summary files
  const files = fs.readdirSync(OUTPUT_DIR);
  const datePattern = /^workers-(\d{4}-\d{2}-\d{2})\.json$/;
  const availableDates = [];

  for (const file of files) {
    const match = file.match(datePattern);
    if (match) {
      availableDates.push(match[1]);
    }
  }

  availableDates.sort((a, b) => b.localeCompare(a));

  const indexPath = path.join(OUTPUT_DIR, "index.json");
  saveJsonFile({ dates: availableDates }, indexPath);
  console.log(`Index file saved with ${availableDates.length} dates`);

  const elapsed = ((Date.now() - scriptStartTime) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
