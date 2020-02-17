// Helpers
function print(msg) {
    console.log(msg);
    // TODO, can be simplified once .innerText works correctly with taint
    document.body.appendChild(document.createTextNode(msg));
    document.body.appendChild(document.createElement("br"));
}

function isTainted(str) {
    return str.taint.length > 0;
}

// Test 1: check HTML tainting
function htmlTaintTest() {
    return isTainted(document.body.textContent);
}

// Test 2: Check inline script tainting
function inlineScriptTaintTest() {
    return isTainted(inline_js_string);
}

// Test 3: Check external script tainting
function externalScriptTaintTest() {
    return isTainted(external_js_string);
}


// Test 4: Check XMLHttpRequest tainting
function xhrTaintTest() {
    xhr = new XMLHttpRequest();
    xhr.open("GET", "/xhrme.txt", false);
    xhr.send();
    return isTainted(xhr.responseText);
}


var tests = [htmlTaintTest, inlineScriptTaintTest, externalScriptTaintTest, xhrTaintTest];

function runTests() {
    successes = 0;
    for (var i = 0; i < tests.length; i++) {
        var test = tests[i];
        var success = test();
        if (!success) {
            print("[-] " + test.name + " failed!");
        } else {
            print("[+] " + test.name + " succeeded!");
        }
        successes += success;
    }
    print(successes + "/" + tests.length + " tests succeeded");
}
