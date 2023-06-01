/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WebrtcGlobalInformation.h"
#include "mozilla/media/webrtc/WebrtcGlobal.h"
#include "WebrtcGlobalChild.h"
#include "WebrtcGlobalParent.h"

#include <algorithm>
#include <vector>
#include <type_traits>

#include "mozilla/dom/WebrtcGlobalInformationBinding.h"
#include "mozilla/dom/RTCStatsReportBinding.h"  // for RTCStatsReportInternal
#include "mozilla/dom/ContentChild.h"

#include "nsNetCID.h"               // NS_SOCKETTRANSPORTSERVICE_CONTRACTID
#include "nsServiceManagerUtils.h"  // do_GetService
#include "mozilla/ErrorResult.h"
#include "nsProxyRelease.h"  // nsMainThreadPtrHolder
#include "mozilla/Telemetry.h"
#include "mozilla/Unused.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ClearOnShutdown.h"

#include "common/browser_logging/WebRtcLog.h"
#include "transport/runnable_utils.h"
#include "MediaTransportHandler.h"
#include "PeerConnectionCtx.h"
#include "PeerConnectionImpl.h"

#ifdef XP_WIN
#  include <process.h>
#endif

namespace mozilla::dom {

typedef nsMainThreadPtrHandle<WebrtcGlobalStatisticsCallback>
    StatsRequestCallback;

typedef nsMainThreadPtrHandle<WebrtcGlobalLoggingCallback> LogRequestCallback;

class WebrtcContentParents {
 public:
  static WebrtcGlobalParent* Alloc();
  static void Dealloc(WebrtcGlobalParent* aParent);
  static bool Empty() { return sContentParents.empty(); }
  static const std::vector<RefPtr<WebrtcGlobalParent>>& GetAll() {
    return sContentParents;
  }

 private:
  static std::vector<RefPtr<WebrtcGlobalParent>> sContentParents;
  WebrtcContentParents() = delete;
  WebrtcContentParents(const WebrtcContentParents&) = delete;
  WebrtcContentParents& operator=(const WebrtcContentParents&) = delete;
};

std::vector<RefPtr<WebrtcGlobalParent>> WebrtcContentParents::sContentParents;

WebrtcGlobalParent* WebrtcContentParents::Alloc() {
  RefPtr<WebrtcGlobalParent> cp = new WebrtcGlobalParent;
  sContentParents.push_back(cp);
  return cp.get();
}

void WebrtcContentParents::Dealloc(WebrtcGlobalParent* aParent) {
  if (aParent) {
    aParent->mShutdown = true;
    auto cp =
        std::find(sContentParents.begin(), sContentParents.end(), aParent);
    if (cp != sContentParents.end()) {
      sContentParents.erase(cp);
    }
  }
}

static PeerConnectionCtx* GetPeerConnectionCtx() {
  if (PeerConnectionCtx::isActive()) {
    MOZ_ASSERT(PeerConnectionCtx::GetInstance());
    return PeerConnectionCtx::GetInstance();
  }
  return nullptr;
}

static nsTArray<dom::RTCStatsReportInternal>& GetWebrtcGlobalStatsStash() {
  static StaticAutoPtr<nsTArray<dom::RTCStatsReportInternal>> sStash;
  if (!sStash) {
    sStash = new nsTArray<dom::RTCStatsReportInternal>();
    ClearOnShutdown(&sStash);
  }
  return *sStash;
}

static RefPtr<PWebrtcGlobalParent::GetStatsPromise>
GetStatsPromiseForThisProcess(const nsAString& aPcIdFilter) {
  nsTArray<RefPtr<dom::RTCStatsReportPromise>> promises;

  std::set<nsString> pcids;
  if (auto ctx = GetPeerConnectionCtx()) {
    // Grab stats for PCs that still exist
    ctx->ForEachPeerConnection([&](PeerConnectionImpl* aPc) {
      if (!aPcIdFilter.IsEmpty() &&
          !aPcIdFilter.EqualsASCII(aPc->GetIdAsAscii().c_str())) {
        return;
      }
      if (!aPc->IsClosed() || !aPc->LongTermStatsIsDisabled()) {
        nsString id;
        aPc->GetId(id);
        pcids.insert(id);
        promises.AppendElement(aPc->GetStats(nullptr, true));
      }
    });

    // Grab previously stashed stats, if they aren't dupes, and ensure they
    // are marked closed. (In a content process, this should already have
    // happened, but in the parent process, the stash will contain the last
    // observed stats from the content processes. From the perspective of the
    // parent process, these are assumed closed unless we see new stats from the
    // content process that say otherwise.)
    for (auto& report : GetWebrtcGlobalStatsStash()) {
      report.mClosed = true;
      if ((aPcIdFilter.IsEmpty() || aPcIdFilter == report.mPcid) &&
          !pcids.count(report.mPcid)) {
        promises.AppendElement(dom::RTCStatsReportPromise::CreateAndResolve(
            MakeUnique<dom::RTCStatsReportInternal>(report), __func__));
      }
    }
  }

  auto UnwrapUniquePtrs = [](dom::RTCStatsReportPromise::AllSettledPromiseType::
                                 ResolveOrRejectValue&& aResult) {
    nsTArray<dom::RTCStatsReportInternal> reports;
    MOZ_RELEASE_ASSERT(aResult.IsResolve(), "AllSettled should never reject!");
    for (auto& reportResult : aResult.ResolveValue()) {
      if (reportResult.IsResolve()) {
        reports.AppendElement(*reportResult.ResolveValue());
      }
    }
    return PWebrtcGlobalParent::GetStatsPromise::CreateAndResolve(
        std::move(reports), __func__);
  };

  return dom::RTCStatsReportPromise::AllSettled(
             GetMainThreadSerialEventTarget(), promises)
      ->Then(GetMainThreadSerialEventTarget(), __func__,
             std::move(UnwrapUniquePtrs));
}

static std::map<int32_t, dom::Sequence<nsString>>& GetWebrtcGlobalLogStash() {
  static StaticAutoPtr<std::map<int32_t, dom::Sequence<nsString>>> sStash;
  if (!sStash) {
    sStash = new std::map<int32_t, dom::Sequence<nsString>>();
    ClearOnShutdown(&sStash);
  }
  return *sStash;
}

static void ClearLongTermStats() {
  GetWebrtcGlobalStatsStash().Clear();
  if (auto ctx = GetPeerConnectionCtx()) {
    ctx->ClearClosedStats();
  }
}

void WebrtcGlobalInformation::ClearAllStats(const GlobalObject& aGlobal) {
  if (!NS_IsMainThread()) {
    return;
  }

  // Chrome-only API
  MOZ_ASSERT(XRE_IsParentProcess());

  if (!WebrtcContentParents::Empty()) {
    // Pass on the request to any content process based PeerConnections.
    for (const auto& cp : WebrtcContentParents::GetAll()) {
      Unused << cp->SendClearStats();
    }
  }

  // Flush the history for the chrome process
  ClearLongTermStats();
}

void WebrtcGlobalInformation::GetAllStats(
    const GlobalObject& aGlobal, WebrtcGlobalStatisticsCallback& aStatsCallback,
    const Optional<nsAString>& pcIdFilter, ErrorResult& aRv) {
  if (!NS_IsMainThread()) {
    aRv.Throw(NS_ERROR_NOT_SAME_THREAD);
    return;
  }

  MOZ_ASSERT(XRE_IsParentProcess());

  nsTArray<RefPtr<PWebrtcGlobalParent::GetStatsPromise>> statsPromises;

  nsString filter;
  if (pcIdFilter.WasPassed()) {
    filter = pcIdFilter.Value();
  }

  for (const auto& cp : WebrtcContentParents::GetAll()) {
    statsPromises.AppendElement(cp->SendGetStats(filter));
  }

  // Stats from this (the parent) process. How long do we keep supporting this?
  statsPromises.AppendElement(GetStatsPromiseForThisProcess(filter));

  // CallbackObject does not support threadsafe refcounting, and must be
  // used and destroyed on main.
  StatsRequestCallback callbackHandle(
      new nsMainThreadPtrHolder<WebrtcGlobalStatisticsCallback>(
          "WebrtcGlobalStatisticsCallback", &aStatsCallback));

  auto FlattenThenStashThenCallback =
      [callbackHandle,
       filter](PWebrtcGlobalParent::GetStatsPromise::AllSettledPromiseType::
                   ResolveOrRejectValue&& aResult) MOZ_CAN_RUN_SCRIPT_BOUNDARY {
        std::set<nsString> pcids;
        WebrtcGlobalStatisticsReport flattened;
        MOZ_RELEASE_ASSERT(aResult.IsResolve(),
                           "AllSettled should never reject!");
        // Flatten stats from content processes and parent process.
        // The stats from the parent process (which will come last) might
        // contain some stale content-process stats, so skip those.
        for (auto& processResult : aResult.ResolveValue()) {
          // TODO: Report rejection on individual content processes someday?
          if (processResult.IsResolve()) {
            for (auto& pcStats : processResult.ResolveValue()) {
              if (!pcids.count(pcStats.mPcid)) {
                pcids.insert(pcStats.mPcid);
                if (!flattened.mReports.AppendElement(std::move(pcStats),
                                                      fallible)) {
                  mozalloc_handle_oom(0);
                }
              }
            }
          }
        }

        if (filter.IsEmpty()) {
          // Unfiltered is simple; the flattened result becomes the new stash.
          GetWebrtcGlobalStatsStash() = flattened.mReports;
        } else if (!flattened.mReports.IsEmpty()) {
          // Update our stash with the single result.
          MOZ_ASSERT(flattened.mReports.Length() == 1);
          StashStats(flattened.mReports[0]);
        }

        IgnoredErrorResult rv;
        callbackHandle->Call(flattened, rv);
      };

  PWebrtcGlobalParent::GetStatsPromise::AllSettled(
      GetMainThreadSerialEventTarget(), statsPromises)
      ->Then(GetMainThreadSerialEventTarget(), __func__,
             std::move(FlattenThenStashThenCallback));

  aRv = NS_OK;
}

static RefPtr<PWebrtcGlobalParent::GetLogPromise> GetLogPromise() {
  PeerConnectionCtx* ctx = GetPeerConnectionCtx();
  if (!ctx) {
    // This process has never created a PeerConnection, so no ICE logging.
    return PWebrtcGlobalParent::GetLogPromise::CreateAndResolve(
        Sequence<nsString>(), __func__);
  }

  nsresult rv;
  nsCOMPtr<nsISerialEventTarget> stsThread =
      do_GetService(NS_SOCKETTRANSPORTSERVICE_CONTRACTID, &rv);

  if (NS_WARN_IF(NS_FAILED(rv) || !stsThread)) {
    return PWebrtcGlobalParent::GetLogPromise::CreateAndResolve(
        Sequence<nsString>(), __func__);
  }

  RefPtr<MediaTransportHandler> transportHandler = ctx->GetTransportHandler();

  auto AddMarkers =
      [](MediaTransportHandler::IceLogPromise::ResolveOrRejectValue&& aValue) {
        nsString pid;
        pid.AppendInt(getpid());
        Sequence<nsString> logs;
        if (aValue.IsResolve() && !aValue.ResolveValue().IsEmpty()) {
          bool ok = logs.AppendElement(
              u"+++++++ BEGIN (process id "_ns + pid + u") ++++++++"_ns,
              fallible);
          ok &=
              !!logs.AppendElements(std::move(aValue.ResolveValue()), fallible);
          ok &= !!logs.AppendElement(
              u"+++++++ END (process id "_ns + pid + u") ++++++++"_ns,
              fallible);
          if (!ok) {
            mozalloc_handle_oom(0);
          }
        }
        return PWebrtcGlobalParent::GetLogPromise::CreateAndResolve(
            std::move(logs), __func__);
      };

  return transportHandler->GetIceLog(nsCString())
      ->Then(GetMainThreadSerialEventTarget(), __func__, std::move(AddMarkers));
}

static nsresult RunLogClear() {
  PeerConnectionCtx* ctx = GetPeerConnectionCtx();
  if (!ctx) {
    // This process has never created a PeerConnection, so no ICE logging.
    return NS_OK;
  }

  nsresult rv;
  nsCOMPtr<nsISerialEventTarget> stsThread =
      do_GetService(NS_SOCKETTRANSPORTSERVICE_CONTRACTID, &rv);

  if (NS_FAILED(rv)) {
    return rv;
  }
  if (!stsThread) {
    return NS_ERROR_FAILURE;
  }

  RefPtr<MediaTransportHandler> transportHandler = ctx->GetTransportHandler();

  return RUN_ON_THREAD(
      stsThread,
      WrapRunnable(transportHandler, &MediaTransportHandler::ClearIceLog),
      NS_DISPATCH_NORMAL);
}

void WebrtcGlobalInformation::ClearLogging(const GlobalObject& aGlobal) {
  if (!NS_IsMainThread()) {
    return;
  }

  // Chrome-only API
  MOZ_ASSERT(XRE_IsParentProcess());
  GetWebrtcGlobalLogStash().clear();

  if (!WebrtcContentParents::Empty()) {
    // Clear content process signaling logs
    for (const auto& cp : WebrtcContentParents::GetAll()) {
      Unused << cp->SendClearLog();
    }
  }

  // Clear chrome process signaling logs
  Unused << RunLogClear();
}

static RefPtr<GenericPromise> UpdateLogStash() {
  nsTArray<RefPtr<GenericPromise>> logPromises;
  MOZ_ASSERT(XRE_IsParentProcess());
  for (const auto& cp : WebrtcContentParents::GetAll()) {
    auto StashLog =
        [id = cp->Id() * 2 /* Make sure 1 isn't used */](
            PWebrtcGlobalParent::GetLogPromise::ResolveOrRejectValue&& aValue) {
          if (aValue.IsResolve() && !aValue.ResolveValue().IsEmpty()) {
            GetWebrtcGlobalLogStash()[id] = aValue.ResolveValue();
          }
          return GenericPromise::CreateAndResolve(true, __func__);
        };
    logPromises.AppendElement(cp->SendGetLog()->Then(
        GetMainThreadSerialEventTarget(), __func__, std::move(StashLog)));
  }

  // Get ICE logging for this (the parent) process. How long do we support this?
  logPromises.AppendElement(GetLogPromise()->Then(
      GetMainThreadSerialEventTarget(), __func__,
      [](PWebrtcGlobalParent::GetLogPromise::ResolveOrRejectValue&& aValue) {
        if (aValue.IsResolve()) {
          GetWebrtcGlobalLogStash()[1] = aValue.ResolveValue();
        }
        return GenericPromise::CreateAndResolve(true, __func__);
      }));

  return GenericPromise::AllSettled(GetMainThreadSerialEventTarget(),
                                    logPromises)
      ->Then(GetMainThreadSerialEventTarget(), __func__,
             [](GenericPromise::AllSettledPromiseType::ResolveOrRejectValue&&
                    aValue) {
               // We don't care about the value, since we're just going to copy
               // what is in the stash. This ignores failures too, which is what
               // we want.
               return GenericPromise::CreateAndResolve(true, __func__);
             });
}

void WebrtcGlobalInformation::GetLogging(
    const GlobalObject& aGlobal, const nsAString& aPattern,
    WebrtcGlobalLoggingCallback& aLoggingCallback, ErrorResult& aRv) {
  if (!NS_IsMainThread()) {
    aRv.Throw(NS_ERROR_NOT_SAME_THREAD);
    return;
  }

  MOZ_ASSERT(XRE_IsParentProcess());

  nsAutoString pattern(aPattern);

  // CallbackObject does not support threadsafe refcounting, and must be
  // destroyed on main.
  LogRequestCallback callbackHandle(
      new nsMainThreadPtrHolder<WebrtcGlobalLoggingCallback>(
          "WebrtcGlobalLoggingCallback", &aLoggingCallback));

  auto FilterThenCallback =
      [pattern, callbackHandle](GenericPromise::ResolveOrRejectValue&& aValue)
          MOZ_CAN_RUN_SCRIPT_BOUNDARY {
            dom::Sequence<nsString> flattened;
            for (const auto& [id, log] : GetWebrtcGlobalLogStash()) {
              (void)id;
              for (const auto& line : log) {
                if (pattern.IsEmpty() || (line.Find(pattern) != kNotFound)) {
                  if (!flattened.AppendElement(line, fallible)) {
                    mozalloc_handle_oom(0);
                  }
                }
              }
            }
            IgnoredErrorResult rv;
            callbackHandle->Call(flattened, rv);
          };

  UpdateLogStash()->Then(GetMainThreadSerialEventTarget(), __func__,
                         std::move(FilterThenCallback));
  aRv = NS_OK;
}

static int32_t sLastSetLevel = 0;
static bool sLastAECDebug = false;
static Maybe<nsCString> sAecDebugLogDir;

void WebrtcGlobalInformation::SetDebugLevel(const GlobalObject& aGlobal,
                                            int32_t aLevel) {
  if (aLevel) {
    StartWebRtcLog(mozilla::LogLevel(aLevel));
  } else {
    StopWebRtcLog();
  }
  sLastSetLevel = aLevel;

  for (const auto& cp : WebrtcContentParents::GetAll()) {
    Unused << cp->SendSetDebugMode(aLevel);
  }
}

int32_t WebrtcGlobalInformation::DebugLevel(const GlobalObject& aGlobal) {
  return sLastSetLevel;
}

void WebrtcGlobalInformation::SetAecDebug(const GlobalObject& aGlobal,
                                          bool aEnable) {
  if (aEnable) {
    sAecDebugLogDir = Some(StartAecLog());
  } else {
    StopAecLog();
  }

  sLastAECDebug = aEnable;

  for (const auto& cp : WebrtcContentParents::GetAll()) {
    Unused << cp->SendSetAecLogging(aEnable);
  }
}

bool WebrtcGlobalInformation::AecDebug(const GlobalObject& aGlobal) {
  return sLastAECDebug;
}

void WebrtcGlobalInformation::GetAecDebugLogDir(const GlobalObject& aGlobal,
                                                nsAString& aDir) {
  aDir = NS_ConvertASCIItoUTF16(sAecDebugLogDir.valueOr(""_ns));
}

/*static*/
void WebrtcGlobalInformation::StashStats(
    const dom::RTCStatsReportInternal& aReport) {
  // Remove previous report, if present
  // TODO: Make this a map instead of an array?
  for (size_t i = 0; i < GetWebrtcGlobalStatsStash().Length();) {
    auto& pcStats = GetWebrtcGlobalStatsStash()[i];
    if (pcStats.mPcid == aReport.mPcid) {
      GetWebrtcGlobalStatsStash().RemoveElementAt(i);
      break;
    }
    ++i;
  }

  GetWebrtcGlobalStatsStash().AppendElement(aReport);
}

WebrtcGlobalParent* WebrtcGlobalParent::Alloc() {
  return WebrtcContentParents::Alloc();
}

bool WebrtcGlobalParent::Dealloc(WebrtcGlobalParent* aActor) {
  WebrtcContentParents::Dealloc(aActor);
  return true;
}

void WebrtcGlobalParent::ActorDestroy(ActorDestroyReason aWhy) {
  mShutdown = true;
}

mozilla::ipc::IPCResult WebrtcGlobalParent::Recv__delete__() {
  return IPC_OK();
}

MOZ_IMPLICIT WebrtcGlobalParent::WebrtcGlobalParent() : mShutdown(false) {
  MOZ_COUNT_CTOR(WebrtcGlobalParent);
}

MOZ_IMPLICIT WebrtcGlobalParent::~WebrtcGlobalParent() {
  MOZ_COUNT_DTOR(WebrtcGlobalParent);
}

mozilla::ipc::IPCResult WebrtcGlobalChild::RecvGetStats(
    const nsAString& aPcIdFilter, GetStatsResolver&& aResolve) {
  if (!mShutdown) {
    GetStatsPromiseForThisProcess(aPcIdFilter)
        ->Then(
            GetMainThreadSerialEventTarget(), __func__,
            [resolve = std::move(aResolve)](
                nsTArray<dom::RTCStatsReportInternal>&& aReports) {
              resolve(std::move(aReports));
            },
            []() { MOZ_CRASH(); });
    return IPC_OK();
  }

  aResolve(nsTArray<RTCStatsReportInternal>());
  return IPC_OK();
}

mozilla::ipc::IPCResult WebrtcGlobalChild::RecvClearStats() {
  if (mShutdown) {
    return IPC_OK();
  }

  ClearLongTermStats();
  return IPC_OK();
}

mozilla::ipc::IPCResult WebrtcGlobalChild::RecvGetLog(
    GetLogResolver&& aResolve) {
  if (mShutdown) {
    aResolve(Sequence<nsString>());
    return IPC_OK();
  }

  GetLogPromise()->Then(
      GetMainThreadSerialEventTarget(), __func__,
      [aResolve = std::move(aResolve)](
          PWebrtcGlobalParent::GetLogPromise::ResolveOrRejectValue&& aValue) {
        if (aValue.IsResolve()) {
          aResolve(aValue.ResolveValue());
        } else {
          aResolve(Sequence<nsString>());
        }
      });

  return IPC_OK();
}

mozilla::ipc::IPCResult WebrtcGlobalChild::RecvClearLog() {
  if (mShutdown) {
    return IPC_OK();
  }

  RunLogClear();
  return IPC_OK();
}

mozilla::ipc::IPCResult WebrtcGlobalChild::RecvSetAecLogging(
    const bool& aEnable) {
  if (!mShutdown) {
    if (aEnable) {
      StartAecLog();
    } else {
      StopAecLog();
    }
  }
  return IPC_OK();
}

mozilla::ipc::IPCResult WebrtcGlobalChild::RecvSetDebugMode(const int& aLevel) {
  if (!mShutdown) {
    if (aLevel) {
      StartWebRtcLog(mozilla::LogLevel(aLevel));
    } else {
      StopWebRtcLog();
    }
  }
  return IPC_OK();
}

WebrtcGlobalChild* WebrtcGlobalChild::Create() {
  WebrtcGlobalChild* child = static_cast<WebrtcGlobalChild*>(
      ContentChild::GetSingleton()->SendPWebrtcGlobalConstructor());
  return child;
}

void WebrtcGlobalChild::ActorDestroy(ActorDestroyReason aWhy) {
  mShutdown = true;
}

MOZ_IMPLICIT WebrtcGlobalChild::WebrtcGlobalChild() : mShutdown(false) {
  MOZ_COUNT_CTOR(WebrtcGlobalChild);
}

MOZ_IMPLICIT WebrtcGlobalChild::~WebrtcGlobalChild() {
  MOZ_COUNT_DTOR(WebrtcGlobalChild);
}

}  // namespace mozilla::dom
