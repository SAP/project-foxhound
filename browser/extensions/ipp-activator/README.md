# IPP Add-on Activator

Firefox WebExtension designed as a system add-on to enable and handle IP Protection (IPP) behaviors starting from Firefox 143. When it detects domains known for potential incompatibilities, it shows a browser notification with options to quickly exclude the site from IPP.

## Configure breakage domains

Breakage definitions are JSON files under `extension/breakages/` and are split by trigger:

- `src/breakages/tab.json`: entries used when the top-level tab URL changes or the tab becomes active.
- `src/breakages/webrequest.json`: entries used when matching network activity occurs (webRequest).

Each entry has the shape:

```json
{
  "domains": ["example.com"],
  "message": "Notification text to show to the user",
  "condition": {
    /* optional Condition */
  }
}
```

Notes:

- `domains`: list of registrable domains (eTLD+1, e.g. `example.com`) for which to show the notification. The match includes all subdomains.
- `message`: can be either a string or an array of parts to render rich content.
  - String example: `"Simple message"`.
  - Array example:
    ```json
    [
      { "text": "Important: ", "modifier": ["strong"] },
      { "text": "additional details." }
    ]
    ```
    Supported modifiers: `strong`.
- `condition` (optional): a Condition object that controls when to show the notification. If omitted, the rule always matches when the domain matches.
- Inject dynamic breakages at runtime via string prefs to JSON arrays:
  - `extensions.ippactivator.dynamicTabBreakages` for tab-triggered breakages
  - `extensions.ippactivator.dynamicWebRequestBreakages` for webRequest-triggered breakages
    The background listens for changes and updates immediately.

Examples (from tests, via Selenium running in chrome context):

```
// Set dynamic TAB breakages only
await setDynamicTabBreakages(driver, [
  {
    domains: ["www.example.com"],
    message: "Test message",
    condition: { "type": "test", "ret": true }
  }
]);

// Set dynamic WEBREQUEST breakages only
await setDynamicWebRequestBreakages(driver, [
  {
    domains: ["api.example.com"],
    message: "Matched request",
    condition: { "type": "url", "pattern": "https://api\\.example\\.com/" }
  }
]);
```

## Conditions

- Location: implementations live under `src/conditions/` and are referenced by breakages via the `condition` field.
- Shape: a condition is an object with a `type` plus type-specific fields. Conditions can be composed with logical operators.

Supported types

- **and**: logical AND over an array of sub-conditions.
  - Fields: `conditions: [Condition, ...]`
  - Result: true only if all sub-conditions return true. Empty array → true.
  - Example:
    ```json
    { "type": "and", "conditions": [{ "type": "test", "ret": true }] }
    ```

- **or**: logical OR over an array of sub-conditions.
  - Fields: `conditions: [Condition, ...]`
  - Result: true if any sub-condition returns true. Empty array → false.
  - Example:
    ```json
    {
      "type": "or",
      "conditions": [
        { "type": "test", "ret": false },
        { "type": "test", "ret": true }
      ]
    }
    ```

- **not**: logical negation of a single sub-condition.
  - Fields: `condition: Condition`
  - Result: negates the result of the given condition. If `condition` is omitted, defaults to `true`.
  - Example:
    ```json
    { "type": "not", "condition": { "type": "test", "ret": false } }
    ```

- **test**: helper for simple boolean checks in examples/tests.
  - Fields: `ret: boolean`
  - Result: returns `ret` as-is.
  - Example:
    ```json
    { "type": "test", "ret": true }
    ```

- **cookie**: checks for the existence (and optional value) of a cookie for a given domain.
  - Fields:
    - `domain` (string, required): domain to query (e.g. `"example.com"`).
    - `name` (string, required): cookie name to match.
    - `value` (string, optional): requires exact value match.
    - `value_contain` (string, optional): requires cookie value to contain this substring.
  - Result: true if a cookie with `name` exists for `domain` and, if provided, both `value` and `value_contain` conditions are satisfied.
  - Notes:
    - Requires the `"cookies"` permission (already included in this add-on’s manifest).
    - `domain` should be a host like `example.com` (no scheme/path). Matching follows the browser’s cookie domain rules.
  - Examples:
    ```json
    { "type": "cookie", "domain": "example.com", "name": "sessionid" }
    ```
    ```json
    {
      "type": "cookie",
      "domain": "example.com",
      "name": "sessionid",
      "value": "abc123"
    }
    ```

- **date**: matches when the current time falls within an optional date range.
  - Fields (both optional):
    - `start` (string): ISO 8601 lower bound; match requires `now() >= start`.
    - `end` (string): ISO 8601 upper bound; match requires `now() <= end`.
  - Result: true when the current time is within all provided bounds (inclusive). With no bounds, always true. Invalid date strings are ignored (treated as absent).
  - Notes: the condition is static and does not emit change notifications when a bound is crossed; re-evaluation happens whenever any other condition triggers a check. Combine with `not` to express "before `start`" or "after `end`".
  - Examples:
    ```json
    { "type": "date", "start": "2026-07-11T00:00:00Z", "end": "2026-07-20T23:59:59Z" }
    ```
    ```json
    { "type": "date", "start": "2026-07-11T00:00:00Z" }
    ```
    ```json
    {
      "type": "not",
      "condition": { "type": "date", "start": "2026-07-11T00:00:00Z" }
    }
    ```

- **url**: matches a URL against a regular expression.
  - Fields:
    - `pattern` (string, required): JavaScript RegExp pattern (without flags) tested against a URL string.
  - Example:
    ```json
    { "type": "url", "pattern": "https://example\\.com/api" }
    ```
    ```json
    {
      "type": "cookie",
      "domain": "example.com",
      "name": "sessionid",
      "value_contain": "abc"
    }
    ```

- **vpn**: checks whether IP Protection (IPP) is currently active.
  - Fields:
    - `active` (boolean, required): expected IPP state. Use `true` to match when IPP is active, `false` to match when it is not.
  - Result: true if the current IPP state equals `active`. The condition reacts to IPP state changes and re-evaluates automatically.
  - Example:
    ```json
    { "type": "vpn", "active": true }
    ```

- **region**: matches the user's home region against a list of ISO 3166-1 alpha-2 codes.
  - Fields:
    - `regions` (array of strings, required): list of region codes (uppercase, e.g. `"US"`, `"DE"`). Result is true when the user's current home region is in the list.
  - Notes: the condition observes `browser-region-updated` and re-evaluates when the home region changes.
  - Example:
    ```json
    { "type": "region", "regions": ["US", "CA"] }
    ```

Composing conditions

- You can nest `and`/`or` with other conditions to express complex logic, e.g.:

  ```json
  {
    "type": "and",
    "conditions": [
      { "type": "cookie", "domain": "example.com", "name": "session" },
      {
        "type": "or",
        "conditions": [
          {
            "type": "cookie",
            "domain": "example.com",
            "name": "flags",
            "value_contain": "beta"
          },
          { "type": "test", "ret": true }
        ]
      }
    ]
  }
  ```

- You can also use `not` to invert checks, for example:
  ```json
  {
    "type": "and",
    "conditions": [
      {
        "type": "not",
        "condition": {
          "type": "cookie",
          "domain": "example.com",
          "name": "opt_out"
        }
      },
      { "type": "cookie", "domain": "example.com", "name": "session" }
    ]
  }
  ```

Notes: the notification is informational only (no action buttons). Users can dismiss it; it will reappear when conditions are met.
