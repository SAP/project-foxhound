/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// The Gecko Profiler is an always-on profiler that takes fast and low overhead
// samples of the program execution using only userspace functionality for
// portability. The goal of this module is to provide performance data in a
// generic cross-platform way without requiring custom tools or kernel support.
//
// Samples are collected to form a timeline with optional timeline event
// (markers) used for filtering. The samples include both native stacks and
// platform-independent "label stack" frames.

#ifndef ProfileAdditionalInformation_h
#define ProfileAdditionalInformation_h

#include "js/Value.h"
#include "js/Utility.h"
#include "js/ProfilingSources.h"
#include "mozilla/SharedLibraries.h"
#include "nsString.h"
#include "nsTArray.h"

namespace IPC {
class MessageReader;
class MessageWriter;
template <typename T>
struct ParamTraits;
}  // namespace IPC

namespace mozilla {

// Entry pairing UUID strings with JS source data for WebChannel requests
struct JSSourceEntry {
  nsCString uuid;
  ProfilerJSSourceData sourceData;

  JSSourceEntry() = default;
  JSSourceEntry(nsCString&& aUuid, ProfilerJSSourceData&& aSourceData)
      : uuid(std::move(aUuid)), sourceData(std::move(aSourceData)) {}

  size_t SizeOf() const { return uuid.Length() + sourceData.SizeOf(); }
};

// This structure contains additional information gathered while generating the
// profile json and iterating the buffer.
struct ProfileGenerationAdditionalInformation {
  ProfileGenerationAdditionalInformation() = default;
  explicit ProfileGenerationAdditionalInformation(
      SharedLibraryInfo&& aSharedLibraries,
      nsTArray<JSSourceEntry>&& aJSSourceEntries)
      : mSharedLibraries(std::move(aSharedLibraries)),
        mJSSourceEntries(std::move(aJSSourceEntries)) {}

  size_t SizeOf() const {
    size_t size = mSharedLibraries.SizeOf();

    for (const auto& entry : mJSSourceEntries) {
      size += entry.SizeOf();
    }

    return size;
  }

  ProfileGenerationAdditionalInformation(
      const ProfileGenerationAdditionalInformation& other) = delete;
  ProfileGenerationAdditionalInformation& operator=(
      const ProfileGenerationAdditionalInformation&) = delete;

  ProfileGenerationAdditionalInformation(
      ProfileGenerationAdditionalInformation&& other) = default;
  ProfileGenerationAdditionalInformation& operator=(
      ProfileGenerationAdditionalInformation&& other) = default;

  void Append(ProfileGenerationAdditionalInformation&& aOther) {
    mSharedLibraries.AddAllSharedLibraries(aOther.mSharedLibraries);
    mJSSourceEntries.AppendElements(std::move(aOther.mJSSourceEntries));
  }

  void FinishGathering() { mSharedLibraries.DeduplicateEntries(); }

  void ToJSValue(JSContext* aCx, JS::MutableHandle<JS::Value> aRetVal) const;

  friend IPC::ParamTraits<mozilla::ProfileGenerationAdditionalInformation>;

 private:
  JSString* CreateJSStringFromSourceData(
      JSContext* aCx, const ProfilerJSSourceData& aSourceData) const;

  SharedLibraryInfo mSharedLibraries;
  nsTArray<JSSourceEntry> mJSSourceEntries;
};

struct ProfileAndAdditionalInformation {
  ProfileAndAdditionalInformation() = default;
  explicit ProfileAndAdditionalInformation(nsCString&& aProfile)
      : mProfile(std::move(aProfile)) {}

  ProfileAndAdditionalInformation(
      nsCString&& aProfile,
      ProfileGenerationAdditionalInformation&& aAdditionalInformation)
      : mProfile(std::move(aProfile)),
        mAdditionalInformation(Some(std::move(aAdditionalInformation))) {}

  ProfileAndAdditionalInformation(const ProfileAndAdditionalInformation&) =
      delete;
  ProfileAndAdditionalInformation& operator=(
      const ProfileAndAdditionalInformation&) = delete;

  ProfileAndAdditionalInformation(ProfileAndAdditionalInformation&&) = default;
  ProfileAndAdditionalInformation& operator=(
      ProfileAndAdditionalInformation&&) = default;

  size_t SizeOf() const {
    size_t size = mProfile.Length();
    if (mAdditionalInformation.isSome()) {
      size += mAdditionalInformation->SizeOf();
    }
    return size;
  }

  nsCString mProfile;
  Maybe<ProfileGenerationAdditionalInformation> mAdditionalInformation;
};
}  // namespace mozilla

namespace IPC {
template <>
struct ParamTraits<mozilla::ProfileGenerationAdditionalInformation> {
  typedef mozilla::ProfileGenerationAdditionalInformation paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam);
  static bool Read(MessageReader* aReader, paramType* aResult);
};
}  // namespace IPC

#endif  // ProfileAdditionalInformation_h
