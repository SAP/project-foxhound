# Logging Layer

Provides both **human‑friendly** and **machine‑readable** outputs.

## Components

- `SummarySink` — concise, timestamped lines; also emits to Logcat
- `JsonSink` — newline‑delimited JSON (JSONL)
- `CombinedLogger` — fans out to both sinks
- `ArtifactManager` — centralized artifacts root
- `ScreenshotTaker` — captures full‑device PNGs

## Example JSONL event

```json
{
  "type": "stepEnd",
  "stepId": "presence-0",
  "name": "Presence.SurfaceCheck",
  "result": "PASS",
  "ts": 1731000000000
}
```
