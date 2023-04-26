function stringify() {
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
}

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
    assertIsTainted(out);
    assertSinkHit();
    //assertIsTainted
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
