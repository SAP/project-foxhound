/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_ChannelClassifierUtils_h
#define mozilla_net_ChannelClassifierUtils_h

#include "nsString.h"

class nsIChannel;

namespace mozilla {
namespace net {

enum class ChannelBlockDecision {
  Blocked,
  Replaced,
  Allowed,
};

class ChannelClassifierUtils final {
 public:
  static nsresult SetBlockedContent(nsIChannel* aChannel, nsresult aErrorCode,
                                    const nsACString& aList,
                                    const nsACString& aProvider,
                                    const nsACString& aFullHash);

  static void AnnotateChannel(nsIChannel* aChannel,
                              uint32_t aClassificationFlags,
                              uint32_t aLoadingState);

  static void AnnotateChannelWithoutNotifying(nsIChannel* aChannel,
                                              uint32_t aClassificationFlags);

  static bool IsAllowListed(nsIChannel* aChannel);

  // Helper function for the Classifier to decide whether to cancel or replace
  // a channel. The resolved block decision (Blocked / Replaced / Allowed) is
  // written to |aOutDecision|.
  static nsresult MaybeBlockChannel(
      nsIChannel* aChannel, const nsACString& aFeatureName,
      const nsACString& aList, nsresult aErrorCode, uint32_t aReplacedEvent,
      uint32_t aAllowedEvent, ChannelBlockDecision* aOutDecision);

  // Returns true if this error is known as one of the blocking error codes.
  static bool IsClassifierBlockingErrorCode(nsresult aError);

  // Returns true if this event is a known blocking state from
  // nsIWebProgressListener.
  static bool IsClassifierBlockingEventCode(uint32_t aEventCode);

  static uint32_t GetClassifierBlockingEventCode(nsresult aErrorCode);

  // This can be called only if IsClassifierBlockingErrorCode(aError) returns
  // true.
  static const char* ClassifierBlockingErrorCodeToConsoleMessage(
      nsresult aError, nsACString& aCategory);

  static bool IsPassiveContent(nsIChannel* aChannel);

  static bool IsTrackingClassificationFlag(uint32_t aFlag, bool aIsPrivate);

  static bool IsSocialTrackingClassificationFlag(uint32_t aFlag);

  static bool IsCryptominingClassificationFlag(uint32_t aFlag, bool aIsPrivate);

  static void SetClassificationFlagsHelper(nsIChannel* aChannel,
                                           uint32_t aClassificationFlags,
                                           bool aIsThirdParty);
};

}  // namespace net
}  // namespace mozilla

#endif  // mozilla_net_ChannelClassifierUtils_h
