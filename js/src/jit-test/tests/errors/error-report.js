{
    // Plain-old Error object
    let error = new Error("foobar");

    let report = createErrorReport(error);
    assertEq(report.toStringResult, "Error: foobar");
    assertEq(report.name, "Error");
    assertEq(report.message, "foobar");
}

{
    // Error object with overwritten properties
    let error = new Error("foobar");
    error.name = "MyError";
    error.message = "here";

    let report = createErrorReport(error);
    assertEq(report.toStringResult, "MyError: here");
    assertEq(report.name, "Error");
    assertEq(report.message, "here");
}

{
    // Plain object, which doesn't quack (enough) like an Error
    let obj = {name: "foo", message: "bar"};

    let report = createErrorReport(obj);
    assertEq(report.toStringResult, "uncaught exception: [object Object]");
    assertEq(report.name, "");
    assertEq(report.message, "uncaught exception: [object Object]");
}

{
    setPrefValue("ducktyped_errors", false);
    // Duck-typed error object (when not supported)
    let obj = {name: "foo", message: "bar", fileName: "test", lineNumber: 0};

    let report = createErrorReport(obj);
    assertEq(report.toStringResult, "uncaught exception: [object Object]");
    assertEq(report.name, "");
    assertEq(report.message, "uncaught exception: [object Object]");
}

{
    setPrefValue("ducktyped_errors", true);
    // Duck-typed error object (when supported)
    let obj = {name: "foo", message: "bar", fileName: "test", lineNumber: 0};

    let report = createErrorReport(obj);
    assertEq(report.toStringResult, "foo: bar");
    assertEq(report.name, "");
    assertEq(report.message, "foo: bar");
}

{
    // toString failure
    let obj = {toString() { throw "haha"; }};

    let report = createErrorReport(obj);
    assertEq(report.toStringResult, "uncaught exception: unknown (can't convert to string)");
    assertEq(report.name, "");
    assertEq(report.message, "uncaught exception: unknown (can't convert to string)");
}
