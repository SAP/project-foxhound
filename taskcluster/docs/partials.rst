Partial Update Generation
=========================

Overview
--------

Windows, Mac and Linux releases have partial updates, to reduce
the file size end-users have to download in order to receive new
versions. Partial updates contain only the differences between two
complete MAR files, allowing users to download a much smaller file
when updating.

Partials are generated using ``zucchini``, a binary diffing algorithm.
The task uses an in-tree Docker image
(``taskcluster/docker/partials-zucchini/``) and a Python script
(``make_incremental_zucchini.py``) that orchestrates the diffing
process, along with ``mar`` tools fetched as toolchain artifacts.

How the Task Works
------------------

The ``partials-zucchini`` kind
(``taskcluster/kinds/partials-zucchini/kind.yml``) defines the task.
The transform at
``taskcluster/gecko_taskgraph/transforms/partials_zucchini.py``
populates the task definition based on the release history.

The task depends on the ``repackage`` (or ``repackage-l10n``) kind
for the target ("to") complete MAR, and fetches the ``linux64-zucchini-bin``
and ``linux64-mar-tools`` toolchain artifacts.

The transform reads the ``release_history`` from the task graph
parameters to determine which previous versions need partial updates.
For each platform and locale combination, it constructs a JSON list
of "from" MARs and passes it to the script via the ``--from-mars-json``
argument.

Inside the Docker container, ``make_incremental_zucchini.py``:

1. Extracts the target ("to") complete MAR once.
2. Validates the MAR channel ID on the target MAR.
3. For each previous ("from") version, in parallel using
   ``ProcessPoolExecutor``:

   a. Downloads and signature-verifies the "from" MAR.
   b. Extracts the "from" MAR.
   c. Compares files between the two versions.
   d. For changed files, generates a ``zucchini`` diff (XZ-compressed),
      choosing the smaller of the patch or the full file.
   e. Writes add/remove/patch instructions into an ``updatev3.manifest``.
   f. Packages the result into a partial MAR using ``mar``.
   g. Validates the MAR channel ID on the resulting partial.

4. Writes a ``manifest.json`` summarizing all generated partials.

The script also handles forced-update files (e.g. ``precomplete``,
``.chk`` files, the macOS Firefox binary) and ``add-if-not``
instructions for files like ``channel-prefs.js``.

For Releases
------------

Partials are made as part of the ``promote`` task group. The previous
versions used to create the update are specified in ship-it by
Release Management.

Nightly Partials
----------------

Since nightly releases don't appear in ship-it, the partials to create
are determined in the decision task. This was controversial, and so here
are the assumptions and reasons, so that when an alternative solution is
discovered, we can assess it in context:

1. Balrog is the source of truth for previous nightly releases.
2. Re-running a task should produce the same results.
3. A task's input and output should be specified in the definition.
4. A task transform should avoid external dependencies. This is to
   increase the number of scenarios in which 'mach taskgraph' works.
5. A task graph doesn't explicitly know that it's intended for nightlies,
   only that specific tasks are only present for nightly.
6. The decision task is explicitly told that its target is nightly
   using the target-tasks-method argument.

a. From 2 and 3, this means that the partials task itself cannot query
   balrog for the history, as it may get different results when re-run,
   and hides the inputs and outputs from the task definition.
b. From 4, anything run by 'mach taskgraph' is an inappropriate place
   to query Balrog, even if it results in a repeatable task graph.
c. Since these restrictions don't apply to the decision task, and given
   6, we can query Balrog in the decision task if the target-tasks-method
   given contains 'nightly', such as 'nightly_desktop' or 'nightly_linux'

Using the decision task involves making fewer, larger queries to Balrog,
and storing the results for task graph regeneration and later audit. At
the moment this data is stored in the ``parameters`` under the label
``release_history``, since the parameters are an existing method for
passing data to the task transforms, but a case could be made
for adding a separate store, as it's a significantly larger number of
records than anything else in the parameters.

Nightly Partials and Beetmover
------------------------------

A release for a specific platform and locale may not have a history of
prior releases that can be used to build partial updates. This could be
for a variety of reasons, such as a new locale, or a hiatus in nightly
releases creating too long a gap in the history.

This means that the ``partials-zucchini`` and ``partials-signing`` tasks
may have nothing to do for a platform and locale. If this is true, then
the tasks are filtered out in the ``transform``.

This does mean that the downstream task, ``beetmover-repackage`` can not
rely on the ``partials-signing`` task existing. It depends on both the
``partials-signing`` and ``repackage-signing`` task, and chooses which
to depend on in the transform.

If there is a history in the ``parameters`` ``release_history`` section
then ``beetmover-repackage`` will depend on ``partials-signing``.
Otherwise, it will depend on ``repackage-signing``.

Zucchini Rollout
----------------

The legacy implementation (called "Funsize") used ``mbsdiff`` for
diffing. The ``zucchini_partial_rollout`` transform in the
``partials-signing`` kind controls which implementation is active
for each release channel. The ``partials-signing`` kind depends on
both ``partials`` (legacy) and ``partials-zucchini``, and the rollout
transform filters out the unused implementation based on the project:

- **mozilla-central, mozilla-beta** (nightly): uses ``partials-zucchini``
- **mozilla-release, ESR channels**: uses legacy ``partials``

As zucchini partials are validated on nightly, the rollout will expand
to other channels by removing entries from the
``LEGACY_PARTIALS_PROJECTS`` set in the rollout transform.
