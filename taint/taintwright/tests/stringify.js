function test() {
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
