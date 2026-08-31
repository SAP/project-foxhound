# Worker Pool Activity Data Format Documentation

This document describes the JSON file formats created by `fetch-worker-data.js`.

## Overview

The script generates daily JSON files containing Taskcluster worker pool activity
data, fetched from STMO (BigQuery). The format uses string tables, parallel arrays,
and differential time compression to minimize file size.

Three file types are produced per day:

1. **Index**: `index.json` - List of available dates, used by the dashboard
   at https://tests.firefox.dev/workers.html to know which dates can be loaded.
2. **Summary**: `workers-YYYY-MM-DD.json` - Small file (~5 MB) with timestamps,
   resolution, task queue, and project. Loaded immediately by the dashboard for
   stats computation, time series rendering, and project filtering.
3. **Tasks**: `workers-YYYY-MM-DD-tasks.json` - Full task data (~20 MB) with all
   fields. Loaded on demand when the user clicks a Profiler button.

---

## Index File (`index.json`)

```json
{
  "dates": ["2026-03-04", "2026-03-03", "2026-03-02", ...]
}
```

Dates are sorted in descending order (newest first). Up to 21 days of history
are maintained.

---

## Summary File (`workers-YYYY-MM-DD.json`)

Small file for fast initial dashboard load. Contains only the fields needed
to compute per-pool stats, draw time-series activity tracks, and populate
project filter buttons.

### Top-Level Structure

```json
{
  "metadata": { ... },
  "tables": { ... },
  "tasks": { ... }
}
```

### metadata

```json
{
  "date": "2026-03-04",
  "generatedAt": "2026-03-05T03:12:45.123Z",
  "taskCount": 243684
}
```

### tables

```json
{
  "taskQueueIds": ["gecko-t/t-linux-docker-noscratch-amd", ...],
  "resolutions": ["completed", "failed", "exception - canceled", ...],
  "projects": ["mozilla-central", "try", "autoland", ...]
}
```

### tasks

Parallel arrays of length `taskCount`:

```json
{
  "scheduled": [1709510400000, 150, 0, 23, ...],
  "started": [5432, null, 1234, ...],
  "resolved": [65432, 3600000, 12345, ...],
  "resolutionIds": [0, 0, 2, ...],
  "taskQueueIdIds": [0, 1, 0, ...],
  "projectIds": [0, null, 1, ...]
}
```

See [Time Compression](#time-compression) and [Resolutions](#resolutions) below
for encoding details.

---

## Tasks File (`workers-YYYY-MM-DD-tasks.json`)

Full task data loaded on demand for Firefox Profiler integration.

### Top-Level Structure

```json
{
  "metadata": { ... },
  "tables": { ... },
  "tasks": { ... },
  "workerInfo": { ... },
  "taskGroupInfo": { ... }
}
```

### metadata

Same structure as the summary file.

### tables

All strings are deduplicated and stored once. Tables are sorted by frequency
of use (most referenced entries first) to reduce JSON size (frequently used strings get smaller numeric indices).

```json
{
  "labels": ["test-linux2404-64/opt-mochitest-plain-5", ...],
  "projects": ["mozilla-central", "try", "autoland", ...],
  "taskQueueIds": ["releng-hardware/gecko-t-linux-2404-wayland", ...],
  "resolutions": ["completed", "failed", "exception - canceled", ...],
  "workerGroups": ["us-central1-b", ...],
  "workerIds": ["7732042218797547089", ...],
  "priorities": ["low", "lowest", "medium", ...],
  "users": ["cron@mozilla-central", "user@example.com", ...],
  "taskGroupIds": ["YJJe4a0CRIqbAmcCo8n63w", ...]
}
```

### tasks

Parallel arrays of length `taskCount`:

```json
{
  "scheduled": [1709510400000, 150, 0, 23, ...],
  "started": [5432, null, 1234, ...],
  "resolved": [65432, 3600000, 12345, ...],
  "resolutionIds": [0, 0, 2, ...],
  "taskIds": ["YJJe4a0CRIqbAmcCo8n63w", "XPPf5b1DRJrcBndDp9o74x.1", ...],
  "labelIds": [0, 1, 2, ...],
  "priorityIds": [0, 0, 1, ...],
  "taskGroupIdIds": [0, 0, 1, ...],
  "userIds": [0, 1, 0, ...],
  "taskQueueIdIds": [0, 1, 0, ...],
  "workerIdIds": [0, null, 1, ...],
  "runCosts": [0.012244, 0, 0.003456, ...]
}
```

#### Task IDs

Task IDs include a `.runId` suffix only when the run ID is greater than 0:
- Run 0: `"YJJe4a0CRIqbAmcCo8n63w"`
- Run 1: `"YJJe4a0CRIqbAmcCo8n63w.1"`

#### Index References

- `resolutionIds[i]`: Index into `tables.resolutions`
- `labelIds[i]`: Index into `tables.labels`
- `priorityIds[i]`: Index into `tables.priorities`
- `taskGroupIdIds[i]`: Index into `tables.taskGroupIds`
- `userIds[i]`: Index into `tables.users`
- `taskQueueIdIds[i]`: Index into `tables.taskQueueIds`
- `workerIdIds[i]`: Index into `tables.workerIds` (`null` if never assigned)

#### Run Costs

`runCosts[i]` is the cost in USD, rounded to 6 decimal places. `0` when
not available.

### workerInfo

Per-worker arrays indexed by worker ID (index into `tables.workerIds`).

```json
{
  "workerGroupIds": [0, 1, 0, ...]
}
```

- `workerGroupIds[w]`: Index into `tables.workerGroups` for worker `w`

Each worker belongs to exactly one worker group.

### taskGroupInfo

Per-task-group arrays indexed by task group ID (index into
`tables.taskGroupIds`).

```json
{
  "projectIds": [0, 1, null, ...]
}
```

- `projectIds[g]`: Index into `tables.projects` for task group `g`
  (`null` for task groups with no project, typically decision tasks)

Each task group belongs to at most one project.

---

## Shared Encoding Details

### Time Compression

Both files use the same time encoding. Tasks are sorted by scheduled time.

- **`scheduled`**: Differential compression. `scheduled[0]` is an absolute
  millisecond timestamp. `scheduled[i]` (for i > 0) is the delta from
  `scheduled[i-1]`. Since tasks are sorted, deltas are small non-negative
  integers.
- **`started`**: Offset from the task's own scheduled time (i.e., queue wait
  time in ms). `null` if the task never started.
- **`resolved`**: Offset from the task's own scheduled time (i.e., total
  task lifetime in ms).

To reconstruct absolute timestamps:

```javascript
const abs = new Array(n);
abs[0] = data.tasks.scheduled[0];
for (let i = 1; i < n; i++) {
  abs[i] = abs[i - 1] + data.tasks.scheduled[i];
}
// abs[i] is the absolute scheduled time for task i

const startedMs = data.tasks.started[i] !== null
  ? abs[i] + data.tasks.started[i] : null;
const resolvedMs = abs[i] + data.tasks.resolved[i];
```

### Resolutions

The `resolutions` table merges the task `state` and `reason_resolved` fields:
- When both are the same: just the value (e.g., `"completed"`, `"failed"`)
- When different: `"state - reason"` (e.g., `"exception - canceled"`,
  `"exception - deadline-exceeded"`)

---

## Example: Reconstruct a Full Task Row

Using the tasks file:

```javascript
const d = data;
const i = 42;

// Reconstruct absolute scheduled time
let scheduledMs = d.tasks.scheduled[0];
for (let j = 1; j <= i; j++) {
  scheduledMs += d.tasks.scheduled[j];
}
const startedMs = d.tasks.started[i] !== null
  ? scheduledMs + d.tasks.started[i] : null;
const resolvedMs = scheduledMs + d.tasks.resolved[i];

const taskId = d.tasks.taskIds[i];
const label = d.tables.labels[d.tasks.labelIds[i]];
const resolution = d.tables.resolutions[d.tasks.resolutionIds[i]];
const priority = d.tables.priorities[d.tasks.priorityIds[i]];
const taskQueue = d.tables.taskQueueIds[d.tasks.taskQueueIdIds[i]];
const cost = d.tasks.runCosts[i];

// Task group and project
const tgIdx = d.tasks.taskGroupIdIds[i];
const taskGroupId = tgIdx !== null ? d.tables.taskGroupIds[tgIdx] : null;
const projectIdx = tgIdx !== null ? d.taskGroupInfo.projectIds[tgIdx] : null;
const project = projectIdx !== null ? d.tables.projects[projectIdx] : null;

// User
const userIdx = d.tasks.userIds[i];
const user = userIdx !== null ? d.tables.users[userIdx] : null;

// Worker (may be null if task never ran)
const wIdx = d.tasks.workerIdIds[i];
const workerId = wIdx !== null ? d.tables.workerIds[wIdx] : null;
const workerGroup = wIdx !== null
  ? d.tables.workerGroups[d.workerInfo.workerGroupIds[wIdx]] : null;
```

---

## Data Characteristics

- **Task count**: ~240K tasks per day
- **Summary file size**: ~5 MB uncompressed per day
- **Tasks file size**: ~20 MB uncompressed per day
- **String tables**: Sorted by frequency (most used entries have lowest indices)
- **History**: 21 days maintained via CI artifact re-upload
- **Source**: STMO query 112377 (BigQuery)
- **Schedule**: Generated daily at 03:00 UTC via CI cron
