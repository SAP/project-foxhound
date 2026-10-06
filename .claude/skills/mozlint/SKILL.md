---
description: You MUST use this skill when working with Firefox's linting infrastructure (mozlint), adding new linters, modifying existing linters, running linters, or dealing with linting issues.
---


## Overview
Firefox's linting infrastructure (mozlint) provides a unified way to run various linters across the codebase. It integrates multiple linters including ESLint, Stylelint, ruff, clippy, clang-format, and many others.

## Workflow
- Run `./mach lint` without arguments to lint all modified files in your working directory
- Run `./mach lint --fix` to automatically fix issues where possible
- Run `./mach lint <path>` to lint specific files or directories
- Run `./mach lint --list` to see all available linters
- Run `./mach lint --linter <name>` to run a specific linter (e.g., `./mach lint --linter eslint`)
- Use `./mach lint --outgoing` to lint only outgoing changes (useful before pushing)
- Use `./mach lint --rev <rev>` to lint changes in a specific revision
- Use `./mach lint --warnings` to also show warnings, not just errors

### Python linters
Python-based linters are the right choice when the linter primarily calls external programs (e.g., eslint, ruff, clang-format) or needs complex Python library integrations. They use types like `external`, `string`, `regex`, `structured_log`, or `global`, with a `payload` of the form `module:function`.

## Adding New Linters
See `docs/code-quality/lint/create.rst` for the full guide on creating a new linter.

- Linter configurations are in `tools/lint/` directory
- Each linter has a YAML configuration file (e.g., `tools/lint/eslint.yml`, `tools/lint/ruff.yml`). Adding the YAML file is what registers the linter with mozlint.
- Python-based linters are typically in `tools/lint/python/`
- To add a new linter:
  1. Create a YAML configuration in `tools/lint/`
  2. If it's a custom linter, implement the Python module in `tools/lint/python/`
  3. Add tests in `tools/lint/test/`
- To run the full mozlint test suite (slow): `./mach python-test --subsuite mozlint --run-slow`
- To run a single mozlint test: `./mach python-test --subsuite mozlint <test_name>`

## Common Linters
- **eslint**: JavaScript and JSX linting
- **stylelint**: CSS and related files linting
- **ruff**: Python linting and formatting
- **clippy**: Rust linting
- **clang-format**: C/C++ code formatting
- **prettier**: JavaScript/JSON/YAML formatting
- **shellcheck**: Shell script linting
- **yamllint**: YAML file linting
- **rstcheck**: reStructuredText linting
- **license**: License header checking

## Configuration Files
- ESLint: `eslint.config.mjs`
- Stylelint: `.stylelintrc.js`, `.stylelintignore`
- Ruff: `pyproject.toml`
- Prettier: `.prettierrc.js`, `.prettierignore`
- List of third party code: `tools/rewriting/ThirdPartyPaths.txt`

## Tips
- Use `./mach lint --verbose` for more detailed output when debugging linter issues
- Check `docs/code-quality/lint/` for documentation on specific linters
- Some linters may require additional setup (e.g., node modules for ESLint)
- Run `./mach bootstrap` if linters are missing dependencies
- To exclude files from linting, use the appropriate ignore file or add exclusions in the linter's YAML config
