# Feature Layer

The feature layer defines the **what** of a feature’s tests.

## Key Types

```kotlin
enum class FeatureKey { PRIVATE_BROWSING /* ... */ }

data class FeatureSpec(
  val key: FeatureKey,
  val preconditions: List<TestStep> = emptyList(),
  val surfaces: List<SurfaceCheck> = emptyList(),
  val interactions: List<InteractionCheck> = emptyList(),
  val sanity: List<BehaviorCheck> = emptyList(),
  val cleanup: List<TestStep> = emptyList(),
)
```

Use the DSL or data to build `FeatureSpec`; factories do the rest.
