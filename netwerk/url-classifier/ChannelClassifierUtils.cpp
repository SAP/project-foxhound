/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/net/ChannelClassifierUtils.h"

#include "ChannelClassifierService.h"
#include "mozilla/AntiTrackingUtils.h"
#include "mozilla/BasePrincipal.h"
#include "mozilla/Components.h"
#include "mozilla/ContentBlockingAllowList.h"
#include "mozilla/ContentBlockingNotifier.h"
#include "mozilla/dom/Document.h"
#include "mozilla/net/ChannelClassifierLog.h"
#include "mozilla/net/HttpBaseChannel.h"
#include "mozilla/StaticPrefs_channelclassifier.h"
#include "mozilla/StaticPrefs_network.h"
#include "mozilla/StaticPrefs_privacy.h"
#include "mozIThirdPartyUtil.h"
#include "nsContentUtils.h"
#include "nsIChannel.h"
#include "nsIClassifiedChannel.h"
#include "nsIDocShell.h"
#include "nsIHttpChannelInternal.h"
#include "nsIParentChannel.h"
#include "nsIScriptError.h"
#include "nsIWebProgressListener.h"
#include "nsNetUtil.h"
#include "nsPIDOMWindowInlines.h"
#include "nsQueryObject.h"

namespace mozilla {
namespace net {

namespace {

struct BlockingErrorCode {
  nsresult mErrorCode;
  uint32_t mBlockingEventCode;
  const char* mConsoleMessage;
  nsLiteralCString mConsoleCategory;
};

static constexpr BlockingErrorCode sBlockingErrorCodes[] = {
    {NS_ERROR_TRACKING_URI,
     nsIWebProgressListener::STATE_BLOCKED_TRACKING_CONTENT,
     "TrackerUriBlockedByETP", "Tracking Protection"_ns},
    {NS_ERROR_FINGERPRINTING_URI,
     nsIWebProgressListener::STATE_BLOCKED_FINGERPRINTING_CONTENT,
     "TrackerUriBlockedByETP", "Tracking Protection"_ns},
    {NS_ERROR_CRYPTOMINING_URI,
     nsIWebProgressListener::STATE_BLOCKED_CRYPTOMINING_CONTENT,
     "TrackerUriBlockedByETP", "Tracking Protection"_ns},
    {NS_ERROR_SOCIALTRACKING_URI,
     nsIWebProgressListener::STATE_BLOCKED_SOCIALTRACKING_CONTENT,
     "TrackerUriBlockedByETP", "Tracking Protection"_ns},
    {NS_ERROR_EMAILTRACKING_URI,
     nsIWebProgressListener::STATE_BLOCKED_EMAILTRACKING_CONTENT,
     "TrackerUriBlockedByETP", "Tracking Protection"_ns},
};

}  // namespace

/* static */
bool ChannelClassifierUtils::IsClassifierBlockingErrorCode(nsresult aError) {
  // In theory we can iterate through the features, but at the moment, we can
  // just have a simple check here.
  for (const auto& blockingErrorCode : sBlockingErrorCodes) {
    if (aError == blockingErrorCode.mErrorCode) {
      return true;
    }
  }

  return false;
}

/* static */
bool ChannelClassifierUtils::IsClassifierBlockingEventCode(
    uint32_t aEventCode) {
  for (const auto& blockingErrorCode : sBlockingErrorCodes) {
    if (aEventCode == blockingErrorCode.mBlockingEventCode) {
      return true;
    }
  }
  return false;
}

/* static */
uint32_t ChannelClassifierUtils::GetClassifierBlockingEventCode(
    nsresult aErrorCode) {
  for (const auto& blockingErrorCode : sBlockingErrorCodes) {
    if (aErrorCode == blockingErrorCode.mErrorCode) {
      return blockingErrorCode.mBlockingEventCode;
    }
  }
  return 0;
}

/* static */ const char*
ChannelClassifierUtils::ClassifierBlockingErrorCodeToConsoleMessage(
    nsresult aError, nsACString& aCategory) {
  for (const auto& blockingErrorCode : sBlockingErrorCodes) {
    if (aError == blockingErrorCode.mErrorCode) {
      aCategory = blockingErrorCode.mConsoleCategory;
      return blockingErrorCode.mConsoleMessage;
    }
  }

  return nullptr;
}

/* static */
nsresult ChannelClassifierUtils::SetBlockedContent(
    nsIChannel* aChannel, nsresult aErrorCode, const nsACString& aList,
    const nsACString& aProvider, const nsACString& aFullHash) {
  NS_ENSURE_ARG(!aList.IsEmpty());

  switch (aErrorCode) {
    case NS_ERROR_HARMFULADDON_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_HARMFULADDON_URI);
      break;
    case NS_ERROR_MALWARE_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_MALWARE_URI);
      break;
    case NS_ERROR_PHISHING_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_PHISHING_URI);
      break;
    case NS_ERROR_UNWANTED_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_UNWANTED_URI);
      break;
    case NS_ERROR_TRACKING_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_TRACKING_URI);
      break;
    case NS_ERROR_BLOCKED_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_BLOCKED_URI);
      break;
    case NS_ERROR_HARMFUL_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_HARMFUL_URI);
      break;
    case NS_ERROR_CRYPTOMINING_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_CRYPTOMINING_URI);
      break;
    case NS_ERROR_FINGERPRINTING_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_FINGERPRINTING_URI);
      break;
    case NS_ERROR_SOCIALTRACKING_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_SOCIALTRACKING_URI);
      break;
    case NS_ERROR_EMAILTRACKING_URI:
      NS_SetRequestBlockingReason(
          aChannel, nsILoadInfo::BLOCKING_REASON_CLASSIFY_EMAILTRACKING_URI);
      break;
    default:
      MOZ_CRASH(
          "Missing nsILoadInfo::BLOCKING_REASON* for the classification error");
      break;
  }

  // Can be called in EITHER the parent or child process.
  nsresult rv;
  nsCOMPtr<nsIClassifiedChannel> classifiedChannel =
      do_QueryInterface(aChannel, &rv);
  NS_ENSURE_SUCCESS(rv, rv);

  if (classifiedChannel) {
    classifiedChannel->SetMatchedInfo(aList, aProvider, aFullHash);
  }

  if (XRE_IsParentProcess()) {
    nsCOMPtr<nsIParentChannel> parentChannel;
    NS_QueryNotificationCallbacks(aChannel, parentChannel);
    if (parentChannel) {
      // This channel is a parent-process proxy for a child process request.
      // Tell the child process channel to do this as well.
      // TODO: We can remove the code sending the IPC to content to update
      //       matched info once we move the ContentBlockingLog into the parent.
      //       This would be done in Bug 1601063.
      parentChannel->SetClassifierMatchedInfo(aList, aProvider, aFullHash);
    }

    unsigned state = GetClassifierBlockingEventCode(aErrorCode);
    if (!state) {
      state = nsIWebProgressListener::STATE_BLOCKED_UNSAFE_CONTENT;
    }
    ContentBlockingNotifier::OnEvent(aChannel, state);

    return NS_OK;
  }

  // TODO: ReportToConsole is called in the child process,
  // If nsContentUtils::ReportToConsole is not fission compatiable(cannot report
  // to correct top-level window), we need to do this in the parent process
  // instead (find the top-level window in the parent and send an IPC to child
  // processes to report console).
  nsCOMPtr<mozIThirdPartyUtil> thirdPartyUtil;
  thirdPartyUtil = mozilla::components::ThirdPartyUtil::Service();
  if (NS_WARN_IF(!thirdPartyUtil)) {
    return NS_OK;
  }

  nsCOMPtr<nsIURI> uriBeingLoaded =
      AntiTrackingUtils::MaybeGetDocumentURIBeingLoaded(aChannel);
  nsCOMPtr<mozIDOMWindowProxy> win;
  rv = thirdPartyUtil->GetTopWindowForChannel(aChannel, uriBeingLoaded,
                                              getter_AddRefs(win));
  NS_ENSURE_SUCCESS(rv, NS_OK);
  auto* pwin = nsPIDOMWindowOuter::From(win);
  nsCOMPtr<nsIDocShell> docShell = pwin->GetDocShell();
  if (!docShell) {
    return NS_OK;
  }
  RefPtr<dom::Document> doc = docShell->GetDocument();
  NS_ENSURE_TRUE(doc, NS_OK);

  // Log a warning to the web console.
  nsCOMPtr<nsIURI> uri;
  aChannel->GetURI(getter_AddRefs(uri));
  AutoTArray<nsString, 1> params;
  CopyUTF8toUTF16(uri->GetSpecOrDefault(), *params.AppendElement());
  const char* message;
  nsCString category;

  if (IsClassifierBlockingErrorCode(aErrorCode)) {
    message = ClassifierBlockingErrorCodeToConsoleMessage(aErrorCode, category);
  } else {
    message = "UnsafeUriBlocked";
    category = "Safe Browsing"_ns;
  }

  nsContentUtils::ReportToConsole(nsIScriptError::warningFlag, category, doc,
                                  PropertiesFile::NECKO_PROPERTIES, message,
                                  params);

  return NS_OK;
}

namespace {

void LowerPriorityHelper(nsIChannel* aChannel) {
  MOZ_ASSERT(aChannel);

  bool isBlockingResource = false;

  nsCOMPtr<nsIClassOfService> cos(do_QueryInterface(aChannel));
  if (cos) {
    if (StaticPrefs::network_http_tailing_enabled()) {
      uint32_t cosFlags = 0;
      cos->GetClassFlags(&cosFlags);
      isBlockingResource =
          cosFlags & (nsIClassOfService::UrgentStart |
                      nsIClassOfService::Leader | nsIClassOfService::Unblocked);

      // Requests not allowed to be tailed are usually those with higher
      // prioritization.  That overweights being a tracker: don't throttle
      // them when not in background.
      if (!(cosFlags & nsIClassOfService::TailForbidden)) {
        cos->AddClassFlags(nsIClassOfService::Throttleable);
      }
    } else {
      // Yes, we even don't want to evaluate the isBlockingResource when tailing
      // is off see bug 1395525.

      cos->AddClassFlags(nsIClassOfService::Throttleable);
    }
  }

  if (!isBlockingResource) {
    nsCOMPtr<nsISupportsPriority> p = do_QueryInterface(aChannel);
    if (p) {
      UC_LOG(
          ("ChannelClassifierUtils::LowerPriorityHelper - "
           "setting PRIORITY_LOWEST for channel %p",
           aChannel));
      p->SetPriority(nsISupportsPriority::PRIORITY_LOWEST);
    }
  }
}

}  // namespace

// static
void ChannelClassifierUtils::SetClassificationFlagsHelper(
    nsIChannel* aChannel, uint32_t aClassificationFlags, bool aIsThirdParty) {
  MOZ_ASSERT(aChannel);

  nsCOMPtr<nsIParentChannel> parentChannel;
  NS_QueryNotificationCallbacks(aChannel, parentChannel);
  if (parentChannel) {
    // This channel is a parent-process proxy for a child process
    // request. We should notify the child process as well.
    parentChannel->NotifyClassificationFlags(aClassificationFlags,
                                             aIsThirdParty);
  }

  RefPtr<HttpBaseChannel> httpChannel = do_QueryObject(aChannel);
  if (httpChannel) {
    httpChannel->AddClassificationFlags(aClassificationFlags, aIsThirdParty);
  }
}

// static
void ChannelClassifierUtils::AnnotateChannel(nsIChannel* aChannel,
                                             uint32_t aClassificationFlags,
                                             uint32_t aLoadingState) {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(aChannel);

  nsCOMPtr<nsIURI> chanURI;
  nsresult rv = aChannel->GetURI(getter_AddRefs(chanURI));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return;
  }

  RefPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  bool isThirdPartyWithTopLevelWinURI =
      loadInfo->GetIsThirdPartyContextToTopWindow();

  SetClassificationFlagsHelper(aChannel, aClassificationFlags,
                               isThirdPartyWithTopLevelWinURI);

  // We consider valid tracking flags (based on the current strict vs basic list
  // prefs) and cryptomining (which is not considered as tracking).
  bool validClassificationFlags =
      IsTrackingClassificationFlag(aClassificationFlags,
                                   NS_UsePrivateBrowsing(aChannel)) ||
      IsCryptominingClassificationFlag(aClassificationFlags,
                                       NS_UsePrivateBrowsing(aChannel));

  if (validClassificationFlags && isThirdPartyWithTopLevelWinURI) {
    ContentBlockingNotifier::OnEvent(aChannel, aLoadingState);
  }

  if (isThirdPartyWithTopLevelWinURI &&
      StaticPrefs::privacy_trackingprotection_lower_network_priority()) {
    LowerPriorityHelper(aChannel);
  }
}

// static
void ChannelClassifierUtils::AnnotateChannelWithoutNotifying(
    nsIChannel* aChannel, uint32_t aClassificationFlags) {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(aChannel);

  nsCOMPtr<nsIURI> chanURI;
  nsresult rv = aChannel->GetURI(getter_AddRefs(chanURI));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return;
  }

  RefPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  bool isThirdPartyWithTopLevelWinURI =
      loadInfo->GetIsThirdPartyContextToTopWindow();

  SetClassificationFlagsHelper(aChannel, aClassificationFlags,
                               isThirdPartyWithTopLevelWinURI);

  if (isThirdPartyWithTopLevelWinURI &&
      StaticPrefs::privacy_trackingprotection_lower_network_priority()) {
    LowerPriorityHelper(aChannel);
  }
}

/* static */
nsresult ChannelClassifierUtils::MaybeBlockChannel(
    nsIChannel* aChannel, const nsACString& aFeatureName,
    const nsACString& aList, nsresult aErrorCode, uint32_t aReplacedEvent,
    uint32_t aAllowedEvent, ChannelBlockDecision* aOutDecision) {
  MOZ_ASSERT(aChannel);
  MOZ_ASSERT(aOutDecision);

  ChannelBlockDecision decision =
      ChannelClassifierService::OnBeforeBlockChannel(aChannel, aFeatureName,
                                                     aList);
  *aOutDecision = decision;

  if (decision != ChannelBlockDecision::Blocked) {
    uint32_t event = decision == ChannelBlockDecision::Replaced ? aReplacedEvent
                                                                : aAllowedEvent;

    // Treat a Replaced decision (resource swapped for a shim) as a blocked
    // event so consumers see it as a block.
    bool blocked = decision == ChannelBlockDecision::Replaced;
    ContentBlockingNotifier::OnEvent(aChannel, event, blocked);

    return NS_OK;
  }

  SetBlockedContent(aChannel, aErrorCode, aList, ""_ns, ""_ns);

  UC_LOG(
      ("ChannelClassifierUtils::MaybeBlockChannel - feature=%s "
       "cancelling channel %p",
       PromiseFlatCString(aFeatureName).get(), aChannel));

  nsCOMPtr<nsIHttpChannelInternal> httpChannel = do_QueryInterface(aChannel);
  if (httpChannel) {
    (void)httpChannel->CancelByURLClassifier(aErrorCode);
  } else {
    (void)aChannel->Cancel(aErrorCode);
  }

  return NS_OK;
}

// static
bool ChannelClassifierUtils::IsAllowListed(nsIChannel* aChannel) {
  nsCOMPtr<nsIHttpChannelInternal> channel = do_QueryInterface(aChannel);
  if (NS_WARN_IF(!channel)) {
    return false;
  }

  nsCOMPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();

  bool isAllowListed = false;
  if (StaticPrefs::channelclassifier_allowlist_example()) {
    UC_LOG(
        ("ChannelClassifierUtils::IsAllowListed - "
         "check allowlisting test domain on channel %p",
         aChannel));

    nsCOMPtr<nsIIOService> ios = components::IO::Service();
    if (NS_WARN_IF(!ios)) {
      return false;
    }

    nsCOMPtr<nsIURI> uri;
    nsresult rv = ios->NewURI("http://allowlisted.example.com"_ns, nullptr,
                              nullptr, getter_AddRefs(uri));
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return false;
    }
    nsCOMPtr<nsIPrincipal> cbAllowListPrincipal =
        BasePrincipal::CreateContentPrincipal(uri,
                                              loadInfo->GetOriginAttributes());

    rv = ContentBlockingAllowList::Check(
        cbAllowListPrincipal, NS_UsePrivateBrowsing(aChannel), isAllowListed);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return false;
    }
  } else {
    nsCOMPtr<nsICookieJarSettings> cookieJarSettings;
    MOZ_ALWAYS_SUCCEEDS(
        loadInfo->GetCookieJarSettings(getter_AddRefs(cookieJarSettings)));
    isAllowListed = cookieJarSettings->GetIsOnContentBlockingAllowList();
  }

  if (isAllowListed) {
    UC_LOG(
        ("ChannelClassifierUtils::IsAllowListed - user override on channel %p",
         aChannel));
  }

  return isAllowListed;
}

/* static */
bool ChannelClassifierUtils::IsPassiveContent(nsIChannel* aChannel) {
  MOZ_ASSERT(aChannel);

  nsCOMPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  ExtContentPolicyType contentType = loadInfo->GetExternalContentPolicyType();

  // Return true if aChannel is loading passive display content, as
  // defined by the mixed content blocker.
  // https://searchfox.org/mozilla-central/rev/c80fa7258c935223fe319c5345b58eae85d4c6ae/dom/security/nsMixedContentBlocker.cpp#532
  return contentType == ExtContentPolicy::TYPE_IMAGE ||
         contentType == ExtContentPolicy::TYPE_MEDIA;
}

// static
bool ChannelClassifierUtils::IsTrackingClassificationFlag(uint32_t aFlag,
                                                          bool aIsPrivate) {
  bool isLevel2ListEnabled =
      aIsPrivate
          ? StaticPrefs::privacy_annotate_channels_strict_list_pbmode_enabled()
          : StaticPrefs::privacy_annotate_channels_strict_list_enabled();

  if (isLevel2ListEnabled &&
      (aFlag & nsIClassifiedChannel::ClassificationFlags::
                   CLASSIFIED_ANY_STRICT_TRACKING)) {
    return true;
  }

  if (StaticPrefs::privacy_socialtracking_block_cookies_enabled() &&
      IsSocialTrackingClassificationFlag(aFlag)) {
    return true;
  }

  return (
      aFlag &
      nsIClassifiedChannel::ClassificationFlags::CLASSIFIED_ANY_BASIC_TRACKING);
}

// static
bool ChannelClassifierUtils::IsSocialTrackingClassificationFlag(
    uint32_t aFlag) {
  return (aFlag & nsIClassifiedChannel::ClassificationFlags::
                      CLASSIFIED_ANY_SOCIAL_TRACKING) != 0;
}

// static
bool ChannelClassifierUtils::IsCryptominingClassificationFlag(uint32_t aFlag,
                                                              bool aIsPrivate) {
  if (aFlag &
      nsIClassifiedChannel::ClassificationFlags::CLASSIFIED_CRYPTOMINING) {
    return true;
  }

  bool isLevel2ListEnabled =
      aIsPrivate
          ? StaticPrefs::privacy_annotate_channels_strict_list_pbmode_enabled()
          : StaticPrefs::privacy_annotate_channels_strict_list_enabled();

  if (isLevel2ListEnabled &&
      (aFlag & nsIClassifiedChannel::ClassificationFlags::
                   CLASSIFIED_CRYPTOMINING_CONTENT)) {
    return true;
  }

  return false;
}

}  // namespace net
}  // namespace mozilla
