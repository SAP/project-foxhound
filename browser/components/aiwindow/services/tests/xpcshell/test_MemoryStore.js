/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { MemoryStore, makeMemoryId } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs"
);

add_task(async function test_init_empty_state() {
  // First init should succeed and not throw.
  await MemoryStore.ensureInitialized();

  let memories = await MemoryStore.getMemories();
  equal(memories.length, 0, "New store should start with no memories");

  const meta = await MemoryStore.getMeta();
  equal(
    meta.last_history_memory_ts,
    0,
    "Default last_history_memory_ts should be 0"
  );
  equal(meta.last_chat_memory_ts, 0, "Default last_chat_memory_ts should be 0");
});

add_task(async function test_addMemory() {
  await MemoryStore.ensureInitialized();

  const memory1 = await MemoryStore.addMemory({
    memory_summary: "i love driking coffee",
    category: "Food & Drink",
    intent: "Plan / Organize",
    score: 3,
    reasoning: "searches for nearest coffee places",
  });

  equal(
    memory1.memory_summary,
    "i love driking coffee",
    "memory summary should match input"
  );
  equal(memory1.category, "Food & Drink", "Category should match input");
  equal(memory1.intent, "Plan / Organize", "Intent should match with input");
  equal(memory1.score, 3, "Score should match input");
  equal(
    memory1.reasoning,
    "searches for nearest coffee places",
    "Reasoning should match input"
  );
  await MemoryStore.hardDeleteMemory(memory1.id);
});

add_task(async function test_addMemory_and_upsert_by_content() {
  await MemoryStore.ensureInitialized();

  const memory1 = await MemoryStore.addMemory({
    memory_summary: "trip plans to Italy",
    category: "Travel & Transportation",
    intent: "Plan / Organize",
    score: 3,
  });

  ok(memory1.id, "Memory should have an id");
  equal(
    memory1.memory_summary,
    "trip plans to Italy",
    "Memory summary should be stored"
  );
  equal(
    memory1.reasoning,
    "",
    "Reasoning should default to empty string when not provided"
  );

  // Add another memory with same (summary, category, intent) – should upsert, not duplicate.
  const memory2 = await MemoryStore.addMemory({
    memory_summary: "trip plans to Italy",
    category: "Travel & Transportation",
    intent: "Plan / Organize",
    score: 5,
    reasoning: "User searches for Italy travel guides and visits booking sites",
  });

  equal(
    memory1.id,
    memory2.id,
    "Same (summary, category, intent) should produce same deterministic id"
  );
  equal(
    memory2.score,
    5,
    "Second addMemory call for same id should update score"
  );
  equal(
    memory2.reasoning,
    "User searches for Italy travel guides and visits booking sites",
    "Second addMemory call for same id should update reasoning"
  );

  const memories = await MemoryStore.getMemories();
  equal(memories.length, 1, "Store should still have only one memory");
  await MemoryStore.hardDeleteMemory(memory1.id);
});

add_task(async function test_addMemory_different_intent_produces_new_id() {
  await MemoryStore.ensureInitialized();

  const a = await MemoryStore.addMemory({
    memory_summary: "trip plans to Italy",
    category: "Travel & Transportation",
    intent: "trip_planning",
    score: 3,
  });

  const b = await MemoryStore.addMemory({
    memory_summary: "trip plans to Italy",
    category: "Travel & Transportation",
    intent: "travel_budgeting",
    score: 4,
  });

  notEqual(a.id, b.id, "Different intent should yield different ids");

  const memories = await MemoryStore.getMemories();
  equal(
    memories.length == 2,
    true,
    "Store should contain at least two memories now"
  );
});

add_task(async function test_updateMemory_and_soft_delete() {
  await MemoryStore.ensureInitialized();

  const memory = await MemoryStore.addMemory({
    memory_summary: "debug memory",
    category: "debug",
    intent: "Monitor / Track",
    score: 1,
    reasoning: "Initial reasoning for debugging",
  });

  equal(
    memory.reasoning,
    "Initial reasoning for debugging",
    "Initial reasoning should be set"
  );

  const updated = await MemoryStore.updateMemory(memory.id, {
    score: 4,
    reasoning: "Updated reasoning after more data",
  });
  equal(updated.score, 4, "updateMemory should update score");
  equal(
    updated.reasoning,
    "Updated reasoning after more data",
    "updateMemory should update reasoning"
  );

  const deleted = await MemoryStore.softDeleteMemory(memory.id);

  ok(deleted, "softDeleteMemory should return the updated memory");
  equal(
    deleted.is_deleted,
    true,
    "Soft-deleted memory should have is_deleted = true"
  );

  const nonDeleted = await MemoryStore.getMemories();
  const notFound = nonDeleted.find(i => i.id === memory.id);
  equal(
    notFound,
    undefined,
    "Soft-deleted memory should be filtered out by getMemories()"
  );
});

add_task(async function test_hard_delete() {
  await MemoryStore.ensureInitialized();

  const memory = await MemoryStore.addMemory({
    memory_summary: "to be hard deleted",
    category: "debug",
    intent: "Monitor / Track",
    score: 2,
  });

  let memories = await MemoryStore.getMemories();
  const beforeCount = memories.length;

  const removed = await MemoryStore.hardDeleteMemory(memory.id);
  equal(
    removed,
    true,
    "hardDeleteMemory should return true when removing existing memory"
  );

  memories = await MemoryStore.getMemories();
  const afterCount = memories.length;

  equal(
    beforeCount - 1,
    afterCount,
    "hardDeleteMemory should physically remove entry from array"
  );
});

add_task(async function test_updateMeta_and_persistence_roundtrip() {
  await MemoryStore.ensureInitialized();

  const now = Date.now();

  await MemoryStore.updateMeta({
    last_history_memory_ts: now,
  });

  let meta = await MemoryStore.getMeta();
  equal(
    meta.last_history_memory_ts,
    now,
    "updateMeta should update last_history_memory_ts"
  );
  equal(
    meta.last_chat_memory_ts,
    0,
    "updateMeta should not touch last_chat_memory_ts when not provided"
  );

  const chatTime = now + 1000;
  await MemoryStore.updateMeta({
    last_chat_memory_ts: chatTime,
  });

  meta = await MemoryStore.getMeta();
  equal(
    meta.last_history_memory_ts,
    now,
    "last_history_memory_ts should remain unchanged when only chat ts updated"
  );
  equal(
    meta.last_chat_memory_ts,
    chatTime,
    "last_chat_memory_ts should be updated"
  );

  // Force a write to disk.
  await MemoryStore.testOnlyFlush();

  // Simulate a fresh import by reloading module.
  // This uses the xpcshell helper to bypass module caching.
  const { MemoryStore: FreshStore } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs",
    { ignoreCache: true }
  );

  await FreshStore.ensureInitialized();

  const meta2 = await FreshStore.getMeta();
  equal(
    meta2.last_history_memory_ts,
    now,
    "last_history_memory_ts should survive roundtrip to disk"
  );
  equal(
    meta2.last_chat_memory_ts,
    chatTime,
    "last_chat_memory_ts should survive roundtrip to disk"
  );

  const memories = await FreshStore.getMemories();
  ok(Array.isArray(memories), "Memories should be an array after reload");
});

add_task(async function test_reasoning_field_persistence() {
  await MemoryStore.ensureInitialized();

  const testReasoning =
    "User frequently searches for coffee shops and visits coffee-related websites";

  const memory = await MemoryStore.addMemory({
    memory_summary: "Loves specialty coffee",
    category: "Food & Drink",
    intent: "Buy / Acquire",
    score: 4,
    reasoning: testReasoning,
  });

  equal(
    memory.reasoning,
    testReasoning,
    "Reasoning should be stored when creating new memory"
  );

  const updatedReasoning =
    "User searches for and visits multiple specialty coffee roasters";
  const updated = await MemoryStore.updateMemory(memory.id, {
    reasoning: updatedReasoning,
  });

  equal(
    updated.reasoning,
    updatedReasoning,
    "Reasoning should be updatable via updateMemory"
  );

  await MemoryStore.testOnlyFlush();

  const { MemoryStore: FreshStore } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs",
    { ignoreCache: true }
  );

  await FreshStore.ensureInitialized();
  const persistedMemories = await FreshStore.getMemories();
  const persistedMemory = persistedMemories.find(m => m.id === memory.id);

  ok(persistedMemory, "Memory should exist after reload");
  equal(
    persistedMemory.reasoning,
    updatedReasoning,
    "Reasoning should survive persistence roundtrip"
  );

  await FreshStore.hardDeleteMemory(memory.id);
});

add_task(async function test_create_memory_id_from_valid_category() {
  const memoryPartial = {
    memory_summary: "Likes coffee",
    category: "Food & Drink",
    intent: "Communicate / Share",
  };
  const memoryId = makeMemoryId(memoryPartial);
  Assert.equal(
    memoryId.split(".")[0],
    "food_drink",
    "Memory ID should start with the correct category prefix"
  );
});

add_task(async function test_create_memory_id_from_invalid_category() {
  const memoryPartial = {
    memory_summary: "Likes coffee",
    category: "Foods & Drinks",
    intent: "Communicate / Share",
  };
  const memoryId = makeMemoryId(memoryPartial);
  Assert.equal(
    memoryId.split(".")[0],
    "mem",
    "Memory ID should start with the correct category prefix"
  );
});
