# Test Factory Design Goals

> _“Write intent once; let the system handle the mechanics.”_

## Purpose

The **Test Factory** prototype demonstrates how test cases can be built dynamically from declarative feature specifications, not imperative scripts. It is a **teaching & transition tool** that makes the composition mechanics visible before we automate them.

## Goals

1. **Demonstrate abstraction** — tests = navigation + action + verification
2. **Enable composability** — small steps → reusable specs → generated suites
3. **Provide transparency** — Summary + JSONL logs, screenshots on failure
4. **Reduce onboarding friction** — DSL/specs instead of raw code
5. **Prepare data‑driven future** — same factories will execute runtime specs

## Factory Tiers

| Factory     | Purpose                   | Example                 |
| ----------- | ------------------------- | ----------------------- |
| Presence    | Ensure UI surfaces render | “Do elements appear?”   |
| Interaction | Validate responsiveness   | “Can I toggle/tap?”     |
| Behavior    | Confirm logical outcomes  | “After X, does Y hold?” |

## Execution Flow

```mermaid
flowchart TB
  start((Start)) --> pre[Preconditions]
  pre --> pres[PresenceFactory]
  pres --> inter[InteractionFactory]
  inter --> beh[BehaviorFactory]
  beh --> log[(Logging)]
  beh --> shot[[Screenshots]]
  beh --> dbg[DebugControls]
  log --> finish((End))
  shot --> finish
  dbg --> finish
```

## Educational Scaffolding

The `features/*` specs and `*FactoryTest` classes are **demo/educational** modules. They show what real, data-driven suites will look like “over‑the‑wire.” Once teams are comfortable, they will be replaced or removed.
