/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef js_ProfilingSources_h
#define js_ProfilingSources_h

#include "mozilla/HashFunctions.h"
#include "mozilla/Variant.h"

#include <stdint.h>

#include "jstypes.h"

#include "js/TypeDecls.h"
#include "js/Utility.h"
#include "js/Vector.h"

/*
 * Struct to pass JS source data with content type information for profiler use.
 */
struct JS_PUBLIC_API ProfilerJSSourceData {
 public:
  struct SourceTextUTF16 {
   public:
    SourceTextUTF16(JS::UniqueTwoByteChars&& c, size_t l)
        : chars_(std::move(c)), length_(l) {}

    const JS::UniqueTwoByteChars& chars() const { return chars_; }
    size_t length() const { return length_; }

   private:
    // Not null-terminated string for source text. Always use it with the
    // length.
    JS::UniqueTwoByteChars chars_;
    size_t length_;
  };

  struct SourceTextUTF8 {
   public:
    SourceTextUTF8(JS::UniqueChars&& c, size_t l)
        : chars_(std::move(c)), length_(l) {}

    const JS::UniqueChars& chars() const { return chars_; }
    size_t length() const { return length_; }

   private:
    // Not null-terminated string for source text. Always use it with the
    // length.
    JS::UniqueChars chars_;
    size_t length_;
  };

  /*
   * Represents a source file that can be retrieved later in the parent process.
   * Used when source text is not immediately available in the current process
   * but can be fetched using the file path information.
   */
  struct RetrievableFile {};

  struct Unavailable {};

  using ProfilerSourceVariant =
      mozilla::Variant<SourceTextUTF16, SourceTextUTF8, RetrievableFile,
                       Unavailable>;

  // Constructors
  ProfilerJSSourceData(uint32_t sourceId, JS::UniqueChars&& filePath,
                       size_t pathLen)
      : sourceId_(sourceId),
        filePath_(std::move(filePath)),
        filePathLength_(pathLen),
        data_(Unavailable{}) {}

  // UTF-8 source text with filePath
  ProfilerJSSourceData(uint32_t sourceId, JS::UniqueChars&& chars,
                       size_t length, JS::UniqueChars&& filePath,
                       size_t pathLen)
      : sourceId_(sourceId),
        filePath_(std::move(filePath)),
        filePathLength_(pathLen),
        data_(SourceTextUTF8{std::move(chars), length}) {}

  // UTF-16 source text with filePath
  ProfilerJSSourceData(uint32_t sourceId, JS::UniqueTwoByteChars&& chars,
                       size_t length, JS::UniqueChars&& filePath,
                       size_t pathLen)
      : sourceId_(sourceId),
        filePath_(std::move(filePath)),
        filePathLength_(pathLen),
        data_(SourceTextUTF16{std::move(chars), length}) {}

  // For the cases where no sourceId and filepath are needed.
  ProfilerJSSourceData(JS::UniqueChars&& chars, size_t length)
      : sourceId_(0),
        filePath_(nullptr),
        filePathLength_(0),
        data_(SourceTextUTF8{std::move(chars), length}) {}

  ProfilerJSSourceData()
      : sourceId_(0), filePathLength_(0), data_(Unavailable{}) {}

  static ProfilerJSSourceData CreateRetrievableFile(uint32_t sourceId,
                                                    JS::UniqueChars&& filePath,
                                                    size_t pathLength) {
    ProfilerJSSourceData result(sourceId, std::move(filePath), pathLength);
    result.data_.emplace<RetrievableFile>();
    return result;
  }

  ProfilerJSSourceData(ProfilerJSSourceData&&) = default;
  ProfilerJSSourceData& operator=(ProfilerJSSourceData&&) = default;

  // No copy constructors as this class owns its string storage.
  ProfilerJSSourceData(const ProfilerJSSourceData& other) = delete;
  ProfilerJSSourceData& operator=(const ProfilerJSSourceData&) = delete;

  uint32_t sourceId() const { return sourceId_; }
  // Consumer should always check for filePathLength before calling this.
  const char* filePath() const {
    MOZ_ASSERT(filePath_);
    return filePath_.get();
  }
  size_t filePathLength() const { return filePathLength_; }
  const ProfilerSourceVariant& data() const { return data_; }

  // Used only for memory reporting.
  size_t SizeOf() const {
    // Size of sourceId + filepath
    size_t size = sizeof(uint32_t) + filePathLength_ * sizeof(char);

    data_.match(
        [&](const SourceTextUTF16& srcText) {
          size += srcText.length() * sizeof(char16_t);
        },
        [&](const SourceTextUTF8& srcText) {
          size += srcText.length() * sizeof(char);
        },
        [](const RetrievableFile&) {}, [](const Unavailable&) {});

    return size;
  }

  mozilla::HashNumber hash() const {
    using mozilla::HashBytes;
    using mozilla::HashNumber;

    HashNumber hash = 0;

    if (filePathLength_ > 0) {
      hash = HashBytes(filePath_.get(), filePathLength_, hash);
    }

    hash = data_.addTagToHash(hash);
    data_.match(
        [&](const SourceTextUTF16& srcText) {
          hash = HashBytes(srcText.chars().get(),
                           srcText.length() * sizeof(char16_t), hash);
        },
        [&](const SourceTextUTF8& srcText) {
          hash = HashBytes(srcText.chars().get(), srcText.length(), hash);
        },
        [](const RetrievableFile&) {}, [](const Unavailable&) {});

    return hash;
  }

 private:
  // Unique identifier for this source across the process. This can be used
  // to refer to this source from places that don't want to hold a strong
  // reference on the source itself.
  //  Generated by ScriptSource and retrieved via ScriptSource::id(). See
  //  ScriptSource::id_ for more details.
  uint32_t sourceId_;
  // Null-terminated file path for the source.
  // It can be nullptr if:
  // - The source has no filename.
  // - filename allocation fails during copy.
  JS::UniqueChars filePath_;
  size_t filePathLength_;
  ProfilerSourceVariant data_;
};

namespace js {

using ProfilerJSSources =
    js::Vector<ProfilerJSSourceData, 0, js::SystemAllocPolicy>;

/*
 * Main API for getting the profiled JS sources.
 */
JS_PUBLIC_API ProfilerJSSources GetProfilerScriptSources(JSRuntime* rt);

/**
 * Retrieve the JS sources that are only retrievable from the parent process.
 * See RetrievableFile struct for more information.
 * */
JS_PUBLIC_API ProfilerJSSourceData
RetrieveProfilerSourceContent(JSContext* cx, const char* filename);

}  // namespace js

#endif /* js_ProfilingSources_h */
