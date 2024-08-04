function taintSwitchCaseTest() {

    let tableSwitchOptimized = 1;
    let tableSwitchOptimizedTainted = Number.tainted(tableSwitchOptimized);

    switch (tableSwitchOptimizedTainted) {
        case tableSwitchOptimized:
            break;
        default:
            throw new Error("Taints should not be propagated in optimized switch cases");
    }

    let tableSwitchUnoptimized = 123456789;
    let tableSwitchUnoptimizedTainted = Number.tainted(tableSwitchUnoptimized);

    switch (tableSwitchUnoptimizedTainted) {
        case tableSwitchUnoptimized:
            break;
        default:
            throw new Error("Taints should not be propagated in optimized switch cases");
    }
}

runTaintTest(taintSwitchCaseTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);

