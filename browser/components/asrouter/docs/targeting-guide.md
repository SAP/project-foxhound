# Guide to targeting with JEXL

For a more in-depth explanation of JEXL syntax you can read the [Normady project docs](https://mozilla.github.io/normandy/user/filters.html?highlight=jexl).

## How to write JEXL targeting expressions
A message needs to contain the `targeting` property (JEXL string) which is evaluated against the provided attributes.
Examples:

```javascript
{
  "id": "7864",
  "content": {...},
  // simple equality check
  "targeting": "usesFirefoxSync == true"
}

{
  "id": "7865",
  "content": {...},
  // using JEXL transforms and combining two attributes
  "targeting": "usesFirefoxSync == true && profileAgeCreated > '2018-01-07' | date"
}

{
  "id": "7866",
  "content": {...},
  // targeting addon information
  "targeting": "addonsInfo.addons['activity-stream@mozilla.org'].name == 'Activity Stream'"
}

{
  "id": "7866",
  "content": {...},
  // targeting based on time
  "targeting": "currentDate > '2018-08-08' | date"
}
```

## Available JEXL transforms and operators

Firefox extends standard JEXL with additional transforms and a binary operator, defined in [`FilterExpressions.sys.mjs`](https://searchfox.org/mozilla-central/rev/907db2c22743f1b24496198b10a3dca4085cfb08/toolkit/components/utils/FilterExpressions.sys.mjs#39-52). Transforms are applied using the pipe operator (`|`), e.g. `someValue | transformName`.

### `date`
Converts a date string into a `Date` object.
```java
currentDate | date > "2025-05-06" | date
```

### `stableSample`
Hashes the input and returns `true` if the hash falls below the given rate (0.0–1.0).
```java
// Target approximately 10% of users, consistently
clientID | stableSample(0.1)
```

### `bucketSample`
Hashes the input and returns `true` if it falls within the given bucket range (`start` to `start + count`) out of `total` buckets. The range wraps around if it exceeds `total`, so `bucketSample(70, 50, 100)` checks buckets 70–99 and 0–19.
```java
// Target 500 out of 10,000 buckets
userId | bucketSample(0, 500, 10000)
```

### `preferenceValue`
Returns the current value of a Firefox preference. Supports `string`, `integer`, and `boolean` preference types. Returns `defaultValue` if the preference does not exist, and throws if the preference exists but is of an unrecognised type.

```java
"browser.newtabpage.enabled" | preferenceValue
"some.pref" | preferenceValue(true)
```

### `preferenceIsUserSet`
Returns `true` if the user has explicitly changed the preference from its default value. A preference reset to its default value is considered *not* user-set, even if the current value matches what the user previously set.

```java
"browser.newtabpage.enabled" | preferenceIsUserSet
```

### `preferenceExists`
Returns `true` if the preference exists with any valid type (`string`, `integer`, or `boolean`). Returns `false` for preferences with an invalid or unrecognised type.

```java
"some.optional.pref" | preferenceExists
```

### `keys`
Returns an array of the enumerable keys of an object, or `undefined` if the input is not an object.

```java
providerCohorts | keys
```

### `length`
Returns the length of an array, or `undefined` if the input is not an array.

```java
topFrecentSites | length > 5
```

### `mapToProperty`
Given an array of objects, returns a new array of a single named property extracted from each element.
```java
topFrecentSites | mapToProperty("host")
```

### `intersect`
Returns the elements present in both arrays, or `undefined` if either argument is not an array. Unlike the transforms above, this is used as an **infix operator** rather than with a pipe.
```java
topFrecentSites | mapToProperty("host") intersect ["amazon.com", "ebay.com", "etsy.com"]
```

### `regExpMatch`
Matches a string against a regular expression. Returns an array of matches, or `null` if there are none. Accepts an optional flags argument.
```java
currentURL | regExpMatch("^https://example\\.com/")
currentURL | regExpMatch("^https://example\\.com/", "i")
```

### `versionCompare`
Compares two version strings. Returns `0` if equal, a negative number if the left is lower, or a positive number if the left is higher.
```java
version | versionCompare("120.0") >= 0
```
