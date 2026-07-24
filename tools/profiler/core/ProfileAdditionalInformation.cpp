/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ProfileAdditionalInformation.h"

#include "ipc/IPCMessageUtilsSpecializations.h"
#include "jsapi.h"
#include "js/JSON.h"
#include "js/PropertyAndElement.h"
#include "js/Value.h"
#include "mozilla/Assertions.h"
#include "mozilla/JSONStringWriteFuncs.h"

#ifdef MOZ_GECKO_PROFILER
#  include "platform.h"

JSString*
mozilla::ProfileGenerationAdditionalInformation::CreateJSStringFromSourceData(
    JSContext* aCx, const ProfilerJSSourceData& aSourceData) const {
  return aSourceData.data().match(
      [&](const ProfilerJSSourceData::SourceTextUTF16& srcText) -> JSString* {
        return JS_NewUCStringCopyN(aCx, srcText.chars().get(),
                                   srcText.length());
      },
      [&](const ProfilerJSSourceData::SourceTextUTF8& srcText) -> JSString* {
        return JS_NewStringCopyN(aCx, srcText.chars().get(), srcText.length());
      },
      [&](const ProfilerJSSourceData::RetrievableFile&) -> JSString* {
        ProfilerJSSourceData retrievedData =
            js::RetrieveProfilerSourceContent(aCx, aSourceData.filePath());
        const auto& data = retrievedData.data();
        MOZ_RELEASE_ASSERT(data.is<ProfilerJSSourceData::SourceTextUTF8>(),
                           "Retrieved JS source has to be utf-8");

        const auto& srcText = data.as<ProfilerJSSourceData::SourceTextUTF8>();
        return JS_NewStringCopyN(aCx, srcText.chars().get(), srcText.length());
      },
      [&](const ProfilerJSSourceData::Unavailable&) -> JSString* {
        return JS_NewStringCopyZ(aCx, "[unavailable]");
      });
}

void mozilla::ProfileGenerationAdditionalInformation::ToJSValue(
    JSContext* aCx, JS::MutableHandle<JS::Value> aRetVal) const {
  // Get the shared libraries array.
  JS::Rooted<JS::Value> sharedLibrariesVal(aCx);
  {
    JSONStringWriteFunc<nsCString> buffer;
    JSONWriter w(buffer, JSONWriter::SingleLineStyle);
    w.StartArrayElement();
    AppendSharedLibraries(w, mSharedLibraries);
    w.EndArray();
    NS_ConvertUTF8toUTF16 buffer16(buffer.StringCRef());
    MOZ_ALWAYS_TRUE(JS_ParseJSON(aCx,
                                 static_cast<const char16_t*>(buffer16.get()),
                                 buffer16.Length(), &sharedLibrariesVal));
  }

  // Create jsSources object, which is UUID to source text mapping for
  // WebChannel.
  JS::Rooted<JSObject*> jsSourcesObj(aCx, JS_NewPlainObject(aCx));
  if (jsSourcesObj) {
    for (const auto& entry : mJSSourceEntries) {
      JSString* sourceStr = CreateJSStringFromSourceData(aCx, entry.sourceData);
      if (sourceStr) {
        JS::Rooted<JS::Value> sourceVal(aCx, JS::StringValue(sourceStr));
        JS_SetProperty(aCx, jsSourcesObj, PromiseFlatCString(entry.uuid).get(),
                       sourceVal);
      }
    }
  }

  JS::Rooted<JSObject*> additionalInfoObj(aCx, JS_NewPlainObject(aCx));
  JS::Rooted<JS::Value> jsSourcesVal(aCx, JS::ObjectValue(*jsSourcesObj));
  JS_SetProperty(aCx, additionalInfoObj, "sharedLibraries", sharedLibrariesVal);
  JS_SetProperty(aCx, additionalInfoObj, "jsSources", jsSourcesVal);
  aRetVal.setObject(*additionalInfoObj);
}
#endif  // MOZ_GECKO_PROFILER

namespace IPC {

template <>
struct ParamTraits<SharedLibrary> {
  typedef SharedLibrary paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam);
  static bool Read(MessageReader* aReader, paramType* aResult);
};

template <>
struct ParamTraits<SharedLibraryInfo> {
  typedef SharedLibraryInfo paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam);
  static bool Read(MessageReader* aReader, paramType* aResult);
};

template <>
struct ParamTraits<ProfilerJSSourceData> {
  typedef ProfilerJSSourceData paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam);
  static bool Read(MessageReader* aReader, paramType* aResult);
};

template <>
struct ParamTraits<mozilla::JSSourceEntry> {
  typedef mozilla::JSSourceEntry paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam);
  static bool Read(MessageReader* aReader, paramType* aResult);
};

void IPC::ParamTraits<SharedLibrary>::Write(MessageWriter* aWriter,
                                            const paramType& aParam) {
  WriteParam(aWriter, aParam.mStart);
  WriteParam(aWriter, aParam.mEnd);
  WriteParam(aWriter, aParam.mOffset);
  WriteParam(aWriter, aParam.mBreakpadId);
  WriteParam(aWriter, aParam.mCodeId);
  WriteParam(aWriter, aParam.mModuleName);
  WriteParam(aWriter, aParam.mModulePath);
  WriteParam(aWriter, aParam.mDebugName);
  WriteParam(aWriter, aParam.mDebugPath);
  WriteParam(aWriter, aParam.mVersion);
  WriteParam(aWriter, aParam.mArch);
}

bool IPC::ParamTraits<SharedLibrary>::Read(MessageReader* aReader,
                                           paramType* aResult) {
  return ReadParam(aReader, &aResult->mStart) &&
         ReadParam(aReader, &aResult->mEnd) &&
         ReadParam(aReader, &aResult->mOffset) &&
         ReadParam(aReader, &aResult->mBreakpadId) &&
         ReadParam(aReader, &aResult->mCodeId) &&
         ReadParam(aReader, &aResult->mModuleName) &&
         ReadParam(aReader, &aResult->mModulePath) &&
         ReadParam(aReader, &aResult->mDebugName) &&
         ReadParam(aReader, &aResult->mDebugPath) &&
         ReadParam(aReader, &aResult->mVersion) &&
         ReadParam(aReader, &aResult->mArch);
}

void IPC::ParamTraits<SharedLibraryInfo>::Write(MessageWriter* aWriter,
                                                const paramType& aParam) {
  paramType& p = const_cast<paramType&>(aParam);
  WriteParam(aWriter, p.mEntries);
}

bool IPC::ParamTraits<SharedLibraryInfo>::Read(MessageReader* aReader,
                                               paramType* aResult) {
  return ReadParam(aReader, &aResult->mEntries);
}

// Type tags for ProfilerJSSourceData IPC serialization
constexpr uint8_t kSourceTextUTF16Tag = 0;
constexpr uint8_t kSourceTextUTF8Tag = 1;
constexpr uint8_t kRetrievableFileTag = 2;
constexpr uint8_t kUnavailableTag = 3;

void IPC::ParamTraits<ProfilerJSSourceData>::Write(MessageWriter* aWriter,
                                                   const paramType& aParam) {
  // Write sourceId and filePath first
  WriteParam(aWriter, aParam.sourceId());
  WriteParam(aWriter, aParam.filePathLength());
  if (aParam.filePathLength() > 0) {
    aWriter->WriteBytes(aParam.filePath(),
                        aParam.filePathLength() * sizeof(char));
  }

  // Then write the specific data type
  aParam.data().match(
      [&](const ProfilerJSSourceData::SourceTextUTF16& srcText) {
        WriteParam(aWriter, kSourceTextUTF16Tag);
        WriteParam(aWriter, srcText.length());
        if (srcText.length() > 0) {
          aWriter->WriteBytes(srcText.chars().get(),
                              srcText.length() * sizeof(char16_t));
        }
      },
      [&](const ProfilerJSSourceData::SourceTextUTF8& srcText) {
        WriteParam(aWriter, kSourceTextUTF8Tag);
        WriteParam(aWriter, srcText.length());
        if (srcText.length() > 0) {
          aWriter->WriteBytes(srcText.chars().get(),
                              srcText.length() * sizeof(char));
        }
      },
      [&](const ProfilerJSSourceData::RetrievableFile&) {
        WriteParam(aWriter, kRetrievableFileTag);
      },
      [&](const ProfilerJSSourceData::Unavailable&) {
        WriteParam(aWriter, kUnavailableTag);
      });
}

bool IPC::ParamTraits<ProfilerJSSourceData>::Read(MessageReader* aReader,
                                                  paramType* aResult) {
  // Read sourceId and filePath first
  uint32_t sourceId;
  size_t pathLength;
  if (!ReadParam(aReader, &sourceId) || !ReadParam(aReader, &pathLength)) {
    return false;
  }

  // Read filePath if present
  JS::UniqueChars filePath;
  if (pathLength > 0) {
    char* chars =
        static_cast<char*>(js_malloc((pathLength + 1) * sizeof(char)));
    if (!chars || !aReader->ReadBytesInto(chars, pathLength * sizeof(char))) {
      js_free(chars);
      return false;
    }
    chars[pathLength] = '\0';
    filePath.reset(chars);
  }

  // Then read the specific data type
  uint8_t typeTag;
  if (!ReadParam(aReader, &typeTag)) {
    return false;
  }

  switch (typeTag) {
    case kSourceTextUTF16Tag: {
      size_t length;
      if (!ReadParam(aReader, &length)) {
        return false;
      }
      if (length > 0) {
        // Allocate one extra element for null terminator
        char16_t* chars =
            static_cast<char16_t*>(js_malloc((length + 1) * sizeof(char16_t)));
        if (!chars ||
            !aReader->ReadBytesInto(chars, length * sizeof(char16_t))) {
          js_free(chars);
          return false;
        }
        // Ensure null termination
        chars[length] = u'\0';
        *aResult =
            ProfilerJSSourceData(sourceId, JS::UniqueTwoByteChars(chars),
                                 length, std::move(filePath), pathLength);
      } else {
        *aResult = ProfilerJSSourceData(sourceId, JS::UniqueTwoByteChars(), 0,
                                        std::move(filePath), pathLength);
      }
      return true;
    }
    case kSourceTextUTF8Tag: {
      size_t length;
      if (!ReadParam(aReader, &length)) {
        return false;
      }
      if (length > 0) {
        // Allocate one extra byte for null terminator
        char* chars =
            static_cast<char*>(js_malloc((length + 1) * sizeof(char)));
        if (!chars || !aReader->ReadBytesInto(chars, length * sizeof(char))) {
          js_free(chars);
          return false;
        }
        // Ensure null termination
        chars[length] = '\0';
        *aResult =
            ProfilerJSSourceData(sourceId, JS::UniqueChars(chars), length,
                                 std::move(filePath), pathLength);
      } else {
        *aResult = ProfilerJSSourceData(sourceId, JS::UniqueChars(), 0,
                                        std::move(filePath), pathLength);
      }
      return true;
    }
    case kRetrievableFileTag: {
      *aResult = ProfilerJSSourceData::CreateRetrievableFile(
          sourceId, std::move(filePath), pathLength);
      return true;
    }
    case kUnavailableTag: {
      *aResult =
          ProfilerJSSourceData(sourceId, std::move(filePath), pathLength);
      return true;
    }
    default:
      return false;
  }
}

void IPC::ParamTraits<mozilla::JSSourceEntry>::Write(MessageWriter* aWriter,
                                                     const paramType& aParam) {
  WriteParam(aWriter, aParam.uuid);
  WriteParam(aWriter, aParam.sourceData);
}

bool IPC::ParamTraits<mozilla::JSSourceEntry>::Read(MessageReader* aReader,
                                                    paramType* aResult) {
  return (ReadParam(aReader, &aResult->uuid) &&
          ReadParam(aReader, &aResult->sourceData));
}

void IPC::ParamTraits<mozilla::ProfileGenerationAdditionalInformation>::Write(
    MessageWriter* aWriter, const paramType& aParam) {
  WriteParam(aWriter, aParam.mSharedLibraries);
  WriteParam(aWriter, aParam.mJSSourceEntries);
}

bool IPC::ParamTraits<mozilla::ProfileGenerationAdditionalInformation>::Read(
    MessageReader* aReader, paramType* aResult) {
  if (!ReadParam(aReader, &aResult->mSharedLibraries)) {
    return false;
  }

  if (!ReadParam(aReader, &aResult->mJSSourceEntries)) {
    return false;
  }

  return true;
}

}  // namespace IPC
