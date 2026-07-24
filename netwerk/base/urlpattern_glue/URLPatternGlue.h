/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef URLPatternGlue_h_
#define URLPatternGlue_h_

#include "mozilla/net/urlpattern_glue.h"
#include "nsTHashMap.h"
#include "mozilla/Maybe.h"
#include "mozilla/Logging.h"

extern mozilla::LazyLogModule gUrlPatternLog;

namespace mozilla::net {

UrlPatternInput CreateUrlPatternInput(const nsACString& url);
UrlPatternInput CreateUrlPatternInput(const UrlPatternInit& init);

MaybeString CreateMaybeString(const nsACString& str, bool valid);
MaybeString CreateMaybeStringNone();

class UrlPatternComponentResult {
 public:
  UrlPatternComponentResult() = default;
  UrlPatternComponentResult(const UrlPatternComponentResult& aOther)
      : mInput(aOther.mInput) {
    for (auto iter = aOther.mGroups.ConstIter(); !iter.Done(); iter.Next()) {
      mGroups.InsertOrUpdate(iter.Key(), iter.Data());
    }
  }
  UrlPatternComponentResult(
      UrlPatternComponentResult&& aOther) noexcept  // move constructor
      : mInput(std::move(aOther.mInput)), mGroups(std::move(aOther.mGroups)) {}
  UrlPatternComponentResult& operator=(
      UrlPatternComponentResult&& aOther) noexcept {  // move assignment
    if (this != &aOther) {
      mInput = std::move(aOther.mInput);
      mGroups = std::move(aOther.mGroups);
    }
    return *this;
  }

  nsAutoCString mInput;
  nsTHashMap<nsCStringHashKey, MaybeString> mGroups;
};

class UrlPatternResult {
 public:
  UrlPatternResult() = default;
  Maybe<UrlPatternComponentResult> mProtocol;
  Maybe<UrlPatternComponentResult> mUsername;
  Maybe<UrlPatternComponentResult> mPassword;
  Maybe<UrlPatternComponentResult> mHostname;
  Maybe<UrlPatternComponentResult> mPort;
  Maybe<UrlPatternComponentResult> mPathname;
  Maybe<UrlPatternComponentResult> mSearch;
  Maybe<UrlPatternComponentResult> mHash;
  CopyableTArray<UrlPatternInput> mInputs;
};

Maybe<UrlPatternResult> UrlPatternExec(UrlPatternGlue aPattern,
                                       const UrlPatternInput& aInput,
                                       Maybe<nsAutoCString> aMaybeBaseUrl,
                                       bool aIgnoreCase = false);

bool UrlPatternTest(UrlPatternGlue aPattern, const UrlPatternInput& aInput,
                    Maybe<nsAutoCString> aMaybeBaseUrl,
                    bool aIgnoreCase = false);

nsAutoCString UrlPatternGetProtocol(const UrlPatternGlue aPattern);
nsAutoCString UrlPatternGetUsername(const UrlPatternGlue aPattern);
nsAutoCString UrlPatternGetPassword(const UrlPatternGlue aPattern);
nsAutoCString UrlPatternGetHostname(const UrlPatternGlue aPattern);
nsAutoCString UrlPatternGetPort(const UrlPatternGlue aPattern);
nsAutoCString UrlPatternGetPathname(const UrlPatternGlue aPattern);
nsAutoCString UrlPatternGetSearch(const UrlPatternGlue aPattern);
nsAutoCString UrlPatternGetHash(const UrlPatternGlue aPattern);

}  // namespace mozilla::net

#endif  // URLPatternGlue_h_
