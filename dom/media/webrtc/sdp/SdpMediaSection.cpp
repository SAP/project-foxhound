/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "sdp/SdpMediaSection.h"

namespace mozilla {
const SdpFmtpAttributeList::Parameters* SdpMediaSection::FindFmtp(
    const std::string& pt) const {
  const SdpAttributeList& attrs = GetAttributeList();

  if (attrs.HasAttribute(SdpAttribute::kFmtpAttribute)) {
    for (auto& fmtpAttr : attrs.GetFmtp().mFmtps) {
      if (fmtpAttr.format == pt && fmtpAttr.parameters) {
        return fmtpAttr.parameters.get();
      }
    }
  }
  return nullptr;
}

void SdpMediaSection::SetFmtp(const SdpFmtpAttributeList::Fmtp& fmtpToSet) {
  auto fmtps = MakeUnique<SdpFmtpAttributeList>();

  if (GetAttributeList().HasAttribute(SdpAttribute::kFmtpAttribute)) {
    *fmtps = GetAttributeList().GetFmtp();
  }

  bool found = false;
  for (SdpFmtpAttributeList::Fmtp& fmtp : fmtps->mFmtps) {
    if (fmtp.format == fmtpToSet.format) {
      fmtp = fmtpToSet;
      found = true;
    }
  }

  if (!found) {
    fmtps->mFmtps.push_back(fmtpToSet);
  }

  GetAttributeList().SetAttribute(std::move(fmtps));
}

void SdpMediaSection::RemoveFmtp(const std::string& pt) {
  auto fmtps = MakeUnique<SdpFmtpAttributeList>();

  SdpAttributeList& attrList = GetAttributeList();
  if (attrList.HasAttribute(SdpAttribute::kFmtpAttribute)) {
    *fmtps = attrList.GetFmtp();
  }

  for (size_t i = 0; i < fmtps->mFmtps.size(); ++i) {
    if (pt == fmtps->mFmtps[i].format) {
      fmtps->mFmtps.erase(fmtps->mFmtps.begin() + i);
      break;
    }
  }

  attrList.SetAttribute(std::move(fmtps));
}

const SdpRtpmapAttributeList::Rtpmap* SdpMediaSection::FindRtpmap(
    const std::string& pt) const {
  auto& attrs = GetAttributeList();
  if (!attrs.HasAttribute(SdpAttribute::kRtpmapAttribute)) {
    return nullptr;
  }

  const SdpRtpmapAttributeList& rtpmap = attrs.GetRtpmap();
  if (!rtpmap.HasEntry(pt)) {
    return nullptr;
  }

  return &rtpmap.GetEntry(pt);
}

const SdpSctpmapAttributeList::Sctpmap* SdpMediaSection::GetSctpmap() const {
  auto& attrs = GetAttributeList();
  if (!attrs.HasAttribute(SdpAttribute::kSctpmapAttribute)) {
    return nullptr;
  }

  const SdpSctpmapAttributeList& sctpmap = attrs.GetSctpmap();
  if (sctpmap.mSctpmaps.empty()) {
    return nullptr;
  }

  return &sctpmap.GetFirstEntry();
}

uint32_t SdpMediaSection::GetSctpPort() const {
  auto& attrs = GetAttributeList();
  if (!attrs.HasAttribute(SdpAttribute::kSctpPortAttribute)) {
    return 0;
  }

  return attrs.GetSctpPort();
}

bool SdpMediaSection::GetMaxMessageSize(uint32_t* size) const {
  *size = 0;

  auto& attrs = GetAttributeList();
  if (!attrs.HasAttribute(SdpAttribute::kMaxMessageSizeAttribute)) {
    return false;
  }

  *size = attrs.GetMaxMessageSize();
  return true;
}

bool SdpMediaSection::HasRtcpFb(const std::string& pt,
                                const SdpRtcpFbAttributeList::Type type,
                                const std::string& subType) const {
  const SdpAttributeList& attrs(GetAttributeList());

  if (!attrs.HasAttribute(SdpAttribute::kRtcpFbAttribute)) {
    return false;
  }

  for (auto& rtcpfb : attrs.GetRtcpFb().mFeedbacks) {
    if (rtcpfb.type == type) {
      if (rtcpfb.pt == "*" || rtcpfb.pt == pt) {
        if (rtcpfb.parameter == subType) {
          return true;
        }
      }
    }
  }

  return false;
}

SdpRtcpFbAttributeList SdpMediaSection::GetRtcpFbs() const {
  SdpRtcpFbAttributeList result;
  if (GetAttributeList().HasAttribute(SdpAttribute::kRtcpFbAttribute)) {
    result = GetAttributeList().GetRtcpFb();
  }
  return result;
}

void SdpMediaSection::SetRtcpFbs(const SdpRtcpFbAttributeList& rtcpfbs) {
  if (rtcpfbs.mFeedbacks.empty()) {
    GetAttributeList().RemoveAttribute(SdpAttribute::kRtcpFbAttribute);
    return;
  }

  GetAttributeList().SetAttribute(MakeUnique<SdpRtcpFbAttributeList>(rtcpfbs));
}

void SdpMediaSection::SetSsrcs(const std::vector<uint32_t>& ssrcs,
                               const std::string& cname) {
  if (ssrcs.empty()) {
    GetAttributeList().RemoveAttribute(SdpAttribute::kSsrcAttribute);
    return;
  }

  auto ssrcAttr = MakeUnique<SdpSsrcAttributeList>();
  for (auto ssrc : ssrcs) {
    // When using ssrc attributes, we are required to at least have a cname.
    // (See https://tools.ietf.org/html/rfc5576#section-6.1)
    std::string cnameAttr("cname:");
    cnameAttr += cname;
    ssrcAttr->PushEntry(ssrc, cnameAttr);
  }

  GetAttributeList().SetAttribute(std::move(ssrcAttr));
}

void SdpMediaSection::AddMsid(const std::string& id,
                              const std::string& appdata) {
  auto msids = MakeUnique<SdpMsidAttributeList>();
  if (GetAttributeList().HasAttribute(SdpAttribute::kMsidAttribute)) {
    msids->mMsids = GetAttributeList().GetMsid().mMsids;
  }
  msids->PushEntry(id, appdata);
  GetAttributeList().SetAttribute(std::move(msids));
}

const SdpRidAttributeList::Rid* SdpMediaSection::FindRid(
    const std::string& id) const {
  if (!GetAttributeList().HasAttribute(SdpAttribute::kRidAttribute)) {
    return nullptr;
  }

  for (const auto& rid : GetAttributeList().GetRid().mRids) {
    if (rid.id == id) {
      return &rid;
    }
  }

  return nullptr;
}

}  // namespace mozilla
