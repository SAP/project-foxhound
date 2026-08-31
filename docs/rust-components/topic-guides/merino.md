---
myst:
  enable_extensions: ["colon_fence"]
---

# Merino

The Merino component provides three clients for interacting with the [Merino service](https://merino.services.mozilla.com/docs):

- **`CuratedRecommendationsClient`** — Fetches personalized content recommendations, powering features like Firefox's New Tab page.
- **`SuggestClient`** — Fetches search suggestions, powering features like Firefox's address bar.
- **`WorldCupClient`** — Fetches World Cup teams, matches, and live updates from the Merino WCS endpoint.

## Prerequisites

Ensure that {doc}`viaduct` is initialized during application startup, as it is used for making network requests.

The `SuggestClient` additionally requires the OHTTP channel to be configured before making requests:

:::{tab-set-code}

```kotlin
import mozilla.appservices.viaduct.OhttpConfig
import mozilla.appservices.viaduct.configureOhttpChannel

configureOhttpChannel(
    channel = "merino",
    config = OhttpConfig(
        relayUrl = "https://ohttp-merino.mozilla.fastly-edge.com",
        gatewayHost = "ohttp-gateway-merino.services.mozilla.com",
    ),
)
```

```swift
// Configure the OHTTP channel before using SuggestClient
let config = OhttpConfig(
    relayUrl: "https://ohttp-merino.mozilla.fastly-edge.com",
    gatewayHost: "ohttp-gateway-merino.services.mozilla.com"
)
try configureOhttpChannel(channelId: "merino", config: config)
```

:::

## Async

All clients are synchronous — calling them directly will block the current thread. Consumers should wrap calls in an async implementation.

---

## Curated Recommendations Client

Fetches personalized content recommendations from the Merino Service. [Merino Curated Recommendations API Docs](https://merino.services.mozilla.com/docs#/default/curated_content_api_v1_curated_recommendations_post)

The API for the `CuratedRecommendationsClient` can be found in the Mozilla Rust components [Kotlin API Reference](https://mozilla.github.io/application-services/kotlin/kotlin-components-docs/mozilla.appservices.merino/-curated-recommendations-client/index.html) and [Swift API Reference](https://mozilla.github.io/application-services/swift/Classes/CuratedRecommendationsClient.html).

## Importing the Client

:::{tab-set-code}

```kotlin
import mozilla.appservices.merino.CuratedRecommendationsClient
import mozilla.appservices.merino.CuratedRecommendationsRequest
import mozilla.appservices.merino.CuratedRecommendationsResponse
import mozilla.appservices.merino.CuratedRecommendationsApiException
```

```swift
import MozillaAppServices
```

:::

## Initializing the Curated Recommendations Client

The `CuratedRecommendationsClient` is initialized using a `CuratedRecommendationsConfig` object. This includes a required `userAgentHeader` and an optional `baseHost`. If `baseHost` is not provided, the client will default to the production host.

:::{tab-set-code}

```kotlin

val config = CuratedRecommendationsConfig(
    baseHost = "https://merino.services.mozilla.com"
    userAgentHeader = "Mozilla/5.0"
)

val client = CuratedRecommendationsClient(config)

```

```swift

let config = CuratedRecommendationsConfig(
    baseHost: "https://merino.services.mozilla.com"
    userAgentHeader: "Mozilla/5.0"
)

let client = try CuratedRecommendationsClient(config: config)

```

:::

## Fetching Curated Recommendations

The `getCuratedRecommendations()` method fetches recommendations based on the provided request parameters.

:::{tab-set-code}

```kotlin

val request = CuratedRecommendationsRequest(
    locale = Locale.EN_US,
    region = "US",
    count = 4,
    topics = listOf("business"),
    feeds = listOf("sections")
)

try {
    val response: CuratedRecommendationsResponse = client.getCuratedRecommendations(request)
    println("Received recommendations: $response")
} catch (e: CuratedRecommendationsError) {
    println("Error fetching recommendations: ${e.message}")
}

```

```swift

let request = CuratedRecommendationsRequest(
    locale: Locale.en-US,
    region: "US",
    count: 4,
    topics: ["business"],
    feeds: ["sections"]
)

do {
    let response = try client.getCuratedRecommendations(request: request)
    print("Received recommendations: \(response)")
} catch {
    print("Error fetching recommendations: \(error)")
}

```

:::

## Data Models

### Curated Recommendations Request Model

The `CuratedRecommendationsRequest` model defines the parameters required to request curated recommendations.

### Request Fields

| **Field** | **Type** | **Description** |
|-----------|---------|----------------|
| `locale` | `string` | The Firefox installed locale, e.g., `en`, `en-US`, `de-DE`. Determines the language of recommendations. |
| `region` | `string (optional)` | _(Optional)_ The country-level region, e.g., `US` or `IE`. Helps return more relevant recommendations. If not provided, it is extracted from `locale` if it contains two parts (e.g., `en-US`). |
| `count` | `integer (optional)` | _(Optional)_ The maximum number of recommendations to return. Defaults to `100`. |
| `topics` | `array<string> (optional)` | _(Optional)_ A list of preferred [curated topics](https://mozilla-hub.atlassian.net/wiki/x/LQDaMg). |
| `feeds` | `array<string> (optional)` | _(Optional)_ A list of additional data feeds. Accepted values: `"need_to_know"`, `"fakespot"`, and `"sections"`. |
| `sections` | `array<object> (optional)` | _(Optional)_ A list of section settings that the user follows or has blocked. |
| `experimentName` | `string (optional)` | _(Optional)_ The Nimbus New Tab experiment name that the user is enrolled in. Used to run backend experiments independently of Firefox releases. |
| `experimentBranch` | `string (optional)` | _(Optional)_ The branch name of the Nimbus experiment that the user is in. |
| `enableInterestPicker` | `boolean (optional, default: false)` | _(Optional, defaults to `false`)_ If `true`, the API response will include an `interestPicker` object with sections for interest bubbles. |

### Curated Recommendations Response Model

The `CuratedRecommendationsResponse` model defines the response format containing recommendations.

### Response Fields

| **Field** | **Type** | **Description** |
|-----------|---------|----------------|
| `recommendedAt` | `integer` | The timestamp (in milliseconds) indicating when the recommendations were generated. |
| `data` | `array<object>` | A list of curated recommendation items. |
| `feeds` | `object (optional)` | _(Optional)_ A structured set of multiple curated recommendation lists. |
| `interestPicker` | `object (optional)` | _(Optional)_ Returned if `enableInterestPicker` is `true` in the request. Specifies the display order (`receivedFeedRank`) and a list of sections (referenced by `sectionId`) for interest bubbles. The text in these bubbles should match the corresponding section title. |

## Error Handling

The Curated Recommendations component defines the following error hierarchy:

- **`CuratedRecommendationsApiError`**: Base error
  - **`Network(reason: string)`**: Network error while making a request.
  - **`Other(code: integer (optional), reason: string)`**: Generic error containing an HTTP status code and message.

### Handling Errors in Kotlin and Swift

:::{tab-set-code}

```kotlin
fun fetchCuratedRecommendations() {
    try {
        val response = client.getCuratedRecommendations(request)
    } catch (e: CuratedRecommendationsError.Network) {
        // Log and retry after 5 minutes
        Log.w("Network error when fetching Curated Recommendations: ${e.reason}")
        scheduleRetry(300)
    } catch (e: CuratedRecommendationsError.Other) {
        when (e.code) {
            400 -> Log.e("Bad Request: ${e.reason}")
            422 -> Log.e("Validation Error: ${e.reason}")
            in 500..599 -> Log.e("Server Error: ${e.reason}")
            else -> Log.e("Unexpected Error: ${e.reason}")
        }
    }
}

```

```swift
func fetchCuratedRecommendations() {
    do {
        let response = try client.getCuratedRecommendations(request)
    } catch CuratedRecommendationsError.Network(let reason) {
        // Log and retry after 5 minutes
        print("Network error when fetching Curated Recommendations: \(reason)")
        scheduleRetry(seconds: 300)
    } catch CuratedRecommendationsError.Other(let code, let reason) {
        switch code {
        case 400:
            print("Bad Request: \(reason)")
        case 422:
            print("Validation Error: \(reason)")
        case 500...599:
            print("Server Error: \(reason)")
        default:
            print("Unexpected Error: \(reason)")
        }
    }
}

```

:::

---

## Suggest Client

Fetches search suggestions from the Merino suggest endpoint. [Merino Suggest API Docs](https://merino.services.mozilla.com/docs#/default/suggest_api_v1_suggest_get)

The API for the `SuggestClient` can be found in the Mozilla Rust components [Kotlin API Reference](https://mozilla.github.io/application-services/kotlin/kotlin-components-docs/mozilla.appservices.merino/-suggest-client/index.html) and [Swift API Reference](https://mozilla.github.io/application-services/swift/Classes/SuggestClient.html).

## Importing the Client

:::{tab-set-code}

```kotlin
import mozilla.appservices.merino.SuggestClient
import mozilla.appservices.merino.SuggestConfig
import mozilla.appservices.merino.SuggestOptions
import mozilla.appservices.merino.MerinoSuggestApiException
```

```swift
import MozillaAppServices
```

:::

## Initializing the Suggest Client

The `SuggestClient` is initialized using a `SuggestConfig` object with an optional `baseHost`. If not provided, it defaults to the production host.

:::{tab-set-code}

```kotlin

val config = SuggestConfig(
    baseHost = null // defaults to https://merino.services.mozilla.com
)

val client = SuggestClient(config)

```

```swift

let config = SuggestConfig(baseHost: nil) // defaults to https://merino.services.mozilla.com

let client = try SuggestClient(config: config)

```

:::

## Fetching Suggestions

The `getSuggestions()` method returns a raw JSON string containing the Merino suggest response. Callers are responsible for deserializing the response.

:::{tab-set-code}

```kotlin

val options = SuggestOptions(
    providers = listOf("wikipedia", "adm"),
    source = "urlbar",
    country = "US",
    region = "CA",
    city = "San Francisco",
    clientVariants = null,
    requestType = null,
    acceptLanguage = "en-US"
)

try {
    val json: String = client.getSuggestions(query = "firefox", options = options)
    // parse json as needed
} catch (e: MerinoSuggestApiException) {
    println("Error fetching suggestions: ${e.message}")
}

```

```swift

let options = SuggestOptions(
    providers: ["wikipedia", "adm"],
    source: "urlbar",
    country: "US",
    region: "CA",
    city: "San Francisco",
    clientVariants: nil,
    requestType: nil,
    acceptLanguage: "en-US"
)

do {
    let json: String = try client.getSuggestions(query: "firefox", options: options)
    // parse json as needed
} catch {
    print("Error fetching suggestions: \(error)")
}

```

:::

## Data Models

### SuggestConfig

| **Field** | **Type** | **Description** |
|-----------|---------|----------------|
| `baseHost` | `string (optional)` | The base host for the Merino endpoint. Defaults to `https://merino.services.mozilla.com`. |

### SuggestOptions

All fields are optional — omitted fields are not sent to Merino.

| **Field** | **Type** | **Description** |
|-----------|---------|----------------|
| `providers` | `array<string> (optional)` | List of suggestion providers to query (e.g. `["wikipedia", "adm"]`). An empty list is treated the same as omitting the field. |
| `source` | `string (optional)` | Identifier of which part of Firefox the request comes from (e.g. `"urlbar"`, `"newtab"`). |
| `country` | `string (optional)` | ISO 3166-1 country code (e.g. `"US"`). |
| `region` | `string (optional)` | Subdivision code(s) (e.g. `"CA"`). |
| `city` | `string (optional)` | City name (e.g. `"San Francisco"`). |
| `clientVariants` | `array<string> (optional)` | List of active experiments or rollouts affecting the client's Suggest experience. An empty list is treated the same as omitting the field. |
| `requestType` | `string (optional)` | For the AccuWeather provider: `"location"` for location completion or `"weather"` for weather suggestions. Defaults to weather if omitted. |
| `acceptLanguage` | `string (optional)` | The `Accept-Language` header value to forward to Merino (e.g. `"en-US"`). |

### Response

`getSuggestions()` returns the raw JSON response body as a string. The response follows the [Merino suggest API schema](https://merino.services.mozilla.com/docs#/default/suggest_api_v1_suggest_get).

## Error Handling

The Suggest component defines the following error hierarchy:

- **`MerinoSuggestApiError`**: Base error
  - **`Network(reason: string)`**: A network-level failure (e.g. no connectivity, OHTTP not configured).
  - **`Other(code: integer (optional), reason: string)`**: An HTTP error or unexpected failure, with an optional status code.

### Handling Errors in Kotlin and Swift

:::{tab-set-code}

```kotlin
fun fetchSuggestions() {
    try {
        val json = client.getSuggestions(query = "firefox", options = options)
    } catch (e: MerinoSuggestApiException.Network) {
        // Log and retry
        Log.w("Network error when fetching suggestions: ${e.reason}")
    } catch (e: MerinoSuggestApiException.Other) {
        when (e.code) {
            400 -> Log.e("Bad Request: ${e.reason}")
            422 -> Log.e("Validation Error: ${e.reason}")
            in 500..599 -> Log.e("Server Error: ${e.reason}")
            else -> Log.e("Unexpected Error: ${e.reason}")
        }
    }
}

```

```swift
func fetchSuggestions() {
    do {
        let json = try client.getSuggestions(query: "firefox", options: options)
    } catch MerinoSuggestApiError.network(let reason) {
        // Log and retry
        print("Network error when fetching suggestions: \(reason)")
    } catch MerinoSuggestApiError.other(let code, let reason) {
        switch code {
        case 400:
            print("Bad Request: \(reason)")
        case 422:
            print("Validation Error: \(reason)")
        case 500...599:
            print("Server Error: \(reason)")
        default:
            print("Unexpected Error: \(reason)")
        }
    }
}

```

:::

---

## World Cup Client

Fetches World Cup teams, matches, and live updates from the Merino WCS (World Cup Service) endpoint at `/api/v1/wcs/`.

The API for the `WorldCupClient` can be found in the Mozilla Rust components [Kotlin API Reference](https://mozilla.github.io/application-services/kotlin/kotlin-components-docs/mozilla.appservices.merino/-world-cup-client/index.html) and [Swift API Reference](https://mozilla.github.io/application-services/swift/Classes/WorldCupClient.html).

Unlike `SuggestClient`, the `WorldCupClient` does **not** require the OHTTP channel — requests are sent directly via viaduct.

## Importing the Client

:::{tab-set-code}

```kotlin
import mozilla.appservices.merino.WorldCupClient
import mozilla.appservices.merino.WorldCupConfig
import mozilla.appservices.merino.WorldCupOptions
import mozilla.appservices.merino.MerinoWorldCupApiException
```

```swift
import MozillaAppServices
```

:::

## Initializing the World Cup Client

The `WorldCupClient` is initialized using a `WorldCupConfig` object with an optional `baseHost`. If not provided, it defaults to the production host.

:::{tab-set-code}

```kotlin

val config = WorldCupConfig(
    baseHost = null // defaults to https://merino.services.mozilla.com
)

val client = WorldCupClient(config)

```

```swift

let config = WorldCupConfig(baseHost: nil) // defaults to https://merino.services.mozilla.com

let client = try WorldCupClient(config: config)

```

:::

## Fetching World Cup Data

The client exposes three methods, each returning the raw JSON response body as a string (or `null`/`nil` if the server returned `204 No Content`):

- `getTeams(options)` — fetches teams from `/wcs/teams`
- `getMatches(options)` — fetches matches from `/wcs/matches`
- `getLive(options)` — fetches live updates from `/wcs/live`

Callers are responsible for deserializing the response.

:::{tab-set-code}

```kotlin

val options = WorldCupOptions(
    limit = 10u,
    teams = listOf("FRA", "ENG"),
    acceptLanguage = "en-US"
)

try {
    val json: String? = client.getMatches(options)
    // parse json as needed
} catch (e: MerinoWorldCupApiException) {
    println("Error fetching matches: ${e.message}")
}

```

```swift

let options = WorldCupOptions(
    limit: 10,
    teams: ["FRA", "ENG"],
    acceptLanguage: "en-US"
)

do {
    let json: String? = try client.getMatches(options: options)
    // parse json as needed
} catch {
    print("Error fetching matches: \(error)")
}

```

:::

## Data Models

### WorldCupConfig

| **Field** | **Type** | **Description** |
|-----------|---------|----------------|
| `baseHost` | `string (optional)` | The base host for the Merino endpoint. Defaults to `https://merino.services.mozilla.com`. |

### WorldCupOptions

All fields are optional — omitted fields are not sent to Merino.

| **Field** | **Type** | **Description** |
|-----------|---------|----------------|
| `limit` | `integer (optional)` | Maximum number of results to return. |
| `teams` | `array<string> (optional)` | Filter results by team(s) (e.g. `["FRA", "ENG"]`). An empty list is treated the same as omitting the field. |
| `acceptLanguage` | `string (optional)` | The `Accept-Language` header value to forward to Merino (e.g. `"en-US"`). |

### Response

Each `get*()` method returns the raw JSON response body as a string, or `null`/`nil` if the server returned `204 No Content`.

## Error Handling

The World Cup component defines the following error hierarchy:

- **`MerinoWorldCupApiError`**: Base error
  - **`Network(reason: string)`**: A network-level failure (e.g. no connectivity).
  - **`Other(code: integer (optional), reason: string)`**: An HTTP error or unexpected failure, with an optional status code.

### Handling Errors in Kotlin and Swift

:::{tab-set-code}

```kotlin
fun fetchMatches() {
    try {
        val json = client.getMatches(options)
    } catch (e: MerinoWorldCupApiException.Network) {
        // Log and retry
        Log.w("Network error when fetching matches: ${e.reason}")
    } catch (e: MerinoWorldCupApiException.Other) {
        when (e.code) {
            400 -> Log.e("Bad Request: ${e.reason}")
            422 -> Log.e("Validation Error: ${e.reason}")
            in 500..599 -> Log.e("Server Error: ${e.reason}")
            else -> Log.e("Unexpected Error: ${e.reason}")
        }
    }
}

```

```swift
func fetchMatches() {
    do {
        let json = try client.getMatches(options: options)
    } catch MerinoWorldCupApiError.network(let reason) {
        // Log and retry
        print("Network error when fetching matches: \(reason)")
    } catch MerinoWorldCupApiError.other(let code, let reason) {
        switch code {
        case 400:
            print("Bad Request: \(reason)")
        case 422:
            print("Validation Error: \(reason)")
        case 500...599:
            print("Server Error: \(reason)")
        default:
            print("Unexpected Error: \(reason)")
        }
    }
}

```

:::
