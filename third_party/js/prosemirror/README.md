# ProseMirror vendoring

This directory vendors a ProseMirror bundle. Individual ProseMirror packages are vendored into subfolders. The bundle is built by Rollup from the entry point in `bundle_entry.mjs` and exported via `moz.build`.

## Updating the bundle

### Using moz.sh

To vendor all packages and rebuild the bundle at once you can run:

```bash
./third_party/js/prosemirror/moz.sh [--mach-vendor-flags]
```

`--mach-vendor-flags`: Any `mach vendor` flags (like `--ignore-modified`, `--force`, etc.) will be passed along to each vendoring operation.

The script:
- Vendors the root `moz.yaml` (only fetches a LICENSE file)
- Vendors each `prosemirror-*/moz.yaml` in turn with `--ignore-modified` to handle spurious changes
- Rebuild the bundle by running `make_bundle.sh`

### Manual options

1. Per-package vendoring: `mach vendor third_party/js/prosemirror/prosemirror-*/moz.yaml`
2. Bundle only: Run `./third_party/js/prosemirror/moz.sh`

After vendoring, commit the updated files.

## Development notes

- If you need a bundle that is not minified for stack traces during development you can generate one with `npm run build:dev`.
- Individual package metadata and sources live under `third_party/js/prosemirror/prosemirror-*` with separate `moz.yaml` files. The bundle consumes these via `file:` dependencies in `package.json`.
