---
name: specmap
description: Map relationships between a web spec section, its Firefox implementation code, and Web Platform Tests. Use when starting work on a spec feature, checking implementation coverage, or finding which WPTs to enable.
argument-hint: "[spec-url-or-fragment] [optional: specific-algorithm]"
allowed-tools:
  - Bash(searchfox-cli:*)
  - Bash(curl:*)
  - Bash(jq:*)
  - Read
  - Grep
  - Glob
  - WebFetch(domain:*.csswg.org)
  - WebFetch(domain:*.whatwg.org)
  - WebFetch(domain:w3.org)
  - WebFetch(domain:wicg.github.io)
  - WebFetch(domain:w3c.github.io)
---

# SpecMap: Spec-Code-WPT Mapping

**Spec URL or fragment**: $0
**Specific algorithm** (optional): $1

## Step 1: Identify the Spec Target and Fetch Webref Data

Parse the input to determine the spec domain, fragment identifier, and spec
shortname. If only a feature name is given, use the webref index to find it:

```bash
curl -s "https://w3c.github.io/webref/ed/index.json" | jq '.results[] | select(.url | test("DOMAIN_OR_KEYWORD")) | {shortname, url, title, dfns, algorithms, idl}'
```

Common shortname mappings: `dom.spec.whatwg.org` -> `dom`, `html.spec.whatwg.org`
-> `html`, `drafts.csswg.org/css-grid-1/` -> `css-grid-1`.

Then fetch structured extracts using the shortname:

```bash
# Algorithm steps (pre-parsed with names, hrefs, and step text)
curl -s "https://w3c.github.io/webref/ed/algorithms/SHORTNAME.json" | jq '.algorithms[] | select(.href | test("FRAGMENT"))'

# Definitions (fragment IDs -> linking text, types, headings)
curl -s "https://w3c.github.io/webref/ed/dfns/SHORTNAME.json" | jq '.dfns[] | select(.id == "FRAGMENT" or (.linkingText[] | test("TERM"; "i")))'

# WebIDL extract
curl -s "https://w3c.github.io/webref/ed/idl/SHORTNAME.idl"
```

Not all specs have all extracts. If the algorithms extract is absent, fall back to
fetching the spec section page directly via WebFetch.

## Step 2: Query Searchfox for References

Use `searchfox-cli` to find files referencing the spec section, split by file type:

```bash
# Implementation code (excludes test and generated files)
searchfox-cli -q "DOMAIN.*#FRAGMENT" --only-normal -l 200
searchfox-cli -q "#FRAGMENT" --only-normal --path "dom\|html\|layout\|widget" -l 200
searchfox-cli --id InterfaceName --only-normal -l 100

# Test files only
searchfox-cli -q "DOMAIN.*#FRAGMENT" --only-tests -l 200
searchfox-cli -q "#FRAGMENT" --only-tests -l 200
```

If results are sparse, try alternative fragment spellings or the IDL interface/method
name from the webref IDL extract. If results are too broad, narrow with `--path`.

## Step 3: Analyze Gaps

Cross-reference the webref algorithm steps from Step 1 against the searchfox
results from Step 2 to identify:
- Spec steps with no corresponding implementation code
- Spec steps with implementation but no test coverage in WPT
- WPT tests that are currently failing or disabled

WPT is the preferred test location for web platform features. Do NOT flag the
absence of Mozilla-specific tests (mochitest, browser-chrome, etc.) as a gap when
there is adequate WPT coverage. Mozilla tests are only expected for
Firefox-specific behavior that WPT cannot cover (e.g. chrome-privileged APIs,
internal pref gating, process architecture).

To check WPT status, look for `.ini` expectation files using dedicated tools
(avoid bash loops which trigger permission prompts):

1. Use Glob to find `.ini` files: `testing/web-platform/meta/PATH/*.ini`
2. For each `.ini` file found, use Grep with `output_mode: "count"` to count
   `expected:` and `disabled:` lines.

No `.ini` file means the test fully passes. An `.ini` with `disabled:` lines means
skipped tests. Count `expected:` lines for the number of non-default expectations.

## Step 4: Present the Map

Output a structured report:

```
## SpecMap: [Feature Name]
Spec: [full spec URL with fragment]

### Implementation Code
| File | Function/Class | Line | Notes |
|------|---------------|------|-------|
| dom/Foo.cpp | Foo::Bar() | 123 | Step 4 of algorithm |

### Web Platform Tests
| Test File | Status | Tests |
|-----------|--------|-------|
| .../feature.html | PASS (no .ini) | 12 subtests |
| .../feature-edge.html | PARTIAL (.ini has 3 expected fails) | 8 subtests |

### Mozilla Tests
| Test File | Type | Notes |
|-----------|------|-------|
| dom/tests/mochitest/test_feature.html | mochitest | ... |

### Coverage Summary
- Spec steps with implementation: N/M
- WPT files found: N (K passing, J partial, L failing)
- Gaps: [list spec steps or areas with no code or test coverage]
```

Split test results: files under `testing/web-platform/` are WPT, other test files
are Mozilla tests (mochitest, browser-chrome, xpcshell).

## Step 5: Offer to Add Missing References

If implementation code lacks a spec URL comment or step annotations, offer to add
them. Ask for confirmation before making edits. Examples:

- `// https://spec.example.org/#section` at the top of an implementing function
- `// Step N.` comments for algorithm implementations
- Spec URL references in `.webidl` files next to interface/method definitions

## Tips

- WHATWG fragments follow patterns: `#dom-interface-method`, `#the-element-name-element`, `#concept-name`
- Firefox code references specs as `// https://html.spec.whatwg.org/#fragment` or `// Step N of https://...`
