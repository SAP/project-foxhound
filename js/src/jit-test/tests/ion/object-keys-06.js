load(libdir + 'array-compare.js'); // arraysEqual

// Ion eager fails the test below because we have not yet created any
// Cache IR IC in baseline before running the content of the top-level
// function.
if (getJitCompilerOptions()["ion.warmup.trigger"] <= 100)
    setJitCompilerOption("ion.warmup.trigger", 100);

// This test case checks that we are capable of recovering the Object.keys array
// even if we optimized it away. It also checks that we indeed optimize it away
// as we would expect.

// Prevent GC from cancelling/discarding Ion compilations.
gczeal(0);

function objKeysIterate(obj, expected, i) {
    var keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        assertEq(keys[i], expected[i]);
    }
    assertRecoveredOnBailout(keys, true);
}

function objKeysIterateMutated(obj, expected, i) {
    var keys = Object.keys(obj);
    obj.foo = 42;
    for (let i = 0; i < keys.length; i++) {
        assertEq(keys[i], expected[i]);
    }
    assertRecoveredOnBailout(keys, true);
}

// Prevent compilation of the top-level.
eval(`${arraysEqual}`);
let obj = {a: 0, b: 1, c: 2, d: 3};

for (let i = 0; i < 100; i++) {
    objKeysIterate({...obj}, ["a", "b", "c", "d"], i);
    objKeysIterateMutated({...obj}, ["a", "b", "c", "d"], i);
}
