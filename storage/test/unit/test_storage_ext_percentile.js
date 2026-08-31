/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file tests support for the percentile extension.

// Some example statements in this test are taken from the SQLite percentile
// documentation page: https://sqlite.org/percentile.html

function run_test() {
  let db = Services.storage.openSpecialDatabase("memory");

  db.executeSimpleSQL("CREATE TABLE t1(x REAL)");
  db.executeSimpleSQL(
    "INSERT INTO t1(x) VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10)"
  );

  let stmt = db.createStatement("SELECT percentile(x, 50) FROM t1");
  Assert.ok(stmt.executeStep());
  Assert.equal(stmt.getDouble(0), 5.5);
  stmt.reset();
  stmt.finalize();

  // median(x) is equivalent to percentile(x, 50).
  stmt = db.createStatement("SELECT median(x) FROM t1");
  Assert.ok(stmt.executeStep());
  Assert.equal(stmt.getDouble(0), 5.5);
  stmt.reset();
  stmt.finalize();

  // percentile(x, 0) returns the minimum value.
  stmt = db.createStatement("SELECT percentile(x, 0) FROM t1");
  Assert.ok(stmt.executeStep());
  Assert.equal(stmt.getDouble(0), 1.0);
  stmt.reset();
  stmt.finalize();

  // percentile(x, 100) returns the maximum value.
  stmt = db.createStatement("SELECT percentile(x, 100) FROM t1");
  Assert.ok(stmt.executeStep());
  Assert.equal(stmt.getDouble(0), 10.0);
  stmt.reset();
  stmt.finalize();

  // percentile(x, 25) exercises the linear interpolation path.
  // ix = 0.25 * 9 = 2.25; v1 = a[2] = 3.0, v2 = a[3] = 4.0 => 3.25
  stmt = db.createStatement("SELECT percentile(x, 25) FROM t1");
  Assert.ok(stmt.executeStep());
  Assert.equal(stmt.getDouble(0), 3.25);
  stmt.reset();
  stmt.finalize();

  // percentile_cont(x, P) takes P in the range 0.0-1.0.
  stmt = db.createStatement("SELECT percentile_cont(x, 0.25) FROM t1");
  Assert.ok(stmt.executeStep());
  Assert.equal(stmt.getDouble(0), 3.25);
  stmt.reset();
  stmt.finalize();

  // percentile_disc(x, P) returns the nearest stored value rather than
  // interpolating.
  stmt = db.createStatement("SELECT percentile_disc(x, 0.25) FROM t1");
  Assert.ok(stmt.executeStep());
  Assert.equal(stmt.getDouble(0), 3.0);
  stmt.reset();
  stmt.finalize();

  // All-NULL input must return NULL per spec rule (8).
  stmt = db.createStatement(
    "SELECT percentile(x, 50) FROM (SELECT NULL AS x UNION ALL SELECT NULL AS x)"
  );
  Assert.ok(stmt.executeStep());
  Assert.ok(stmt.getIsNull(0));
  stmt.reset();
  stmt.finalize();

  db.close();
}
