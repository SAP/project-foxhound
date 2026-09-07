/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PW = "correct horse battery staple";
const PW2 = "rotated_password_42";
const PW_WRONG = "Tr0ub4dor&3";

// Per-test kek_refs minted in `add_setup` and reused across the file.
// Every kek_ref is of the form `lockstore::kek::<type>:<base64url(id)>`;
// tests that need a *fresh* kek_ref for isolation should call
// `mintLocalKek()` / `mintPasswordKek()` directly.
let KEK_LOCAL = null;
let KEK_PASSWORD = null;

function getService() {
  return Cc["@mozilla.org/security/lockstore;1"].getService(Ci.nsILockstore);
}

function bytes(input) {
  return new TextEncoder().encode(input);
}

function str(arr) {
  return new TextDecoder().decode(new Uint8Array(arr));
}

async function mintLocalKek(identifier = "") {
  return getService().createKek(
    "local",
    identifier,
    "",
    /* cacheTimeoutMs */ 0
  );
}

async function mintPasswordKek(password) {
  return getService().createKek(
    "password",
    /* identifier */ "",
    password,
    /* cacheTimeoutMs */ 0
  );
}

// `NS_ERROR_INVALID_ARG` and `NS_ERROR_ILLEGAL_VALUE` are the same
// underlying code (0x80070057); the JS error message uses the latter.
const INVALID_ARG_RE = /NS_ERROR_(INVALID_ARG|ILLEGAL_VALUE)/;

add_setup(async function () {
  do_get_profile();
  KEK_LOCAL = await mintLocalKek();
  // Single Password kek_ref reused across tests that need a non-Local
  // KEK. Minted with the canonical test password `PW`; tests unlock it
  // on demand via `ls.unlockKek(KEK_PASSWORD, PW, ...)`.
  KEK_PASSWORD = await mintPasswordKek(PW);

  // Keepalive collection: remove_kek / delete_dek now orphan-clean
  // empty KEK records, so without something always wrapping under
  // KEK_PASSWORD a later test would delete the record and break
  // every subsequent test that relies on it. A keepalive coll wrapped
  // under both KEKs sidesteps the cleanup.
  const ls = getService();
  await ls.unlockKek(KEK_PASSWORD, PW, /*timeoutMs*/ 60_000);
  await ls.createDek("_keepalive", KEK_LOCAL, false, 32);
  await ls.addKek("_keepalive", KEK_LOCAL, KEK_PASSWORD);
  await ls.lockKek(KEK_PASSWORD);
});

add_task(function test_service_accessible() {
  const ls = getService();
  Assert.ok(ls, "nsILockstore service must be obtainable");
  // A freshly-minted Password kek_ref starts locked: createKek persists
  // the wrapped KEK but does not populate the unlock cache.
  Assert.ok(
    !ls.isKekUnlocked(KEK_PASSWORD),
    "fresh Password kek starts locked"
  );
});

add_task(async function test_local_key_encrypt_decrypt_roundtrip() {
  const ls = getService();
  await ls.createDek("rt", KEK_LOCAL, false, 32);

  const plaintext = bytes("hello, lockstore");
  const ct = await ls.encrypt("rt", KEK_LOCAL, plaintext);
  Assert.greater(
    ct.length,
    plaintext.length,
    "ciphertext longer than plaintext"
  );

  const round = await ls.decrypt("rt", KEK_LOCAL, ct);
  Assert.equal(str(round), "hello, lockstore", "roundtrip equal");
});

add_task(async function test_create_dek_duplicate_rejects() {
  const ls = getService();
  // "rt" already exists from the previous task; recreating must fail.
  await Assert.rejects(
    ls.createDek("rt", KEK_LOCAL, false, 32),
    /NS_ERROR_FAILURE/,
    "createDek on an existing collection rejects"
  );
});

add_task(async function test_create_dek_empty_args_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.createDek("", KEK_LOCAL, false, 32),
    INVALID_ARG_RE,
    "createDek with empty collection rejects"
  );
  await Assert.rejects(
    ls.createDek("col", "", false, 32),
    INVALID_ARG_RE,
    "createDek with empty kekRef rejects"
  );
});

add_task(async function test_encrypt_yields_unique_ciphertexts() {
  const ls = getService();
  // Same plaintext, same DEK, two encrypt calls — outputs MUST differ.
  // The cipher uses a random nonce; identical ciphertexts would be a
  // catastrophic invariant violation.
  const pt = bytes("repeatable input");
  const a = await ls.encrypt("rt", KEK_LOCAL, pt);
  const b = await ls.encrypt("rt", KEK_LOCAL, pt);
  Assert.equal(a.length, b.length, "same plaintext → same ciphertext length");
  let differs = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      differs = true;
      break;
    }
  }
  Assert.ok(differs, "two encryptions of the same plaintext must differ");
  // Both round-trip to the same plaintext.
  Assert.equal(str(await ls.decrypt("rt", KEK_LOCAL, a)), "repeatable input");
  Assert.equal(str(await ls.decrypt("rt", KEK_LOCAL, b)), "repeatable input");
});

add_task(async function test_encrypt_empty_args_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.encrypt("", KEK_LOCAL, bytes("x")),
    INVALID_ARG_RE,
    "encrypt with empty collection rejects"
  );
  await Assert.rejects(
    ls.encrypt("rt", "", bytes("x")),
    INVALID_ARG_RE,
    "encrypt with empty kekRef rejects"
  );
});

add_task(async function test_encrypt_no_dek_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.encrypt("never-created", KEK_LOCAL, bytes("x")),
    /NS_ERROR_NOT_AVAILABLE/,
    "encrypt against a collection without a DEK rejects"
  );
});

add_task(async function test_decrypt_empty_args_rejected() {
  const ls = getService();
  const ct = await ls.encrypt("rt", KEK_LOCAL, bytes("x"));
  await Assert.rejects(
    ls.decrypt("", KEK_LOCAL, ct),
    INVALID_ARG_RE,
    "decrypt with empty collection rejects"
  );
  await Assert.rejects(
    ls.decrypt("rt", "", ct),
    INVALID_ARG_RE,
    "decrypt with empty kekRef rejects"
  );
  await Assert.rejects(
    ls.decrypt("rt", KEK_LOCAL, []),
    INVALID_ARG_RE,
    "decrypt of empty ciphertext rejects"
  );
});

add_task(async function test_decrypt_no_dek_rejected() {
  const ls = getService();
  // Build a syntactically plausible ciphertext (>0 bytes) under a
  // collection that doesn't exist; FFI must reject NotAvailable.
  await Assert.rejects(
    ls.decrypt("never-created", KEK_LOCAL, [1, 2, 3, 4, 5, 6, 7, 8, 9]),
    /NS_ERROR_NOT_AVAILABLE/,
    "decrypt against a collection without a DEK rejects"
  );
});

add_task(async function test_decrypt_corrupted_ciphertext_rejects() {
  const ls = getService();
  const ct = await ls.encrypt("rt", KEK_LOCAL, bytes("tamper-me"));
  // Flip a bit somewhere inside the AEAD-protected region (skip the
  // cipher-suite tag at index 0 to avoid the early-out that triggers
  // INVALID_ARG instead of an AEAD failure).
  const tampered = new Uint8Array(ct);
  tampered[Math.floor(tampered.length / 2)] ^= 0x01;
  await Assert.rejects(
    ls.decrypt("rt", KEK_LOCAL, Array.from(tampered)),
    /NS_ERROR_/,
    "tampering with ciphertext bytes must reject"
  );
});

add_task(async function test_decrypt_truncated_ciphertext_rejects() {
  const ls = getService();
  const ct = await ls.encrypt("rt", KEK_LOCAL, bytes("truncate-me"));
  // Drop the trailing AEAD tag → decryption must reject.
  const truncated = ct.slice(0, ct.length - 4);
  await Assert.rejects(
    ls.decrypt("rt", KEK_LOCAL, Array.from(truncated)),
    /NS_ERROR_/,
    "truncated ciphertext must reject"
  );
});

add_task(async function test_decrypt_with_wrong_kek_rejects() {
  const ls = getService();
  // Create a collection wrapped only under KEK_LOCAL.
  await ls.createDek("local-only", KEK_LOCAL, false, 32);
  const ct = await ls.encrypt("local-only", KEK_LOCAL, bytes("wrong-kek"));
  // Decrypting under a KEK that doesn't wrap this DEK must reject. PP
  // is not unlocked here either, but the failure mode we care about is
  // "this KEK doesn't wrap this collection".
  await Assert.rejects(
    ls.decrypt("local-only", KEK_PASSWORD, ct),
    /NS_ERROR_NOT_AVAILABLE/,
    "decrypt under a KEK that does not wrap the collection rejects"
  );
  // Cleanup so listDeks in later tests stays bounded.
  await ls.deleteDek("local-only");
});

add_task(async function test_list_deks_and_delete() {
  const ls = getService();
  await ls.createDek("one", KEK_LOCAL, false, 32);
  await ls.createDek("two", KEK_LOCAL, false, 32);
  const before = await ls.listDeks();
  Assert.ok(before.includes("one"));
  Assert.ok(before.includes("two"));

  await ls.deleteDek("one");
  const after = await ls.listDeks();
  Assert.ok(!after.includes("one"), "deleted collection disappears");
  Assert.ok(after.includes("two"), "other collection remains");

  // Second delete rejects with NotAvailable.
  await Assert.rejects(
    ls.deleteDek("one"),
    /NS_ERROR_NOT_AVAILABLE/,
    "second deleteDek rejects"
  );
  await Assert.rejects(
    ls.deleteDek("never-existed"),
    /NS_ERROR_NOT_AVAILABLE/,
    "deleteDek on missing collection rejects"
  );
});

add_task(async function test_delete_dek_empty_arg_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.deleteDek(""),
    INVALID_ARG_RE,
    "deleteDek with empty arg rejects"
  );
});

add_task(async function test_listKeks_round_trip() {
  const ls = getService();
  await ls.createDek("keks-rt", KEK_LOCAL, false, 32);

  let refs = await ls.listKeks("keks-rt");
  Assert.deepEqual(
    refs,
    [KEK_LOCAL],
    "listKeks reports only KEK_LOCAL after createDek"
  );

  // addKek under Password would require unlock setup; use the local
  // KEK twice as a no-op self-test would fail. Instead, exercise the
  // unknown-collection rejection path here and the addKek/removeKek
  // listing changes are pinned in the gtest where we can use the
  // synthetic test KEK level. In production the round-trip is exercised
  // end-to-end via lockstore-SDR's Password upgrade.
  await Assert.rejects(
    ls.listKeks("never-created"),
    /NS_ERROR_NOT_AVAILABLE/,
    "listKeks against an unknown collection rejects NotAvailable"
  );
  await Assert.rejects(
    ls.listKeks(""),
    /NS_ERROR_NOT_AVAILABLE/,
    "listKeks with empty arg rejects with NotAvailable (collection lookup fails)"
  );

  await ls.deleteDek("keks-rt");
});

add_task(async function test_delete_dek_nonexistent_rejects() {
  const ls = getService();
  await Assert.rejects(
    ls.deleteDek("never-existed-coll"),
    /NS_ERROR_NOT_AVAILABLE/,
    "deleteDek on a missing collection rejects"
  );
});

add_task(async function test_delete_dek_succeeds() {
  const ls = getService();
  await ls.createDek("safe-delete", KEK_LOCAL, false, 32);
  await ls.deleteDek("safe-delete");
  await Assert.rejects(
    ls.encrypt("safe-delete", KEK_LOCAL, bytes("nope")),
    /NS_ERROR_NOT_AVAILABLE/,
    "DEK is gone after deleteDek"
  );
});

add_task(async function test_delete_dek_nonexistent_rejects() {
  const ls = getService();
  await Assert.rejects(
    ls.deleteDek("never-existed-coll-2"),
    /NS_ERROR_NOT_AVAILABLE/,
    "deleteDek on a missing collection rejects"
  );
});

add_task(async function test_delete_dek_empty_arg_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.deleteDek(""),
    INVALID_ARG_RE,
    "deleteDek with empty arg rejects"
  );
});

add_task(async function test_password_lifecycle() {
  const ls = getService();

  // NOTE: production iterations are 800 000; expect ~1s per
  // unlockKek call on modern hardware. The unlock runs off-main-thread.
  Assert.ok(!ls.isKekUnlocked(KEK_PASSWORD), "freshly minted, starts locked");

  // Wrong password rejected; cache stays empty.
  await Assert.rejects(
    ls.unlockKek(KEK_PASSWORD, PW_WRONG, 60000),
    /NS_ERROR_ABORT/,
    "wrong password rejected"
  );
  Assert.ok(
    !ls.isKekUnlocked(KEK_PASSWORD),
    "wrong password does not populate cache"
  );

  await ls.unlockKek(KEK_PASSWORD, PW, 60000);
  Assert.ok(ls.isKekUnlocked(KEK_PASSWORD), "correct password unlocks");

  // Encrypt/decrypt under the Password KEK while unlocked.
  await ls.createDek("pw-col", KEK_PASSWORD, false, 32);
  const ct = await ls.encrypt("pw-col", KEK_PASSWORD, bytes("secret"));
  const round = await ls.decrypt("pw-col", KEK_PASSWORD, ct);
  Assert.equal(str(round), "secret", "Password roundtrip while unlocked");

  // Locking invalidates the cache; subsequent encrypt rejects.
  await ls.lockKek(KEK_PASSWORD);
  Assert.ok(!ls.isKekUnlocked(KEK_PASSWORD));
  await Assert.rejects(
    ls.encrypt("pw-col", KEK_PASSWORD, bytes("nope")),
    /NS_ERROR_NOT_AVAILABLE/,
    "encrypt under locked Password kek rejects with Locked"
  );

  await ls.deleteDek("pw-col");
});

add_task(async function test_multiple_password_keks_unlock_independently() {
  const ls = getService();
  // Two independent password KEKs minted with different passwords.
  const kekA = await mintPasswordKek(PW);
  const kekB = await mintPasswordKek(PW2);
  Assert.notEqual(kekA, kekB, "createKek mints distinct kek_refs each call");

  await ls.unlockKek(kekA, PW, 60000);
  Assert.ok(ls.isKekUnlocked(kekA));
  Assert.ok(!ls.isKekUnlocked(kekB), "kek B is unaffected by kek A's unlock");

  // PW2 is correct for kekB but wrong for kekA.
  await Assert.rejects(
    ls.unlockKek(kekA, PW2, 60000),
    /NS_ERROR_ABORT/,
    "PW2 is wrong for kekA"
  );
  await ls.unlockKek(kekB, PW2, 60000);
  Assert.ok(ls.isKekUnlocked(kekB));

  // lockKek scopes per-kek_ref.
  await ls.lockKek(kekA);
  Assert.ok(!ls.isKekUnlocked(kekA));
  Assert.ok(ls.isKekUnlocked(kekB), "kek B still unlocked after kek A locked");

  await ls.lockKek(kekB);
});

add_task(async function test_add_remove_kek() {
  const ls = getService();
  // Already unlocked from prior task; re-unlock defensively.
  if (!ls.isKekUnlocked(KEK_PASSWORD)) {
    await ls.unlockKek(KEK_PASSWORD, PW, 60000);
  }

  await ls.createDek("multi", KEK_LOCAL, true, 32);
  await ls.addKek("multi", KEK_LOCAL, KEK_PASSWORD);

  const ct = await ls.encrypt("multi", KEK_LOCAL, bytes("shared DEK"));
  const round = await ls.decrypt("multi", KEK_PASSWORD, ct);
  Assert.equal(str(round), "shared DEK", "same DEK decrypts via either KEK");

  await ls.removeKek("multi", KEK_PASSWORD);
  await Assert.rejects(
    ls.encrypt("multi", KEK_PASSWORD, bytes("nope")),
    /NS_ERROR_NOT_AVAILABLE/,
    "removed KEK is gone"
  );
});

add_task(async function test_remove_last_kek_rejected() {
  const ls = getService();
  // "multi" is now wrapped only under KEK_LOCAL (PP wrapping was
  // removed in the previous task). Removing the last wrapping must
  // fail to avoid silently orphaning the DEK.
  await Assert.rejects(
    ls.removeKek("multi", KEK_LOCAL),
    /NS_ERROR_/,
    "removing the last remaining wrapping must reject"
  );
  // Sanity: collection still usable.
  const ct = await ls.encrypt("multi", KEK_LOCAL, bytes("still here"));
  Assert.equal(
    str(await ls.decrypt("multi", KEK_LOCAL, ct)),
    "still here",
    "DEK unchanged after rejected remove"
  );
});

add_task(async function test_remove_kek_not_present_rejects() {
  const ls = getService();
  // KEK_PASSWORD doesn't wrap "multi" anymore; removing a non-present
  // wrapping must reject (vs. silently no-op).
  await Assert.rejects(
    ls.removeKek("multi", KEK_PASSWORD),
    /NS_ERROR_/,
    "removeKek of a kekRef that is not currently wrapping rejects"
  );
});

add_task(async function test_add_kek_missing_collection_rejects() {
  const ls = getService();
  if (!ls.isKekUnlocked(KEK_PASSWORD)) {
    await ls.unlockKek(KEK_PASSWORD, PW, 60000);
  }
  await Assert.rejects(
    ls.addKek("never-created-coll", KEK_LOCAL, KEK_PASSWORD),
    /NS_ERROR_NOT_AVAILABLE/,
    "addKek against a collection without a DEK rejects"
  );
});

add_task(async function test_add_kek_empty_args_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.addKek("", KEK_LOCAL, KEK_PASSWORD),
    INVALID_ARG_RE,
    "addKek with empty collection rejects"
  );
  await Assert.rejects(
    ls.addKek("multi", "", KEK_PASSWORD),
    INVALID_ARG_RE,
    "addKek with empty fromKekRef rejects"
  );
  await Assert.rejects(
    ls.addKek("multi", KEK_LOCAL, ""),
    INVALID_ARG_RE,
    "addKek with empty toKekRef rejects"
  );
});

add_task(async function test_remove_kek_empty_args_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.removeKek("", KEK_LOCAL),
    INVALID_ARG_RE,
    "removeKek with empty collection rejects"
  );
  await Assert.rejects(
    ls.removeKek("multi", ""),
    INVALID_ARG_RE,
    "removeKek with empty kekRef rejects"
  );
});

add_task(async function test_local_key_is_always_unlocked() {
  const ls = getService();
  Assert.ok(ls.isKekUnlocked(KEK_LOCAL), "LocalKey always unlocked");
  await ls.lockKek(KEK_LOCAL); // no-op
  Assert.ok(ls.isKekUnlocked(KEK_LOCAL), "LocalKey still unlocked after lock");
  await ls.unlockKek(KEK_LOCAL, "", 60000); // no-op
  Assert.ok(ls.isKekUnlocked(KEK_LOCAL));
});

add_task(async function test_lock_all() {
  const ls = getService();
  if (!ls.isKekUnlocked(KEK_PASSWORD)) {
    await ls.unlockKek(KEK_PASSWORD, PW, 60000);
  }
  Assert.ok(ls.isKekUnlocked(KEK_PASSWORD), "PP unlocked before lock()");
  await ls.lock();
  Assert.ok(!ls.isKekUnlocked(KEK_PASSWORD), "PP locked after lock()");
  Assert.ok(ls.isKekUnlocked(KEK_LOCAL), "LocalKey unaffected by lock()");
});

add_task(async function test_unknown_kek_ref_rejected() {
  const ls = getService();
  const BOGUS = "lockstore::kek::bogus";
  // Every kek_ref-taking method validates the prefix; a malformed
  // kek_ref surfaces as InvalidKekRef (NS_ERROR_INVALID_ARG).
  Assert.throws(
    () => ls.isKekUnlocked(BOGUS),
    INVALID_ARG_RE,
    "isKekUnlocked rejects an unknown kek_ref"
  );
  await Assert.rejects(
    ls.unlockKek(BOGUS, "whatever", 60000),
    INVALID_ARG_RE,
    "unlockKek rejects an unknown kek_ref"
  );
  await Assert.rejects(
    ls.lockKek(BOGUS),
    INVALID_ARG_RE,
    "lockKek rejects an unknown kek_ref"
  );
});

add_task(async function test_empty_kek_ref_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.unlockKek("", "pw", 60000),
    INVALID_ARG_RE,
    "empty kek_ref rejected by unlockKek"
  );
  await Assert.rejects(
    ls.lockKek(""),
    INVALID_ARG_RE,
    "empty kek_ref rejected by lockKek"
  );
  Assert.throws(
    () => ls.isKekUnlocked(""),
    INVALID_ARG_RE,
    "empty kek_ref rejected by isKekUnlocked"
  );
});

add_task(async function test_pkcs11_unknown_kek_ref_rejected() {
  // No PKCS#11 token is registered in the xpcshell harness, so we can
  // only exercise error paths for the PKCS#11 branch. A kek_ref that
  // has no persisted Pkcs11KekRecord must reject without touching any
  // slot.
  const ls = getService();
  const bogusPkcs11 = "lockstore::kek::pkcs11:not-a-real-record";
  await Assert.rejects(
    ls.unlockKek(bogusPkcs11, "pin-bytes", 60000),
    /NS_ERROR_(NOT_AVAILABLE|INVALID_ARG|ILLEGAL_VALUE|FAILURE)/,
    "unknown PKCS#11 kek_ref rejected"
  );
});

// The service serialises FFI on a private queue. Multiple in-flight
// async ops must all complete and produce distinct ciphertexts.
add_task(async function test_concurrent_encrypts_serialised() {
  const ls = getService();
  await ls.createDek("concurrent", KEK_LOCAL, false, 32);

  const N = 8;
  const pt = bytes("parallel-but-serialised");
  const cts = await Promise.all(
    Array.from({ length: N }, () => ls.encrypt("concurrent", KEK_LOCAL, pt))
  );
  Assert.equal(cts.length, N, "every concurrent encrypt resolved");

  // All ciphertexts of the same plaintext must be unique (random nonce).
  const seen = new Set();
  for (const ct of cts) {
    seen.add(Array.from(ct).join(","));
  }
  Assert.equal(
    seen.size,
    N,
    "every concurrent encrypt produced a unique ciphertext"
  );

  // All decrypt back to the original plaintext.
  const rounds = await Promise.all(
    cts.map(ct => ls.decrypt("concurrent", KEK_LOCAL, ct))
  );
  for (const r of rounds) {
    Assert.equal(str(r), "parallel-but-serialised");
  }

  await ls.deleteDek("concurrent");
});

add_task(async function test_concurrent_mixed_ops() {
  const ls = getService();
  // Mix createDek / encrypt / listDeks / deleteDek in flight.
  const colls = ["mix-a", "mix-b", "mix-c"];
  await Promise.all(colls.map(c => ls.createDek(c, KEK_LOCAL, false, 32)));

  const collsAfter = await ls.listDeks();
  for (const c of colls) {
    Assert.ok(collsAfter.includes(c), `${c} present after concurrent create`);
  }

  // Encrypt under each in parallel.
  const cts = await Promise.all(
    colls.map(c => ls.encrypt(c, KEK_LOCAL, bytes(c)))
  );

  // Decrypt under each in parallel.
  const rounds = await Promise.all(
    colls.map((c, i) => ls.decrypt(c, KEK_LOCAL, cts[i]))
  );
  for (let i = 0; i < colls.length; i++) {
    Assert.equal(str(rounds[i]), colls[i], `${colls[i]} round-trips correctly`);
  }

  // Cleanup in parallel.
  await Promise.all(colls.map(c => ls.deleteDek(c)));
  const collsFinal = await ls.listDeks();
  for (const c of colls) {
    Assert.ok(!collsFinal.includes(c), `${c} cleaned up`);
  }
});

add_task(async function test_import_dek_roundtrip() {
  const ls = getService();
  // 32 known bytes — pattern, not crypto-quality.
  const dek = new Uint8Array(32);
  for (let i = 0; i < dek.length; i++) {
    dek[i] = (i + 1) & 0xff;
  }

  await ls.importDek("imported", KEK_LOCAL, dek, true);

  const round = await ls.getDek("imported", KEK_LOCAL);
  Assert.equal(round.length, 32, "exported DEK is 32 bytes");
  for (let i = 0; i < 32; i++) {
    Assert.equal(round[i], dek[i], `byte ${i} round-trips`);
  }

  // Sanity: encrypt/decrypt under the imported DEK.
  const ct = await ls.encrypt("imported", KEK_LOCAL, bytes("payload"));
  Assert.equal(str(await ls.decrypt("imported", KEK_LOCAL, ct)), "payload");

  await ls.deleteDek("imported");
});

add_task(async function test_import_dek_wrong_length_rejected() {
  const ls = getService();
  const short = new Uint8Array(16);
  await Assert.rejects(
    ls.importDek("short", KEK_LOCAL, short, true),
    /NS_ERROR_FAILURE/,
    "importDek with non-32-byte input rejects (InvalidConfiguration)"
  );
});

add_task(async function test_import_dek_empty_args_rejected() {
  const ls = getService();
  const dek = new Uint8Array(32);
  await Assert.rejects(
    ls.importDek("", KEK_LOCAL, dek, true),
    INVALID_ARG_RE,
    "importDek with empty collection rejects"
  );
  await Assert.rejects(
    ls.importDek("c", "", dek, true),
    INVALID_ARG_RE,
    "importDek with empty kekRef rejects"
  );
  await Assert.rejects(
    ls.importDek("c", KEK_LOCAL, [], true),
    INVALID_ARG_RE,
    "importDek with empty dekBytes rejects"
  );
});

add_task(async function test_import_dek_duplicate_rejected() {
  const ls = getService();
  const dek = new Uint8Array(32);
  await ls.importDek("dup", KEK_LOCAL, dek, true);
  await Assert.rejects(
    ls.importDek("dup", KEK_LOCAL, dek, true),
    /NS_ERROR_FAILURE/,
    "importDek on an existing collection rejects"
  );
  await ls.deleteDek("dup");
});

add_task(async function test_is_dek_extractable_true() {
  const ls = getService();
  await ls.createDek("extract-yes", KEK_LOCAL, true, 32);
  Assert.equal(
    await ls.isDekExtractable("extract-yes"),
    true,
    "isDekExtractable reflects extractable=true at creation"
  );
  await ls.deleteDek("extract-yes");
});

add_task(async function test_is_dek_extractable_false() {
  const ls = getService();
  await ls.createDek("extract-no", KEK_LOCAL, false, 32);
  Assert.equal(
    await ls.isDekExtractable("extract-no"),
    false,
    "isDekExtractable reflects extractable=false at creation"
  );
  await ls.deleteDek("extract-no");
});

add_task(async function test_is_dek_extractable_missing_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.isDekExtractable("never-existed-coll"),
    /NS_ERROR_NOT_AVAILABLE/,
    "isDekExtractable on a missing collection rejects"
  );
});

add_task(async function test_switch_kek_round_trip() {
  const ls = getService();
  if (!ls.isKekUnlocked(KEK_PASSWORD)) {
    await ls.unlockKek(KEK_PASSWORD, PW, 60000);
  }

  await ls.createDek("switch-rt", KEK_LOCAL, false, 32);
  // Produce ciphertext under the OLD kek_ref; after switching to PP the
  // same ciphertext must still decrypt — switch_kek changes only the
  // wrapping, not the DEK bytes.
  const ct = await ls.encrypt("switch-rt", KEK_LOCAL, bytes("preserved"));

  await ls.switchKek("switch-rt", KEK_LOCAL, KEK_PASSWORD);

  const refs = await ls.listKeks("switch-rt");
  Assert.deepEqual(
    refs,
    [KEK_PASSWORD],
    "only the new kekRef wraps the collection after switch"
  );

  Assert.equal(
    str(await ls.decrypt("switch-rt", KEK_PASSWORD, ct)),
    "preserved",
    "ciphertext decrypts under the new kekRef (DEK bytes preserved)"
  );

  await Assert.rejects(
    ls.decrypt("switch-rt", KEK_LOCAL, ct),
    /NS_ERROR_NOT_AVAILABLE/,
    "old kekRef no longer wraps the collection"
  );

  await ls.deleteDek("switch-rt");
});

add_task(async function test_switch_kek_same_ref_rejected() {
  const ls = getService();
  await ls.createDek("same-ref", KEK_LOCAL, false, 32);
  await Assert.rejects(
    ls.switchKek("same-ref", KEK_LOCAL, KEK_LOCAL),
    /NS_ERROR_FAILURE/,
    "switchKek(old == new) rejects as InvalidConfiguration"
  );
  await ls.deleteDek("same-ref");
});

add_task(async function test_switch_kek_empty_args_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.switchKek("", KEK_LOCAL, KEK_PASSWORD),
    INVALID_ARG_RE,
    "switchKek with empty collection rejects"
  );
  await Assert.rejects(
    ls.switchKek("c", "", KEK_PASSWORD),
    INVALID_ARG_RE,
    "switchKek with empty oldKekRef rejects"
  );
  await Assert.rejects(
    ls.switchKek("c", KEK_LOCAL, ""),
    INVALID_ARG_RE,
    "switchKek with empty newKekRef rejects"
  );
});

add_task(async function test_switch_kek_missing_collection_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.switchKek("never-existed", KEK_LOCAL, KEK_PASSWORD),
    /NS_ERROR_NOT_AVAILABLE/,
    "switchKek on a missing collection rejects"
  );
});

// ---------------------------------------------------------------------------
// deleteKek
// ---------------------------------------------------------------------------

add_task(async function test_delete_kek_drops_unreferenced_local() {
  const ls = getService();
  const ephemeral = await mintLocalKek();
  await ls.deleteKek(ephemeral);
  await Assert.rejects(
    ls.createDek("dk-after-delete", ephemeral, false, 32),
    /NS_ERROR/,
    "createDek under a deleted local kek_ref fails"
  );
});

add_task(async function test_delete_kek_drops_unreferenced_password() {
  const ls = getService();
  const ephemeral = await mintPasswordKek(PW);
  await ls.deleteKek(ephemeral);
  await Assert.rejects(
    ls.unlockKek(ephemeral, PW, /*timeoutMs*/ 60_000),
    /NS_ERROR/,
    "unlockKek on a deleted password kek_ref fails"
  );
});

add_task(async function test_delete_kek_rejects_when_in_use() {
  const ls = getService();
  const ephemeral = await mintLocalKek();
  await ls.createDek("dk-in-use", ephemeral, false, 32);
  await Assert.rejects(
    ls.deleteKek(ephemeral),
    /NS_ERROR_FAILURE/,
    "deleteKek of a kek_ref that still wraps a DEK is rejected"
  );
});

add_task(async function test_delete_kek_unknown_ref_rejects() {
  const ls = getService();
  await Assert.rejects(
    ls.deleteKek("lockstore::kek::local:AAAAAAAAAAAAAAAAAAAAAA"),
    /NS_ERROR_NOT_AVAILABLE/,
    "deleteKek on an unknown kek_ref rejects with NOT_AVAILABLE"
  );
});

add_task(async function test_delete_kek_invalid_arg_rejected() {
  const ls = getService();
  await Assert.rejects(
    ls.deleteKek(""),
    INVALID_ARG_RE,
    "deleteKek with empty kek_ref is rejected"
  );
  await Assert.rejects(
    ls.deleteKek("not-a-valid-kek-ref"),
    /NS_ERROR/,
    "deleteKek with malformed kek_ref is rejected"
  );
});
