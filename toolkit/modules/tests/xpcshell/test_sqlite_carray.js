/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// head.js provides: Sqlite, do_get_profile

function getConnection(dbName) {
  return Sqlite.openConnection({ path: dbName + ".sqlite" });
}

async function getDummyDatabase(name) {
  let c = await getConnection(name);
  await c.execute(
    "CREATE TABLE dirs (id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT)"
  );
  return c;
}

add_task(async function test_carray_binding() {
  let c = await getDummyDatabase("carray_binding");
  await c.execute("INSERT INTO dirs VALUES (1, 'foo')");
  await c.execute("INSERT INTO dirs VALUES (2, 'bar')");
  await c.execute("INSERT INTO dirs VALUES (3, 'baz')");

  // Named integer array.
  let rows = await c.execute(
    "SELECT path FROM dirs WHERE id IN carray(:ids) ORDER BY id",
    { ids: [1, 3] }
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("path")),
    ["foo", "baz"]
  );

  // Indexed integer array.
  rows = await c.execute(
    "SELECT path FROM dirs WHERE id IN carray(?1) ORDER BY id",
    [[2, 3]]
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("path")),
    ["bar", "baz"]
  );

  // Values that satisfy Number.isInteger() — including those that lose their
  // fractional part due to IEEE 754 precision (e.g. 5.0000000000000001 === 5.0)
  // — are bound as integers, not doubles.
  rows = await c.execute(
    "SELECT path FROM dirs WHERE id IN carray(:ids) ORDER BY id",
    // eslint-disable-next-line no-loss-of-precision
    { ids: [1.0, 3.0000000000000001] }
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("path")),
    ["foo", "baz"]
  );

  // Named string array.
  rows = await c.execute(
    "SELECT id FROM dirs WHERE path IN carray(:paths) ORDER BY id",
    { paths: ["foo", "baz"] }
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("id")),
    [1, 3]
  );

  // Named float array.
  await c.execute("CREATE TABLE floats (val REAL)");
  await c.execute("INSERT INTO floats VALUES (1.1)");
  await c.execute("INSERT INTO floats VALUES (2.2)");
  rows = await c.execute(
    "SELECT val FROM floats WHERE val IN carray(:vals) ORDER BY val",
    { vals: [1.1, 2.2] }
  );
  Assert.equal(rows.length, 2);

  // Integer followed by a double: the array is promoted to doubles.
  await c.execute("INSERT INTO floats VALUES (3)");
  rows = await c.execute(
    "SELECT val FROM floats WHERE val IN carray(:vals) ORDER BY val",
    { vals: [3, 1.1] }
  );
  Assert.equal(rows.length, 2);

  // A whole-number double (2.0) satisfies Number.isInteger() and would naively
  // be classified as an integer, but the array is still bound as doubles
  // because subsequent elements are non-integer.
  await c.execute("INSERT INTO floats VALUES (2.0)");
  rows = await c.execute(
    "SELECT val FROM floats WHERE val IN carray(:vals) ORDER BY val",
    { vals: [2.0, 1.1, 2.2] }
  );
  Assert.equal(rows.length, 3);

  // Double followed by an integer: still bound as doubles.
  rows = await c.execute(
    "SELECT val FROM floats WHERE val IN carray(:vals) ORDER BY val",
    { vals: [1.1, 3] }
  );
  Assert.equal(rows.length, 2);

  // Empty array should throw.
  await Assert.rejects(
    c.execute("SELECT path FROM dirs WHERE id IN carray(:ids)", { ids: [] }),
    /Array must not be empty/
  );

  await c.close();
});

add_task(async function test_carray_binding_invalid_inputs() {
  let c = await getDummyDatabase("carray_binding_invalid");
  await c.execute("INSERT INTO dirs VALUES (1, 'foo')");

  // Array with object elements should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(?1)", [[{ id: 1 }]]),
    /Unsupported array element type: object/
  );

  // Array with nested array elements should throw (typeof [] is "object").
  await Assert.rejects(
    c.execute("SELECT * FROM carray(?1)", [[[1, 2]]]),
    /Unsupported array element type: object/
  );

  // Integer followed by string should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(?1)", [[1, "two"]]),
    /All array elements must be of the same type/
  );

  // String followed by integer should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(?1)", [["one", 2]]),
    /All array elements must be of the same type/
  );

  // Array with null element should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(?1)", [[null, 1]]),
    /Unsupported array element type: object/
  );

  // NaN element should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(?1)", [[1, NaN]]),
    /Array elements must be finite numbers/
  );

  // Positive infinity should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(?1)", [[Infinity]]),
    /Array elements must be finite numbers/
  );

  // Negative infinity should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(?1)", [[-Infinity, 2]]),
    /Array elements must be finite numbers/
  );

  // Array bound to a non-carray query should throw.
  await Assert.rejects(
    c.execute("SELECT id FROM dirs WHERE id = :id", { id: [1, 2] }),
    /Array parameters require carray\(\)/
  );

  // Scalar bound to a carray() parameter should throw.
  await Assert.rejects(
    c.execute("SELECT path FROM dirs WHERE id IN carray(:ids)", { ids: 1 }),
    /carray\(\) parameters must be bound to an array/
  );

  await c.close();
});

add_task(async function test_carray_binding_null_elements() {
  let c = await getDummyDatabase("carray_binding_nulls");

  // null as first element should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(:ids)", { ids: [null, 1, 2] }),
    /Unsupported array element type: object/
  );

  // null in the middle should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(:ids)", { ids: [1, null, 2] }),
    /Unsupported array element type: object/
  );

  // All-null array should throw.
  await Assert.rejects(
    c.execute("SELECT * FROM carray(:ids)", { ids: [null, null] }),
    /Unsupported array element type: object/
  );

  await c.close();
});

add_task(async function test_carray_binding_multirow() {
  let c = await getDummyDatabase("carray_binding_multirow");
  await c.execute("INSERT INTO dirs VALUES (1, 'foo')");
  await c.execute("INSERT INTO dirs VALUES (2, 'bar')");
  await c.execute("INSERT INTO dirs VALUES (3, 'baz')");
  await c.execute("INSERT INTO dirs VALUES (4, 'qux')");

  await c.execute("DELETE FROM dirs WHERE id IN carray(:ids)", [
    { ids: [1, 2] },
    { ids: [3] },
  ]);
  let rows = await c.execute("SELECT id FROM dirs ORDER BY id");
  Assert.deepEqual(
    rows.map(r => r.getResultByName("id")),
    [4]
  );

  await c.close();
});

add_task(async function test_carray_binding_syntax_variants() {
  let c = await getDummyDatabase("carray_binding_syntax");
  await c.execute("INSERT INTO dirs VALUES (1, 'foo')");
  await c.execute("INSERT INTO dirs VALUES (2, 'bar')");
  await c.execute("INSERT INTO dirs VALUES (3, 'baz')");

  // Uppercase CARRAY() is valid SQL.
  let rows = await c.execute(
    "SELECT path FROM dirs WHERE id IN CARRAY(:ids) ORDER BY id",
    { ids: [1, 2] }
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("path")),
    ["foo", "bar"]
  );

  // Bare ? placeholder (anonymous, sequential).
  rows = await c.execute(
    "SELECT path FROM dirs WHERE id IN carray(?) ORDER BY id",
    [[2, 3]]
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("path")),
    ["bar", "baz"]
  );

  // Bare ? with a preceding scalar param.
  rows = await c.execute(
    "SELECT path FROM dirs WHERE path != ? AND id IN carray(?) ORDER BY id",
    ["foo", [2, 3]]
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("path")),
    ["bar", "baz"]
  );

  await c.close();
});

add_task(async function test_carray_binding_multiple() {
  let c = await getDummyDatabase("carray_binding_multiple");
  await c.execute("INSERT INTO dirs VALUES (1, 'foo')");
  await c.execute("INSERT INTO dirs VALUES (2, 'bar')");
  await c.execute("INSERT INTO dirs VALUES (3, 'baz')");

  // Two carray() in one query, both named.
  let rows = await c.execute(
    "SELECT path FROM dirs WHERE id IN carray(:ids) AND path IN carray(:paths) ORDER BY id",
    { ids: [1, 2, 3], paths: ["foo", "baz"] }
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("path")),
    ["foo", "baz"]
  );

  // Two bare carray(?) in one query.
  rows = await c.execute(
    "SELECT path FROM dirs WHERE id IN carray(?) AND path IN carray(?) ORDER BY id",
    [
      [1, 2, 3],
      ["foo", "baz"],
    ]
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("path")),
    ["foo", "baz"]
  );

  await c.close();
});

// This test exercises an extreme edge case of SQLite parameter numbering where
// explicit ?N and bare ? placeholders are interleaved. This is purely to verify
// correct internal behaviour — never write SQL like this in production code.
add_task(async function test_carray_binding_mixed_placeholder_styles() {
  let c = await getDummyDatabase("carray_binding_mixed_placeholders");
  await c.execute("INSERT INTO dirs VALUES (1, 'foo')");
  await c.execute("INSERT INTO dirs VALUES (2, 'bar')");
  await c.execute("INSERT INTO dirs VALUES (3, 'baz')");

  // 6 carray() references but only 4 distinct parameter slots:
  //   ?1=slot0, ?=slot1, ?=slot2, ?2=slot1 (same as first bare ?),
  //   ?=slot3, ?3=slot2 (same as second bare ?)
  // The intersections narrow the result down to id=1 only.
  let rows = await c.execute(
    `SELECT id FROM dirs
       WHERE id IN carray(?1)
         AND id IN carray(?)
         AND id IN carray(?)
         AND id IN carray(?2)
         AND id IN carray(?)
         AND id IN carray(?3)
       ORDER BY id`,
    [
      [1, 2, 3],
      [1, 2],
      [1, 3],
      [1, 2, 3],
    ]
  );
  Assert.deepEqual(
    rows.map(r => r.getResultByName("id")),
    [1]
  );

  await c.close();
});
