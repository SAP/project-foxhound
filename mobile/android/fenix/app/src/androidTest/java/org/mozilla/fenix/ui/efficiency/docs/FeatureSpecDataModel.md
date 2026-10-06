# FeatureSpec Data Model

This document explains the `FeatureSpec` concept and how **feature specs** (eventually authored as data) will drive the factories to generate dynamic test suites per piece of functionality.

## Why Feature Specs?

- Make **intent explicit**: what surfaces, interactions, and behaviors matter
- Allow **tests as data**: factories assemble suites mechanically
- Enable **ad‑hoc, on‑demand suites** in CI by passing arguments to choose features/tier

## Kotlin Type Model (today)

```kotlin
data class FeatureSpec(
  val key: FeatureKey,
  val preconditions: List<TestStep> = emptyList(),
  val surfaces: List<SurfaceCheck> = emptyList(),
  val interactions: List<InteractionCheck> = emptyList(),
  val sanity: List<BehaviorCheck> = emptyList(),
  val cleanup: List<TestStep> = emptyList(),
)
```

```kotlin
data class SurfaceCheck(val navigateStep: TestStep, val verifyStep: TestStep)
data class InteractionCheck(val navigateStep: TestStep, val actionStep: TestStep, val verifyStep: TestStep)
data class BehaviorCheck(val setupSteps: List<TestStep>, val triggerSteps: List<TestStep>, val crossPageVerifySteps: List<TestStep>)
```

## Future: Spec as Data (JSON/YAML)

```yaml
feature: PRIVATE_BROWSING
preconditions:
  - navigate: home
surfaces:
  - navigate: home
    verify: { page: home, group: privateHomeHeader }
  - navigate: history
    verify: { page: history, group: emptyHistoryList }
interactions:
  - navigate: home
    actions: [toggle: { privateBrowsing: true }]
    verify: { page: home, group: privateHomeHeader }
behavior:
  - setup: [toggle: { privateBrowsing: true }]
    trigger: [visit: "https://example.com"]
    verify:
      - navigate: history
      - verify: { page: history, group: emptyHistoryList }
cleanup:
  - toggle: { privateBrowsing: false }
```

The factory runtime maps these to concrete `TestStep`s (navigate/toggle/verify).

## Relationship Diagram

```mermaid
flowchart LR
  FS[FeatureSpec] --> PRE[Preconditions]
  FS --> SUR[Surfaces]
  FS --> INT[Interactions]
  FS --> BEH[Behavior]
  FS --> CLN[Cleanup]
  PRE --> STEP[TestStep]
  SUR --> STEP
  INT --> STEP
  BEH --> STEP
  CLN --> STEP
```

## CI Usage

- Choose features & tiers via arguments (e.g., `--features=PRIVATE_BROWSING --tiers=PRESENCE,INTERACTION`)
- Factories generate suites on demand using the provided `FeatureSpec` data
- Teams manage **test data** (selectors + groups) as the “requirements” that drive base coverage

**Goal:** everything that can be procedurally generated is covered by factories; only **user‑journey tests** remain bespoke.
