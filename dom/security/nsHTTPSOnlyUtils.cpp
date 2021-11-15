/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/ClearOnShutdown.h"
#include "mozilla/NullPrincipal.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/net/DNS.h"
#include "nsContentUtils.h"
#include "nsHTTPSOnlyUtils.h"
#include "nsIConsoleService.h"
#include "nsIHttpChannel.h"
#include "nsIHttpChannelInternal.h"
#include "nsIHttpsOnlyModePermission.h"
#include "nsIPermissionManager.h"
#include "nsIPrincipal.h"
#include "nsIScriptError.h"
#include "prnetdb.h"

// Set the timer to 3 seconds. If the https request has not received
// any signal from the server during that time, than we it's almost
// certain the request will time out.
#define FIRE_HTTP_REQUEST_BACKGROUND_TIMER_MS 3000

/* static */
bool nsHTTPSOnlyUtils::IsHttpsOnlyModeEnabled(bool aFromPrivateWindow) {
  // if the general pref is set to true, then we always return
  if (mozilla::StaticPrefs::dom_security_https_only_mode()) {
    return true;
  }

  // otherwise we check if executing in private browsing mode and return true
  // if the PBM pref for HTTPS-Only is set.
  if (aFromPrivateWindow &&
      mozilla::StaticPrefs::dom_security_https_only_mode_pbm()) {
    return true;
  }
  return false;
}

/* static */
void nsHTTPSOnlyUtils::PotentiallyFireHttpRequestToShortenTimout(
    mozilla::net::DocumentLoadListener* aDocumentLoadListener) {
  // only send http background request to counter timeouts if the
  // pref allows us to do that.
  if (!mozilla::StaticPrefs::
          dom_security_https_only_mode_send_http_background_request()) {
    return;
  }

  nsCOMPtr<nsIChannel> channel = aDocumentLoadListener->GetChannel();
  if (!channel) {
    return;
  }

  nsCOMPtr<nsILoadInfo> loadInfo = channel->LoadInfo();
  bool isPrivateWin = loadInfo->GetOriginAttributes().mPrivateBrowsingId > 0;

  // if https-only mode is not even enabled, then there is nothing to do here.
  if (!IsHttpsOnlyModeEnabled(isPrivateWin)) {
    return;
  }

  // if we are not dealing with a top-level load, then there is nothing to do
  // here.
  if (loadInfo->GetExternalContentPolicyType() !=
      nsIContentPolicy::TYPE_DOCUMENT) {
    return;
  }

  // if the load is exempt, then there is nothing to do here.
  uint32_t httpsOnlyStatus = loadInfo->GetHttpsOnlyStatus();
  if (httpsOnlyStatus & nsILoadInfo::nsILoadInfo::HTTPS_ONLY_EXEMPT) {
    return;
  }

  // if it's not an http channel, then there is nothing to do here.
  nsCOMPtr<nsIHttpChannel> httpChannel(do_QueryInterface(channel));
  if (!httpChannel) {
    return;
  }

  // if it's not a GET method, then there is nothing to do here either.
  nsAutoCString method;
  mozilla::Unused << httpChannel->GetRequestMethod(method);
  if (!method.EqualsLiteral("GET")) {
    return;
  }

  // if it's already an https channel, then there is nothing to do here.
  nsCOMPtr<nsIURI> channelURI;
  channel->GetURI(getter_AddRefs(channelURI));
  if (channelURI->SchemeIs("https")) {
    return;
  }

  RefPtr<nsIRunnable> task =
      new TestHTTPAnswerRunnable(channelURI, aDocumentLoadListener);
  NS_DispatchToMainThread(task.forget());
}

/* static */
bool nsHTTPSOnlyUtils::ShouldUpgradeRequest(nsIURI* aURI,
                                            nsILoadInfo* aLoadInfo) {
  // 1. Check if the HTTPS-Only Mode is even enabled, before we do anything else
  bool isPrivateWin = aLoadInfo->GetOriginAttributes().mPrivateBrowsingId > 0;
  if (!IsHttpsOnlyModeEnabled(isPrivateWin)) {
    return false;
  }

  // 2. Check for general exceptions
  if (OnionException(aURI) || LoopbackOrLocalException(aURI)) {
    return false;
  }

  // 3. Check if NoUpgrade-flag is set in LoadInfo
  uint32_t httpsOnlyStatus = aLoadInfo->GetHttpsOnlyStatus();
  if (httpsOnlyStatus & nsILoadInfo::HTTPS_ONLY_EXEMPT) {
    AutoTArray<nsString, 1> params = {
        NS_ConvertUTF8toUTF16(aURI->GetSpecOrDefault())};
    nsHTTPSOnlyUtils::LogLocalizedString("HTTPSOnlyNoUpgradeException", params,
                                         nsIScriptError::infoFlag, aLoadInfo,
                                         aURI);
    return false;
  }

  // All subresources of an exempt triggering principal are also exempt
  if (aLoadInfo->GetExternalContentPolicyType() !=
      nsIContentPolicy::TYPE_DOCUMENT) {
    if (!aLoadInfo->TriggeringPrincipal()->IsSystemPrincipal() &&
        TestIfPrincipalIsExempt(aLoadInfo->TriggeringPrincipal())) {
      return false;
    }
  }

  // We can upgrade the request - let's log it to the console
  // Appending an 's' to the scheme for the logging. (http -> https)
  nsAutoCString scheme;
  aURI->GetScheme(scheme);
  scheme.AppendLiteral("s");
  NS_ConvertUTF8toUTF16 reportSpec(aURI->GetSpecOrDefault());
  NS_ConvertUTF8toUTF16 reportScheme(scheme);

  AutoTArray<nsString, 2> params = {reportSpec, reportScheme};
  nsHTTPSOnlyUtils::LogLocalizedString("HTTPSOnlyUpgradeRequest", params,
                                       nsIScriptError::warningFlag, aLoadInfo,
                                       aURI);

  // If the status was not determined before, we now indicate that the request
  // will get upgraded, but no event-listener has been registered yet.
  if (httpsOnlyStatus & nsILoadInfo::HTTPS_ONLY_UNINITIALIZED) {
    httpsOnlyStatus ^= nsILoadInfo::HTTPS_ONLY_UNINITIALIZED;
    httpsOnlyStatus |= nsILoadInfo::HTTPS_ONLY_UPGRADED_LISTENER_NOT_REGISTERED;
    aLoadInfo->SetHttpsOnlyStatus(httpsOnlyStatus);
  }
  return true;
}

/* static */
bool nsHTTPSOnlyUtils::ShouldUpgradeWebSocket(nsIURI* aURI,
                                              nsILoadInfo* aLoadInfo) {
  // 1. Check if the HTTPS-Only Mode is even enabled, before we do anything else
  bool isPrivateWin = aLoadInfo->GetOriginAttributes().mPrivateBrowsingId > 0;
  if (!IsHttpsOnlyModeEnabled(isPrivateWin)) {
    return false;
  }

  // 2. Check for general exceptions
  if (OnionException(aURI) || LoopbackOrLocalException(aURI)) {
    return false;
  }

  // 3. Check if NoUpgrade-flag is set in LoadInfo
  uint32_t httpsOnlyStatus = aLoadInfo->GetHttpsOnlyStatus();
  if (httpsOnlyStatus & nsILoadInfo::HTTPS_ONLY_EXEMPT) {
    // Let's log to the console, that we didn't upgrade this request
    AutoTArray<nsString, 1> params = {
        NS_ConvertUTF8toUTF16(aURI->GetSpecOrDefault())};
    nsHTTPSOnlyUtils::LogLocalizedString("HTTPSOnlyNoUpgradeException", params,
                                         nsIScriptError::infoFlag, aLoadInfo,
                                         aURI);
    return false;
  }

  // We can upgrade the request - let's log it to the console
  // Appending an 's' to the scheme for the logging. (ws -> wss)
  nsAutoCString scheme;
  aURI->GetScheme(scheme);
  scheme.AppendLiteral("s");
  NS_ConvertUTF8toUTF16 reportSpec(aURI->GetSpecOrDefault());
  NS_ConvertUTF8toUTF16 reportScheme(scheme);

  AutoTArray<nsString, 2> params = {reportSpec, reportScheme};
  nsHTTPSOnlyUtils::LogLocalizedString("HTTPSOnlyUpgradeRequest", params,
                                       nsIScriptError::warningFlag, aLoadInfo,
                                       aURI);
  return true;
}

/* static */
bool nsHTTPSOnlyUtils::CouldBeHttpsOnlyError(nsIChannel* aChannel,
                                             nsresult aError) {
  // If there is no failed channel, then there is nothing to do here.
  if (!aChannel) {
    return false;
  }

  // If HTTPS-Only Mode is not enabled, then there is nothing to do here.
  nsCOMPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  bool isPrivateWin = loadInfo->GetOriginAttributes().mPrivateBrowsingId > 0;
  if (!IsHttpsOnlyModeEnabled(isPrivateWin)) {
    return false;
  }

  // If the load is exempt or did not get upgraded,
  // then there is nothing to do here.
  uint32_t httpsOnlyStatus = loadInfo->GetHttpsOnlyStatus();
  if (httpsOnlyStatus & nsILoadInfo::HTTPS_ONLY_EXEMPT ||
      httpsOnlyStatus & nsILoadInfo::HTTPS_ONLY_UNINITIALIZED) {
    return false;
  }

  // If it's one of those errors, then most likely it's not a HTTPS-Only error
  // (This list of errors is largely drawn from nsDocShell::DisplayLoadError())
  return !(NS_ERROR_UNKNOWN_PROTOCOL == aError ||
           NS_ERROR_FILE_NOT_FOUND == aError ||
           NS_ERROR_FILE_ACCESS_DENIED == aError ||
           NS_ERROR_UNKNOWN_HOST == aError || NS_ERROR_PHISHING_URI == aError ||
           NS_ERROR_MALWARE_URI == aError || NS_ERROR_UNWANTED_URI == aError ||
           NS_ERROR_HARMFUL_URI == aError ||
           NS_ERROR_CONTENT_CRASHED == aError ||
           NS_ERROR_FRAME_CRASHED == aError);
}

/* static */
bool nsHTTPSOnlyUtils::TestIfPrincipalIsExempt(nsIPrincipal* aPrincipal) {
  static nsCOMPtr<nsIPermissionManager> sPermMgr;
  if (!sPermMgr) {
    sPermMgr = mozilla::services::GetPermissionManager();
    mozilla::ClearOnShutdown(&sPermMgr);
  }
  NS_ENSURE_TRUE(sPermMgr, false);

  uint32_t perm;
  nsresult rv = sPermMgr->TestExactPermissionFromPrincipal(
      aPrincipal, "https-only-load-insecure"_ns, &perm);
  NS_ENSURE_SUCCESS(rv, false);

  return perm == nsIHttpsOnlyModePermission::LOAD_INSECURE_ALLOW ||
         perm == nsIHttpsOnlyModePermission::LOAD_INSECURE_ALLOW_SESSION;
}

/* static */
void nsHTTPSOnlyUtils::TestSitePermissionAndPotentiallyAddExemption(
    nsIChannel* aChannel) {
  NS_ENSURE_TRUE_VOID(aChannel);

  // if https-only mode is not enabled, then there is nothing to do here.
  nsCOMPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  bool isPrivateWin = loadInfo->GetOriginAttributes().mPrivateBrowsingId > 0;
  if (!IsHttpsOnlyModeEnabled(isPrivateWin)) {
    return;
  }

  // if it's not a top-level load then there is nothing to here.
  nsContentPolicyType type = loadInfo->GetExternalContentPolicyType();
  if (type != nsIContentPolicy::TYPE_DOCUMENT) {
    return;
  }

  // it it's not an http channel, then there is nothing to do here.
  nsCOMPtr<nsIHttpChannel> httpChannel = do_QueryInterface(aChannel);
  if (!httpChannel) {
    return;
  }

  nsCOMPtr<nsIPrincipal> principal;
  nsresult rv = nsContentUtils::GetSecurityManager()->GetChannelResultPrincipal(
      aChannel, getter_AddRefs(principal));
  NS_ENSURE_SUCCESS_VOID(rv);

  // We explicitly add or also remove the exemption flag, because this
  // function is also consulted after redirects.
  uint32_t httpsOnlyStatus = loadInfo->GetHttpsOnlyStatus();
  if (TestIfPrincipalIsExempt(principal)) {
    httpsOnlyStatus |= nsILoadInfo::HTTPS_ONLY_EXEMPT;
  } else {
    httpsOnlyStatus &= ~nsILoadInfo::HTTPS_ONLY_EXEMPT;
  }
  loadInfo->SetHttpsOnlyStatus(httpsOnlyStatus);
}

/* static */
bool nsHTTPSOnlyUtils::IsSafeToAcceptCORSOrMixedContent(
    nsILoadInfo* aLoadInfo) {
  // Check if the request is exempt from upgrades
  if ((aLoadInfo->GetHttpsOnlyStatus() & nsILoadInfo::HTTPS_ONLY_EXEMPT)) {
    return false;
  }
  // Check if HTTPS-Only Mode is enabled for this request
  bool isPrivateWin = aLoadInfo->GetOriginAttributes().mPrivateBrowsingId > 0;
  return nsHTTPSOnlyUtils::IsHttpsOnlyModeEnabled(isPrivateWin);
}

/* ------ Logging ------ */

/* static */
void nsHTTPSOnlyUtils::LogLocalizedString(const char* aName,
                                          const nsTArray<nsString>& aParams,
                                          uint32_t aFlags,
                                          nsILoadInfo* aLoadInfo,
                                          nsIURI* aURI) {
  nsAutoString logMsg;
  nsContentUtils::FormatLocalizedString(nsContentUtils::eSECURITY_PROPERTIES,
                                        aName, aParams, logMsg);
  LogMessage(logMsg, aFlags, aLoadInfo, aURI);
}

/* static */
void nsHTTPSOnlyUtils::LogMessage(const nsAString& aMessage, uint32_t aFlags,
                                  nsILoadInfo* aLoadInfo, nsIURI* aURI) {
  // do not log to the console if the loadinfo says we should not!
  uint32_t httpsOnlyStatus = aLoadInfo->GetHttpsOnlyStatus();
  if (httpsOnlyStatus & nsILoadInfo::HTTPS_ONLY_DO_NOT_LOG_TO_CONSOLE) {
    return;
  }

  // Prepending HTTPS-Only to the outgoing console message
  nsString message;
  message.AppendLiteral(u"HTTPS-Only Mode: ");
  message.Append(aMessage);

  // Allow for easy distinction in devtools code.
  nsCString category("HTTPSOnly");

  uint32_t innerWindowId = aLoadInfo->GetInnerWindowID();
  if (innerWindowId > 0) {
    // Send to content console
    nsContentUtils::ReportToConsoleByWindowID(message, aFlags, category,
                                              innerWindowId, aURI);
  } else {
    // Send to browser console
    bool isPrivateWin = aLoadInfo->GetOriginAttributes().mPrivateBrowsingId > 0;
    nsContentUtils::LogSimpleConsoleError(message, category.get(), isPrivateWin,
                                          true /* from chrome context */,
                                          aFlags);
  }
}

/* ------ Exceptions ------ */

/* static */
bool nsHTTPSOnlyUtils::OnionException(nsIURI* aURI) {
  // Onion-host exception can get disabled with a pref
  if (mozilla::StaticPrefs::dom_security_https_only_mode_upgrade_onion()) {
    return false;
  }
  nsAutoCString host;
  aURI->GetHost(host);
  return StringEndsWith(host, ".onion"_ns);
}

/* static */
bool nsHTTPSOnlyUtils::LoopbackOrLocalException(nsIURI* aURI) {
  nsAutoCString asciiHost;
  nsresult rv = aURI->GetAsciiHost(asciiHost);
  NS_ENSURE_SUCCESS(rv, false);

  // Let's make a quick check if the host matches these loopback strings
  // before we do anything else
  if (asciiHost.EqualsLiteral("localhost") || asciiHost.EqualsLiteral("::1")) {
    return true;
  }

  // The local-ip and loopback checks expect a NetAddr struct. We only have a
  // host-string but can convert it to a NetAddr by first converting it to
  // PRNetAddr.
  PRNetAddr tempAddr;
  memset(&tempAddr, 0, sizeof(PRNetAddr));
  // PR_StringToNetAddr does not properly initialize the output buffer in the
  // case of IPv6 input. See bug 223145.
  if (PR_StringToNetAddr(asciiHost.get(), &tempAddr) != PR_SUCCESS) {
    return false;
  }

  mozilla::net::NetAddr addr(&tempAddr);
  // Loopback IPs are always exempt
  if (addr.IsLoopbackAddr()) {
    return true;
  }

  // Local IP exception can get disabled with a pref
  bool upgradeLocal =
      mozilla::StaticPrefs::dom_security_https_only_mode_upgrade_local();
  return (!upgradeLocal && addr.IsIPAddrLocal());
}

/////////////////////////////////////////////////////////////////////
// Implementation of TestHTTPAnswerRunnable

NS_IMPL_ISUPPORTS_INHERITED(TestHTTPAnswerRunnable, mozilla::Runnable,
                            nsIStreamListener, nsIInterfaceRequestor,
                            nsITimerCallback)

TestHTTPAnswerRunnable::TestHTTPAnswerRunnable(
    nsIURI* aURI, mozilla::net::DocumentLoadListener* aDocumentLoadListener)
    : mozilla::Runnable("TestHTTPAnswerRunnable"),
      mURI(aURI),
      mDocumentLoadListener(aDocumentLoadListener) {}

NS_IMETHODIMP
TestHTTPAnswerRunnable::OnStartRequest(nsIRequest* aRequest) {
  // If the request status is not OK, it means it encountered some
  // kind of error in which case we do not want to do anything.
  nsresult requestStatus;
  aRequest->GetStatus(&requestStatus);
  if (requestStatus != NS_OK) {
    return NS_OK;
  }

  // Check if the original top-level channel which https-only is trying
  // to upgrade is already in progress or if the channel is an auth channel.
  // If it is in progress or Auth is in progress, then all good, if not
  // then let's cancel that channel so we can dispaly the exception page.
  nsCOMPtr<nsIChannel> docChannel = mDocumentLoadListener->GetChannel();
  nsCOMPtr<nsIHttpChannel> httpsOnlyChannel = do_QueryInterface(docChannel);
  if (httpsOnlyChannel) {
    nsCOMPtr<nsILoadInfo> loadInfo = httpsOnlyChannel->LoadInfo();
    uint32_t topLevelLoadInProgress =
        loadInfo->GetHttpsOnlyStatus() &
        nsILoadInfo::HTTPS_ONLY_TOP_LEVEL_LOAD_IN_PROGRESS;

    nsCOMPtr<nsIHttpChannelInternal> httpChannelInternal =
        do_QueryInterface(httpsOnlyChannel);
    bool isAuthChannel = false;
    mozilla::Unused << httpChannelInternal->GetIsAuthChannel(&isAuthChannel);
    if (!topLevelLoadInProgress && !isAuthChannel) {
      // Only really cancel the original top-level channel if it's
      // status is still NS_OK, otherwise it might have already
      // encountered some other error and was cancelled.
      nsresult httpsOnlyChannelStatus;
      httpsOnlyChannel->GetStatus(&httpsOnlyChannelStatus);
      if (httpsOnlyChannelStatus == NS_OK) {
        httpsOnlyChannel->Cancel(NS_ERROR_NET_TIMEOUT);
      }
    }
  }

  // Cancel this http request because it has reached the end of it's
  // lifetime at this point.
  aRequest->Cancel(NS_ERROR_ABORT);
  return NS_ERROR_ABORT;
}

NS_IMETHODIMP
TestHTTPAnswerRunnable::OnDataAvailable(nsIRequest* aRequest,
                                        nsIInputStream* aStream,
                                        uint64_t aOffset, uint32_t aCount) {
  // TestHTTPAnswerRunnable only cares about ::OnStartRequest which
  // will also cancel the request, so we should in fact never even
  // get here.
  MOZ_ASSERT(false, "how come we get to ::OnDataAvailable");
  return NS_OK;
}

NS_IMETHODIMP
TestHTTPAnswerRunnable::OnStopRequest(nsIRequest* aRequest,
                                      nsresult aStatusCode) {
  // TestHTTPAnswerRunnable only cares about ::OnStartRequest
  return NS_OK;
}

NS_IMETHODIMP
TestHTTPAnswerRunnable::GetInterface(const nsIID& aIID, void** aResult) {
  return QueryInterface(aIID, aResult);
}

NS_IMETHODIMP
TestHTTPAnswerRunnable::Run() {
  // Wait N milliseconds to give the original https request a heads start
  // before firing up this http request in the background.
  return NS_NewTimerWithCallback(getter_AddRefs(mTimer), this,
                                 FIRE_HTTP_REQUEST_BACKGROUND_TIMER_MS,
                                 nsITimer::TYPE_ONE_SHOT);
}

NS_IMETHODIMP
TestHTTPAnswerRunnable::Notify(nsITimer* aTimer) {
  if (mTimer) {
    mTimer->Cancel();
    mTimer = nullptr;
  }

  // If the original channel has already started loading at this point
  // then there is no need to do the dance.
  nsCOMPtr<nsIChannel> origChannel = mDocumentLoadListener->GetChannel();
  nsCOMPtr<nsILoadInfo> origLoadInfo = origChannel->LoadInfo();
  uint32_t origHttpsOnlyStatus = origLoadInfo->GetHttpsOnlyStatus();
  if ((origHttpsOnlyStatus &
       nsILoadInfo::HTTPS_ONLY_TOP_LEVEL_LOAD_IN_PROGRESS)) {
    return NS_OK;
  }

  mozilla::OriginAttributes attrs = origLoadInfo->GetOriginAttributes();
  RefPtr<nsIPrincipal> nullPrincipal =
      mozilla::NullPrincipal::CreateWithInheritedAttributes(attrs);

  uint32_t loadFlags =
      nsIRequest::LOAD_ANONYMOUS | nsIRequest::INHIBIT_CACHING |
      nsIRequest::INHIBIT_PERSISTENT_CACHING | nsIRequest::LOAD_BYPASS_CACHE |
      nsIChannel::LOAD_BYPASS_SERVICE_WORKER;

  // No need to connect to the URI including the path because we only care about
  // the round trip time if a server responds to an http request.
  nsCOMPtr<nsIURI> backgroundChannelURI;
  nsAutoCString prePathStr;
  nsresult rv = mURI->GetPrePath(prePathStr);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }
  rv = NS_NewURI(getter_AddRefs(backgroundChannelURI), prePathStr);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  // we are using TYPE_OTHER because TYPE_DOCUMENT might have side effects
  nsCOMPtr<nsIChannel> testHTTPChannel;
  rv = NS_NewChannel(getter_AddRefs(testHTTPChannel), backgroundChannelURI,
                     nullPrincipal,
                     nsILoadInfo::SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
                     nsIContentPolicy::TYPE_OTHER, nullptr, nullptr, nullptr,
                     nullptr, loadFlags);

  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  // We have exempt that load from HTTPS-Only to avoid getting upgraded
  // to https as well. Additonally let's not log that request to the console
  // because it might confuse end users.
  nsCOMPtr<nsILoadInfo> loadInfo = testHTTPChannel->LoadInfo();
  uint32_t httpsOnlyStatus = loadInfo->GetHttpsOnlyStatus();
  httpsOnlyStatus |= nsILoadInfo::HTTPS_ONLY_EXEMPT |
                     nsILoadInfo::HTTPS_ONLY_DO_NOT_LOG_TO_CONSOLE;
  loadInfo->SetHttpsOnlyStatus(httpsOnlyStatus);

  testHTTPChannel->SetNotificationCallbacks(this);
  testHTTPChannel->AsyncOpen(this);
  return NS_OK;
}
