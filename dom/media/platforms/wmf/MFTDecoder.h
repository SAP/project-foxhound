/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#if !defined(MFTDecoder_h_)
#  define MFTDecoder_h_

#  include "WMF.h"
#  include "mozilla/ReentrantMonitor.h"
#  include "mozilla/RefPtr.h"
#  include "nsIThread.h"

namespace mozilla {

class MFTDecoder final {
  ~MFTDecoder();

 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(MFTDecoder)

  MFTDecoder();

  // Creates the MFT by COM class ID.
  //
  // Params:
  //  - aCLSID The COM class ID of the decoder.
  HRESULT Create(const GUID& aCLSID);

  // Creates the MFT by querying a category and media subtype.
  // First thing to do as part of setup.
  //
  // Params:
  //  - aCategory the GUID of the MFT category to use.
  //  - aInSubType the GUID of the input MFT media type to use.
  //    GUID_NULL may be used as a wildcard.
  //  - aOutSubType the GUID of the output MFT media type to use.
  //    GUID_NULL may be used as a wildcard.
  HRESULT Create(const GUID& aCategory, const GUID& aInSubtype,
                 const GUID& aOutSubtype);

  // Sets the input and output media types. Call after Init().
  //
  // Params:
  //  - aInputType needs at least major and minor types set.
  //  - aOutputType needs at least major and minor types set.
  //    This is used to select the matching output type out
  //    of all the available output types of the MFT.
  //  - aFallbackSubType is a preferred subtype to fall back to if the currently
  //    selected subtype in aOutputType is unavailable, if this is GUID_NULL
  //    then no attempt to fallback will occur, if it is not GUID_NULL then it
  //    will be searched for as a preferred fallback, and if not found the last
  //    subtype available will be chosen as a final fallback.
  HRESULT SetMediaTypes(
      IMFMediaType* aInputType, IMFMediaType* aOutputType,
      const GUID& aFallbackSubType,
      std::function<HRESULT(IMFMediaType*)>&& aCallback =
          [](IMFMediaType* aOutput) { return S_OK; });

  // Returns the MFT's global IMFAttributes object.
  already_AddRefed<IMFAttributes> GetAttributes();

  // Returns the MFT's IMFAttributes object for an output stream.
  already_AddRefed<IMFAttributes> GetOutputStreamAttributes();

  // Retrieves the media type being input.
  HRESULT GetInputMediaType(RefPtr<IMFMediaType>& aMediaType);

  // Retrieves the media type being output. This may not be valid until
  //  the first sample is decoded.
  HRESULT GetOutputMediaType(RefPtr<IMFMediaType>& aMediaType);
  const GUID& GetOutputMediaSubType() const { return mOutputSubType; }

  // Submits data into the MFT for processing.
  //
  // Returns:
  //  - MF_E_NOTACCEPTING if the decoder can't accept input. The data
  //    must be resubmitted after Output() stops producing output.
  HRESULT Input(const uint8_t* aData, uint32_t aDataSize,
                int64_t aTimestampUsecs, int64_t aDurationUsecs);
  HRESULT Input(IMFSample* aSample);

  HRESULT CreateInputSample(const uint8_t* aData, uint32_t aDataSize,
                            int64_t aTimestampUsecs, int64_t aDurationUsecs,
                            RefPtr<IMFSample>* aOutSample);

  // Retrieves output from the MFT. Call this once Input() returns
  // MF_E_NOTACCEPTING. Some MFTs with hardware acceleration (the H.264
  // decoder MFT in particular) can't handle it if clients hold onto
  // references to the output IMFSample, so don't do that.
  //
  // Returns:
  //  - MF_E_TRANSFORM_STREAM_CHANGE if the underlying stream output
  //    type changed. Retrieve the output media type and reconfig client,
  //    else you may misinterpret the MFT's output.
  //  - MF_E_TRANSFORM_NEED_MORE_INPUT if no output can be produced
  //    due to lack of input.
  //  - S_OK if an output frame is produced.
  HRESULT Output(RefPtr<IMFSample>* aOutput);

  // Sends a flush message to the MFT. This causes it to discard all
  // input data. Use before seeking.
  HRESULT Flush();

  // Sends a message to the MFT.
  HRESULT SendMFTMessage(MFT_MESSAGE_TYPE aMsg, ULONG_PTR aData);

  // This method first attempts to find the provided aSubType in the compatible
  // list reported by the decoder, if found it will be set up, otherwise it will
  // search for the preferred subtype aFallbackSubType, and if that is also not
  // found the last available subtype is set up.
  //
  // aFallbackSubType can be GUID_NULL to cause this to return E_FAIL when
  // aSubType is not found, avoiding fallback behaviors.
  HRESULT FindDecoderOutputTypeWithSubtype(const GUID& aSubType,
                                           const GUID& aFallbackSubType);
  HRESULT FindDecoderOutputType(const GUID& aFallbackSubType);

 private:
  // Will search a suitable MediaType using aTypeToUse if set, if not will
  // use the current mOutputType.
  //
  // When aSubType (or the current mOutputType) is not found, it will search for
  // aFallbackSubType instead, and if not is not found it will use the last
  // available compatible type reported by the decoder.
  //
  // aFallbackSubType can be GUID_NULL to cause this to return E_FAIL when
  // aSubType (or the current mOutputType) is not found, avoiding fallbacks.
  HRESULT SetDecoderOutputType(
      const GUID& aSubType, const GUID& aFallbackSubType,
      IMFMediaType* aTypeToUse,
      std::function<HRESULT(IMFMediaType*)>&& aCallback);
  HRESULT CreateOutputSample(RefPtr<IMFSample>* aOutSample);

  MFT_INPUT_STREAM_INFO mInputStreamInfo;
  MFT_OUTPUT_STREAM_INFO mOutputStreamInfo;

  RefPtr<IMFActivate> mActivate;
  RefPtr<IMFTransform> mDecoder;

  RefPtr<IMFMediaType> mOutputType;
  GUID mOutputSubType;

  // Either MFMediaType_Audio or MFMediaType_Video.
  GUID mMajorType;

  // True if the IMFTransform allocates the samples that it returns.
  bool mMFTProvidesOutputSamples = false;

  // True if we need to mark the next sample as a discontinuity.
  bool mDiscontinuity = true;
};

}  // namespace mozilla

#endif
