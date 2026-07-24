# Test Harness JSON Data Format Documentation

This document describes the JSON file formats created by `fetch-test-data.js`.

## Overview

The script generates two types of JSON files for each date or try commit:

1. **Test timing data**: `{harness}-{date}.json` or `{harness}-{project}-{revision}.json`
2. **Resource usage data**: `{harness}-{date}-resources.json` or `{harness}-{project}-{revision}-resources.json`

Where `{harness}` is the test harness name (e.g., `xpcshell`, `mochitest`).

Both formats use string tables and index-based lookups to minimize file size.

---

## Test Timing Data Format

### Top-Level Structure

```json
{
  "metadata": { ... },
  "tables": { ... },
  "taskInfo": { ... },
  "testInfo": { ... },
  "testRuns": [ ... ]
}
```

### metadata

Contains information about the data collection:

```json
{
  "date": "2025-10-14",              // Date of the data (for date-based queries)
  "revision": "abc123...",           // Try commit revision (for try-based queries)
  "pushId": 12345,                   // Treeherder push ID (for try-based queries)
  "startTime": 1760400000,           // Unix timestamp (seconds) used as base for relative timestamps
  "generatedAt": "2025-10-15T14:24:33.451Z",  // ISO timestamp when file was created
  "jobCount": 3481,                  // Number of jobs fetched
  "processedJobCount": 3481          // Number of jobs successfully processed
}
```

### tables

String tables for efficient storage. All strings are deduplicated and stored once, sorted by frequency (most frequently used first for better compression):

```json
{
  "jobNames": [                      // Job names (e.g., "test-linux1804-64/opt-xpcshell")
    "test-linux1804-64/opt-xpcshell",
    "test-macosx1015-64/debug-xpcshell",
    ...
  ],
  "testPaths": [                     // Test file paths (e.g., "dom/indexedDB/test/unit")
    "dom/indexedDB/test/unit",
    "toolkit/components/extensions/test/xpcshell",
    ...
  ],
  "testNames": [                     // Test filenames (e.g., "test_foo.js")
    "test_foo.js",
    "test_bar.js",
    ...
  ],
  "repositories": [                  // Repository names
    "mozilla-central",
    "autoland",
    "try",
    ...
  ],
  "statuses": [                      // Test run statuses
    "PASS-PARALLEL",
    "PASS-SEQUENTIAL",
    "SKIP",
    "FAIL-PARALLEL",
    "TIMEOUT-SEQUENTIAL",
    "CRASH",
    "EXPECTED-FAIL",
    ...
  ],
  "taskIds": [                       // TaskCluster task IDs with retry (always includes .retryId)
    "YJJe4a0CRIqbAmcCo8n63w.0",      // Retry 0
    "XPPf5b1DRJrcBndDp9o74x.1",      // Retry 1
    ...
  ],
  "messages": [                      // Test messages (for SKIP and FAIL statuses)
    "skip-if: os == 'linux'",
    "disabled due to bug 123456",
    "Expected 5, got 10",              // Failure message
    ...
  ],
  "crashSignatures": [               // Crash signatures (only for crashed tests)
    "mozilla::dom::Something::Crash",
    "EMPTY: no crashing thread identified",
    ...
  ],
  "components": [                    // Bugzilla components (Product :: Component format)
    "Core :: Storage: IndexedDB",
    "Testing :: XPCShell Harness",
    "Firefox :: General",
    ...
  ],
  "commitIds": [                     // Commit IDs from repository (extracted from profile.meta.sourceURL)
    "f37a6863f87aeeb870b16223045ea7614b1ba0a7",
    "abc123def456789012345678901234567890abcd",
    ...
  ]
}
```

### taskInfo

Maps task IDs to their associated job names, repositories, and commit IDs. These are parallel arrays indexed by `taskIdId`:

```json
{
  "repositoryIds": [0, 1, 0, 2, ...],  // Index into tables.repositories
  "jobNameIds": [0, 0, 1, 1, ...],     // Index into tables.jobNames
  "commitIds": [0, 1, 0, null, ...]    // Index into tables.commitIds (null if not available)
}
```

**Example lookup:**
```javascript
const taskIdId = 5;
const taskId = tables.taskIds[taskIdId];           // "YJJe4a0CRIqbAmcCo8n63w.0"
const repository = tables.repositories[taskInfo.repositoryIds[taskIdId]];  // "mozilla-central"
const jobName = tables.jobNames[taskInfo.jobNameIds[taskIdId]];           // "test-linux1804-64/opt-xpcshell"
const commitIdIdx = taskInfo.commitIds[taskIdId];
const commitId = commitIdIdx !== null ? tables.commitIds[commitIdIdx] : null;  // "f37a6863f87a..." or null
```

### testInfo

Maps test IDs to their test paths, names, and components. These are parallel arrays indexed by `testId`:

```json
{
  "testPathIds": [0, 0, 1, 2, ...],    // Index into tables.testPaths
  "testNameIds": [0, 1, 2, 3, ...],    // Index into tables.testNames
  "componentIds": [5, 5, 12, null, ...] // Index into tables.components (null if unknown)
}
```

**Example lookup:**
```javascript
const testId = 10;
const testPath = tables.testPaths[testInfo.testPathIds[testId]];  // "dom/indexedDB/test/unit"
const testName = tables.testNames[testInfo.testNameIds[testId]];  // "test_foo.js"
const fullPath = testPath ? `${testPath}/${testName}` : testName;
const componentId = testInfo.componentIds[testId];
const component = componentId !== null ? tables.components[componentId] : "Unknown";  // "Core :: Storage: IndexedDB"
```

### testRuns

A 2D sparse array structure: `testRuns[testId][statusId]`

- First dimension: `testId` (index into testInfo arrays)
- Second dimension: `statusId` (index into tables.statuses)

Each `testRuns[testId][statusId]` contains data for all runs of that test with that specific status. If a test never had a particular status, that array position contains `null`:

```json
[
  // testId 0
  [
    // statusId 0 (e.g., "PASS-PARALLEL")
    {
      "taskIdIds": [5, 12, 18, ...],       // Indices into tables.taskIds
      "durations": [1234, 1456, 1289, ...], // Test durations in milliseconds
      "timestamps": [0, 15, 23, ...]        // Differential compressed timestamps (seconds relative to metadata.startTime)
    },
    // statusId 1 - this test never had that status
    null,
    // statusId 2 (e.g., "SKIP")
    {
      "taskIdIds": [45, 67, ...],
      "durations": [0, 0, ...],
      "timestamps": [100, 200, ...],
      "messageIds": [5, 5, ...]            // Present for SKIP and FAIL statuses - indices into tables.messages (null if no message)
    },
    // statusId 3 (e.g., "FAIL-PARALLEL")
    {
      "taskIdIds": [78, ...],
      "durations": [1234, ...],
      "timestamps": [250, ...],
      "messageIds": [12, ...]              // Present for SKIP and FAIL statuses - indices into tables.messages (null if no message)
    },
    // statusId 4 (e.g., "CRASH")
    {
      "taskIdIds": [89, ...],
      "durations": [5678, ...],
      "timestamps": [300, ...],
      "crashSignatureIds": [2, ...],       // Only present for CRASH status - indices into tables.crashSignatures (null if none)
      "minidumps": ["12345678-abcd-1234-abcd-1234567890ab", ...]   // Only present for CRASH status - minidump IDs or null
    }
  ],
  // testId 1
  [ ... ],
  ...
]
```

**Timestamp decompression:**
```javascript
// Timestamps are differentially compressed
let currentTime = metadata.startTime;  // Base timestamp in seconds
const decompressedTimestamps = statusGroup.timestamps.map(diff => {
    currentTime += diff;
    return currentTime;
});
```

**Example: Get all runs of a specific test:**
```javascript
const testId = 10;
const testGroup = testRuns[testId];

for (let statusId = 0; statusId < testGroup.length; statusId++) {
    const statusGroup = testGroup[statusId];
    if (!statusGroup) continue;  // This test never had this status

    const status = tables.statuses[statusId];
    console.log(`Status: ${status}, Runs: ${statusGroup.taskIdIds.length}`);

    // Decompress timestamps
    let currentTime = metadata.startTime;
    for (let i = 0; i < statusGroup.taskIdIds.length; i++) {
        currentTime += statusGroup.timestamps[i];
        const taskId = tables.taskIds[statusGroup.taskIdIds[i]];
        const duration = statusGroup.durations[i];
        console.log(`  Task: ${taskId}, Duration: ${duration}ms, Time: ${currentTime}`);
    }
}
```

---

## Resource Usage Data Format

### Top-Level Structure

```json
{
  "jobNames": [ ... ],
  "repositories": [ ... ],
  "machineInfos": [ ... ],
  "jobs": { ... }
}
```

### Lookup Tables

```json
{
  "jobNames": [                      // Base job names without chunk numbers
    "test-linux1804-64/opt-xpcshell",
    "test-macosx1015-64/debug-xpcshell",
    ...
  ],
  "repositories": [                  // Repository names
    "mozilla-central",
    "autoland",
    ...
  ],
  "machineInfos": [                  // Machine specifications (memory in GB, rounded to 1 decimal)
    {
      "logicalCPUs": 8,
      "physicalCPUs": 4,
      "mainMemory": 15.6             // GB
    },
    {
      "logicalCPUs": 16,
      "physicalCPUs": 8,
      "mainMemory": 31.4
    },
    ...
  ]
}
```

### jobs

Parallel arrays containing resource usage data for each job, sorted by start time:

```json
{
  "jobNameIds": [0, 0, 1, 1, ...],                              // Indices into jobNames array
  "chunks": [1, 2, 1, 2, ...],                                  // Chunk numbers (null if job name has no chunk)
  "taskIds": ["YJJe4a0CRIqbAmcCo8n63w", "XPPf5b1DRJrcBndDp9o74x.1", ...], // Task IDs (format: "taskId" for retry 0, "taskId.retryId" for retry > 0)
  "repositoryIds": [0, 0, 1, 1, ...],                           // Indices into repositories array
  "startTimes": [0, 150, 23, 45, ...],       // Differential compressed timestamps (seconds)
  "machineInfoIds": [0, 0, 1, 1, ...],       // Indices into machineInfos array
  "maxMemories": [1234567890, ...],          // Maximum memory used (bytes)
  "idleTimes": [12345, ...],                 // Time with <50% of one core used (milliseconds)
  "singleCoreTimes": [45678, ...],           // Time using ~1 core (0.75-1.25 cores, milliseconds)
  "cpuBuckets": [                            // CPU usage time distribution (milliseconds per bucket)
    [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],  // Job 0: [0-10%, 10-20%, ..., 90-100%]
    [150, 250, 350, 450, 550, 650, 750, 850, 950, 1050],  // Job 1
    ...
  ]
}
```

**CPU Buckets Explanation:**
- Array of 10 values representing time spent in each CPU usage range
- Bucket 0: 0-10% CPU usage
- Bucket 1: 10-20% CPU usage
- ...
- Bucket 9: 90-100% CPU usage
- Values are in milliseconds

**Idle Time Calculation:**
- Idle = CPU usage < (50% of one core)
- For 8-core machine: idle = CPU usage < 6.25%
- For 16-core machine: idle = CPU usage < 3.125%

**Single Core Time Calculation:**
- Single core = CPU usage between 0.75 and 1.25 cores
- For 8-core machine: 9.375% - 15.625%
- For 16-core machine: 4.6875% - 7.8125%

**Start Time Decompression:**
```javascript
let currentTime = 0;  // Start times are relative to each other
const decompressedStartTimes = jobs.startTimes.map(diff => {
    currentTime += diff;
    return currentTime;
});
```

**Example: Get full information for a job:**
```javascript
const jobIndex = 5;
const jobName = jobNames[jobs.jobNameIds[jobIndex]];
const chunk = jobs.chunks[jobIndex];  // May be null
const fullJobName = chunk !== null ? `${jobName}-${chunk}` : jobName;
const taskId = jobs.taskIds[jobIndex];
const repository = repositories[jobs.repositoryIds[jobIndex]];
const machineInfo = machineInfos[jobs.machineInfoIds[jobIndex]];

// Decompress start time
let currentTime = 0;
for (let i = 0; i <= jobIndex; i++) {
    currentTime += jobs.startTimes[i];
}
const startTime = currentTime;  // seconds since epoch

const maxMemoryGB = jobs.maxMemories[jobIndex] / (1024 * 1024 * 1024);
const idleTimeSeconds = jobs.idleTimes[jobIndex] / 1000;
const singleCoreTimeSeconds = jobs.singleCoreTimes[jobIndex] / 1000;
const cpuDistribution = jobs.cpuBuckets[jobIndex];
const totalTime = cpuDistribution.reduce((sum, val) => sum + val, 0);
const idlePercent = (idleTimeSeconds * 1000 / totalTime) * 100;
```

---

## Data Compression Techniques

The format uses several compression techniques to minimize file size:

1. **String Tables**: All repeated strings (job names, test paths, etc.) are stored once and referenced by index
2. **Frequency Sorting**: Strings are sorted by usage frequency (most common first) so that frequently-used items have smaller index values, reducing the number of digits in the serialized JSON
3. **Differential Compression**: Timestamps are stored as differences from the previous value
4. **Parallel Arrays**: Instead of arrays of objects, data is stored in parallel arrays to avoid repeating key names
5. **Sparse Arrays**: In testRuns, status groups that don't exist are stored as `null`
6. **Combined IDs**: TaskCluster task IDs and retry IDs are combined into a single string format: `"taskId.retryId"`
7. **Chunk Extraction**: Job chunk numbers are extracted and stored separately from base job names

---

## Index File Format

The `index.json` file lists all available dates:

```json
{
  "dates": [
    "2025-10-15",
    "2025-10-14",
    "2025-10-13",
    ...
  ]
}
```

Dates are sorted in descending order (newest first).

---

## Statistics File Format

The `{harness}-stats.json` file provides aggregate statistics for each date:

```json
{
  "metadata": {
    "generatedAt": "2025-10-15T14:24:33.451Z",
    "harness": "xpcshell"
  },
  "dates": [
    "2025-10-13",
    "2025-10-14",
    "2025-10-15",
    ...
  ],
  "totalTestRuns": [44987, 45102, 45231, ...],
  "failedTestRuns": [267, 189, 234, ...],
  "skippedTestRuns": [1234, 1198, 1245, ...],
  "processedJobCount": [3472, 3465, 3481, ...],
  "failedJobs": [178, 142, 156, ...],
  "invalidJobs": [25, 18, 23, ...],
  "ignoredJobs": [43, 47, 45, ...]
}
```

All arrays are parallel - the value at index `i` corresponds to the date at `dates[i]`.

### Field Definitions

- **totalTestRuns**: Total number of test runs across processed jobs
- **failedTestRuns**: Number of test runs with FAIL, CRASH, or TIMEOUT status
- **skippedTestRuns**: Number of test runs with SKIP status (excluding run-if conditional skips)
- **processedJobCount**: Number of jobs successfully processed (test data extracted)
- **failedJobs**: Number of jobs with state='failed' (from the Firefox-CI ETL database query)
- **invalidJobs**: Number of jobs that didn't upload a valid resource usage profile
- **ignoredJobs**: Number of jobs filtered out by the ignore list (annotated jobs - failures that sheriffs marked as due to patches that were later reverted or fixed)

### Job Counts Relationship

The total number of jobs for a date equals:
```
Total Jobs = processedJobCount + invalidJobs + ignoredJobs
```

### Notes

- Statistics are cumulative from previous runs - new dates update the file
- The file is generated after the index file and before aggregated failures

---

## Notes

- All timestamps in test timing data are in **seconds**
- All durations are in **milliseconds**
- Memory values in machineInfos are in **GB** (rounded to 1 decimal place)
- Memory values in jobs.maxMemories are in **bytes**
- The `testRuns` array is sparse - `testRuns[testId][statusId]` may be `null` if that test never had that status
- **Task ID formats differ between files:**
  - Test timing data: Always includes retry suffix (e.g., `"YJJe4a0CRIqbAmcCo8n63w.0"`)
  - Resource usage data: Omits `.0` for retry 0 (e.g., `"YJJe4a0CRIqbAmcCo8n63w"`), includes suffix for retries > 0 (e.g., `"YJJe4a0CRIqbAmcCo8n63w.1"`)
- **Component mapping:** Components are fetched from the TaskCluster index `gecko.v2.mozilla-central.latest.source.source-bugzilla-info` and mapped to test paths. The component ID in `testInfo.componentIds` may be `null` if the test path is not found in the mapping
- Components are formatted as `"Product :: Component"` (e.g., `"Core :: Storage: IndexedDB"`)
- The data structure is optimized for sequential access patterns used by the dashboards

---

## Aggregated Files Format

When running with `--days N` where N > 1, two aggregated files are generated:

1. **`xpcshell-issues-with-taskids.json`** (~30MB for 21 days): Includes task IDs for all non-passing runs, allowing drill-down to specific CI tasks. Passing runs and non-passing runs are both aggregated by day.

2. **`xpcshell-issues.json`** (~15MB for 21 days): No task IDs or minidumps - all runs are aggregated to counts only. Optimized for fast dashboard initial load.

### Detailed File (xpcshell-issues-with-taskids.json)

#### Differences from Daily Files

#### 1. Metadata Changes

```json
{
  "metadata": {
    "startDate": "2025-11-12",           // First date in the range (earliest)
    "endDate": "2025-12-02",             // Last date in the range (most recent)
    "days": 21,                          // Number of days aggregated
    "startTime": 1731456000,             // Unix timestamp for startDate at 00:00:00 UTC
    "generatedAt": "...",
    "totalTestCount": 4506,              // Total number of unique tests
    "testsWithFailures": 3614,           // Number of tests that had at least one non-passing run
    "aggregatedFrom": [...]              // Array of source filenames
  }
}
```

Additional fields:
- `startDate`, `endDate`, `days` indicate the date range
- `startTime` is the base timestamp for the entire aggregated period (00:00:00 UTC on `startDate`)
- `testsWithFailures` counts tests with any non-passing status
- `aggregatedFrom` lists all source files that were merged

#### 2. Passing Test Runs Are Aggregated

**Daily files** store individual runs for all statuses:
```json
{
  "taskIdIds": [123, 456, 789],
  "durations": [1500, 1600, 1550],
  "timestamps": [3600, 3600, 7200]
}
```

**Aggregated file** stores only counts per day for passing statuses (status starts with "PASS"):
```json
{
  "counts": [150, 200, 180, 145, ...],
  "days": [0, 1, 1, 1, ...]
}
```

Where:
- `counts[i]` = total number of passing runs in that day
- `days[i]` = differential compressed day offset (days since previous bucket)
- No `taskIdIds` or `durations` arrays
- Typically sparse - only days with passing runs are included

**Decompressing days:**
```javascript
let currentDay = 0;
const absoluteDays = [];
for (const delta of days) {
  currentDay += delta;
  absoluteDays.push(currentDay);
}
// absoluteDays[i] is now the day number (0 = startTime, 1 = startTime + 1 day, etc.)
```

**Example: Calculate pass rate for a test on day 5:**
```javascript
const testId = 0;
const day = 5; // 5 days after startDate

// Find pass status
const passStatusId = data.tables.statuses.findIndex(s => s.startsWith("PASS"));
const passGroup = data.testRuns[testId]?.[passStatusId];

// Count passes on day 5
let passCount = 0;
let currentDay = 0;
if (passGroup) {
  for (let i = 0; i < passGroup.days.length; i++) {
    currentDay += passGroup.days[i];
    if (currentDay === day) {
      passCount += passGroup.counts[i];
    }
  }
}
```

#### 3. All Test Runs Aggregated by Day

Both passing and non-passing test runs are aggregated by day. The difference is in what data is preserved:

**Passing tests** (status starts with "PASS"):
```json
{
  "counts": [150, 200, 180],
  "days": [0, 1, 1]
}
```

**Non-passing tests** (FAIL, CRASH, TIMEOUT, SKIP, etc.):
```json
{
  "taskIdIds": [
    [45, 67],      // Task IDs that failed on day 0 with message 23
    [89, 12, 56],  // Task IDs that failed on day 1 with message 23
    [34]           // Task IDs that failed on day 2 with message 24
  ],
  "days": [0, 1, 1],
  "messageIds": [23, 23, 24],
  "crashSignatureIds": [5, 5, 6],
  "minidumps": [
    ["abc123", "def456"],    // Minidumps for crashes on day 0
    ["ghi789", null, "jkl"],  // Minidumps for crashes on day 1
    [null]                    // Minidumps for crashes on day 2
  ]
}
```

Key differences from per-date files:
- `taskIdIds` is an **array of arrays** - one array per (day, message, crashSignature) bucket
- `minidumps` is an **array of arrays** - parallel to `taskIdIds`, preserving minidump for each task
- `days` provides differentially compressed day offsets
- Durations are **removed**
- Individual timestamps are **removed** - only the day bucket is preserved
- Failures with different messages or crash signatures are in separate buckets

#### 4. String Tables Are Merged

All string tables are merged and deduplicated across all input days. A string that appears in multiple daily files will only appear once in the aggregated file.

#### 5. TaskInfo Only Contains Failed Tasks

Since passing runs don't store `taskIdIds`, the `taskInfo` object only contains mappings for tasks that appear in non-passing test runs. This significantly reduces the size of these arrays.

#### 6. Platform-Irrelevant Tests Are Filtered

SKIP tests with messages starting with "run-if" are filtered out during aggregation. These represent tests that are not relevant on certain platforms (e.g., "run-if = os == 'win'") and are not actual issues. The dashboard would filter these out anyway, so excluding them reduces file size.

### Use Cases

**Show pass/fail trends over time:**
- Passing runs: Use `counts` and `days` arrays
- Failing runs: Count taskIds in buckets within day ranges using `days`

**Investigate specific failures:**
- Task IDs preserved for all non-passing runs
- Can identify which tasks/jobs/repos had failures
- Can see error messages, crash signatures, and minidumps

**Calculate overall pass rate:**
```javascript
const testId = 0;
const passStatusId = data.tables.statuses.findIndex(s => s.startsWith("PASS"));
const failStatusId = data.tables.statuses.indexOf("FAIL");

// Total passes
const totalPasses = data.testRuns[testId]?.[passStatusId]?.counts.reduce((a, b) => a + b, 0) ?? 0;

// Total fails - count all taskIds across all buckets
const failGroup = data.testRuns[testId]?.[failStatusId];
const totalFails = failGroup?.taskIdIds.reduce((sum, arr) => sum + arr.length, 0) ?? 0;

const passRate = totalPasses / (totalPasses + totalFails);
```

---

### Small File (xpcshell-issues.json)

This file omits task IDs and minidumps to minimize file size for fast dashboard loading.

#### Differences from xpcshell-issues-with-taskids.json

#### 1. No taskInfo or taskIds

The `taskInfo` object and `tables.taskIds` array are completely omitted since all runs are aggregated.

#### 2. Reduced String Tables

Only includes tables needed for aggregated data:
```json
{
  "tables": {
    "testPaths": [...],
    "testNames": [...],
    "statuses": [...],
    "messages": [...],           // Kept for failure details
    "crashSignatures": [...],    // Kept for crash details
    "components": [...]
    // No jobNames, repositories, or taskIds
  }
}
```

#### 3. No Task IDs - Only Counts

All status groups use counts instead of task ID arrays:

```json
{
  "counts": [5, 12, 8, 3],
  "days": [0, 1, 1, 1],
  "messageIds": [23, 23, 24, 24],           // For failures with different messages
  "crashSignatureIds": [5, 6, 5, 6]         // For crashes with different signatures
  // Note: taskIdIds and minidumps are NOT included in this file
}
```

Failures with different messages or crash signatures are bucketed separately, preserving distinct failure modes.

Task IDs and minidumps are omitted to reduce size. They are available in the detailed file.

**Example:** A test that fails 5 times on day 3 with message A and 3 times with message B will have two entries:
```json
{
  "counts": [5, 3],
  "days": [3, 0],  // Both on same day, so second delta is 0
  "messageIds": [23, 24]
}
```
