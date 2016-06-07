function charAtTest() {
    var str = randomTaintedString();
    var index = rand() % str.length;

    // Basic charAt() test.
    assertTainted(str.charAt(index));

    // There are different code paths used depending on the index type.
    assertTainted(str[index]);
    assertTainted(str[index.toString()]);
    assertTainted(str[{valueOf: function() { return index; }}]);

    // Test other methods that can be used to access single characters.
    assertTainted(str.substr(index, 1));
    assertTainted(str.substring(index, index+1));
    assertTainted(str.slice(index, index+1));
}

runTaintTest(charAtTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
