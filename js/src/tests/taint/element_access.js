function elementAccesstest() {
    var str = randomString();
    var index = rand(0, str.length);
    var taintedIndex = taint(index);

    // Short strings/characters accessd through a tainted index should also be tainted
    // as they could represent lookup tables.

    assertTainted(str[taintedIndex]);
    assertNotTainted(str[index]);

    var chars = str.split('');
    assertTainted(chars[taintedIndex]);
    assertNotTainted(chars[index]);
}

runTaintTest(elementAccesstest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
