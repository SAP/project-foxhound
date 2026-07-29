/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "HLSDecoder.h"

#include "AndroidBridge.h"
#include "DecoderTraits.h"
#include "GeckoViewStreamListener.h"
#include "HLSDemuxer.h"
#include "HLSUtils.h"
#include "JavaBuiltins.h"
#include "JavaExceptions.h"
#include "MediaContainerType.h"
#include "MediaDecoderStateMachine.h"
#include "MediaFormatReader.h"
#include "MediaShutdownManager.h"
#include "base/process_util.h"
#include "mozilla/BasePrincipal.h"
#include "mozilla/ErrorNames.h"
#include "mozilla/NullPrincipal.h"
#include "mozilla/StaticPrefs_media.h"
#include "mozilla/SyncRunnable.h"
#include "mozilla/dom/HTMLMediaElement.h"
#include "mozilla/glean/DomMediaHlsMetrics.h"
#include "mozilla/java/GeckoAppShellWrappers.h"
#include "mozilla/java/GeckoHLSResourceWrapperNatives.h"
#include "mozilla/java/GeckoResultWrappers.h"
#include "mozilla/java/WebMessageWrappers.h"
#include "mozilla/java/WebRequestWrappers.h"
#include "mozilla/widget/WebExecutorSupport.h"
#include "nsContentUtils.h"
#include "nsIChannel.h"
#include "nsIHttpChannel.h"
#include "nsILoadInfo.h"
#include "nsIURL.h"
#include "nsNetUtil.h"
#include "nsThreadUtils.h"

namespace mozilla {

class HLSResourceCallbacksSupport
    : public java::GeckoHLSResourceWrapper::Callbacks::Natives<
          HLSResourceCallbacksSupport> {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(HLSResourceCallbacksSupport)
 public:
  typedef java::GeckoHLSResourceWrapper::Callbacks::Natives<
      HLSResourceCallbacksSupport>
      NativeCallbacks;
  using NativeCallbacks::AttachNative;
  using NativeCallbacks::DisposeNative;

  explicit HLSResourceCallbacksSupport(HLSDecoder* aResource);
  void Detach();
  void OnLoad(jni::String::Param aUrl);
  void OnDataArrived();
  void OnError(int aErrorCode);
  // Called by ExoPlayer on its loader thread to fetch HLS resource specified
  // with a WebRequest. Returns a GeckoResult<WebResponse> that will be resolved
  // on the Gecko main thread.
  jni::Object::LocalRef OnOpenChannel(jni::Object::Param aRequest);

 private:
  ~HLSResourceCallbacksSupport() {}
  void DoOpenChannel(java::WebRequest::Param aRequest,
                     java::GeckoResult::Param aResult);

  Mutex mMutex MOZ_UNANNOTATED;
  HLSDecoder* mDecoder;

  // Listener to bridge Necko HTTP channel response back to the
  // GeckoResult<WebResponse> returned by OnOpenChannel().
  class GeckoHttpChannelListener final : public GeckoViewStreamListener {
   public:
    NS_INLINE_DECL_REFCOUNTING_INHERITED(GeckoHttpChannelListener,
                                         GeckoViewStreamListener)

    explicit GeckoHttpChannelListener(java::GeckoResult::Param aResult)
        : mResult(aResult) {
      MOZ_ASSERT(NS_IsMainThread());
      MOZ_ASSERT(mResult);
    }

   protected:
    void SendWebResponse(java::WebResponse::Param aResponse) override {
      MOZ_ASSERT(mResult);
      HLS_DEBUG("GeckoHttpChannelListener", "Status code=%" PRIi32,
                aResponse->StatusCode());
      mResult->Complete(aResponse);
      mResult = nullptr;
    }

    void CompleteWithError(nsresult aStatus, nsIChannel* aChannel) override {
      MOZ_ASSERT(mResult);
      HLS_DEBUG("GeckoHttpChannelListener", "error=%s",
                format_as(aStatus).get());
      widget::WebExecutorSupport::CompleteWithError(mResult, aStatus, aChannel);
      mResult = nullptr;
    }

   private:
    ~GeckoHttpChannelListener() = default;

    java::GeckoResult::GlobalRef mResult;
  };
};

HLSResourceCallbacksSupport::HLSResourceCallbacksSupport(HLSDecoder* aDecoder)
    : mMutex("HLSResourceCallbacksSupport"), mDecoder(aDecoder) {
  MOZ_ASSERT(mDecoder);
}

void HLSResourceCallbacksSupport::Detach() {
  MOZ_ASSERT(NS_IsMainThread());
  MutexAutoLock lock(mMutex);
  mDecoder = nullptr;
}

void HLSResourceCallbacksSupport::OnLoad(jni::String::Param aUrl) {
  MutexAutoLock lock(mMutex);
  if (!mDecoder) {
    return;
  }
  RefPtr<HLSResourceCallbacksSupport> self = this;
  jni::String::GlobalRef url = std::move(aUrl);
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "HLSResourceCallbacksSupport::OnLoad", [self, url]() -> void {
        if (self->mDecoder) {
          self->mDecoder->NotifyLoad(url->ToCString());
        }
      }));
}

void HLSResourceCallbacksSupport::OnDataArrived() {
  HLS_DEBUG("HLSResourceCallbacksSupport", "OnDataArrived.");
  MutexAutoLock lock(mMutex);
  if (!mDecoder) {
    return;
  }
  RefPtr<HLSResourceCallbacksSupport> self = this;
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "HLSResourceCallbacksSupport::OnDataArrived", [self]() -> void {
        if (self->mDecoder) {
          self->mDecoder->NotifyDataArrived();
        }
      }));
}

void HLSResourceCallbacksSupport::OnError(int aErrorCode) {
  HLS_DEBUG("HLSResourceCallbacksSupport", "onError({})", aErrorCode);
  MutexAutoLock lock(mMutex);
  if (!mDecoder) {
    return;
  }
  RefPtr<HLSResourceCallbacksSupport> self = this;
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "HLSResourceCallbacksSupport::OnError", [self]() -> void {
        if (self->mDecoder) {
          // Since HLS source should be from the Internet, we treat all resource
          // errors from GeckoHlsPlayer as network errors.
          self->mDecoder->NetworkError(
              MediaResult(NS_ERROR_FAILURE, "HLS error"));
        }
      }));
}

jni::Object::LocalRef HLSResourceCallbacksSupport::OnOpenChannel(
    jni::Object::Param aRequest) {
  MOZ_ASSERT(!NS_IsMainThread());

  MutexAutoLock lock(mMutex);
  if (!mDecoder) {
    HLS_DEBUG("HLSResourceCallbacksSupport", "FAIL: already detached");
    return nullptr;
  }

  auto result = java::GeckoResult::New();
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "HLSResourceCallbacksSupport::OnOpenChannel",
      [self = RefPtr{this},
       request =
           java::WebRequest::GlobalRef{java::WebRequest::Ref::From(aRequest)},
       result = java::GeckoResult::GlobalRef{result}]() {
        self->DoOpenChannel(request, result);
      }));

  return jni::ToLocalRef(result);
}

void HLSResourceCallbacksSupport::DoOpenChannel(
    java::WebRequest::Param aRequest, java::GeckoResult::Param aResult) {
  MOZ_ASSERT(NS_IsMainThread());

  if (!mDecoder) {
    HLS_DEBUG("HLSResourceCallbacksSupport", "FAIL: already detached");
    aResult->CompleteExceptionally(java::sdk::IllegalStateException::New(
                                       jni::StringParam("already detached"_ns))
                                       .Cast<jni::Throwable>());
    return;
  }
  RefPtr<dom::HTMLMediaElement> element =
      mDecoder->GetOwner()->GetMediaElement();
  if (!element) {
    HLS_DEBUG("HLSResourceCallbacksSupport", "FAIL: no media element");
    aResult->CompleteExceptionally(java::sdk::IllegalStateException::New(
                                       jni::StringParam("no media element"_ns))
                                       .Cast<jni::Throwable>());
    return;
  }

  const auto requestBase =
      java::WebMessage::LocalRef(aRequest.Cast<java::WebMessage>());
  const nsCString uriStr = requestBase->Uri()->ToCString();

  HLS_DEBUG("HLSResourceCallbacksSupport", "URI=%s", uriStr.get());
  nsCOMPtr<nsIURI> uri;
  nsresult rv = NS_NewURI(getter_AddRefs(uri), uriStr);
  if (NS_FAILED(rv)) {
    HLS_DEBUG("HLSResourceCallbacksSupport",
              "FAIL: cannot create URI, error=%s", format_as(rv).get());
    widget::WebExecutorSupport::CompleteWithError(aResult, rv);
    return;
  }

  nsCOMPtr<nsIChannel> newChannel;
  nsCOMPtr<nsIPrincipal> triggeringPrincipal;
  nsContentUtils::QueryTriggeringPrincipal(element,
                                           getter_AddRefs(triggeringPrincipal));
  nsSecurityFlags secFlags =
      element->ShouldCheckAllowOrigin()
          ? nsILoadInfo::SEC_REQUIRE_CORS_INHERITS_SEC_CONTEXT
          : nsILoadInfo::SEC_ALLOW_CROSS_ORIGIN_INHERITS_SEC_CONTEXT;
  if (element->GetCORSMode() == CORS_USE_CREDENTIALS) {
    secFlags |= nsILoadInfo::SEC_COOKIES_INCLUDE;
  }
  const auto contentType = element->IsHTMLElement(nsGkAtoms::audio)
                               ? nsIContentPolicy::TYPE_INTERNAL_AUDIO
                               : nsIContentPolicy::TYPE_INTERNAL_VIDEO;
  rv = NS_NewChannelWithTriggeringPrincipal(getter_AddRefs(newChannel), uri,
                                            element, triggeringPrincipal,
                                            secFlags, contentType);
  if (NS_FAILED(rv)) {
    HLS_DEBUG("HLSResourceCallbacksSupport",
              "FAIL: cannot create channel, error=%s", format_as(rv).get());
    widget::WebExecutorSupport::CompleteWithError(aResult, rv);
    return;
  }

  nsCOMPtr<nsIHttpChannel> httpChannel = do_QueryInterface(newChannel);
  if (httpChannel) {
    const auto keys = requestBase->GetHeaderKeys();
    const auto values = requestBase->GetHeaderValues();
    for (size_t i = 0; i < keys->Length(); i++) {
      nsAutoCString name{
          jni::String::LocalRef(keys->GetElement(i))->ToCString()};
      nsAutoCString value{
          jni::String::LocalRef(values->GetElement(i))->ToCString()};
      rv = httpChannel->SetRequestHeader(name, value, false);
      if (NS_FAILED(rv)) {
        HLS_DEBUG("HLSResourceCallbacksSupport",
                  "WARN: cannot set header '%s: %s', error=%s", name.get(),
                  value.get(), format_as(rv).get());
      }
    }
  }

  auto listener = MakeRefPtr<GeckoHttpChannelListener>(aResult);
  newChannel->SetNotificationCallbacks(listener);
  rv = newChannel->AsyncOpen(listener);
  if (NS_FAILED(rv)) {
    HLS_DEBUG("HLSResourceCallbacksSupport", "FAIL: cannot open, error=%s",
              format_as(rv).get());
    widget::WebExecutorSupport::CompleteWithError(aResult, rv, newChannel);
  }
}

size_t HLSDecoder::sAllocatedInstances = 0;

// static
RefPtr<HLSDecoder> HLSDecoder::Create(MediaDecoderInit& aInit) {
  MOZ_ASSERT(NS_IsMainThread());

  return sAllocatedInstances < StaticPrefs::media_hls_max_allocations()
             ? new HLSDecoder(aInit)
             : nullptr;
}

HLSDecoder::HLSDecoder(MediaDecoderInit& aInit) : MediaDecoder(aInit) {
  MOZ_ASSERT(NS_IsMainThread());
  sAllocatedInstances++;
  HLS_DEBUG("HLSDecoder", "HLSDecoder(): allocated={}", sAllocatedInstances);
}

HLSDecoder::~HLSDecoder() {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(sAllocatedInstances > 0);
  sAllocatedInstances--;
  HLS_DEBUG("HLSDecoder", "~HLSDecoder(): allocated={}", sAllocatedInstances);
}

already_AddRefed<MediaDecoderStateMachineBase> HLSDecoder::CreateStateMachine(
    bool aDisableExternalEngine) {
  MOZ_ASSERT(NS_IsMainThread());

  MediaFormatReaderInit init;
  init.mVideoFrameContainer = GetVideoFrameContainer();
  init.mKnowsCompositor = GetCompositor();
  init.mCrashHelper = GetOwner()->CreateGMPCrashHelper();
  init.mFrameStats = mFrameStats;
  init.mMediaDecoderOwnerID = mOwner;
  static Atomic<uint32_t> sTrackingIdCounter(0);
  init.mTrackingId =
      Some(TrackingId(TrackingId::Source::HLSDecoder, sTrackingIdCounter++,
                      TrackingId::TrackAcrossProcesses::Yes));
  mReader = new MediaFormatReader(
      init, new HLSDemuxer(mHLSResourceWrapper->GetPlayerId()));

  return MakeAndAddRef<MediaDecoderStateMachine>(this, mReader);
}

bool HLSDecoder::IsEnabled() {
  return StaticPrefs::media_hls_enabled() &&
         !java::GeckoAppShell::IsIsolatedProcess();
}

bool HLSDecoder::IsSupportedType(const MediaContainerType& aContainerType) {
  return IsEnabled() && DecoderTraits::IsHttpLiveStreamingType(aContainerType);
}

nsresult HLSDecoder::Load(nsIChannel* aChannel) {
  MOZ_ASSERT(NS_IsMainThread());

  nsresult rv = NS_GetFinalChannelURI(aChannel, getter_AddRefs(mURI));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  mChannel = aChannel;
  nsCString spec;
  (void)mURI->GetSpec(spec);
  mUsageRecorded = false;

  HLSResourceCallbacksSupport::Init();

  mJavaCallbacks = java::GeckoHLSResourceWrapper::Callbacks::New();
  mCallbackSupport = new HLSResourceCallbacksSupport(this);
  HLSResourceCallbacksSupport::AttachNative(mJavaCallbacks, mCallbackSupport);
  mHLSResourceWrapper = java::GeckoHLSResourceWrapper::Create(
      NS_ConvertUTF8toUTF16(spec), mJavaCallbacks);
  MOZ_ASSERT(mHLSResourceWrapper);

  rv = MediaShutdownManager::Instance().Register(this);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }
  return CreateAndInitStateMachine(false);
}

void HLSDecoder::AddSizeOfResources(ResourceSizes* aSizes) {
  MOZ_ASSERT(NS_IsMainThread());
  // TODO: track JAVA wrappers.
}

already_AddRefed<nsIPrincipal> HLSDecoder::GetCurrentPrincipal() {
  MOZ_ASSERT(NS_IsMainThread());
  return do_AddRef(mContentPrincipal);
}

bool HLSDecoder::HadCrossOriginRedirects() {
  MOZ_ASSERT(NS_IsMainThread());
  // Bug 1478843
  return false;
}

void HLSDecoder::Play() {
  MOZ_ASSERT(NS_IsMainThread());
  HLS_DEBUG("HLSDecoder", "MediaElement called Play");
  mHLSResourceWrapper->Play();
  return MediaDecoder::Play();
}

void HLSDecoder::Pause() {
  MOZ_ASSERT(NS_IsMainThread());
  HLS_DEBUG("HLSDecoder", "MediaElement called Pause");
  mHLSResourceWrapper->Pause();
  return MediaDecoder::Pause();
}

void HLSDecoder::Suspend() {
  MOZ_ASSERT(NS_IsMainThread());
  HLS_DEBUG("HLSDecoder", "Should suspend the resource fetching.");
  mHLSResourceWrapper->Suspend();
}

void HLSDecoder::Resume() {
  MOZ_ASSERT(NS_IsMainThread());
  HLS_DEBUG("HLSDecoder", "Should resume the resource fetching.");
  mHLSResourceWrapper->Resume();
}

void HLSDecoder::Shutdown() {
  HLS_DEBUG("HLSDecoder", "Shutdown");
  if (mCallbackSupport) {
    mCallbackSupport->Detach();
  }
  if (mHLSResourceWrapper) {
    mHLSResourceWrapper->Destroy();
    mHLSResourceWrapper = nullptr;
  }
  if (mJavaCallbacks) {
    HLSResourceCallbacksSupport::DisposeNative(mJavaCallbacks);
    mJavaCallbacks = nullptr;
  }
  MediaDecoder::Shutdown();
}

void HLSDecoder::NotifyDataArrived() {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_DIAGNOSTIC_ASSERT(!IsShutdown());
  NotifyReaderDataArrived();
  GetOwner()->DownloadProgressed();
}

void HLSDecoder::NotifyLoad(nsCString aMediaUrl) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_DIAGNOSTIC_ASSERT(!IsShutdown());

  nsCOMPtr<nsIURI> uri;
  nsresult rv = NS_NewURI(getter_AddRefs(uri), aMediaUrl.Data());
  NS_ENSURE_SUCCESS_VOID(rv);

  RecordMediaUsage(uri);
  UpdateCurrentPrincipal(uri);
}

void HLSDecoder::RecordMediaUsage(nsIURI* aMediaUri) {
  if (mUsageRecorded) {
    return;
  }

  nsresult rv;
  nsCOMPtr<nsIURL> url = do_QueryInterface(aMediaUri, &rv);
  NS_ENSURE_SUCCESS_VOID(rv);

  // TODO: get hostname. See bug 1887053.
  nsAutoCString mediaExt;
  (void)url->GetFileExtension(mediaExt);
  glean::hls::MediaLoadExtra extra = {.mediaExtension = Some(mediaExt.get())};
  glean::hls::media_load.Record(Some(extra));
  mUsageRecorded = true;
}

// Should be called when the decoder loads media from a URL to ensure the
// principal of the media element is appropriately set for CORS.
void HLSDecoder::UpdateCurrentPrincipal(nsIURI* aMediaUri) {
  nsCOMPtr<nsIPrincipal> principal = GetContentPrincipal(aMediaUri);
  MOZ_DIAGNOSTIC_ASSERT(principal);

  // Check the subsumption of old and new principals. Should be either
  // equal or disjoint.
  if (!mContentPrincipal || principal->GetIsNullPrincipal()) {
    mContentPrincipal = std::move(principal);
  } else if (principal->Equals(mContentPrincipal)) {
    return;
  } else if (!principal->Subsumes(mContentPrincipal) &&
             !mContentPrincipal->Subsumes(principal)) {
    // Principals are disjoint -- no access.
    mContentPrincipal = NullPrincipal::Create(OriginAttributes());
  } else {
    MOZ_DIAGNOSTIC_CRASH("non-equal principals should be disjoint");
    mContentPrincipal = nullptr;
  }
  MediaDecoder::NotifyPrincipalChanged();
}

already_AddRefed<nsIPrincipal> HLSDecoder::GetContentPrincipal(
    nsIURI* aMediaUri) {
  RefPtr<dom::HTMLMediaElement> element = GetOwner()->GetMediaElement();
  nsSecurityFlags securityFlags =
      element->ShouldCheckAllowOrigin()
          ? nsILoadInfo::SEC_REQUIRE_CORS_INHERITS_SEC_CONTEXT
          : nsILoadInfo::SEC_ALLOW_CROSS_ORIGIN_INHERITS_SEC_CONTEXT;
  if (element->GetCORSMode() == CORS_USE_CREDENTIALS) {
    securityFlags |= nsILoadInfo::SEC_COOKIES_INCLUDE;
  }
  nsCOMPtr<nsIPrincipal> principal = NullPrincipal::Create(OriginAttributes());
  nsCOMPtr<nsIChannel> channel;
  nsresult rv = NS_NewChannel(
      getter_AddRefs(channel), aMediaUri, static_cast<dom::Element*>(element),
      securityFlags, nsIContentPolicy::TYPE_INTERNAL_VIDEO);
  NS_ENSURE_SUCCESS(rv, principal.forget());
  nsIScriptSecurityManager* secMan = nsContentUtils::GetSecurityManager();
  if (!secMan) {
    return principal.forget();
  }
  secMan->GetChannelResultPrincipal(channel, getter_AddRefs(principal));
  return principal.forget();
}

}  // namespace mozilla
