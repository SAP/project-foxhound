# kotlin-test

## Status

Accepted

## Context

`kotlin-test` is a core Kotlin library, mostly providing idiomatic Kotlin assertion functions,
and we weren't using it in our tests.

## Decision

Introduce a dependency on `kotlin-test` in unit and Android test source sets across Fenix, Focus,
Android Components and GeckoView. Encourage using its affordances. Start transitioning existing
JUnit usages to `kotlin-test` with the expectation to transition to using it more in the future.

## Consequences

`kotlin-test` adds about 17 new functions (mostly assertions) and 6 annotations on top of JUnit.
Their advantages include:

* idiomatic Kotlin API,
* improved compiler/IDE code analysis (smart casts, dead code detection),
* improved failure messages.

## See also

* [1-pager](https://docs.google.com/document/d/1JiVV1Ayhdsjk1ocaZ8Bfq5kJAfC4ft20nvdcQ8m67A4/edit?usp=sharing)
