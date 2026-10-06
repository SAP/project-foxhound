// |jit-test| --setpref=experimental.capture_oom_stack_trace=true; skip-if: !this.hasOwnProperty("getLastOOMStackTrace")

function assertCapturesOOMStackTrace(f, lineNo) {
    // Clear any existing trace
    var initialTrace = getLastOOMStackTrace();
    assertEq(initialTrace, null);

    try {
        f();
        assertEq(true, false, "Expected an OOM exception");
    } catch (e) {
        print("✓ Exception caught: " + e);

        // Check for captured stack trace
        var finalTrace = getLastOOMStackTrace();
        assertEq(finalTrace !== null, true, "Expected a stack trace after OOM");

        print(finalTrace);

        // Detailed analysis
        var lines = finalTrace.split('\n');
        let re = new RegExp("#0.*test_oom_comprehensive\.js:" + lineNo)
        assertEq(re.test(lines[0]), true, "Missing innermost frame");
    }
}

// Interpreter captures innermost frame
assertCapturesOOMStackTrace(function () {
    function deepFunction() {
        function evenDeeper() {
            throwOutOfMemory();
        }
        evenDeeper();
    }
    deepFunction();
}, 31);

if (getJitCompilerOptions()['baseline.enable']){
    // JITs capture innermost frame
    assertCapturesOOMStackTrace(function () {
        function deepFunction(shouldOOM) {
            function evenDeeper() {
                if (shouldOOM) {
                    assertEq(inJit(), true, "Should be JIT-compiled");
                    throwOutOfMemory();
                }
            }
            evenDeeper();
        }
        const MAX = 150;
        for (let i = 0; i < MAX; i++) {
            deepFunction(i >= MAX - 1);
        }
    }, 45);
}
