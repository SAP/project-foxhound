# Automated Tests via Playwright

## Running the tests

`npm run go` runs the tests via playwright and also hosts an express application at `localhost:3000` that can be navigated to in order to execute the tests in ones own browser/foxhound.

## Writing Tests

+ Create a Javascript file in the `tests` directory
+ Write tests (see below for an example)
+ Optional: Create HTML file with the same name
  + Add tags that should be accessible through document.body from the javascript
+ Optional: Add external javascript files you want to include to the `public` directory (e.g. for testing flows through/from external js
+ Add `harness.registerFile("tests/<testFileNameWithoutExtension>", ["external.js"])` in `index.js`

```
TEST("stringify", () => {
    // Ensure location.hash is non-empty
    location.hash = "initial";

    // Source
    let str = location.hash;

    // Create obj to stringify
    let obj = {
        prefix: "test",
        s: str
    }

    // Propagation
    let out = JSON.stringify(obj);

    // Sink
    location.hash = out;
    // Check if value is tainted
    assertIsTainted(out);
    // Check if __taintreport event was fired
    assertSinkHit();
    // Check for equality of taint value
    // Ignores location for simplicity
    assertTaintEqual(out, [
    {
        "begin": 22,
        "end": 30,
        "flow": [
            {"operation": "function"},
            {"operation": "JSON.stringify"},
            {"operation": "location.hash"}
        ]
    }]);
});
```

## How it works

When `harness.registerFile` is called, an express endpoint at `localhost:3000/<fileName>` is created which contains the tests in `<script>` tags in the header and whatever was in the corresponding HTML file in the body. It will also have `<script src="external.js">` tags if the list of external files passed to `registerFile` was nonempty, as well as `<script src="lib.js">` for the test library.

The testing functions like `TEST` and `assertIsTainted` are all defined in `lib.js`.

When visiting one of the enpoints in a browser, the `onload` event of the body will execute the tests and the results are written directory to document.body. When executing via playwright, playwright exposes a binding to the test functions to report the result of each tests back. The taint library also handles the `__taintreport` event, remembering if it was fired during the currently executing test in order for `assertSinkHit` to work, which will reset that flag so that it can be used multiple times in the same test.
