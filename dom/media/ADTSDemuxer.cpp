/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ADTSDemuxer.h"

#include "TimeUnits.h"
#include "VideoUtils.h"
#include "mozilla/Logging.h"
#include "mozilla/UniquePtr.h"
#include "Adts.h"
#include <inttypes.h>

extern mozilla::LazyLogModule gMediaDemuxerLog;
#define LOG(msg, ...) \
  MOZ_LOG(gMediaDemuxerLog, LogLevel::Debug, msg, ##__VA_ARGS__)
#define ADTSLOG(msg, ...) \
  DDMOZ_LOG(gMediaDemuxerLog, LogLevel::Debug, msg, ##__VA_ARGS__)
#define ADTSLOGV(msg, ...) \
  DDMOZ_LOG(gMediaDemuxerLog, LogLevel::Verbose, msg, ##__VA_ARGS__)

namespace mozilla {

using media::TimeUnit;

// ADTSDemuxer

ADTSDemuxer::ADTSDemuxer(MediaResource* aSource) : mSource(aSource) {
  DDLINKCHILD("source", aSource);
}

bool ADTSDemuxer::InitInternal() {
  if (!mTrackDemuxer) {
    mTrackDemuxer = new ADTSTrackDemuxer(mSource);
    DDLINKCHILD("track demuxer", mTrackDemuxer.get());
  }
  return mTrackDemuxer->Init();
}

RefPtr<ADTSDemuxer::InitPromise> ADTSDemuxer::Init() {
  if (!InitInternal()) {
    ADTSLOG("Init() failure: waiting for data");

    return InitPromise::CreateAndReject(NS_ERROR_DOM_MEDIA_METADATA_ERR,
                                        __func__);
  }

  ADTSLOG("Init() successful");
  return InitPromise::CreateAndResolve(NS_OK, __func__);
}

uint32_t ADTSDemuxer::GetNumberTracks(TrackInfo::TrackType aType) const {
  return (aType == TrackInfo::kAudioTrack) ? 1 : 0;
}

already_AddRefed<MediaTrackDemuxer> ADTSDemuxer::GetTrackDemuxer(
    TrackInfo::TrackType aType, uint32_t aTrackNumber) {
  if (!mTrackDemuxer) {
    return nullptr;
  }

  return RefPtr<ADTSTrackDemuxer>(mTrackDemuxer).forget();
}

bool ADTSDemuxer::IsSeekable() const {
  int64_t length = mSource->GetLength();
  return length > -1;
}

// ADTSTrackDemuxer
ADTSTrackDemuxer::ADTSTrackDemuxer(MediaResource* aSource)
    : mSource(aSource),
      mParser(new ADTS::FrameParser()),
      mOffset(0),
      mNumParsedFrames(0),
      mFrameIndex(0),
      mTotalFrameLen(0),
      mSamplesPerFrame(0),
      mSamplesPerSecond(0),
      mChannels(0) {
  DDLINKCHILD("source", aSource);
  Reset();
}

ADTSTrackDemuxer::~ADTSTrackDemuxer() { delete mParser; }

bool ADTSTrackDemuxer::Init() {
  FastSeek(TimeUnit::Zero());
  // Read the first frame to fetch sample rate and other meta data.
  RefPtr<MediaRawData> frame(GetNextFrame(FindNextFrame(true)));

  ADTSLOG("Init StreamLength()=%" PRId64 " first-frame-found=%d",
          StreamLength(), !!frame);

  if (!frame) {
    return false;
  }

  // Rewind back to the stream begin to avoid dropping the first frame.
  FastSeek(TimeUnit::Zero());

  if (!mSamplesPerSecond) {
    return false;
  }

  if (!mInfo) {
    mInfo = MakeUnique<AudioInfo>();
  }

  mInfo->mRate = mSamplesPerSecond;
  mInfo->mChannels = mChannels;
  mInfo->mBitDepth = 16;
  mInfo->mDuration = Duration();

  // AAC Specific information
  mInfo->mMimeType = "audio/mp4a-latm";

  // Configure AAC codec-specific values.
  // For AAC, mProfile and mExtendedProfile contain the audioObjectType from
  // Table 1.3 -- Audio Profile definition, ISO/IEC 14496-3. Eg. 2 == AAC LC
  mInfo->mProfile = mInfo->mExtendedProfile =
      mParser->FirstFrame().Header().mObjectType;
  AudioCodecSpecificBinaryBlob blob;
  InitAudioSpecificConfig(mParser->FirstFrame(), blob.mBinaryBlob);
  mInfo->mCodecSpecificConfig = AudioCodecSpecificVariant{std::move(blob)};

  ADTSLOG("Init mInfo={mRate=%u mChannels=%u mBitDepth=%u mDuration=%" PRId64
          "}",
          mInfo->mRate, mInfo->mChannels, mInfo->mBitDepth,
          mInfo->mDuration.ToMicroseconds());

  // AAC encoder delay can be 2112 (typical value when using Apple AAC encoder),
  // or 1024 (typical value when encoding using fdk_aac, often via ffmpeg).
  // See
  // https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFAppenG/QTFFAppenG.html
  // In an attempt to not trim valid audio data, and because ADTS doesn't
  // provide a way to know this pre-roll value, this offets by 1024 frames.
  mPreRoll = TimeUnit(1024, mSamplesPerSecond);
  return mChannels;
}

UniquePtr<TrackInfo> ADTSTrackDemuxer::GetInfo() const {
  return mInfo->Clone();
}

RefPtr<ADTSTrackDemuxer::SeekPromise> ADTSTrackDemuxer::Seek(
    const TimeUnit& aTime) {
  // Efficiently seek to the position.
  const TimeUnit time = aTime > mPreRoll ? aTime - mPreRoll : TimeUnit::Zero();
  FastSeek(time);
  // Correct seek position by scanning the next frames.
  const TimeUnit seekTime = ScanUntil(time);

  return SeekPromise::CreateAndResolve(seekTime, __func__);
}

TimeUnit ADTSTrackDemuxer::FastSeek(const TimeUnit& aTime) {
  ADTSLOG("FastSeek(%" PRId64 ") avgFrameLen=%f mNumParsedFrames=%" PRIu64
          " mFrameIndex=%" PRId64 " mOffset=%" PRIu64,
          aTime.ToMicroseconds(), AverageFrameLength(), mNumParsedFrames,
          mFrameIndex, mOffset);

  const uint64_t firstFrameOffset = mParser->FirstFrame().Offset();
  if (!aTime.ToMicroseconds()) {
    // Quick seek to the beginning of the stream.
    mOffset = firstFrameOffset;
  } else if (AverageFrameLength() > 0) {
    mOffset =
        firstFrameOffset +
        AssertedCast<uint64_t>(AssertedCast<double>(FrameIndexFromTime(aTime)) *
                               AverageFrameLength());
  }

  const int64_t streamLength = StreamLength();
  if (mOffset > firstFrameOffset && streamLength > 0) {
    mOffset = std::min(static_cast<uint64_t>(streamLength - 1), mOffset);
  }

  mFrameIndex = FrameIndexFromOffset(mOffset);
  mParser->EndFrameSession();

  ADTSLOG("FastSeek End avgFrameLen=%f mNumParsedFrames=%" PRIu64
          " mFrameIndex=%" PRId64 " mFirstFrameOffset=%" PRIu64
          " mOffset=%" PRIu64 " SL=%" PRIu64 "",
          AverageFrameLength(), mNumParsedFrames, mFrameIndex, firstFrameOffset,
          mOffset, streamLength);

  return Duration(mFrameIndex);
}

TimeUnit ADTSTrackDemuxer::ScanUntil(const TimeUnit& aTime) {
  ADTSLOG("ScanUntil(%" PRId64 ") avgFrameLen=%f mNumParsedFrames=%" PRIu64
          " mFrameIndex=%" PRId64 " mOffset=%" PRIu64,
          aTime.ToMicroseconds(), AverageFrameLength(), mNumParsedFrames,
          mFrameIndex, mOffset);

  if (!aTime.ToMicroseconds()) {
    return FastSeek(aTime);
  }

  if (Duration(mFrameIndex) > aTime) {
    FastSeek(aTime);
  }

  while (SkipNextFrame(FindNextFrame()) && Duration(mFrameIndex + 1) < aTime) {
    ADTSLOGV("ScanUntil* avgFrameLen=%f mNumParsedFrames=%" PRIu64
             " mFrameIndex=%" PRId64 " mOffset=%" PRIu64 " Duration=%" PRId64,
             AverageFrameLength(), mNumParsedFrames, mFrameIndex, mOffset,
             Duration(mFrameIndex + 1).ToMicroseconds());
  }

  ADTSLOG("ScanUntil End avgFrameLen=%f mNumParsedFrames=%" PRIu64
          " mFrameIndex=%" PRId64 " mOffset=%" PRIu64,
          AverageFrameLength(), mNumParsedFrames, mFrameIndex, mOffset);

  return Duration(mFrameIndex);
}

RefPtr<ADTSTrackDemuxer::SamplesPromise> ADTSTrackDemuxer::GetSamples(
    int32_t aNumSamples) {
  ADTSLOGV("GetSamples(%d) Begin mOffset=%" PRIu64 " mNumParsedFrames=%" PRIu64
           " mFrameIndex=%" PRId64 " mTotalFrameLen=%" PRIu64
           " mSamplesPerFrame=%d "
           "mSamplesPerSecond=%d mChannels=%d",
           aNumSamples, mOffset, mNumParsedFrames, mFrameIndex, mTotalFrameLen,
           mSamplesPerFrame, mSamplesPerSecond, mChannels);

  MOZ_ASSERT(aNumSamples);

  RefPtr<SamplesHolder> frames = new SamplesHolder();

  while (aNumSamples--) {
    RefPtr<MediaRawData> frame(GetNextFrame(FindNextFrame()));
    if (!frame) break;
    frames->AppendSample(frame);
  }

  ADTSLOGV(
      "GetSamples() End mSamples.Size()=%zu aNumSamples=%d mOffset=%" PRIu64
      " mNumParsedFrames=%" PRIu64 " mFrameIndex=%" PRId64
      " mTotalFrameLen=%" PRIu64
      " mSamplesPerFrame=%d mSamplesPerSecond=%d "
      "mChannels=%d",
      frames->GetSamples().Length(), aNumSamples, mOffset, mNumParsedFrames,
      mFrameIndex, mTotalFrameLen, mSamplesPerFrame, mSamplesPerSecond,
      mChannels);

  if (frames->GetSamples().IsEmpty()) {
    return SamplesPromise::CreateAndReject(NS_ERROR_DOM_MEDIA_END_OF_STREAM,
                                           __func__);
  }

  return SamplesPromise::CreateAndResolve(frames, __func__);
}

void ADTSTrackDemuxer::Reset() {
  ADTSLOG("Reset()");
  MOZ_ASSERT(mParser);
  if (mParser) {
    mParser->Reset();
  }
  FastSeek(TimeUnit::Zero());
}

RefPtr<ADTSTrackDemuxer::SkipAccessPointPromise>
ADTSTrackDemuxer::SkipToNextRandomAccessPoint(const TimeUnit& aTimeThreshold) {
  // Will not be called for audio-only resources.
  return SkipAccessPointPromise::CreateAndReject(
      SkipFailureHolder(NS_ERROR_DOM_MEDIA_DEMUXER_ERR, 0), __func__);
}

int64_t ADTSTrackDemuxer::GetResourceOffset() const {
  return AssertedCast<int64_t>(mOffset);
}

media::TimeIntervals ADTSTrackDemuxer::GetBuffered() {
  auto duration = Duration();

  if (duration.IsInfinite()) {
    return media::TimeIntervals();
  }

  AutoPinned<MediaResource> stream(mSource.GetResource());
  return GetEstimatedBufferedTimeRanges(stream, duration.ToMicroseconds());
}

int64_t ADTSTrackDemuxer::StreamLength() const { return mSource.GetLength(); }

TimeUnit ADTSTrackDemuxer::Duration() const {
  if (!mNumParsedFrames) {
    return TimeUnit::Invalid();
  }

  const int64_t streamLen = StreamLength();
  if (streamLen < 0) {
    // Unknown length, we can't estimate duration, this is probably a live
    // stream.
    return TimeUnit::FromInfinity();
  }
  const int64_t firstFrameOffset =
      AssertedCast<int64_t>(mParser->FirstFrame().Offset());
  int64_t numFrames =
      AssertedCast<int64_t>(AssertedCast<double>(streamLen - firstFrameOffset) /
                            AverageFrameLength());
  return Duration(numFrames);
}

TimeUnit ADTSTrackDemuxer::Duration(int64_t aNumFrames) const {
  if (!mSamplesPerSecond) {
    return TimeUnit::Invalid();
  }

  return TimeUnit(aNumFrames * mSamplesPerFrame, mSamplesPerSecond);
}

const ADTS::Frame& ADTSTrackDemuxer::FindNextFrame(
    bool findFirstFrame /*= false*/) {
  static const int BUFFER_SIZE = 4096;
  static const int MAX_SKIPPED_BYTES = 10 * BUFFER_SIZE;

  ADTSLOGV("FindNext() Begin mOffset=%" PRIu64 " mNumParsedFrames=%" PRIu64
           " mFrameIndex=%" PRId64 " mTotalFrameLen=%" PRIu64
           " mSamplesPerFrame=%d mSamplesPerSecond=%d mChannels=%d",
           mOffset, mNumParsedFrames, mFrameIndex, mTotalFrameLen,
           mSamplesPerFrame, mSamplesPerSecond, mChannels);

  uint8_t buffer[BUFFER_SIZE];
  uint32_t read = 0;

  bool foundFrame = false;
  uint64_t frameHeaderOffset = mOffset;

  // Prepare the parser for the next frame parsing session.
  mParser->EndFrameSession();

  // Check whether we've found a valid ADTS frame.
  while (!foundFrame) {
    if ((read = Read(buffer, AssertedCast<int64_t>(frameHeaderOffset),
                     BUFFER_SIZE)) == 0) {
      ADTSLOG("FindNext() EOS without a frame");
      break;
    }

    if (frameHeaderOffset - mOffset > MAX_SKIPPED_BYTES) {
      ADTSLOG("FindNext() exceeded MAX_SKIPPED_BYTES without a frame");
      break;
    }

    const ADTS::Frame& currentFrame = mParser->CurrentFrame();
    foundFrame = mParser->Parse(frameHeaderOffset, buffer, buffer + read);
    if (findFirstFrame && foundFrame) {
      // Check for sync marker after the found frame, since it's
      // possible to find sync marker in AAC data. If sync marker
      // exists after the current frame then we've found a frame
      // header.
      uint64_t nextFrameHeaderOffset =
          currentFrame.Offset() + currentFrame.Length();
      uint32_t read =
          Read(buffer, AssertedCast<int64_t>(nextFrameHeaderOffset), 2);
      if (read != 2 || !ADTS::FrameHeader::MatchesSync(buffer)) {
        frameHeaderOffset = currentFrame.Offset() + 1;
        mParser->Reset();
        foundFrame = false;
        continue;
      }
    }

    if (foundFrame) {
      break;
    }

    // Minimum header size is 7 bytes.
    uint64_t advance = read - 7;

    // Check for offset overflow.
    if (frameHeaderOffset + advance <= frameHeaderOffset) {
      break;
    }

    frameHeaderOffset += advance;
  }

  if (!foundFrame || !mParser->CurrentFrame().Length()) {
    ADTSLOG(
        "FindNext() Exit foundFrame=%d mParser->CurrentFrame().Length()=%zu ",
        foundFrame, mParser->CurrentFrame().Length());
    mParser->Reset();
    return mParser->CurrentFrame();
  }

  ADTSLOGV("FindNext() End mOffset=%" PRIu64 " mNumParsedFrames=%" PRIu64
           " mFrameIndex=%" PRId64 " frameHeaderOffset=%" PRId64
           " mTotalFrameLen=%" PRIu64
           " mSamplesPerFrame=%d mSamplesPerSecond=%d"
           " mChannels=%d",
           mOffset, mNumParsedFrames, mFrameIndex, frameHeaderOffset,
           mTotalFrameLen, mSamplesPerFrame, mSamplesPerSecond, mChannels);

  return mParser->CurrentFrame();
}

bool ADTSTrackDemuxer::SkipNextFrame(const ADTS::Frame& aFrame) {
  if (!mNumParsedFrames || !aFrame.Length()) {
    RefPtr<MediaRawData> frame(GetNextFrame(aFrame));
    return frame;
  }

  UpdateState(aFrame);

  ADTSLOGV("SkipNext() End mOffset=%" PRIu64 " mNumParsedFrames=%" PRIu64
           " mFrameIndex=%" PRId64 " mTotalFrameLen=%" PRIu64
           " mSamplesPerFrame=%d mSamplesPerSecond=%d mChannels=%d",
           mOffset, mNumParsedFrames, mFrameIndex, mTotalFrameLen,
           mSamplesPerFrame, mSamplesPerSecond, mChannels);

  return true;
}

already_AddRefed<MediaRawData> ADTSTrackDemuxer::GetNextFrame(
    const ADTS::Frame& aFrame) {
  ADTSLOG("GetNext() Begin({mOffset=%" PRIu64 " HeaderSize()=%" PRIu64
          " Length()=%zu})",
          aFrame.Offset(), aFrame.Header().HeaderSize(),
          aFrame.PayloadLength());
  if (!aFrame.IsValid()) return nullptr;

  const int64_t offset = AssertedCast<int64_t>(aFrame.PayloadOffset());
  const uint32_t length = aFrame.PayloadLength();

  RefPtr<MediaRawData> frame = new MediaRawData();
  frame->mOffset = offset;

  UniquePtr<MediaRawDataWriter> frameWriter(frame->CreateWriter());
  if (!frameWriter->SetSize(length)) {
    ADTSLOG("GetNext() Exit failed to allocated media buffer");
    return nullptr;
  }

  const uint32_t read =
      Read(frameWriter->Data(), offset, AssertedCast<int32_t>(length));
  if (read != length) {
    ADTSLOG("GetNext() Exit read=%u frame->Size()=%zu", read, frame->Size());
    return nullptr;
  }

  UpdateState(aFrame);

  TimeUnit rawpts = Duration(mFrameIndex - 1) - mPreRoll;
  TimeUnit rawDuration = Duration(1);
  TimeUnit rawend = rawpts + rawDuration;

  frame->mTime = std::max(TimeUnit::Zero(), rawpts);
  frame->mDuration = Duration(1);
  frame->mTimecode = frame->mTime;
  frame->mKeyframe = true;

  // Handle decoder delay. A packet must be trimmed if its pts, adjusted for
  // decoder delay, is negative. A packet can be trimmed entirely.
  if (rawpts.IsNegative()) {
    frame->mDuration = std::max(TimeUnit::Zero(), rawend - frame->mTime);
  }

  // ADTS frames can have a presentation duration of zero, e.g. when a frame is
  // part of preroll.
  MOZ_ASSERT(frame->mDuration.IsPositiveOrZero());

  ADTSLOG("ADTS packet demuxed: pts [%lf, %lf] (duration: %lf)",
          frame->mTime.ToSeconds(), frame->GetEndTime().ToSeconds(),
          frame->mDuration.ToSeconds());

  // Indicate original packet information to trim after decoding.
  if (frame->mDuration != rawDuration) {
    frame->mOriginalPresentationWindow =
        Some(media::TimeInterval{rawpts, rawend});
    ADTSLOG("Total packet time excluding trimming: [%lf, %lf]",
            rawpts.ToSeconds(), rawend.ToSeconds());
  }

  ADTSLOGV("GetNext() End mOffset=%" PRIu64 " mNumParsedFrames=%" PRIu64
           " mFrameIndex=%" PRId64 " mTotalFrameLen=%" PRIu64
           " mSamplesPerFrame=%d mSamplesPerSecond=%d mChannels=%d",
           mOffset, mNumParsedFrames, mFrameIndex, mTotalFrameLen,
           mSamplesPerFrame, mSamplesPerSecond, mChannels);

  return frame.forget();
}

int64_t ADTSTrackDemuxer::FrameIndexFromOffset(uint64_t aOffset) const {
  int64_t frameIndex = 0;

  if (AverageFrameLength() > 0) {
    frameIndex = AssertedCast<int64_t>(
        AssertedCast<double>(aOffset - mParser->FirstFrame().Offset()) /
        AverageFrameLength());
    MOZ_ASSERT(frameIndex >= 0);
  }

  ADTSLOGV("FrameIndexFromOffset(%" PRId64 ") -> %" PRId64, aOffset,
           frameIndex);
  return frameIndex;
}

int64_t ADTSTrackDemuxer::FrameIndexFromTime(const TimeUnit& aTime) const {
  int64_t frameIndex = 0;
  if (mSamplesPerSecond > 0 && mSamplesPerFrame > 0) {
    frameIndex = AssertedCast<int64_t>(aTime.ToSeconds() * mSamplesPerSecond /
                                       mSamplesPerFrame) -
                 1;
  }

  ADTSLOGV("FrameIndexFromOffset(%fs) -> %" PRId64, aTime.ToSeconds(),
           frameIndex);
  return std::max<int64_t>(0, frameIndex);
}

void ADTSTrackDemuxer::UpdateState(const ADTS::Frame& aFrame) {
  uint32_t frameLength = aFrame.Length();
  // Prevent overflow.
  if (mTotalFrameLen + frameLength < mTotalFrameLen) {
    // These variables have a linear dependency and are only used to derive the
    // average frame length.
    mTotalFrameLen /= 2;
    mNumParsedFrames /= 2;
  }

  // Full frame parsed, move offset to its end.
  mOffset = aFrame.Offset() + frameLength;
  mTotalFrameLen += frameLength;

  if (!mSamplesPerFrame) {
    const ADTS::FrameHeader& header = aFrame.Header();
    mSamplesPerFrame = header.mSamples;
    mSamplesPerSecond = header.mSampleRate;
    mChannels = header.mChannels;
  }

  ++mNumParsedFrames;
  ++mFrameIndex;
  MOZ_ASSERT(mFrameIndex > 0);
}

uint32_t ADTSTrackDemuxer::Read(uint8_t* aBuffer, int64_t aOffset,
                                int32_t aSize) {
  ADTSLOGV("ADTSTrackDemuxer::Read(%p %" PRId64 " %d)", aBuffer, aOffset,
           aSize);

  const int64_t streamLen = StreamLength();
  if (mInfo && streamLen > 0) {
    int64_t max = streamLen > aOffset ? streamLen - aOffset : 0;
    // Prevent blocking reads after successful initialization.
    aSize = std::min<int32_t>(aSize, AssertedCast<int32_t>(max));
  }

  uint32_t read = 0;
  ADTSLOGV("ADTSTrackDemuxer::Read        -> ReadAt(%d)", aSize);
  const nsresult rv = mSource.ReadAt(aOffset, reinterpret_cast<char*>(aBuffer),
                                     static_cast<uint32_t>(aSize), &read);
  NS_ENSURE_SUCCESS(rv, 0);
  return read;
}

double ADTSTrackDemuxer::AverageFrameLength() const {
  if (mNumParsedFrames) {
    return AssertedCast<double>(mTotalFrameLen) /
           AssertedCast<double>(mNumParsedFrames);
  }

  return 0.0;
}

/* static */
bool ADTSDemuxer::ADTSSniffer(const uint8_t* aData, const uint32_t aLength) {
  if (aLength < 7) {
    return false;
  }
  if (!ADTS::FrameHeader::MatchesSync(Span(aData, aLength))) {
    return false;
  }
  auto parser = MakeUnique<ADTS::FrameParser>();

  if (!parser->Parse(0, aData, aData + aLength)) {
    return false;
  }
  const ADTS::Frame& currentFrame = parser->CurrentFrame();
  // Check for sync marker after the found frame, since it's
  // possible to find sync marker in AAC data. If sync marker
  // exists after the current frame then we've found a frame
  // header.
  uint64_t nextFrameHeaderOffset =
      currentFrame.Offset() + currentFrame.Length();
  return aLength > nextFrameHeaderOffset &&
         aLength - nextFrameHeaderOffset >= 2 &&
         ADTS::FrameHeader::MatchesSync(Span(aData + nextFrameHeaderOffset,
                                             aLength - nextFrameHeaderOffset));
}

}  // namespace mozilla
