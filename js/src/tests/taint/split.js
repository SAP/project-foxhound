function strSplitTest() {
    var a = 'Hello ';
    var b = taint('tainted');
    var c = ' World!';
    var str = a + b + c;

    // Test basic string splitting
    var parts = str.split(' ');
    assertEqualTaint(parts[1], b);
    assertLastTaintOperationEquals(parts[1], "split");

    // Test splitting into character array
    var parts = str.split('');
    assertEqualTaint(parts[6], b[0]);
    assertLastTaintOperationEquals(parts[6], "split");

    // Test regex string splitting
    parts = str.split(/\s/);
    assertEqualTaint(parts[1], b);
}

runTaintTest(strSplitTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
