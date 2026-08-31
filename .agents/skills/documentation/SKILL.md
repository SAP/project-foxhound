---
description: Use this skill when working with Firefox documentation,
  including building documentation with `./mach doc`,
  fixing Sphinx build errors or warnings, modifying existing
  documentation, or adding new docs.
---

## Overview

Firefox documentation is built using **Sphinx**
through the `./mach doc` command. Documentation sources are distributed
throughout the repository and can be written in **reStructuredText
(`.rst`)** or **Markdown (`.md`)**.

The documentation system integrates:

-   Sphinx
-   MyST parser (for Markdown support, with colon fences, definition lists, field lists, and HTML admonitions enabled)
-   custom Mozilla tooling in `tools/moztreedocs/` and `docs/`

Documentation builds into static HTML that is published to **Firefox
Source Docs**.

## Core Principles

-   Always reproduce documentation issues **locally first** using
    `./mach doc --no-serve --no-open`.
-   Treat warnings seriously; they often indicate real navigation or
    reference problems.
-   Prefer **small targeted builds** while debugging.
-   Ensure new documentation is **reachable through a toctree**.
-   Keep documentation **close to the code it describes** when possible.

## Recommended Workflow

### 1. Reproduce the issue locally

Start by building the documentation locally. Redirect output to a file
rather than piping through `tail`/`grep`, since builds can be slow:

    ./mach doc --no-serve --no-open > /tmp/doc_build.txt 2>&1

Common commands:

-   `./mach doc --no-serve --no-open` -- build entire tree
-   `./mach doc <path> --no-serve --no-open` -- build a specific component (much faster)
-   `./mach doc <path>` -- build and serve with livereload for iterative writing

Useful flags:

-   `--no-autodoc` -- skip Python/JS API generation for faster builds
-   `--verbose` -- run Sphinx in verbose mode for debugging
-   `--disable-warnings-check` -- ignore unexpected warnings during local development
-   `--linkcheck` -- validate all links in the documentation
-   `-j JOBS` -- control parallel build jobs (defaults to CPU count)

Documentation output is generated under:

    obj-*/docs/html/

When debugging, prefer building only the relevant component instead of
rebuilding everything.

### 2. Identify the type of Sphinx problem

Most documentation build issues fall into these categories:

-   navigation problems (toctree)
-   broken references
-   duplicate labels
-   include directive errors
-   autodoc import failures
-   uncategorized documentation (missing from `docs/config.yml`)
-   configuration issues

The build output from `./mach doc` will normally indicate the failing
file and line. If the build crashes, Sphinx writes backtraces to
`/tmp/sphinx-err-*` files.

Always start by inspecting the referenced file and directive.

## Documentation Layout

Key locations:

Main documentation root:

    docs/

Component documentation often lives near the code, for example:

    devtools/docs/
    toolkit/docs/
    browser/docs/

Important configuration files:

-   `docs/config.yml` -- categories, allowed warnings, redirects, JS source paths
-   `docs/conf.py` -- Sphinx configuration (extensions, theme, MyST settings)

Custom Mozilla Sphinx integration:

    tools/moztreedocs/

### How documentation is discovered

The build system discovers documentation directories via `SPHINX_TREES`
variables in `moz.build` files. When adding documentation in a new
location, you must add a `SPHINX_TREES` entry in the relevant `moz.build`.

## Configuration: `docs/config.yml`

This file controls several critical aspects of the documentation build:

-   **`categories`**: Every documentation path must be assigned to a
    category. If a new doc path is not categorized here, the build fails
    with an "Uncategorized documentation" error.
-   **`allowed_warnings`**: Regex patterns for known/acceptable Sphinx
    warnings. Warnings matching these patterns are logged as "KNOWN"
    instead of causing build failures.
-   **`redirects`**: URL redirects for backward compatibility when
    documentation moves. Format: `old/path: new/path`.
-   **`js_source_paths`**: Directories where JSDoc generation is enabled
    (tree-wide JSDoc does not work).

## Adding New Documentation

Typical process:

1.  Create a `.rst` or `.md` file in the appropriate directory. Prefer Markdown.
2.  Add the document to a parent `toctree`.
3.  Add the documentation path to the appropriate category in `docs/config.yml`.
4.  If adding docs in a new directory, ensure `SPHINX_TREES` is set in the
    relevant `moz.build` file.
5.  Follow the structure used by neighboring documentation.
6.  Build locally with:

        ./mach doc <path> --no-serve --no-open

7.  Resolve warnings before landing the change.

If the page does not appear in the generated navigation, verify that it
is included in a toctree.

When moving documentation to a new URL, add an entry to the `redirects`
section of `docs/config.yml` so old links continue to work.

## Best Practices

-   Always build documentation locally before pushing.
-   Resolve warnings before landing documentation changes.
-   Keep documentation near the code it describes when appropriate.
-   Prefer `literalinclude` for code examples instead of copying code.
-   When debugging large documentation changes, build only the affected
    component.
-   Use `--no-autodoc` for faster iteration when not working on API docs.
-   If a new warning appears that is expected/acceptable, add a pattern
    to `allowed_warnings` in `docs/config.yml`.
