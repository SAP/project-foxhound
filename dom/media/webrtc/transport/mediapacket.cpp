/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mediapacket.h"

#include <cstring>

#include "ipc/EnumSerializer.h"
#include "ipc/IPCMessageUtils.h"
#include "ipc/IPCMessageUtilsSpecializations.h"

namespace IPC {
template <>
struct ParamTraits<mozilla::MediaPacket::Type>
    : public ContiguousEnumSerializerInclusive<
          mozilla::MediaPacket::Type, mozilla::MediaPacket::UNCLASSIFIED,
          mozilla::MediaPacket::SCTP> {};
}  // namespace IPC

namespace mozilla {

void MediaPacket::Copy(const uint8_t* data, size_t len, size_t capacity) {
  if (capacity < len) {
    capacity = len;
  }
  data_.reset(new uint8_t[capacity]);
  len_ = len;
  capacity_ = capacity;
  memcpy(data_.get(), data, len);
}

MediaPacket::MediaPacket(const MediaPacket& orig)
    : sdp_level_(orig.sdp_level_), type_(orig.type_) {
  Copy(orig.data_.get(), orig.len_, orig.capacity_);
}

MediaPacket MediaPacket::Clone() const { return MediaPacket(*this); }

void MediaPacket::Serialize(IPC::MessageWriter* aWriter) const {
  WriteParam(aWriter, len_);
  WriteParam(aWriter, capacity_);
  WriteParam(aWriter, encrypted_len_);
  WriteParam(aWriter, sdp_level_);
  WriteParam(aWriter, type_);

  if (len_) {
    aWriter->WriteBytes(data_.get(), len_);
  }
  if (encrypted_len_) {
    aWriter->WriteBytes(encrypted_data_.get(), encrypted_len_);
  }
}

bool MediaPacket::Deserialize(IPC::MessageReader* aReader) {
  Reset();
  if (!ReadParam(aReader, &len_) || !ReadParam(aReader, &capacity_) ||
      !ReadParam(aReader, &encrypted_len_) ||
      !ReadParam(aReader, &sdp_level_) || !ReadParam(aReader, &type_)) {
    return false;
  }

  if (capacity_ < len_) {
    return false;
  }

  // Kinda arbitrary, but we want some sort of ceiling here.
  if ((capacity_ > 1024 * 1024) || (encrypted_len_ > 1024 * 1024)) {
    return false;
  }

  if (capacity_) {
    data_.reset(new uint8_t[capacity_]);
    if (len_) {
      if (!aReader->ReadBytesInto(data_.get(), len_)) {
        return false;
      }
    }
  }

  if (encrypted_len_) {
    encrypted_data_.reset(new uint8_t[encrypted_len_]);
    if (!aReader->ReadBytesInto(encrypted_data_.get(), encrypted_len_)) {
      return false;
    }
  }
  return true;
}

static bool IsRtp(const uint8_t* data, size_t len) {
  if (len < 2) return false;

  // Check if this is a RTCP packet. Logic based on the types listed in
  // media/webrtc/trunk/src/modules/rtp_rtcp/source/rtp_utility.cc

  // Anything outside this range is RTP.
  if ((data[1] < 192) || (data[1] > 207)) return true;

  if (data[1] == 192)  // FIR
    return false;

  if (data[1] == 193)  // NACK, but could also be RTP. This makes us sad
    return true;       // but it's how webrtc.org behaves.

  if (data[1] == 194) return true;

  if (data[1] == 195)  // IJ.
    return false;

  if ((data[1] > 195) && (data[1] < 200))  // the > 195 is redundant
    return true;

  if ((data[1] >= 200) && (data[1] <= 207))  // SR, RR, SDES, BYE,
    return false;                            // APP, RTPFB, PSFB, XR

  MOZ_ASSERT(false);  // Not reached, belt and suspenders.
  return true;
}

void MediaPacket::Categorize() {
  SetType(MediaPacket::UNCLASSIFIED);

  if (!data_ || len_ < 4) {
    return;
  }

  if (data_[0] >= 20 && data_[0] <= 63) {
    // DTLS per RFC 7983
    SetType(MediaPacket::DTLS);
  } else if (data_[0] > 127 && data_[0] < 192) {
    // RTP/RTCP per RFC 7983
    if (IsRtp(data_.get(), len_)) {
      SetType(MediaPacket::SRTP);
    } else {
      SetType(MediaPacket::SRTCP);
    }
  }
}
}  // namespace mozilla
