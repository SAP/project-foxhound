// Copyright (c) 2006-2008 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/revocable_store.h"

#include "base/logging.h"

RevocableStore::Revocable::Revocable(RevocableStore* store)
    : store_reference_(store->owning_reference_) {
  // We AddRef() the owning reference.
  DCHECK(store_reference_->store());
  store_reference_->store()->Add(this);
}

RevocableStore::RevocableStore() {
  // Create a new owning reference.
  owning_reference_ = new StoreRef(this);
}

RevocableStore::~RevocableStore() {
  // Revoke all the items in the store.
  owning_reference_->set_store(nullptr);
}

void RevocableStore::Add(Revocable* item) { DCHECK(!item->revoked()); }

void RevocableStore::RevokeAll() {
  // We revoke all the existing items in the store and reset our count.
  owning_reference_->set_store(nullptr);

  // Then we create a new owning reference for new items that get added.
  // This Release()s the old owning reference, allowing it to be freed after
  // all the items that were in the store are eventually destroyed.
  owning_reference_ = new StoreRef(this);
}
