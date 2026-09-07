# Debug Utilities

The debug layer provides **developer‑friendly** tools for exporting artifacts and pausing after runs—without Gradle/manifest changes.

## Modules

- `DebugControls` — reads instrumentation flags and performs suite‑end actions
- `ShellExporter` — mirrors `artifacts/<run-id>` to a public path (e.g., `/sdcard/TestFactoryArtifacts/<run-id>`)

## Flags

```
-e factoryExportPublic true
-e factoryPauseAfterRunSec 20
```

## Typical Flow

1. Factories run a tier and write artifacts under the app’s private external storage.
2. `DebugControls.onSuiteEnd(...)` runs:
   - **export** artifacts publicly (optional)
   - **pause** N seconds for manual inspection (optional)
