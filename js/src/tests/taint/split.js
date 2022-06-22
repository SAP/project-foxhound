function strSplitTest() {
    var a = 'Hello ';
    var b = taint('tainted');
    var c = ' World!';
    var str = a + b + c;

    // Test basic string splitting
    var parts = str.split(' ');
    assertLastTaintOperationEquals(parts[1], "split");
    assertEqualTaint(parts[1], b);
    assertNotHasTaintOperation(str, 'split');
}

function strSplitTestArray() {
    var a = 'Hello ';
    var b = taint('tainted');
    var c = ' World!';
    var str = a + b + c;

    // Test splitting into character array
    var parts = str.split('');
    assertLastTaintOperationEquals(parts[6], "split");
    assertEqualTaint(parts[6], b[0]);
    assertNotHasTaintOperation(str, 'split');
}

function strSplitTestRegex() {
    var a = 'Hello ';
    var b = taint('tainted');
    var c = ' World!';
    var str = a + b + c;

    // Test regex string splitting
    parts = str.split(/\s/);
    assertEqualTaint(parts[1], b);
    assertNotHasTaintOperation(str, 'split');
}

runTaintTest(strSplitTest);
runTaintTest(strSplitTestArray);
runTaintTest(strSplitTestRegex);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
