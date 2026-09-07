// |jit-test| --enable-legacy-regexp
function testLegacyFeaturesEnabled(re, str) {
    for (let i = 0; i < 100; i++){
        re.test(str);
    }
}

{
    class MyRegExp extends RegExp {}
    
    var re1 = /a(b)c/;
    testLegacyFeaturesEnabled(re1, "abc");
    assertEq(RegExp.$1, "b");

    var re2 = new MyRegExp("d(e)f");
    testLegacyFeaturesEnabled(re2, "def");
    
    var threw = false;
    try {
        RegExp.$1;
    } catch(e) {
        threw = true;
        assertEq(e instanceof TypeError, true);
    }
}

{
    var other = newGlobal();
    other.eval("var re = /x(y)z/;");

    var re = other.re;
    testLegacyFeaturesEnabled(re, "xyz");

    var threw = false;
    try {
        RegExp.$1;
    } catch(e) {
        threw = true;
        assertEq(e instanceof TypeError, true);
    }

    assertEq(threw, true);
}
