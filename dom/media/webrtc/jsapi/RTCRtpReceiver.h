/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef _RTCRtpReceiver_h_
#define _RTCRtpReceiver_h_

#include "nsISupports.h"
#include "nsWrapperCache.h"
#include "mozilla/RefPtr.h"
#include "mozilla/StateMirroring.h"
#include "mozilla/Maybe.h"
#include "js/RootingAPI.h"
#include "libwebrtcglue/MediaConduitInterface.h"
#include "libwebrtcglue/RtpRtcpConfig.h"
#include "nsTArray.h"
#include "mozilla/dom/RTCStatsReportBinding.h"
#include "PerformanceRecorder.h"
#include "RTCStatsReport.h"
#include "transportbridge/MediaPipeline.h"
#include <vector>

class nsPIDOMWindowInner;

namespace mozilla {
class MediaSessionConduit;
class MediaTransportHandler;
class JsepTransceiver;
class PeerConnectionImpl;
enum class PrincipalPrivacy : uint8_t;
class RemoteTrackSource;

namespace dom {
class MediaStreamTrack;
class Promise;
class RTCDtlsTransport;
struct RTCRtpContributingSource;
struct RTCRtpSynchronizationSource;
class RTCRtpTransceiver;

class RTCRtpReceiver : public nsISupports,
                       public nsWrapperCache,
                       public MediaPipelineReceiveControlInterface {
 public:
  RTCRtpReceiver(nsPIDOMWindowInner* aWindow, PrincipalPrivacy aPrivacy,
                 PeerConnectionImpl* aPc,
                 MediaTransportHandler* aTransportHandler,
                 AbstractThread* aCallThread, nsISerialEventTarget* aStsThread,
                 MediaSessionConduit* aConduit, RTCRtpTransceiver* aTransceiver,
                 const TrackingId& aTrackingId);

  // nsISupports
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(RTCRtpReceiver)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // webidl
  MediaStreamTrack* Track() const { return mTrack; }
  RTCDtlsTransport* GetTransport() const;
  already_AddRefed<Promise> GetStats(ErrorResult& aError);
  void GetContributingSources(
      nsTArray<dom::RTCRtpContributingSource>& aSources);
  void GetSynchronizationSources(
      nsTArray<dom::RTCRtpSynchronizationSource>& aSources);
  // test-only: insert fake CSRCs and audio levels for testing
  void MozInsertAudioLevelForContributingSource(
      const uint32_t aSource, const DOMHighResTimeStamp aTimestamp,
      const uint32_t aRtpTimestamp, const bool aHasLevel, const uint8_t aLevel);

  nsPIDOMWindowInner* GetParentObject() const;
  nsTArray<RefPtr<RTCStatsPromise>> GetStatsInternal(
      bool aSkipIceStats = false);

  void Shutdown();
  void BreakCycles();
  // Terminal state, reached through stopping RTCRtpTransceiver.
  void Stop();
  bool HasTrack(const dom::MediaStreamTrack* aTrack) const;
  void SyncToJsep(JsepTransceiver& aJsepTransceiver) const;
  void SyncFromJsep(const JsepTransceiver& aJsepTransceiver);
  const std::vector<std::string>& GetStreamIds() const { return mStreamIds; }

  struct StreamAssociation {
    RefPtr<MediaStreamTrack> mTrack;
    std::string mStreamId;
  };

  struct TrackEventInfo {
    RefPtr<RTCRtpReceiver> mReceiver;
    std::vector<std::string> mStreamIds;
  };

  struct StreamAssociationChanges {
    std::vector<RefPtr<RTCRtpReceiver>> mReceiversToMute;
    std::vector<StreamAssociation> mStreamAssociationsRemoved;
    std::vector<StreamAssociation> mStreamAssociationsAdded;
    std::vector<TrackEventInfo> mTrackEvents;
  };

  // This is called when we set an answer (ie; when the transport is finalized).
  void UpdateTransport();
  void UpdateConduit();

  // This is called when we set a remote description; may be an offer or answer.
  void UpdateStreams(StreamAssociationChanges* aChanges);

  // Called when the privacy-needed state changes on the fly, as a result of
  // ALPN negotiation.
  void UpdatePrincipalPrivacy(PrincipalPrivacy aPrivacy);

  void OnRtcpBye();
  void OnRtcpTimeout();

  void SetTrackMuteFromRemoteSdp();
  void OnUnmute();
  void UpdateUnmuteBlockingState();
  void UpdateReceiveTrackMute();

  AbstractCanonical<Ssrc>* CanonicalSsrc() { return &mSsrc; }
  AbstractCanonical<Ssrc>* CanonicalVideoRtxSsrc() { return &mVideoRtxSsrc; }
  AbstractCanonical<RtpExtList>* CanonicalLocalRtpExtensions() {
    return &mLocalRtpExtensions;
  }

  AbstractCanonical<std::vector<AudioCodecConfig>>* CanonicalAudioCodecs() {
    return &mAudioCodecs;
  }

  AbstractCanonical<std::vector<VideoCodecConfig>>* CanonicalVideoCodecs() {
    return &mVideoCodecs;
  }
  AbstractCanonical<Maybe<RtpRtcpConfig>>* CanonicalVideoRtpRtcpConfig() {
    return &mVideoRtpRtcpConfig;
  }
  AbstractCanonical<bool>* CanonicalReceiving() override { return &mReceiving; }

 private:
  virtual ~RTCRtpReceiver();

  void UpdateVideoConduit();
  void UpdateAudioConduit();

  std::string GetMid() const;
  JsepTransceiver& GetJsepTransceiver();
  const JsepTransceiver& GetJsepTransceiver() const;

  WatchManager<RTCRtpReceiver> mWatchManager;
  nsCOMPtr<nsPIDOMWindowInner> mWindow;
  RefPtr<PeerConnectionImpl> mPc;
  bool mHaveStartedReceiving = false;
  bool mHaveSetupTransport = false;
  RefPtr<AbstractThread> mCallThread;
  nsCOMPtr<nsISerialEventTarget> mStsThread;
  RefPtr<dom::MediaStreamTrack> mTrack;
  RefPtr<RemoteTrackSource> mTrackSource;
  RefPtr<MediaPipelineReceive> mPipeline;
  RefPtr<MediaTransportHandler> mTransportHandler;
  RefPtr<RTCRtpTransceiver> mTransceiver;
  // This is [[AssociatedRemoteMediaStreams]], basically. We do not keep the
  // streams themselves here, because that would require this object to know
  // where the stream list for the whole RTCPeerConnection lives..
  std::vector<std::string> mStreamIds;
  bool mRemoteSetSendBit = false;
  Watchable<bool> mReceiveTrackMute{true, "RTCRtpReceiver::mReceiveTrackMute"};
  Watchable<bool> mBlockUnmuteEvents{false, "RTCRtpReceiver::mBlockUnmuteEve~"};

  MediaEventListener mRtcpByeListener;
  MediaEventListener mRtcpTimeoutListener;
  MediaEventListener mUnmuteListener;

  Canonical<Ssrc> mSsrc;
  Canonical<Ssrc> mVideoRtxSsrc;
  Canonical<RtpExtList> mLocalRtpExtensions;
  Canonical<std::vector<AudioCodecConfig>> mAudioCodecs;
  Canonical<std::vector<VideoCodecConfig>> mVideoCodecs;
  Canonical<Maybe<RtpRtcpConfig>> mVideoRtpRtcpConfig;
  Canonical<bool> mReceiving;
};

}  // namespace dom
}  // namespace mozilla
#endif  // _RTCRtpReceiver_h_
