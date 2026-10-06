# Architecture Overview

This document provides a high-level map of modules and how they interact.

## Diagram — Architecture Overview

```mermaid
flowchart LR
  A["Selectors(UI element metadata)"] --> B["Page Objects(BasePage, PageContext)"]
  B --> C["Steps(Navigate, Toggle, Verify...)"]
  C --> D["Feature Specs(Presence, Interaction, Behavior)"]
  D --> E["Factories(Presence, Interaction, Behavior)"]
  E --> F["Logging LayerSummarySink, JsonSink, ScreenshotTaker"]
  E --> G["Debug UtilitiesDebugControls, ShellExporter"]
  F --> H["CI / Firebase Test Lab"]
  G --> H
```

## Diagram — Factory Execution Flow

```mermaid
flowchart TB
    start(("Test Start")) --> pre["Run Preconditions"]
    pre --> p["PresenceFactory.run()"]
    p --> i["InteractionFactory.run()"]
    i --> b["BehaviorFactory.run()"]
    b --> logger[("StepLogger\nSummary + JSONL")] & shots[["ScreenshotTaker"]] & dbg["DebugControls.onSuiteEnd()"]
    logger --> finish(("Test End / Artifacts Exported"))
    shots --> finish
    dbg --> finish
```

## Diagram — FeatureSpec Composition

```mermaid
flowchart LR
  FS[FeatureSpec] --> PRE["Preconditions List"<TestStep>]
  FS --> SUR["Surfaces List"<SurfaceCheck>]
  FS --> INT["Interactions List"<InteractionCheck>]
  FS --> BEH["Behavior List"<BehaviorCheck>]
  FS --> CLN["Cleanup List"<TestStep>]
  PRE --> STEP[TestStep]
  SUR --> STEP
  INT --> STEP
  BEH --> STEP
  CLN --> STEP
```
