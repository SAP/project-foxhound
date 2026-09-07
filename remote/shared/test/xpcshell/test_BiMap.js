/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const { BiMap } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/BiMap.sys.mjs"
);

add_task(function test_BiMap_constructor() {
  const bimap = new BiMap();
  ok(bimap, "BiMap instance created");
});

add_task(function test_BiMap_clear() {
  const bimap = new BiMap();
  const obj1 = { foo: "bar" };
  const obj2 = { baz: "qux" };

  const id1 = bimap.getOrInsert(obj1);
  const id2 = bimap.getOrInsert(obj2);

  ok(bimap.hasId(id1), "First id exists before clear");
  ok(bimap.hasId(id2), "Second id exists before clear");

  bimap.clear();

  ok(!bimap.hasId(id1), "First id removed after clear");
  ok(!bimap.hasId(id2), "Second id removed after clear");
  ok(!bimap.hasObject(obj1), "First object removed after clear");
  ok(!bimap.hasObject(obj2), "Second object removed after clear");
});

add_task(function test_BiMap_getOrInsert() {
  const bimap = new BiMap();
  const obj = { foo: "bar" };

  const regExpUUID = new RegExp(
    /^[a-f|0-9]{8}-[a-f|0-9]{4}-[a-f|0-9]{4}-[a-f|0-9]{4}-[a-f|0-9]{12}$/g
  );

  const id = bimap.getOrInsert(obj);

  ok(regExpUUID.test(id), "Returned a valid UUID");
  equal(bimap.getId(obj), id, "Object is mapped to the id");
  equal(bimap.getObject(id), obj, "Id is mapped to the object");
});

add_task(function test_BiMap_multipleMappings() {
  const bimap = new BiMap();
  const obj1 = { name: "first" };
  const obj2 = { name: "second" };
  const obj3 = { name: "third" };

  const id1 = bimap.getOrInsert(obj1);
  const id2 = bimap.getOrInsert(obj2);
  const id3 = bimap.getOrInsert(obj3);

  equal(bimap.getId(obj1), id1, "First mapping correct");
  equal(bimap.getId(obj2), id2, "Second mapping correct");
  equal(bimap.getId(obj3), id3, "Third mapping correct");

  equal(bimap.getObject(id1), obj1, "First reverse mapping correct");
  equal(bimap.getObject(id2), obj2, "Second reverse mapping correct");
  equal(bimap.getObject(id3), obj3, "Third reverse mapping correct");
});

add_task(function test_BiMap_getId() {
  const bimap = new BiMap();
  const obj = { foo: "bar" };

  equal(bimap.getId(obj), undefined, "Returns undefined for unknown object");

  const id = bimap.getOrInsert(obj);

  equal(bimap.getId(obj), id, "Retrieved correct id for object");
});

add_task(function test_BiMap_getObject() {
  const bimap = new BiMap();
  const obj = { foo: "bar" };

  equal(
    bimap.getObject("unknown-id"),
    undefined,
    "Returns undefined for unknown id"
  );

  const id = bimap.getOrInsert(obj);

  equal(bimap.getObject(id), obj, "Retrieved correct object for id");
});

add_task(function test_BiMap_hasId() {
  const bimap = new BiMap();
  const obj = { foo: "bar" };

  const id = bimap.getOrInsert(obj);

  ok(!bimap.hasId("unknown-id"), "Returns false for unknown id");
  ok(bimap.hasId(id), "Returns true for existing id");
});

add_task(function test_BiMap_hasObject() {
  const bimap = new BiMap();
  const obj = { foo: "bar" };
  const otherObj = { baz: "qux" };

  ok(!bimap.hasObject(otherObj), "Returns false for non-existing object");

  bimap.getOrInsert(obj);

  ok(bimap.hasObject(obj), "Returns true for existing object");
});

add_task(function test_BiMap_deleteById() {
  const bimap = new BiMap();
  const obj = { foo: "bar" };

  const id = bimap.getOrInsert(obj);

  ok(bimap.hasId(id), "Id exists before deletion");
  ok(bimap.hasObject(obj), "Object exists before deletion");

  // Deleting non-existing id should not affect existing mappings.
  bimap.deleteById("unknown-id");

  ok(bimap.hasId(id), "Existing id still present");
  ok(bimap.hasObject(obj), "Existing object still present");

  // Delete existing id.
  bimap.deleteById(id);

  ok(!bimap.hasId(id), "Id removed after deletion");
  ok(!bimap.hasObject(obj), "Object removed after deletion");
  equal(bimap.getId(obj), undefined, "Object no longer maps to id");
  equal(bimap.getObject(id), undefined, "Id no longer maps to object");
});

add_task(function test_BiMap_deleteByObject() {
  const bimap = new BiMap();
  const obj = { foo: "bar" };
  const otherObj = { baz: "qux" };

  const id = bimap.getOrInsert(obj);

  ok(bimap.hasId(id), "Id exists before deletion");
  ok(bimap.hasObject(obj), "Object exists before deletion");

  // Deleting non-existing object should not affect existing mappings.
  bimap.deleteByObject(otherObj);

  ok(bimap.hasId(id), "Existing id still present");
  ok(bimap.hasObject(obj), "Existing object still present");

  // Delete existing object.
  bimap.deleteByObject(obj);

  ok(!bimap.hasId(id), "Id removed after deletion");
  ok(!bimap.hasObject(obj), "Object removed after deletion");
  equal(bimap.getId(obj), undefined, "Object no longer maps to id");
  equal(bimap.getObject(id), undefined, "Id no longer maps to object");
});
