function basicNumberOperationTest() {
    var n = taint(42);
}

runTaintTest(basicNumberOperationTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
