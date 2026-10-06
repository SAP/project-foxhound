/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_TESTING_TESTUTILS_H_
#define DOM_TESTING_TESTUTILS_H_

#include "mozilla/ErrorResult.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"

class nsIGlobalObject;

namespace mozilla::dom {

class TestUtils {
 public:
  static already_AddRefed<Promise> Gc(const GlobalObject& aGlobal,
                                      ErrorResult& aRv);

 private:
  ~TestUtils() = delete;
};

}  // namespace mozilla::dom

#endif  // DOM_TESTING_TESTUTILS_H_
