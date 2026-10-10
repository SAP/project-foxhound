// The first taint location recorded in a script source hashes that source,
// which used to allocate. Each evaluate() below is a new source and the subject
// is tainted outside of it, so that hashing happens while the operation is
// built. Sweeping the zeal frequency lands a minor GC on each allocation in
// turn; exec used to crash when it hit the unrooted match string.
var subject = taint("ab12cd");

function RegExpExecGCTaintTest() {
    if (typeof gczeal !== "function" || typeof minorgc !== "function") {
        return;
    }
    for (var k = 1; k <= 40; k++) {
        minorgc();
        gczeal(7, k);
        var m = evaluate("/(a)(b)(\\d+)/.exec(subject)",
                         { fileName: "regexp-exec-gc-" + k + ".js" });
        var json = evaluate("JSON.stringify({ a: subject })",
                            { fileName: "json-stringify-gc-" + k + ".js" });
        gczeal(0);
        assertEq(m[3], "12");
        assertFullTainted(m[0]);
        assertFullTainted(m[3]);
        assertHasTaintOperation(m[3], "RegExp.prototype.exec");
        assertHasTaintOperation(json, "JSON.stringify");
    }
}

RegExpExecGCTaintTest();

if (typeof reportCompare === "function")
    reportCompare(true, true);
