/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef __ClassOfService_h__
#define __ClassOfService_h__

#include "nsIClassOfService.h"
#include "nsPrintfCString.h"

namespace IPC {
template <class P>
struct ParamTraits;
}  // namespace IPC

namespace mozilla::net {

class ClassOfService {
 public:
  ClassOfService() = default;
  ClassOfService(unsigned long flags, bool incremental)
      : mClassFlags(flags), mIncremental(incremental) {}

  // class flags (priority)
  unsigned long Flags() const { return mClassFlags; }
  void SetFlags(unsigned long flags) { mClassFlags = flags; }

  // incremental flags
  bool Incremental() const { return mIncremental; }
  void SetIncremental(bool incremental) { mIncremental = incremental; }

  nsIClassOfService::FetchPriority FetchPriority() { return mFetchPriority; }
  void SetFetchPriority(nsIClassOfService::FetchPriority aPriority) {
    mFetchPriority = aPriority;
  }

  static void ToString(const ClassOfService aCos, nsACString& aOut) {
    return ToString(aCos.Flags(), aOut);
  }

  static void ToString(unsigned long aFlags, nsACString& aOut) {
    aOut = nsPrintfCString("%lX", aFlags);
  }

 private:
  unsigned long mClassFlags = 0;
  bool mIncremental = false;
  nsIClassOfService::FetchPriority mFetchPriority =
      nsIClassOfService::FETCHPRIORITY_UNSET;
  friend IPC::ParamTraits<mozilla::net::ClassOfService>;
  friend bool operator==(const ClassOfService& lhs, const ClassOfService& rhs);
  friend bool operator!=(const ClassOfService& lhs, const ClassOfService& rhs);
};

inline bool operator==(const ClassOfService& lhs, const ClassOfService& rhs) {
  return lhs.mClassFlags == rhs.mClassFlags &&
         lhs.mIncremental == rhs.mIncremental &&
         lhs.mFetchPriority == rhs.mFetchPriority;
}

inline bool operator!=(const ClassOfService& lhs, const ClassOfService& rhs) {
  return !(lhs == rhs);
}

}  // namespace mozilla::net

#endif
