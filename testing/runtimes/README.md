Test Runtimes
=============

This directory contains runtime data for test manifests, used by the taskgraph
to chunk tests so that each chunk takes roughly the same amount of time.

The ``fetch-manifest-data.js`` script collects per-manifest timing data from
Treeherder errorsummary logs and produces two files:

- ``manifests-runtimes.json`` -- runtimes grouped by manifest and job, used by
  the taskgraph chunking code in
  ``taskcluster/gecko_taskgraph/util/chunking.py``.
- ``manifests.json`` -- detailed per-run data with task IDs and commit hashes,
  useful for debugging timing regressions. This data powers the manifest
  timings dashboard at https://tests.firefox.dev/manifests.html.

See ``JSON_FORMAT.md`` for the format of these files.

The data is regenerated periodically by the
``source-test-file-metadata-test-info-manifest-timings-periodic`` task
and published as a TaskCluster artifact.
