# Automated Tests via Playwright

The tests are located in the aptly named directory.
 
Run `npm run go` to execute the tests. The tests will be executed both by playwright and will be hosted at `localhost:3000`. On navigating to that address the tests will execute and the results will be written to the document. Under `localhost:3000/{testName}` you can execute single test files independently.

The framework consists mainly of the harness class, which manages the list of test files, creates the endpoints for the API and executes the tests with playwright.

Currently, to register a new test file, use the function `harness.registerFile(path)`, as shown in `index.js`. The `index.js` file is the entry point of the node project.

Each javascript test file can contain multiple tests, the following snippet demonstrates how to write a test:

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

In addition to the js file containing the tests, a second file with the same name, but a `.html` extension, you can specify the body of the page that is constructed. The content of this file is simply written in between the `<body>` tags of the document.

