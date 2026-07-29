/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

/* exported testGenerator */
var testGenerator = testSteps();

function createAbortingKey(transaction) {
  const key = [1, 2, 3];
  Object.defineProperty(key, 1, {
    get() {
      transaction.abort();
      return 2;
    },
  });
  return key;
}

function* testSteps() {
  const name = this.window ? window.location.pathname : "Splendid Test";

  info("Setting up database with object store and index.");
  let request = indexedDB.open(name, 1);
  request.onerror = errorHandler;
  request.onupgradeneeded = grabEventAndContinueHandler;
  request.onsuccess = grabEventAndContinueHandler;
  let event = yield undefined;

  let db = event.target.result;
  let objectStore = db.createObjectStore("store", { keyPath: "id" });
  objectStore.createIndex("idx", "value");

  objectStore.add({ id: 1, value: "a" });
  objectStore.add({ id: 2, value: "b" });
  objectStore.add({ id: 3, value: "c" });

  event = yield undefined;

  // Test objectStore.get() with aborting key
  info("Testing objectStore.get() with aborting key.");
  let tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  try {
    objectStore.get(createAbortingKey(tx));
    ok(false, "objectStore.get() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "objectStore.get() threw AbortError");
  }

  // Test objectStore.getKey() with aborting key
  info("Testing objectStore.getKey() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  try {
    objectStore.getKey(createAbortingKey(tx));
    ok(false, "objectStore.getKey() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "objectStore.getKey() threw AbortError");
  }

  // Test objectStore.getAll() with aborting key
  info("Testing objectStore.getAll() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  try {
    objectStore.getAll(createAbortingKey(tx));
    ok(false, "objectStore.getAll() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "objectStore.getAll() threw AbortError");
  }

  // Test objectStore.getAllKeys() with aborting key
  info("Testing objectStore.getAllKeys() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  try {
    objectStore.getAllKeys(createAbortingKey(tx));
    ok(false, "objectStore.getAllKeys() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "objectStore.getAllKeys() threw AbortError");
  }

  // Test objectStore.count() with aborting key
  info("Testing objectStore.count() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  try {
    objectStore.count(createAbortingKey(tx));
    ok(false, "objectStore.count() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "objectStore.count() threw AbortError");
  }

  // Test objectStore.delete() with aborting key
  info("Testing objectStore.delete() with aborting key.");
  tx = db.transaction("store", "readwrite");
  objectStore = tx.objectStore("store");
  try {
    objectStore.delete(createAbortingKey(tx));
    ok(false, "objectStore.delete() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "objectStore.delete() threw AbortError");
  }

  // Test objectStore.openCursor() with aborting key
  info("Testing objectStore.openCursor() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  try {
    objectStore.openCursor(createAbortingKey(tx));
    ok(false, "objectStore.openCursor() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "objectStore.openCursor() threw AbortError");
  }

  // Test objectStore.openKeyCursor() with aborting key
  info("Testing objectStore.openKeyCursor() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  try {
    objectStore.openKeyCursor(createAbortingKey(tx));
    ok(false, "objectStore.openKeyCursor() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "objectStore.openKeyCursor() threw AbortError");
  }

  // Test index.get() with aborting key
  info("Testing index.get() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  let index = objectStore.index("idx");
  try {
    index.get(createAbortingKey(tx));
    ok(false, "index.get() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "index.get() threw AbortError");
  }

  // Test index.getKey() with aborting key
  info("Testing index.getKey() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  index = objectStore.index("idx");
  try {
    index.getKey(createAbortingKey(tx));
    ok(false, "index.getKey() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "index.getKey() threw AbortError");
  }

  // Test index.getAll() with aborting key
  info("Testing index.getAll() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  index = objectStore.index("idx");
  try {
    index.getAll(createAbortingKey(tx));
    ok(false, "index.getAll() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "index.getAll() threw AbortError");
  }

  // Test index.getAllKeys() with aborting key
  info("Testing index.getAllKeys() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  index = objectStore.index("idx");
  try {
    index.getAllKeys(createAbortingKey(tx));
    ok(false, "index.getAllKeys() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "index.getAllKeys() threw AbortError");
  }

  // Test index.count() with aborting key
  info("Testing index.count() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  index = objectStore.index("idx");
  try {
    index.count(createAbortingKey(tx));
    ok(false, "index.count() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "index.count() threw AbortError");
  }

  // Test index.openCursor() with aborting key
  info("Testing index.openCursor() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  index = objectStore.index("idx");
  try {
    index.openCursor(createAbortingKey(tx));
    ok(false, "index.openCursor() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "index.openCursor() threw AbortError");
  }

  // Test index.openKeyCursor() with aborting key
  info("Testing index.openKeyCursor() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  index = objectStore.index("idx");
  try {
    index.openKeyCursor(createAbortingKey(tx));
    ok(false, "index.openKeyCursor() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "index.openKeyCursor() threw AbortError");
  }

  // Test cursor.continue() with aborting key
  info("Testing cursor.continue() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  request = objectStore.openCursor();
  request.onsuccess = grabEventAndContinueHandler;
  event = yield undefined;

  let cursor = event.target.result;
  ok(cursor, "Got a cursor");
  try {
    cursor.continue(createAbortingKey(tx));
    ok(false, "cursor.continue() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "cursor.continue() threw AbortError");
  }

  // Test cursor.continuePrimaryKey() with aborting key
  info("Testing cursor.continuePrimaryKey() with aborting key.");
  tx = db.transaction("store", "readonly");
  objectStore = tx.objectStore("store");
  index = objectStore.index("idx");
  request = index.openCursor();
  request.onsuccess = grabEventAndContinueHandler;
  event = yield undefined;

  cursor = event.target.result;
  ok(cursor, "Got an index cursor");
  try {
    cursor.continuePrimaryKey(createAbortingKey(tx), 999);
    ok(false, "cursor.continuePrimaryKey() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "AbortError", "cursor.continuePrimaryKey() threw AbortError");
  }

  // Test cursor.update() with a value that aborts during clone.
  // The object store uses keyPath "id", so update() clones the value
  // to extract the key. A getter that aborts the transaction during
  // cloning should be caught because the transaction is made inactive.
  info("Testing cursor.update() with value that aborts during clone.");
  tx = db.transaction("store", "readwrite");
  objectStore = tx.objectStore("store");
  request = objectStore.openCursor();
  request.onsuccess = grabEventAndContinueHandler;
  event = yield undefined;

  cursor = event.target.result;
  ok(cursor, "Got a cursor for update test");

  let updateValue = { id: cursor.key };
  Object.defineProperty(updateValue, "sneaky", {
    get() {
      tx.abort();
      return 42;
    },
    enumerable: true,
  });
  try {
    cursor.update(updateValue);
    ok(false, "cursor.update() should have thrown");
  } catch (e) {
    ok(e instanceof DOMException, "got a DOMException");
    is(e.name, "DataCloneError", "cursor.update() threw DataCloneError");
  }

  finishTest();
}
