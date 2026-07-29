# Newtab Development

## Documentation
- Newtab source docs: https://firefox-source-docs.mozilla.org/browser/extensions/newtab/docs/index.html
- Design system tokens: https://firefoxux.github.io/firefox-desktop-components/ (visual reference), or locally: `toolkit/themes/shared/design-system/dist/tokens-shared.css`

## File Locations
Most of the code should be located in `browser/extensions/newtab`
- React components: `browser/extensions/newtab/content-src/components/`
- Styles (SCSS): `browser/extensions/newtab/content-src/styles/` (global) and alongside components
- Backend feeds: `browser/extensions/newtab/lib/*Feed.sys.mjs`
- Redux actions: `browser/extensions/newtab/common/Actions.mjs`
- Redux reducers: `browser/extensions/newtab/common/Reducers.sys.mjs`
- Tests: `browser/extensions/newtab/test/unit/` (matches source structure)

## Redux Patterns
- Action types defined in `common/Actions.mjs` with enum pattern
- Action creators use utility functions (ac.AlsoToMain, ac.OnlyToContent, etc.)
- Components connect via react-redux `connect()` and functional components connect with the `useSelector()` hook from `react-redux`
- Message routing between main/content processes via action metadata (to/from properties)
- Always dispatch actions, never mutate state directly

## Development Workflow
- Source files: Edit `.jsx`, `.js`, and `.scss` files in `browser/extensions/newtab/content-src/`
- Build (front-end only): `./mach build faster` skips C++/Rust compilation — use this for front-end-only changes
- Bundle only: `./mach newtab bundle` bundles and copies to `browser/components/newtab/` but does NOT complete the build; follow with `./mach build` or `./mach build faster`
- Watch mode: `./mach newtab watch` for auto-building (invokes npm run watchmc and mach watch)
- After making code changes: format with `./mach format path/to/file`, lint with `./mach lint --fix path/to/file`, then build

## Build Output
- Webpack bundles to: `data/content/activity-stream.bundle.js`
- Sass compiles to: `css/activity-stream.css`
- Pre-rendered HTML: `prerendered/activity-stream.html`
- Final package copied to `browser/components/newtab/` by mach

## Testing
- Test framework: Karma + Enzyme + Sinon
- Run unit tests: `./mach test browser/components/newtab/test/xpcshell && ./mach npm test --prefix=browser/extensions/newtab`
- Run browser (mochi) tests: `./mach test browser/components/newtab/test/browser` — you probably want to run with `--headless`
- Unit Test files mirror source structure: `test/unit/content-src/components/Card/Card.test.js`
- Use test utilities from `test/unit/utils.js` for mocks (FakePrefs, GlobalOverrider, etc.)

## Train-Hopping Compatibility

The newtab extension can ship updates independently of the Firefox release train ("train-hopping") via XPI. This has compatibility implications:

- **Trainhoppable**: Only code under `browser/extensions/newtab/` is packaged into the XPI and can train-hop
- **Not trainhoppable**: Code in `browser/components/newtab/` always rides the release train (e.g. `AboutNewTabResourceMapping.sys.mjs`) — changes here cannot be ship-fixed via XPI
- **External dependencies**: If newtab code depends on platform changes outside `browser/extensions/newtab/` (imported modules, DOM APIs, Nimbus feature definitions), those changes are only available once they reach the Release channel

When a change requires a shim for backward compatibility, mark it with:
```js
/**
 * @backward-compat { version 143 }
 * Explanation of what breaks on older versions and what this shim does.
 */
```
The version is when the workaround can be removed (once that Firefox version hits Release). Remove shims once the version reaches Release.

**Practical rules:**
- Avoid depending on new platform APIs or module paths until they are in Release
- New Nimbus feature definitions in `FeatureManifest.yaml` require defensive coding on older channels
- If you must depend on an external change, add a `@backward-compat` comment and plan the removal
- The `newtabTrainhop` escape hatch in `AboutNewTabChild.sys.mjs` allows overriding the XPI-bundled content with a locally-built version for testing train-hop changes before they ship

## Nova CSS
- Nova-specific CSS must be scoped under `.nova-enabled` — the CSS file switcher has been removed. Flag any nova styles not behind this class.

## Glean Metrics

- Metric definitions live in `browser/components/newtab/metrics.yaml` and `browser/components/newtab/pings.yaml`.
- **Pings**: Newtab uses two pings:
  - `newtab` — session-level data, sent on `newtab_session_end` or `component_init`
  - `newtab-content` — private instrumentation sent over OHTTP without a client ID
- **Schema changes are not trainhoppable** — renaming, removing, or changing the type of an existing metric rides the release train and cannot be ship-fixed via XPI
- Glean supports runtime registration (new metrics). Whenever you touch either file, generate and commit the channel diff files:
  - `./mach newtab channel-metrics-diff --channel beta`
  - `./mach newtab channel-metrics-diff --channel release`
- This writes `runtime-metrics-N.json` files to `browser/extensions/newtab/webext-glue/metrics/`. Delete any files for versions no longer supported on the Release channel.

---

## Configuration Files
- `webpack.system-addon.config.js` - Webpack bundling config
- `karma.mc.config.js` - Test runner with coverage thresholds
- `yamscripts.yml` - npm script definitions (compile with `npm run yamscripts`)
- `.eslintrc.mjs` - ESLint configuration
