function taintRangeEqual(actual, expected) {
    if(actual.begin != expected.begin ||
        actual.end != expected.end     ||
        actual.flow.length != expected.flow.length)
        return false;
    return actual.flow.every((flow, idx) => {
        let other = expected.flow[idx];
        return flow.operation === other.operation;
    });
}

function taintEqual(actual, expected) {
    if(actual.length != expected.length)
        return false;
    return actual.every((range, idx) => {
        let other = expected[idx];
        return taintRangeEqual(range, other);
    });
}

function taintFromList(ranges) {
    return ranges.map(range => {
        return {
            begin: range.begin,
            end: range.end,
            flow: range.flow.map(str => {
                return {operation: str};
            })
        };
    });

}
// Helpers
function print(msg) {
    console.log(msg);
    // TODO, can be simplified once .innerText works correctly with taint
    document.body.appendChild(document.createTextNode(msg));
    document.body.appendChild(document.createElement("br"));
}

var success = false;
var sinkHit = false;
var lastRecordedString = "";
function __taint_report_listener(details) {
    sinkHit = true;
    lastRecordedString = details.str;
}

/*
function runTests(tests) {
    let successes = 0;
    for(const { f, expected } of tests) {
        success = false;
        window.addEventListener("__taintreport", (r) => { __taint_report_listener(r.detail.str.taint, expected)});
        f();
        if(success) {
            print(`[+] ${f.name}`);
            successes += 1;
        } else {
            print(`[-] ${f.name}`);
        }
    }
    print(`${successes}/${tests.length} Tests passed.`);
}
*/

const testFunctions = [];

function TEST(name, func) {
    testFunctions.push([name, () => {
        success = true;
        func();
    }]);
}

function assertIsTainted(str, name) {
    if(str.taint.length == 0) {
        console.log(`[${name}] String ${str} was expected to be tainted but isn't.`);
        success = false;
    }
}

function assertTaintEqual(str, taint) {
    // Modify expected value to include assertTaintEqual call
    taint.forEach((range) => range.flow.splice(0, 0, {"operation": "function"}));
    if(!taintEqual(str.taint, taint)) {
        console.log(`Wrong taint value of string "${str}".`);
        console.log(`Expected: ${JSON.stringify(taint)}`);
        console.log(`Actual: ${JSON.stringify(str.taint)}`);
        success = false;
    }
}

function assertSinkHit(expected) {
    if(!sinkHit) {
        console.log("No tainted values arrived at a taint sink.");
        success = false;
    } else if(expected) {
        assertTaintEqual(lastRecordedString);
    }
    sinkHit = false;
}

function exec() {
    testResults = [];
    let successes = 0;

    window.addEventListener("__taintreport", (r) => { __taint_report_listener(r.detail) });
    for(const [name, func] of testFunctions) {
        func();
        sinkHit = false;
        if(success) {
            print(`[+] ${name}`);
            successes += 1;
        } else {
            print(`[-] ${name}`);
        }
        testResults.push(name, success);
        // If executing in playwright context, report the results
        if(window.__report_tainttest_result) {
            __report_tainttest_result(name, success);
        }
    }
    print(`${successes}/${testFunctions.length} tests have succeeded.`);
    // Give results to playwright via event
    return successes === testFunctions.length;
}
