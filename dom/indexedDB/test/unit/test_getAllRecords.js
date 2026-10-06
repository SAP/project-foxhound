/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

/* exported testSteps */
async function testSteps() {
  const dbName = this.window ? window.location.pathname : "test_getAllRecords";

  let request = indexedDB.open(dbName, 1);
  let event = await expectingUpgrade(request);

  let db = event.target.result;

  let objectStore = db.createObjectStore("store");
  objectStore.createIndex("idx", "x");
  objectStore.add({ x: 10 }, "keyA");
  objectStore.add({ x: 20 }, "keyB");

  event = await expectingSuccess(request);
  db = event.target.result;

  let tx = db.transaction("store", "readonly");

  event = await requestSucceeded(tx.objectStore("store").getAllRecords());
  let storeRecords = event.target.result;

  event = await requestSucceeded(
    tx.objectStore("store").index("idx").getAllRecords()
  );
  let indexRecords = event.target.result;

  is(storeRecords.length, 2, "Got 2 store records");
  is(indexRecords.length, 2, "Got 2 index records");

  // Object store records: key and primaryKey share the same underlying raw key
  // in the C++ implementation (mPrimaryKeyAndKeyEqual = true). Test that both
  // attributes return correct values regardless of access order and on repeated
  // access.

  info("Object store: key first, then primaryKey");
  is(storeRecords[0].key, "keyA", "record[0].key correct (first access)");
  is(
    storeRecords[0].primaryKey,
    "keyA",
    "record[0].primaryKey correct after key"
  );
  is(storeRecords[0].key, "keyA", "record[0].key correct (second access)");
  is(
    storeRecords[0].primaryKey,
    "keyA",
    "record[0].primaryKey correct (second access)"
  );

  info("Object store: primaryKey first, then key");
  is(
    storeRecords[1].primaryKey,
    "keyB",
    "record[1].primaryKey correct (first access)"
  );
  is(storeRecords[1].key, "keyB", "record[1].key correct after primaryKey");
  is(
    storeRecords[1].primaryKey,
    "keyB",
    "record[1].primaryKey correct (second access)"
  );
  is(storeRecords[1].key, "keyB", "record[1].key correct (second access)");

  info("Object store: value accessible multiple times");
  is(storeRecords[0].value.x, 10, "record[0].value correct (first access)");
  is(storeRecords[0].value.x, 10, "record[0].value correct (second access)");

  // Index records: key (index key) and primaryKey (object store key) use
  // distinct underlying raw keys in the C++ implementation
  // (mPrimaryKeyAndKeyEqual = false). Test both access orders.

  info("Index: key first, then primaryKey");
  is(indexRecords[0].key, 10, "index record[0].key correct (first access)");
  is(
    indexRecords[0].primaryKey,
    "keyA",
    "index record[0].primaryKey correct after key"
  );
  is(indexRecords[0].key, 10, "index record[0].key correct (second access)");
  is(
    indexRecords[0].primaryKey,
    "keyA",
    "index record[0].primaryKey correct (second access)"
  );

  info("Index: primaryKey first, then key");
  is(
    indexRecords[1].primaryKey,
    "keyB",
    "index record[1].primaryKey correct (first access)"
  );
  is(indexRecords[1].key, 20, "index record[1].key correct after primaryKey");
  is(
    indexRecords[1].primaryKey,
    "keyB",
    "index record[1].primaryKey correct (second access)"
  );
  is(indexRecords[1].key, 20, "index record[1].key correct (second access)");

  db.close();
}
