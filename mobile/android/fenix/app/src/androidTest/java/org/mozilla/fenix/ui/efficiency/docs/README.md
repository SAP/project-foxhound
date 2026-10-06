# Android Test Automation Framework (POM + Factories)

## Introduction

This framework brings a modern, scalable approach to Android UI testing using the **Page Object Model (POM)** and a new **Test Factory** layer. It unifies Espresso, UIAutomator2, and Jetpack Compose testing under one abstraction so tests read like user journeys and can be **composed** from reusable steps.

Factories sit on top of POM and execute **Presence**, **Interaction**, and **Behavior** suites from a declarative **FeatureSpec**. This makes it easy to scale coverage with minimal boilerplate while keeping logs and artifacts developer-friendly.

> The concrete `features/*` specs and factory test classes included here are **demo & educational scaffolding**. They illustrate what the system will produce “over‑the‑wire.” As the team adopts data‑driven specs and the DSL, these demos will be replaced or removed.

---

## Architecture Layers

| Layer           | Responsibility                     | Example                                              |
| --------------- | ---------------------------------- | ---------------------------------------------------- |
| Selectors       | Describe how to find UI elements   | `Selector(byText = "Settings")`                      |
| Pages           | Group selectors and expose actions | `SettingsPage.navigateToPage()`                      |
| Steps           | Reusable actions/assertions        | `Navigate.To.Home()`, `Toggle.PrivateBrowsing(true)` |
| Feature Specs   | Compose steps into suites          | `FeatureSpec(surfaces, interactions, behavior)`      |
| Factories       | Execute suites + logging/artifacts | `PresenceFactory.run(spec, ctx)`                     |
| Debug Utilities | Export artifacts & pause           | `DebugControls.onSuiteEnd()`                         |
| Logging         | Human + machine logs, screenshots  | `SummarySink`, `JsonSink`, `ScreenshotTaker`         |

### Diagram — Architecture Overview

```mermaid
flowchart LR
  A["Selectors<br/>(UI element metadata)"] --> B["Page Objects<br/>(BasePage, PageContext)"]
  B --> C["Steps<br/>(Navigate, Toggle, Verify...)"]
  C --> D["Feature Specs<br/>(Presence, Interaction, Behavior)"]
  D --> E["Factories<br/>(Presence, Interaction, Behavior)"]
  E --> F["Logging Layer<br/>SummarySink, JsonSink, ScreenshotTaker"]
  E --> G["Debug Utilities<br/>DebugControls, ShellExporter"]
  F --> H["CI / Firebase Test Lab"]
  G --> H
```

---

## Dynamic Test Factories (Phase 1.5 Prototype)

Factories consume a declarative `FeatureSpec` and run three tiers:

- **Presence** – do expected elements render?
- **Interaction** – are controls responsive?
- **Behavior** – do minimal logical outcomes hold across pages?

```kotlin
val PrivateBrowsingSpec = FeatureSpec(
  key = FeatureKey.PRIVATE_BROWSING,
  surfaces = list_of(
    SurfaceCheck(
      navigateStep = Navigate.To.Home(),
      verifyStep = mozVerifyElementsByGroup("privateHomeHeader") { it.home }
    )
  )
)
```

**Execution flow:**

```mermaid
flowchart TB
  start((Test Start)) --> pre[Run Preconditions]
  pre --> p["PresenceFactory.run()"]
  p --> i["InteractionFactory.run()"]
  i --> b["BehaviorFactory.run()"]
  b --> logger[(StepLogger\nSummary + JSONL)]
  b --> shots[[ScreenshotTaker]]
  b --> dbg["DebugControls.onSuiteEnd()"]
  logger --> finish((Test End / Artifacts Exported))
  shots --> finish
  dbg --> finish
```

---

## First Test

```kotlin
@Test
fun verifyHomeLoads() {
  on.homePage.navigateToPage()
    .mozVerifyElementsByGroup("requiredForPage")
}
```

---

## Developer Workflow

1. **Define selectors** → small, reusable UI descriptors
2. **Create a page** → group selectors & expose actions
3. **Register navigation** → declare how to reach pages
4. **Compose specs or write tests** → use `FeatureSpec` or the DSL

---

## Documents

- [Test Automation Strategy](./TestAutomationStrategy.md)
- [Test Factory Design Goals](./TestFactoryDesignGoals.md)
- [FeatureSpec Data Model](./FeatureSpecDataModel.md)
- [Architecture Overview](./ArchitectureOverview.md)
- [Debug Utilities](./DebugUtilities.md)
- [Factories Guide](./Factories.md)
- [Feature Layer](./FeatureLayer.md)
- [Logging Layer](./LoggingLayer.md)
- [Steps Layer](./StepsLayer.md)

---

## Best Practices

- Prefer descriptive selector names & groups
- Keep page objects small and focused
- Use Given / When / Then phrasing
- Don’t call Espresso/UIAutomator directly in tests—wrap in steps/pages
