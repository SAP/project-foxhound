function evalPropagationTest() {
    var charset = defaultCharset.replace('"', '').replace('\\', '').replace('\n', '');
    var str = multiTaint(randomString(0, charset));
    print("orig: " + str);
    print("orig taint: " + stringifyTaint(str.taint));
    var code = 'var s = "' + str + '";';
    eval(code);
    print("new: " + s);
    print("new taint: " + stringifyTaint(s.taint));
    assertEqualTaint(s, str);
}

runTaintTest(evalPropagationTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
