function charAtTest() {
    var str = randomTaintedString();
    var index = rand(0, str.length);

    // Basic charAt() test.
    assertTainted(str.charAt(index));
    assertLastTaintOperationEquals(str.charAt(index), 'charAt');
    assertLastTaintOperationEquals(str.charAt(), 'charAt');
    assertLastTaintOperationEquals(str.charAt(index.toString()), 'charAt');

    // There are different code paths used depending on the index type.
    assertTainted(str[index]);
    assertTainted(str[index.toString()]);

    // Test other methods that can be used to access single characters.
    assertTainted(str.substr(index, 1));
    assertTainted(str.substring(index, index+1));
    assertTainted(str.slice(index, index+1));
}

runTaintTest(charAtTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
