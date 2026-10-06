// Helper to expand CLDR validity data.
//
// https://unicode.org/reports/tr35/#Validity_Data
function validityData(data) {
  // https://unicode.org/reports/tr35/tr35.html#String_Range
  function stringRange(x, y) {
    assertEq(x.length >= y.length && y.length > 0, true);
    let prefix = x.slice(0, x.length - y.length);
    let suffix = x.slice(-y.length);

    function* g(p, i) {
      if (i < suffix.length) {
        let from = suffix.charCodeAt(i);
        let to = y.charCodeAt(i);
        for (let k = from; k <= to; ++k) {
          yield* g(p + String.fromCharCode(k), i + 1);
        }
      } else {
        yield p;
      }
    }
    return [...g(prefix, 0)];
  }

  let result = [];
  for (let part of data.replace(/\s+/g, " ").trim().split(" ")) {
    let e = part.split("~");
    assertEq(e.length <= 2, true);
    if (e.length === 2) {
      result.push(...stringRange(e[0], e[1]));
    } else {
      result.push(e[0]);
    }
  }
  return result;
}
