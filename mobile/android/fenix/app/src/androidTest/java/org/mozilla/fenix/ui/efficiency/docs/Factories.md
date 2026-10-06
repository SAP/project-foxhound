# Factories Guide

Factories execute `FeatureSpec` tiers with consistent logging and screenshots.

## Tiers

- **PresenceFactory** — navigate + verify
- **InteractionFactory** — navigate + action + verify
- **BehaviorFactory** — setup + trigger + cross‑page verify

## Failure Semantics

- **Fail fast** on the first failed step within a tier
- Capture a screenshot on failure
- Always call `testEnd(PASS|FAIL)` and suite‑end debug hooks

## Logging

- Human: `summary.log`
- Machine: `details.jsonl` (one JSON per line)
- Screenshots: under per‑test/per‑step dirs
