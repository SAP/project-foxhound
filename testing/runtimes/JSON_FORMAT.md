# Manifest Runtime Data Format Documentation

This document describes the JSON file formats created by `fetch-manifest-data.js`.

## Overview

The script generates two types of JSON files:

1. **Detailed data**: `manifests.json` - Contains all individual manifest runs with task IDs and commit hashes
2. **Runtimes data**: `manifests-runtimes.json` - Smaller file grouping runtimes by manifest and job

Both formats use string tables and index-based lookups to minimize file size.

---

## Detailed Data Format (`manifests.json`)

### Top-Level Structure

```json
{
  "metadata": { ... },
  "manifests": [ ... ],
  "jobNames": [ ... ],
  "commits": [ ... ],
  "prefixes": [ ... ],
  "tasks": { ... },
  "runs": { ... }
}
```

### metadata

Contains information about the data collection:

```json
{
  "date": "2025-02-04",
  "repository": "mozilla-central",
  "generatedAt": "2025-02-05T14:24:33.451Z",
  "processedJobCount": 1234,
  "failedJobCount": 56,
  "skippedJobCount": 789,
  "manifestCount": 3456,
  "jobNameCount": 45,
  "timingCount": 12345
}
```

### String Tables

All strings are deduplicated and stored once:

```json
{
  "manifests": [
    "dom/tests/mochitest/general/mochitest.toml",
    "toolkit/components/extensions/test/mochitest/mochitest.toml",
    ...
  ],
  "jobNames": [
    "test-linux2404-64/debug-mochitest-browser-chrome",
    "test-macosx1470-64/opt-mochitest-plain",
    ...
  ],
  "commits": [
    "f37a6863f87aeeb870b16223045ea7614b1ba0a7",
    "abc123def456789012345678901234567890abcd",
    ...
  ],
  "prefixes": [
    "mochitest-browser-chrome",
    "mochitest-plain",
    "wpt",
    "xpcshell",
    "reftest",
    ...
  ]
}
```

### tasks

Object containing parallel arrays with task metadata:

```json
{
  "tasks": {
    "id": [
      "YJJe4a0CRIqbAmcCo8n63w",
      "XPPf5b1DRJrcBndDp9o74x.1",
      ...
    ],
    "jobName": [5, 12, 8, 15, ...],
    "commitId": [0, 0, 1, 1, ...],
    "prefix": [0, 1, 2, 1, ...]
  }
}
```

All arrays are parallel - index `i` corresponds to the same task:
- `id[i]`: Task ID string (includes retry suffix when retry > 0, e.g., `taskId.1`)
- `jobName[i]`: Index into `jobNames` array (full job name including chunk number)
- `commitId[i]`: Index into `commits` array
- `prefix[i]`: Index into `prefixes` array (artifact type used)

**Note**: The `jobNames` table contains both base names (without chunks, used in `runs.jobNameIds`) and full names (with chunks, used in `tasks.jobName`).

### runs

Parallel arrays containing timing data:

```json
{
  "runs": {
    "manifestIds": [0, 1, 0, 2, ...],
    "jobNameIds": [0, 0, 1, 1, ...],
    "taskIds": [0, 1, 2, 3, ...],
    "durations": [1234, 5678, 2345, ...]
  }
}
```

All arrays are parallel - index `i` in each array corresponds to the same manifest run:
- `manifestIds[i]`: Index into `manifests` array
- `jobNameIds[i]`: Index into `jobNames` array (base name without chunk)
- `taskIds[i]`: Index into `tasks.id` array
- `durations[i]`: Runtime in milliseconds

**Example lookup:**
```javascript
const i = 5;
const manifest = data.manifests[data.runs.manifestIds[i]];
const jobBaseName = data.jobNames[data.runs.jobNameIds[i]];
const duration = data.runs.durations[i];

// Get task details
const taskIdx = data.runs.taskIds[i];
const taskId = data.tasks.id[taskIdx];
const fullJobName = data.jobNames[data.tasks.jobName[taskIdx]];
const commitIdx = data.tasks.commitId[taskIdx];
const commit = data.commits[commitIdx];
const prefixIdx = data.tasks.prefix[taskIdx];
const prefix = data.prefixes[prefixIdx];

// Open in Treeherder
const treeherderUrl = `https://treeherder.mozilla.org/#/jobs?repo=${data.metadata.repository}&revision=${commit}&selectedTaskRun=${taskId}`;
```

---

## Runtimes Data Format (`manifests-runtimes.json`)

### Top-Level Structure

```json
{
  "metadata": { ... },
  "jobNames": [ ... ],
  "manifests": { ... }
}
```

### metadata

```json
{
  "date": "2025-02-04",
  "repository": "mozilla-central",
  "generatedAt": "2025-02-05T14:24:33.451Z",
  "manifestCount": 3456,
  "jobNameCount": 45
}
```

### jobNames

String table for job names:

```json
{
  "jobNames": [
    "test-linux2404-64/debug-mochitest-browser-chrome",
    "test-macosx1470-64/opt-mochitest-plain",
    ...
  ]
}
```

### manifests

Object where keys are manifest names and values are objects containing parallel arrays:

```json
{
  "manifests": {
    "dom/tests/mochitest/general/mochitest.toml": {
      "jobs": [0, 1],
      "runtimes": [
        [1200, 1234, 1250, 1280, 1300],
        [2100, 2150, 2200]
      ]
    },
    "toolkit/components/extensions/test/mochitest/mochitest.toml": {
      "jobs": [0],
      "runtimes": [
        [3400, 3500, 3600]
      ]
    },
    ...
  }
}
```

Each manifest has an object containing parallel arrays:
- `jobs`: Array of indices into the `jobNames` array
- `runtimes`: Array of arrays, where `runtimes[i]` is the sorted runtime values in milliseconds for the manifest on `jobs[i]`

**Example lookup:**
```javascript
const manifest = "dom/tests/mochitest/general/mochitest.toml";
const manifestData = data.manifests[manifest];

for (let i = 0; i < manifestData.jobs.length; i++) {
  const jobName = data.jobNames[manifestData.jobs[i]];
  const runtimes = manifestData.runtimes[i];
  const median = runtimes[Math.floor(runtimes.length / 2)];
  const mean = runtimes.reduce((a, b) => a + b) / runtimes.length;
  console.log(`${jobName}: median=${median}ms, mean=${mean}ms, runs=${runtimes.length}`);
}
```

---

## Use Cases

### Detailed File

**Purpose**: Deep analysis with full traceability to specific CI runs

**Use cases:**
- Link to specific Treeherder jobs for investigation
- Track timing changes across commits
- Identify which specific runs were slow
- Debug timing regressions

**Example: Find all slow runs for a manifest**
```javascript
const targetManifest = "dom/tests/mochitest/general/mochitest.toml";
const manifestId = data.manifests.indexOf(targetManifest);
const threshold = 5000; // ms

const slowRuns = [];
for (let i = 0; i < data.runs.durations.length; i++) {
  if (data.runs.manifestIds[i] === manifestId && data.runs.durations[i] > threshold) {
    slowRuns.push({
      duration: data.runs.durations[i],
      job: data.jobNames[data.runs.jobNameIds[i]],
      commit: data.commits[data.runs.commitIds[i]],
      taskId: data.taskIds[data.runs.taskIds[i]],
    });
  }
}
```

### Runtimes File

**Purpose**: Fast dashboard loading and statistical analysis

**Use cases:**
- Calculate median/mean runtimes per manifest
- Compare timing distributions across jobs
- Identify consistently slow manifests
- Generate runtime estimates for scheduling

**Example: Find slowest manifests by median runtime**
```javascript
const manifestStats = [];

for (const [manifestName, manifestData] of Object.entries(data.manifests)) {
  let totalMedian = 0;

  for (const runtimes of manifestData.runtimes) {
    const median = runtimes[Math.floor(runtimes.length / 2)];
    totalMedian += median;
  }

  manifestStats.push({
    manifest: manifestName,
    avgMedian: totalMedian / manifestData.runtimes.length,
  });
}

manifestStats.sort((a, b) => b.avgMedian - a.avgMedian);
const slowest = manifestStats.slice(0, 10);
```

---

## Data Characteristics

### Job Names

Job names in the `jobNames` table have chunk numbers removed. For example:
- `test-linux2404-64/debug-mochitest-browser-chrome-5` → `test-linux2404-64/debug-mochitest-browser-chrome`
- `test-macosx1470-64/opt-web-platform-tests-12` → `test-macosx1470-64/opt-web-platform-tests`

### Task IDs

Task IDs in the detailed file format:
- Retry 0: `"taskId"` (no suffix)
- Retry > 0: `"taskId.N"` (includes retry number)

### Durations

All duration values are in **milliseconds** and are integers.

### Filtering

The data only includes:
- Jobs from `test-*` (actual test jobs, not build jobs)
- Jobs with `state === "completed"` and `result` in `["success", "testfailed"]`
- Test harnesses that produce manifest-level timing data (excludes `cppunittest`, `marionette`, `gtest`, etc.)

### Manifests

Manifest names are the full path to the manifest file, typically ending in:
- `mochitest.toml`
- `browser.toml`
- `chrome.toml`
- `xpcshell.toml`

For web-platform-tests, manifest names may be test directory paths.

---

## File Size Comparison

Typical file sizes for one day of mozilla-central data:

- **Detailed file**: ~8 MB (contains all individual runs)
- **Runtimes file**: ~3 MB (grouped and sorted)

---

## Notes

- Runtimes in the runtimes file are **sorted** for efficient percentile calculations
- The detailed file allows reconstruction of the runtimes file
- Both files share the same `jobNames` table for consistency
- Commit hashes are full 40-character SHA-1 hashes from mozilla-central
- Task IDs can be used with the TaskCluster API or Treeherder UI
