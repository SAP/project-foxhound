function JSONTaintTest() {
    var str = randomMultiTaintedString();

    var stringifiedStr = JSON.stringify(str);
    assertEq(stringifiedStr.taint.length, str.taint.length);
    assertLastTaintOperationEquals(stringifiedStr, 'JSON.stringify');

    var parsedStr = JSON.parse(stringifiedStr);
    assertEq(str, parsedStr);
    assertEqualTaint(str, parsedStr);
    assertLastTaintOperationEquals(parsedStr, 'JSON.parse');

    var t = String.tainted("hello");
    var stringifiedTaint = JSON.stringify({ "name": t });
    assertEq(stringifiedTaint, "{\"name\":\"hello\"}");
    assertRangeTainted(stringifiedTaint, [9, 14]);

    parsedStr = JSON.parse(stringifiedTaint);
    var hello = parsedStr.name;
    assertEq(hello, "hello");
    assertFullTainted(hello);
    assertLastTaintOperationEquals(hello, 'JSON.parse');

    // From here: https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
    var jsonString = `
      { "store": {
        "book": [
          { "category": "reference",
            "author": "Nigel Rees",
            "title": "Sayings of the Century",
            "price": 8.95
          },
          { "category": "fiction",
            "author": "Evelyn Waugh",
            "title": "Sword of Honour",
            "price": 12.99
          },
          { "category": "fiction",
            "author": "Herman Melville",
            "title": "Moby Dick",
            "isbn": "0-553-21311-3",
            "price": 8.99
          },
          { "category": "fiction",
            "author": "J. R. R. Tolkien",
            "title": "The Lord of the Rings",
            "isbn": "0-395-19395-8",
            "price": 22.99
          }
        ],
        "bicycle": {
          "color": "red",
          "price": 19.95
        }
      }
    }
  `;
  t = String.tainted(jsonString);
  var o = JSON.parse(t);
  cat = o.store.book[1].category;
  assertEq(cat.taint[0].flow[0].arguments[0], "$.store.book[1].category");
  assertEq(cat, "fiction");
  assertFullTainted(cat);
  assertLastTaintOperationEquals(cat, 'JSON.parse');


}

runTaintTest(JSONTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
