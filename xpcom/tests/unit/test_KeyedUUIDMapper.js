/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const KeyedUUIDMapper = Components.Constructor(
  "@mozilla.org/keyed-uuid-mapper;1",
  Ci.nsIKeyedUUIDMapper,
  "init"
);

function makeMapper(seed) {
  // Some key - the specifics do not matter, as long as it is 16 bytes.
  const key = new Uint8Array(16).map((_, i) => (seed + i) & 0xff);
  return new KeyedUUIDMapper(key);
}

// NOTE: All test tasks here are run twice, first in the parent process as
// usual, and then again in the content process in the end as a double check,
// via test_KeyedUUIDMapper_in_content_process.

add_task(function test_generateKey() {
  const mapper = Cc["@mozilla.org/keyed-uuid-mapper;1"].createInstance(
    Ci.nsIKeyedUUIDMapper
  );
  const key1 = mapper.generateKey();

  const key2 = Cc["@mozilla.org/keyed-uuid-mapper;1"]
    .createInstance(Ci.nsIKeyedUUIDMapper)
    .generateKey();

  Assert.equal(key1.length, key2.length, "Keys have consistent lengths");
  Assert.ok(
    key1.some((v, i) => v !== key2[i]),
    "generateKey() returns unique key"
  );

  Assert.throws(
    () => mapper.toUUID(1),
    /NS_ERROR_NOT_INITIALIZED/,
    "generateKey() does not initialize mapper"
  );
  mapper.init(key2);
  Assert.ok(mapper.toUUID(1), "generateKey() result can initialize mapper");
});

add_task(function test_uuid_format() {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  const result = makeMapper(1).toUUID(1);

  Assert.ok(UUID_RE.test(result), "toUUID() returns a lowercase UUID string");
  // The exact value does not matter, we just check a specific value to make
  // sure that the output is reasonably stable.
  Assert.equal(result, "c047bf20-c07c-9531-7e69-e6d65bf96acd", "Stable uuid");
  // If you ever need to change the above expectation, that means that you are
  // changing the algorithm. The test_invalid_uuid test tests a boundary case
  // that you have to re-generate, as follows:
  // 1. Disable kJS_MAX_SAFE_UINTEGER constraint in KeyedUUIDMapper::ToUUID.
  // 2. Uncomment the following line:
  //    Assert.ok(false, makeMapper(1).toUUID(Number.MAX_SAFE_INTEGER + 1));
  // 3. Run this test, and copy the displayed UUID.
  // 4. Replace test_invalid_uuid's MAX_SAFE_INTEGER+1 test case with it.
});

add_task(function test_roundtrip() {
  for (const [seed, value] of [
    [0, 0],
    [1, 1],
    [0xde, 42],
    [0x12, 0xabcdef],
    [0x7f, Number.MAX_SAFE_INTEGER],
  ]) {
    const mapper = makeMapper(seed);
    Assert.equal(
      mapper.fromUUID(mapper.toUUID(value)),
      value,
      `seed=${seed}, value=${value}`
    );
  }
});

add_task(function test_toUUID_max_range() {
  const mapper = makeMapper(1);
  // Beyond MAX_SAFE_INTEGER some numbers may not accurately be represented
  // in JS. E.g., 2*63 is 9223372036854775808, but ends with 776 000 instead.
  // The implementation explicitly filters those to avoid loss of precision.
  Assert.throws(
    () => mapper.toUUID(Number.MAX_SAFE_INTEGER + 1),
    // NS_ERROR_INVALID_ARG is converted to NS_ERROR_ILLEGAL_VALUE:
    /NS_ERROR_ILLEGAL_VALUE/,
    "toUUID rejects number past MAX_SAFE_INTEGER"
  );
  Assert.throws(
    () => mapper.toUUID(2 ** 63),
    // NS_ERROR_INVALID_ARG is converted to NS_ERROR_ILLEGAL_VALUE:
    /NS_ERROR_ILLEGAL_VALUE/,
    "toUUID rejects number past MAX_SAFE_INTEGER"
  );

  // Note: values beyond Number.MAX_SAFE_INTEGER are rejected, as shown above.
  // But beyond the 64-bit numeric range the values become 0 before the
  // implementation event receives the value.
  Assert.equal(
    mapper.fromUUID(mapper.toUUID(2 ** 66)),
    0,
    "toUUID does not support numbers outside the 64-bit range"
  );
});

add_task(function test_opaque_without_key() {
  const uuid = makeMapper(0xca).toUUID(0xbabe);
  // With a different key 0xcb, we should not get value 0xbabe back.
  // In fact, because 0xbabe is not a value that could ever have been produced
  // for this given UUID, the implementation throws:
  Assert.throws(
    () => makeMapper(0xcb).fromUUID(uuid),
    /NS_ERROR_ILLEGAL_VALUE/,
    "wrong key does not recover the original value"
  );
});

add_task(function test_case_insensitive_parsing() {
  const lower = makeMapper(1).toUUID(42);
  const upper = makeMapper(1).toUUID(42).toUpperCase();
  Assert.notEqual(lower, upper, "Contains alpha characters");
  const mapper = makeMapper(1);
  Assert.equal(mapper.fromUUID(upper), 42, "fromUUID accepts uppercase hex");
});

add_task(function test_reinit() {
  const mapper = makeMapper(1);
  const uuid1 = mapper.toUUID(42);
  mapper.init(new Uint8Array(16).fill(0xff));
  Assert.notEqual(
    mapper.toUUID(42),
    uuid1,
    "reinit with new key changes output"
  );
  mapper.init(new Uint8Array(16).map((_, i) => (1 + i) & 0xff));
  Assert.equal(
    mapper.toUUID(42),
    uuid1,
    "reinit with original key restores output"
  );
});

add_task(function test_not_initialized() {
  const mapper = Cc["@mozilla.org/keyed-uuid-mapper;1"].createInstance(
    Ci.nsIKeyedUUIDMapper
  );
  // Note: mapper.init() not called.
  Assert.throws(() => mapper.toUUID(1), /NS_ERROR_NOT_INITIALIZED/);
  Assert.throws(
    () => mapper.fromUUID("00000000-0000-0000-0000-000000000000"),
    /NS_ERROR_NOT_INITIALIZED/
  );
});

add_task(function test_invalid_key_size() {
  const mapper = Cc["@mozilla.org/keyed-uuid-mapper;1"].createInstance(
    Ci.nsIKeyedUUIDMapper
  );
  for (const keyLength of [0, 15, 17, 32]) {
    Assert.throws(
      () => mapper.init(new Uint8Array(keyLength)),
      // NS_ERROR_INVALID_ARG is converted to NS_ERROR_ILLEGAL_VALUE:
      /NS_ERROR_ILLEGAL_VALUE/,
      `rejects key of length ${keyLength}`
    );
  }
});

add_task(function test_invalid_uuid() {
  const mapper = makeMapper(1);
  for (const bad of [
    "",
    "not-a-uuid",
    "00000000-0000-0000-0000-00000000000", // too short
    "00000000-0000-0000-0000-0000000000000", // too long
    "00000000-0000-0000-0000-00000000000g", // invalid hex char
    "000000000000-0000-0000-0000-000000000000", // wrong dash positions
    // Right length, but no value maps to this. If one inputs a random UUID,
    // they are in fact more likely going to get an error than a mapping to
    // an arbitrary value because there are 2^128 UUIDs but only 2^64 valid
    // values.
    "00000000-0000-0000-0000-000000000000",
    // The generated UUID for MAX_SAFE_INTEGER+1 (9007199254740992),
    // if the implementation would not have capped it at MAX_SAFE_INTEGER.
    "31bf73c9-08ba-c9b8-1fb7-922e1f311eb4",
    "{" + mapper.toUUID(1) + "}", // Reject UUID with brackets.
  ]) {
    Assert.throws(
      () => mapper.fromUUID(bad),
      // NS_ERROR_INVALID_ARG is converted to NS_ERROR_ILLEGAL_VALUE:
      /NS_ERROR_ILLEGAL_VALUE/,
      `rejects invalid uuid: "${bad}"`
    );
  }
});

add_task(function test_fromUUID_non_ascii() {
  const mapper = makeMapper(0xde);
  const uuid = mapper.toUUID(42);
  // ^ test_roundtrip already verified that fromUUID(uuid) will return 42.

  // String where the lossy conversion from UTF16 to ASCII would be identical
  // to the input, but which actually differs from the real input.
  const bad = String.fromCharCode(uuid.charCodeAt(0) + 0x100) + uuid.slice(1);
  Assert.throws(
    () => mapper.fromUUID(bad),
    // NS_ERROR_INVALID_ARG is converted to NS_ERROR_ILLEGAL_VALUE:
    /NS_ERROR_ILLEGAL_VALUE/,
    "Rejects non-ASCII"
  );
});

// Internally, the mapping is implemented with AES 128. This is merely an
// implementation detail. However, we verify that that the behavior matches.
// This proof ensures that the mapper inherits these desired properties:
// - Confidentiality: Value cannot be recovered from UUID without key.
// - Deterministic: For the same sets of inputs, the result is identical.
// - Unique: Every input value produces an unique UUID.
// - Reversable: A UUID can be mapped back (AES encrypt <-> decrypt).
add_task(async function test_verify_alg_AES_128() {
  // Some arbitrary test values.
  const keyBytes = new Uint8Array(16).fill(128);
  const value = 0x123456789;
  // crypto.subtle does not support AES-ECB, but for the first block it is
  // equivalent to AES-CBC with a zero IV, so we can use that for verification.
  const AES_ALGO = "AES-CBC";

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: AES_ALGO },
    false,
    ["encrypt"]
  );
  const plaintext = new Uint8Array(16);
  new DataView(plaintext.buffer).setBigUint64(0, BigInt(value));

  const raw = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv: new Uint8Array(16) },
    key,
    plaintext
  );
  const uuidBytes = new Uint8Array(raw, 0, 16); // drop padding

  Assert.equal(
    new KeyedUUIDMapper(keyBytes).toUUID(value).replaceAll("-", ""),
    uuidBytes.toHex(),
    "KeyedUUIDMapper mapping is equivalent to AES-ECB"
  );
});

if (runningInParent) {
  // Run same tests again, but in the content process.
  add_task(async function test_KeyedUUIDMapper_in_content_process() {
    await run_test_in_child("test_KeyedUUIDMapper.js");
  });
}
