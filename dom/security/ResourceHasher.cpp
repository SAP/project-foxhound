/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "ResourceHasher.h"

#include <cinttypes>

#include "WAICTUtils.h"
#include "nsComponentManagerUtils.h"
#include "nsNetCID.h"

static mozilla::LazyLogModule gResourceHasherLog("ResourceHasher");

namespace mozilla::dom {

using mozilla::waict::gWaictLog;

ResourceHasher::ResourceHasher(nsICryptoHash* aCrypto)
    : mCrypto(aCrypto), mFinalized(false) {}

already_AddRefed<ResourceHasher> ResourceHasher::Init() {
  nsCOMPtr<nsICryptoHash> crypto = do_CreateInstance(NS_CRYPTO_HASH_CONTRACTID);
  if (!crypto) {
    MOZ_LOG(gWaictLog, LogLevel::Warning,
            ("ResourceHasher::Create -- "
             "Failed to create nsICryptoHash\n"));
    return nullptr;
  }

  nsresult rv = crypto->Init(nsICryptoHash::SHA256);
  if (NS_FAILED(rv)) {
    MOZ_LOG(gResourceHasherLog, LogLevel::Warning,
            ("ResourceHasher::Create -- Init failed: 0x%08x",
             static_cast<uint32_t>(rv)));
    return nullptr;
  }

  RefPtr<ResourceHasher> hasher = new ResourceHasher(crypto);
  return hasher.forget();
}

nsresult ResourceHasher::Update(const uint8_t* aData, uint32_t aLength) {
  if (mFinalized) {
    return NS_ERROR_FAILURE;
  }

  if (!mCrypto) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  return mCrypto->Update(aData, aLength);
}

nsresult ResourceHasher::Finish() {
  if (mFinalized) {
    return NS_ERROR_FAILURE;
  }

  if (!mCrypto) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  mFinalized = true;
  nsresult rv = mCrypto->Finish(/* aASCII = */ true, mComputedHash);

  if (NS_SUCCEEDED(rv)) {
    MOZ_LOG(gWaictLog, LogLevel::Debug,
            ("[this=%p] ResourceHasher::Finish -- "
             "Hash computed successfully: %s\n",
             this, mComputedHash.get()));
  } else {
    MOZ_LOG(gWaictLog, LogLevel::Error,
            ("[this=%p] ResourceHasher::Finish -- "
             "Failed to finalize hash rv %" PRIu32 "\n",
             this, static_cast<uint32_t>(rv)));
  }

  return rv;
}

}  // namespace mozilla::dom
