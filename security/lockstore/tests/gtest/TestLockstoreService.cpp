/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <atomic>
#include <set>

#include "gtest/gtest.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "mozilla/gtest/MozAssertions.h"
#include "LockstoreService.h"
#include "nsString.h"
#include "nsTArray.h"
#include "nsThreadUtils.h"

using namespace mozilla;
using namespace mozilla::security::lockstore;

namespace {

nsCString UniqueCollection(const char* aPrefix) {
  // Service-level state is a process-wide singleton bound to the test
  // profile, so we suffix every collection with a counter to keep tests
  // independent within the same binary run.
  static uint32_t sCounter = 0;
  nsCString out;
  out.AppendASCII(aPrefix);
  out.AppendLiteral("-");
  out.AppendInt(++sCounter);
  return out;
}

// Runs `aFn` on a background task and spins the main loop until it
// completes. Used to drive the off-main-thread sync `Do*` methods from
// gtest, which runs on the main thread.
template <typename Fn>
void RunOnBackground(Fn&& aFn) {
  // `done` is touched only on the main thread (set by the completion
  // runnable, read by the predicate), so it needs no synchronization.
  bool done = false;
  MOZ_ALWAYS_SUCCEEDS(NS_DispatchBackgroundTask(NS_NewRunnableFunction(
      "TestLockstoreService::RunOnBackground",
      [&done, fn = std::forward<Fn>(aFn)]() mutable {
        fn();
        // The predicate is satisfied from this background task, so post
        // completion back to the main thread. This wakes the blocked
        // NS_ProcessNextEvent inside SpinEventLoopUntil; otherwise the spin
        // only re-checks `done` when unrelated event-loop traffic happens to
        // wake the main thread, and those incidental wakeups grow sparse as
        // the process quiesces -- stretching each wait until it trips the
        // gtest no-output watchdog.
        NS_DispatchToMainThread(NS_NewRunnableFunction(
            "TestLockstoreService::RunOnBackground::Done",
            [&done] { done = true; }));
      })));
  MOZ_ALWAYS_TRUE(
      SpinEventLoopUntil("RunOnBackground"_ns, [&done]() { return done; }));
}

nsTArray<uint8_t> Bytes(const char* aLiteral) {
  nsTArray<uint8_t> out;
  out.AppendElements(reinterpret_cast<const uint8_t*>(aLiteral),
                     strlen(aLiteral));
  return out;
}

}  // namespace

class LockstoreServiceTest : public ::testing::Test {
 protected:
  void SetUp() override {
    mService = LockstoreService::GetSingleton();
    ASSERT_TRUE(mService)
    << "LockstoreService singleton must be obtainable";

    // Mint two fresh LocalKey kek_refs for this test. Every test gets
    // independent kek_refs so collection lifetimes don't interfere
    // across tests sharing the process-wide service singleton, and
    // tests that need "a different KEK" (wrong-kek decrypt, addKek)
    // have a second one to reach for.
    RunOnBackground([&]() {
      auto k1 = mService->DoCreateKek("local"_ns, /*identifier=*/""_ns, ""_ns,
                                      /*cacheTimeoutMs=*/0);
      ASSERT_TRUE(k1.isOk())
      << "DoCreateKek(local) must succeed";
      mLocalKek = k1.unwrap();
      ASSERT_FALSE(mLocalKek.IsEmpty())
      << "DoCreateKek(local) must mint a non-empty kek_ref";

      auto k2 = mService->DoCreateKek("local"_ns, /*identifier=*/""_ns, ""_ns,
                                      /*cacheTimeoutMs=*/0);
      ASSERT_TRUE(k2.isOk())
      << "DoCreateKek(local) must succeed";
      mOtherKek = k2.unwrap();
      ASSERT_FALSE(mOtherKek.IsEmpty())
      << "DoCreateKek(local) must mint a non-empty kek_ref";
    });
  }

  void TearDown() override {
    // The service singleton persists across the gtest binary, so any KEKs
    // left behind accumulate in the store. Drop the per-test KEKs to keep
    // each test's footprint bounded. Best-effort: a test that already
    // deleted its KEKs (or never finished SetUp) sees the second call no-op.
    if (mLocalKek.IsEmpty() && mOtherKek.IsEmpty()) {
      return;
    }
    RunOnBackground([&]() {
      if (!mLocalKek.IsEmpty()) {
        mService->DoDeleteKek(mLocalKek);
      }
      if (!mOtherKek.IsEmpty()) {
        mService->DoDeleteKek(mOtherKek);
      }
    });
  }

  // Fresh-per-test LocalKey kek_refs.
  nsCString mLocalKek;
  nsCString mOtherKek;
  RefPtr<LockstoreService> mService;
};

// ---------------------------------------------------------------------------
// Singleton / lifecycle
// ---------------------------------------------------------------------------

TEST_F(LockstoreServiceTest, SingletonIdentity) {
  RefPtr<LockstoreService> a = LockstoreService::GetSingleton();
  RefPtr<LockstoreService> b = LockstoreService::GetSingleton();
  EXPECT_EQ(a.get(), b.get()) << "GetSingleton must return the same instance";
}

// ---------------------------------------------------------------------------
// createDek / listCollections / deleteDek
// ---------------------------------------------------------------------------

TEST_F(LockstoreServiceTest, CreateAndDeleteDek) {
  nsCString coll = UniqueCollection("create-delete");

  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    auto collectionsResult = mService->DoListDeks();
    ASSERT_TRUE(collectionsResult.isOk());
    auto collections = collectionsResult.unwrap();
    bool found = false;
    for (const auto& c : collections) {
      if (c == coll) {
        found = true;
        break;
      }
    }
    EXPECT_TRUE(found) << "Created collection should appear in listCollections";

    EXPECT_NS_SUCCEEDED(mService->DoDeleteDek(coll));

    // Second call rejects since the DEK is gone.
    EXPECT_EQ(mService->DoDeleteDek(coll), NS_ERROR_NOT_AVAILABLE);
  });
}

TEST_F(LockstoreServiceTest, CreateDek_DuplicateRejects) {
  nsCString coll = UniqueCollection("dup");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    EXPECT_EQ(mService->DoCreateDek(coll, mLocalKek, /*extractable=*/false,
                                    /*keySize=*/32),
              NS_ERROR_FAILURE)
        << "createDek on an existing collection must reject";

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, CreateDek_RejectsEmptyCollection) {
  RunOnBackground([&]() {
    EXPECT_EQ(mService->DoCreateDek(""_ns, mLocalKek, /*extractable=*/false,
                                    /*keySize=*/32),
              NS_ERROR_INVALID_ARG);
  });
}

TEST_F(LockstoreServiceTest, CreateDek_RejectsEmptyKekRef) {
  nsCString coll = UniqueCollection("empty-kek");
  RunOnBackground([&]() {
    EXPECT_EQ(mService->DoCreateDek(coll, ""_ns, /*extractable=*/false,
                                    /*keySize=*/32),
              NS_ERROR_INVALID_ARG);
  });
}

TEST_F(LockstoreServiceTest, DeleteDek_RejectsEmptyArg) {
  RunOnBackground(
      [&]() { EXPECT_EQ(mService->DoDeleteDek(""_ns), NS_ERROR_INVALID_ARG); });
}

TEST_F(LockstoreServiceTest, ListDeks_ContainsCreated) {
  // Create three uniquely-named collections; listCollections must
  // include all three. The list may also include collections from
  // unrelated tests, so we only assert subset, not equality.
  nsCString a = UniqueCollection("list-a");
  nsCString b = UniqueCollection("list-b");
  nsCString c = UniqueCollection("list-c");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        a, mLocalKek, /*extractable=*/false, /*keySize=*/32));
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        b, mLocalKek, /*extractable=*/false, /*keySize=*/32));
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        c, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    auto listResult = mService->DoListDeks();
    ASSERT_TRUE(listResult.isOk());
    auto list = listResult.unwrap();
    std::set<nsCString> names;
    for (const auto& n : list) {
      names.insert(n);
    }
    EXPECT_TRUE(names.count(a)) << "listCollections missing " << a.get();
    EXPECT_TRUE(names.count(b)) << "listCollections missing " << b.get();
    EXPECT_TRUE(names.count(c)) << "listCollections missing " << c.get();

    mService->DoDeleteDek(a);
    mService->DoDeleteDek(b);
    mService->DoDeleteDek(c);
  });
}

// ---------------------------------------------------------------------------
// listKeks
// ---------------------------------------------------------------------------

TEST_F(LockstoreServiceTest, ListKeks_ReflectsCreateDek) {
  nsCString coll = UniqueCollection("keks-create");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    auto refsResult = mService->DoListKeks(coll);
    ASSERT_TRUE(refsResult.isOk());
    auto refs = refsResult.unwrap();
    ASSERT_EQ(refs.Length(), 1u);
    EXPECT_EQ(refs[0], mLocalKek);

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, ListKeks_RejectsNoDek) {
  nsCString coll = UniqueCollection("keks-missing");
  RunOnBackground([&]() {
    auto refsResult = mService->DoListKeks(coll);
    EXPECT_TRUE(refsResult.isErr());
    EXPECT_EQ(refsResult.unwrapErr(), NS_ERROR_NOT_AVAILABLE);
  });
}

TEST_F(LockstoreServiceTest, ListKeks_RejectsEmptyCollection) {
  RunOnBackground([&]() {
    auto refsResult = mService->DoListKeks(""_ns);
    EXPECT_TRUE(refsResult.isErr());
    // Empty / unknown collection surfaces as NS_ERROR_NOT_AVAILABLE: the
    // keystore layer rejects the lookup with `NotFound`, which the FFI
    // maps via `error_to_nsresult`. The FFI no longer pre-rejects empty
    // strings at the boundary.
    EXPECT_EQ(refsResult.unwrapErr(), NS_ERROR_NOT_AVAILABLE);
  });
}

// ---------------------------------------------------------------------------
// encrypt / decrypt
// ---------------------------------------------------------------------------

TEST_F(LockstoreServiceTest, EncryptDecryptRoundtrip) {
  nsCString coll = UniqueCollection("roundtrip");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    auto ctResult = mService->DoEncrypt(coll, mLocalKek, Bytes("hello world"));
    ASSERT_TRUE(ctResult.isOk());
    auto ciphertext = ctResult.unwrap();
    EXPECT_GT(ciphertext.Length(), 0u);

    auto ptResult = mService->DoDecrypt(coll, mLocalKek, ciphertext);
    ASSERT_TRUE(ptResult.isOk());
    auto plaintext = ptResult.unwrap();
    nsCString joined;
    for (uint8_t b : plaintext) {
      joined.Append(static_cast<char>(b));
    }
    EXPECT_STREQ(joined.get(), "hello world");

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, Encrypt_YieldsUniqueCiphertexts) {
  nsCString coll = UniqueCollection("nonce");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    auto a = mService->DoEncrypt(coll, mLocalKek, Bytes("same"));
    auto b = mService->DoEncrypt(coll, mLocalKek, Bytes("same"));
    ASSERT_TRUE(a.isOk());
    ASSERT_TRUE(b.isOk());
    auto ctA = a.unwrap();
    auto ctB = b.unwrap();
    EXPECT_NE(ctA, ctB) << "Repeated encrypts of the same plaintext must "
                           "yield distinct ciphertexts (random nonce)";

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, Decrypt_CorruptedCiphertextRejects) {
  nsCString coll = UniqueCollection("corrupt");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    auto ctResult = mService->DoEncrypt(coll, mLocalKek, Bytes("payload"));
    ASSERT_TRUE(ctResult.isOk());
    auto ct = ctResult.unwrap();
    // Flip a byte in the middle to corrupt the AEAD tag.
    if (ct.Length() > 0) {
      ct[ct.Length() / 2] ^= 0xff;
    }

    auto ptResult = mService->DoDecrypt(coll, mLocalKek, ct);
    EXPECT_TRUE(ptResult.isErr());

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, Decrypt_TruncatedCiphertextRejects) {
  nsCString coll = UniqueCollection("trunc");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    auto ctResult = mService->DoEncrypt(coll, mLocalKek, Bytes("payload"));
    ASSERT_TRUE(ctResult.isOk());
    auto ct = ctResult.unwrap();
    if (ct.Length() > 8) {
      ct.SetLength(ct.Length() / 2);
    }

    auto ptResult = mService->DoDecrypt(coll, mLocalKek, ct);
    EXPECT_TRUE(ptResult.isErr());

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, Decrypt_WrongKekRejects) {
  nsCString coll = UniqueCollection("wrong-kek");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    auto ctResult = mService->DoEncrypt(coll, mLocalKek, Bytes("payload"));
    ASSERT_TRUE(ctResult.isOk());
    auto ct = ctResult.unwrap();

    auto ptResult = mService->DoDecrypt(coll, mOtherKek, ct);
    EXPECT_TRUE(ptResult.isErr());

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, Encrypt_NoDekRejects) {
  nsCString coll = UniqueCollection("no-dek");
  RunOnBackground([&]() {
    auto ctResult = mService->DoEncrypt(coll, mLocalKek, Bytes("payload"));
    EXPECT_TRUE(ctResult.isErr());
  });
}

TEST_F(LockstoreServiceTest, Encrypt_RejectsEmptyArgs) {
  nsCString coll = UniqueCollection("empty-enc");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    EXPECT_TRUE(mService->DoEncrypt(""_ns, mLocalKek, Bytes("x")).isErr());
    EXPECT_TRUE(mService->DoEncrypt(coll, ""_ns, Bytes("x")).isErr());

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, Decrypt_NoDekRejects) {
  nsCString coll = UniqueCollection("no-dek-dec");
  RunOnBackground([&]() {
    nsTArray<uint8_t> bogus;
    bogus.AppendElements(static_cast<const uint8_t*>(
                             reinterpret_cast<const uint8_t*>("\0\0\0\0\0\0")),
                         6);
    auto ptResult = mService->DoDecrypt(coll, mLocalKek, bogus);
    EXPECT_TRUE(ptResult.isErr());
  });
}

TEST_F(LockstoreServiceTest, Decrypt_RejectsEmptyArgs) {
  nsCString coll = UniqueCollection("empty-dec");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    auto ctResult = mService->DoEncrypt(coll, mLocalKek, Bytes("x"));
    ASSERT_TRUE(ctResult.isOk());
    auto ct = ctResult.unwrap();

    EXPECT_TRUE(mService->DoDecrypt(""_ns, mLocalKek, ct).isErr());
    EXPECT_TRUE(mService->DoDecrypt(coll, ""_ns, ct).isErr());

    mService->DoDeleteDek(coll);
  });
}

// ---------------------------------------------------------------------------
// addKek / removeKek
// ---------------------------------------------------------------------------

TEST_F(LockstoreServiceTest, AddKek_RejectsMissingCollection) {
  nsCString coll = UniqueCollection("addkek-missing");
  RunOnBackground([&]() {
    EXPECT_EQ(mService->DoAddKek(coll, mLocalKek, mOtherKek),
              NS_ERROR_NOT_AVAILABLE);
  });
}

TEST_F(LockstoreServiceTest, AddKek_RejectsEmptyArgs) {
  nsCString coll = UniqueCollection("addkek-empty");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    EXPECT_EQ(mService->DoAddKek(""_ns, mLocalKek, mOtherKek),
              NS_ERROR_INVALID_ARG);
    EXPECT_EQ(mService->DoAddKek(coll, ""_ns, mOtherKek), NS_ERROR_INVALID_ARG);
    EXPECT_EQ(mService->DoAddKek(coll, mLocalKek, ""_ns), NS_ERROR_INVALID_ARG);

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, RemoveKek_RejectsEmptyArgs) {
  nsCString coll = UniqueCollection("rmkek-empty");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    EXPECT_EQ(mService->DoRemoveKek(""_ns, mLocalKek), NS_ERROR_INVALID_ARG);
    EXPECT_EQ(mService->DoRemoveKek(coll, ""_ns), NS_ERROR_INVALID_ARG);

    mService->DoDeleteDek(coll);
  });
}

TEST_F(LockstoreServiceTest, RemoveKek_LastWrappingRejects) {
  nsCString coll = UniqueCollection("rmkek-last");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));

    // Removing the last KEK wrapping must be rejected — otherwise the
    // DEK would become unrecoverable.
    EXPECT_EQ(mService->DoRemoveKek(coll, mLocalKek), NS_ERROR_FAILURE);

    mService->DoDeleteDek(coll);
  });
}

// ---------------------------------------------------------------------------
// Threading: concurrent dispatches all complete with `mMutex`
// serialising under the hood.
// ---------------------------------------------------------------------------

TEST_F(LockstoreServiceTest, ConcurrentEncryptsAllResolveUnique) {
  // Dispatch N encrypts in parallel on independent background tasks.
  // The service's `mMutex` guarantees they execute one at a time;
  // each must produce a distinct ciphertext (random nonce).
  nsCString coll = UniqueCollection("concurrent");
  RunOnBackground([&]() {
    EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
        coll, mLocalKek, /*extractable=*/false, /*keySize=*/32));
  });

  constexpr size_t N = 8;
  nsTArray<nsTArray<uint8_t>> results;
  results.SetLength(N);
  std::atomic<size_t> doneCount{0};

  for (size_t i = 0; i < N; ++i) {
    MOZ_ALWAYS_SUCCEEDS(NS_DispatchBackgroundTask(NS_NewRunnableFunction(
        "ConcurrentEncryptsAllResolveUnique::worker",
        [this, &coll, &results, &doneCount, i]() {
          auto r = mService->DoEncrypt(coll, mLocalKek, Bytes("same-input"));
          if (r.isOk()) {
            results[i] = r.unwrap();
          }
          // Record completion on the main thread so the spin loop is woken
          // promptly (see RunOnBackground).
          NS_DispatchToMainThread(
              NS_NewRunnableFunction("ConcurrentEncryptsAllResolveUnique::done",
                                     [&doneCount]() { ++doneCount; }));
        })));
  }
  MOZ_ALWAYS_TRUE(
      SpinEventLoopUntil("ConcurrentEncryptsAllResolveUnique"_ns,
                         [&doneCount]() { return doneCount.load() == N; }));

  std::set<nsCString> seen;
  for (const auto& ct : results) {
    EXPECT_GT(ct.Length(), 0u);
    nsCString joined;
    for (uint8_t b : ct) {
      joined.AppendInt(static_cast<uint32_t>(b));
      joined.AppendLiteral(",");
    }
    seen.insert(std::move(joined));
  }
  EXPECT_EQ(seen.size(), N)
      << "Every concurrent encrypt must produce a unique ciphertext";

  RunOnBackground([&]() { mService->DoDeleteDek(coll); });
}

TEST_F(LockstoreServiceTest, ConcurrentMixedOpsAllComplete) {
  // Mix createDek / encrypt-decrypt / deleteDek across multiple
  // collections concurrently. All ops must complete without deadlock,
  // and listCollections at the end must reflect the post-cleanup state.
  constexpr size_t N = 4;
  nsTArray<nsCString> colls;
  for (size_t i = 0; i < N; ++i) {
    colls.AppendElement(UniqueCollection("mix"));
  }

  // Concurrent creates.
  std::atomic<size_t> createDone{0};
  for (size_t i = 0; i < N; ++i) {
    const nsCString& c = colls[i];
    MOZ_ALWAYS_SUCCEEDS(NS_DispatchBackgroundTask(NS_NewRunnableFunction(
        "ConcurrentMixedOps::create", [this, &c, &createDone]() {
          EXPECT_NS_SUCCEEDED(mService->DoCreateDek(
              c, mLocalKek, /*extractable=*/false, /*keySize=*/32));
          NS_DispatchToMainThread(
              NS_NewRunnableFunction("ConcurrentMixedOps::create-done",
                                     [&createDone]() { ++createDone; }));
        })));
  }
  MOZ_ALWAYS_TRUE(
      SpinEventLoopUntil("ConcurrentMixedOps::create-wait"_ns,
                         [&createDone]() { return createDone.load() == N; }));

  // Concurrent encrypt + decrypt round-trips per collection.
  std::atomic<size_t> roundtripDone{0};
  for (size_t i = 0; i < N; ++i) {
    const nsCString& c = colls[i];
    MOZ_ALWAYS_SUCCEEDS(NS_DispatchBackgroundTask(NS_NewRunnableFunction(
        "ConcurrentMixedOps::roundtrip", [this, &c, &roundtripDone]() {
          auto ctResult = mService->DoEncrypt(c, mLocalKek, Bytes("payload"));
          EXPECT_TRUE(ctResult.isOk());
          if (ctResult.isOk()) {
            auto ct = ctResult.unwrap();
            EXPECT_GT(ct.Length(), 0u);
            auto ptResult = mService->DoDecrypt(c, mLocalKek, ct);
            EXPECT_TRUE(ptResult.isOk());
            if (ptResult.isOk()) {
              EXPECT_EQ(ptResult.unwrap().Length(), strlen("payload"));
            }
          }
          NS_DispatchToMainThread(
              NS_NewRunnableFunction("ConcurrentMixedOps::roundtrip-done",
                                     [&roundtripDone]() { ++roundtripDone; }));
        })));
  }
  MOZ_ALWAYS_TRUE(SpinEventLoopUntil(
      "ConcurrentMixedOps::roundtrip-wait"_ns,
      [&roundtripDone]() { return roundtripDone.load() == N; }));

  // Concurrent deletes.
  std::atomic<size_t> deleteDone{0};
  for (size_t i = 0; i < N; ++i) {
    const nsCString& c = colls[i];
    MOZ_ALWAYS_SUCCEEDS(NS_DispatchBackgroundTask(NS_NewRunnableFunction(
        "ConcurrentMixedOps::delete", [this, &c, &deleteDone]() {
          EXPECT_NS_SUCCEEDED(mService->DoDeleteDek(c));
          NS_DispatchToMainThread(
              NS_NewRunnableFunction("ConcurrentMixedOps::delete-done",
                                     [&deleteDone]() { ++deleteDone; }));
        })));
  }
  MOZ_ALWAYS_TRUE(
      SpinEventLoopUntil("ConcurrentMixedOps::delete-wait"_ns,
                         [&deleteDone]() { return deleteDone.load() == N; }));

  // Verify listCollections no longer contains any of them.
  RunOnBackground([&]() {
    auto remainingResult = mService->DoListDeks();
    ASSERT_TRUE(remainingResult.isOk());
    auto remaining = remainingResult.unwrap();
    for (const auto& c : colls) {
      for (const auto& r : remaining) {
        EXPECT_NE(r, c) << "Collection " << c.get()
                        << " should be gone but is still listed";
      }
    }
  });
}
