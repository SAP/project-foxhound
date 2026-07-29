# rumdl

[rumdl](https://github.com/rvben/rumdl) is a fast Markdown linter and formatter
written in Rust. It is a drop-in replacement for markdownlint and ships with
71 rules covering Markdown style and consistency.

## Run Locally

The mozlint integration of [`rumdl`](https://github.com/rvben/rumdl) can be run using [`mach`](https://firefox-source-docs.mozilla.org/mach/):

```{eval-rst}
.. parsed-literal::

    $ mach lint --linter rumdl <file paths>
```

## Configuration

Rules are configured in {searchfox}`tools/lint/rumdl.toml <tools/lint/rumdl.toml>`.
To enable rumdl on a new directory, add the path to the `include` section in
{searchfox}`rumdl.yml <tools/lint/rumdl.yml>`.

## Autofix

rumdl supports automatic fixing via the upstream `--fix` flag. Pass `--fix`
to `mach lint` to apply fixes:

```
$ mach lint --linter rumdl --fix <file paths>
```

## Sources

- {searchfox}`Configuration (YAML) <tools/lint/rumdl.yml>`
- {searchfox}`Source <tools/lint/python/rumdl.py>`
