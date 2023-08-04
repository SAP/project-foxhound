function regexpTestString(url) {
    var b = taint(url);
    var r = /#(.*)$/;

    d = r.exec(b);
   
    assertTainted(d[0]);
    assertTainted(d[1]);
    assertTainted(d.input);
}



function regexpTest() {
    var url = "https://www.hello.com/#1234567890aaaaaaaabbbbbbbbccccccccdddddddd"

    regexpTestString("https://www.hello.com/#1234567890");
    regexpTestString("https://www.hello.com/#1234567890aaaaaaaabbbbbbbbccccccccdddddddd");

    regexpTestString(url);

    var url2 = url;
    regexpTestString(url2);

    var url3 = url.substring(0,50)
    regexpTestString(url3)

    regexpTestString(url + "eeeee")
    
}

runTaintTest(regexpTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);

