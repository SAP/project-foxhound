---
name: stmo
description: >
  Manage Redash queries and dashboards on Mozilla's STMO (sql.telemetry.mozilla.org)
  using stmo-cli. Use when the user wants to explore telemetry data on STMO, write,
  deploy, or execute Redash queries, manage dashboards, or discover data sources.
  Also trigger on mentions of STMO, Redash, sql.telemetry.mozilla.org, or when the
  user wants to query Mozilla telemetry data (as opposed to probe/metric discovery,
  which is mozdata territory).
allowed-tools:
  - Bash(stmo-cli:*)
  - Bash(mkdir:*)
  - Read
  - Grep
  - Glob
---

# stmo-cli

CLI for managing queries and dashboards on Mozilla's Redash instance (sql.telemetry.mozilla.org).

## Prerequisites

Before running any stmo-cli command (except `init` and `update`), verify `REDASH_API_KEY` is set. If missing, every command fails immediately with:

```
Error: REDASH_API_KEY environment variable not set
```

To get the key, go to `https://sql.telemetry.mozilla.org/users/me` (API Key section), copy the key, and export it:

```bash
export REDASH_API_KEY=your_key_here
```

If `stmo-cli` is not available, install it via `./mach bootstrap`.

## Working directory

stmo-cli creates `queries/` and `dashboards/` relative to the current directory. Never run file-creating commands from the Firefox repo tree. Always use the `artifacts/stmo/` directory, which is already VCS-ignored:

```bash
mkdir -p artifacts/stmo
cd artifacts/stmo
```

Queries created during exploration are ephemeral: fetch → execute → archive → done.

The temp directory is not a git repo, so `stmo-cli deploy` (which uses git diff to detect changes) won't work — always use `stmo-cli deploy --all` instead.

## Data exploration workflow

1. **Find data sources**
   ```bash
   stmo-cli data-sources
   stmo-cli data-sources <id> --schema
   ```

2. **Discover existing queries**
   ```bash
   stmo-cli discover
   ```

3. **Fetch and read an existing query**
   ```bash
   stmo-cli fetch <id>
   # reads: queries/<id>-*.sql and queries/<id>-*.yaml
   ```

4. **Execute**
   ```bash
   stmo-cli execute <id> --format table --limit 50
   stmo-cli execute <id> --format json --limit 50
   stmo-cli execute <id> --param key=value
   stmo-cli execute <id> --param channels='["release","beta"]'  # multi-value enum: always JSON array
   stmo-cli execute <id> --interactive  # prompts for parameter values
   ```

5. **Clean up newly created queries**

   If you created a new query (the `id: 0` → deploy flow) and it's not worth keeping, archive it — throwaway queries clutter the Redash account:
   ```bash
   stmo-cli archive <id>
   ```

   If the query is useful or you want to share it with others, leave it in Redash instead. The same applies to dashboards created during exploration — archive with `stmo-cli dashboards archive <slug>` if throwaway, leave if worth sharing.

   Do **not** archive queries or dashboards you only fetched to read — that would delete them from Redash.

   To restore an archived query:
   ```bash
   stmo-cli unarchive <id>
   stmo-cli fetch <id>
   ```

## Bootstrap context from existing queries

Before answering a new data question, fetch the user's existing queries to understand what tables, patterns, and SQL style they already use:

```bash
stmo-cli fetch --all
```

Then read the downloaded `.sql` files to learn which tables are queried, how filters are structured, and what metrics are already tracked. This makes new queries fit naturally into the user's existing work.

## Beyond Redash: export and analyze

When Redash isn't sufficient — complex statistics, rich visualizations, or analysis over large result sets — export the raw data and analyze it locally:

```bash
stmo-cli execute <id> --format json --limit 10000 2>/dev/null > data.json
```

From there:
- **DuckDB or SQLite** for SQL-based analysis over the exported data
- **Python + pandas/scipy/numpy** for real statistics (mean/median alone is almost always wrong)
- **Apache Echarts** for rich interactive charts in HTML/JS that handle large datasets well
- **Jinja2** for templating if generating reports

A static website updated via cron (behind SSO) is a proven pattern for sharing results within Mozilla — see the [App Engine static site with IAP runbook](https://docs.google.com/document/d/19GaDXZmppnZs79apvG2PBiCzFj6hKl6rGWlhz3wlSww/edit?tab=t.0#heading=h.s080nn5fdzk8).

## SQL style

STMO queries run on BigQuery. Use BigQuery SQL syntax: backtick-quoted identifiers, `DATE_ADD(date, INTERVAL N DAY)`, `FORMAT_DATE`, `APPROX_COUNT_DISTINCT`, etc.

## mozdata integration

Use the mozdata MCP tools (`mozdata:probe-discovery`, `mozdata:query-writing`) to find the right telemetry probes, metrics, and table schemas. Then use stmo-cli to write, deploy, and execute the actual Redash queries.

## Query management

**Create a new query:**

1. Create `queries/0-{slug}.sql` with the SQL

2. Create `queries/0-{slug}.yaml` with metadata:
   ```yaml
   id: 0
   name: My Query Name
   data_source_id: <id from stmo-cli data-sources>
   options:
     parameters: []
   visualizations: []
   ```
   Both `options` (with `parameters`) and `visualizations` are required even when empty.

   Do **not** add a default Table visualization — Redash creates one automatically for every new query.

   **Slug rule**: stmo-cli derives the expected SQL filename by slugifying the `name` field — non-alphanumeric chars become `-`, consecutive dashes collapse, apostrophes are stripped (e.g. `"Mozilla's .rpm"` → `mozilla-s-rpm`). The `{slug}` in both filenames must match this transform.

3. **For enum parameters**, use YAML multiline format — escaped newlines (`\\n`) are not valid:
   ```yaml
   options:
     parameters:
     - name: normalized_channels
       title: normalized_channels
       type: enum
       value:
       - release
       enumOptions: |-
         nightly
         aurora
         beta
         release
         esr
       multiValuesOptions:
         prefix: ''''
         suffix: ''''
         separator: ','
   ```

4. Deploy:
   ```bash
   stmo-cli deploy --all
   ```

5. Sync the server-assigned ID:
   ```bash
   stmo-cli fetch <new-id>  # renames local files to {new-id}-{slug}.*
   ```

## Dashboard management

Dashboards are addressed by slug, not ID.

```bash
stmo-cli dashboards discover                    # only shows favorited dashboards
stmo-cli dashboards fetch <slug>
stmo-cli dashboards deploy <slug>
stmo-cli dashboards deploy --all
stmo-cli dashboards archive <slug>
stmo-cli dashboards unarchive <slug>
```

Create: `dashboards/0-{slug}.yaml` with `id: 0`, deploy, file auto-renames with real ID.

## Command reference

Run `stmo-cli --help` — stmo-cli outputs LLM-optimized help when run inside an AI coding environment (`CLAUDECODE` is set automatically).

## File format

```
queries/{id}-{slug}.sql    # SQL text
queries/{id}-{slug}.yaml   # metadata: name, data_source_id, options, visualizations
dashboards/{id}-{slug}.yaml
```

New queries/dashboards use `id: 0` in the filename until deployed.
