/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef KeyedUUIDMapper_h
#define KeyedUUIDMapper_h

#include "nsIKeyedUUIDMapper.h"
#include "ScopedNSSTypes.h"

namespace mozilla {

class KeyedUUIDMapper final : public nsIKeyedUUIDMapper {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIKEYEDUUIDMAPPER

 private:
  ~KeyedUUIDMapper() = default;
  UniquePK11SymKey mSymKey;
};

}  // namespace mozilla

#endif  // KeyedUUIDMapper_h
