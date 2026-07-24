/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */
#include "FuzzedDataProvider.h"
#include "FuzzingInterface.h"
#include "js/RootingAPI.h"                    // JS::PersistentRooted
#include "mozilla/ErrorResult.h"              // ErrorResult
#include "mozilla/dom/BindingDeclarations.h"  // GlobalObject
#include "mozilla/dom/ScriptSettings.h"       // AutoJSAPI
#include "mozilla/dom/SimpleGlobalObject.h"   // SimpleGlobalObject
#include "mozilla/dom/URLPattern.h"           // URLPattern class
#include "mozilla/dom/URLPatternBinding.h"  // UTF8StringOrURLPatternInit, URLPatternOptions
#include "nsReadableUtils.h"                // CopyUTF8toUTF16, CopyUTF16toUTF8

using namespace mozilla;
using namespace mozilla::dom;

static MOZ_RUNINIT JS::PersistentRooted<JSObject*> global;

static int FuzzingInit(int* argc, char*** argv) {
  JSObject* simpleGlobal =
      SimpleGlobalObject::Create(SimpleGlobalObject::GlobalType::BindingDetail);
  global.init(mozilla::dom::RootingCx());
  global.set(simpleGlobal);
  return 0;
}

// Helper function to simulate JS->WebIDL UTF8String conversion
static void SanitizeToUTF8(const std::string& input, nsACString& output) {
  nsAutoString utf16;
  CopyUTF8toUTF16(mozilla::Span(input.data(), input.length()), utf16);
  CopyUTF16toUTF8(utf16, output);
}

// Helper function to create an optional baseURL string
static void MaybeCreateBaseURL(FuzzedDataProvider& fdp,
                               Optional<nsACString>& base, nsCString& baseUrl) {
  if (fdp.ConsumeBool()) {
    std::string str = fdp.ConsumeRandomLengthString();
    SanitizeToUTF8(str, baseUrl);
    base = &baseUrl;
  }
}

static void CreateURLPatternInput(FuzzedDataProvider& fdp,
                                  UTF8StringOrURLPatternInit& input) {
  if (fdp.ConsumeBool()) {
    // URLPatternInit
    auto maybeSetField = [&fdp](auto& field) {
      if (fdp.ConsumeBool()) {
        std::string str = fdp.ConsumeRandomLengthString();
        nsCString sanitized;
        SanitizeToUTF8(str, sanitized);
        field.Construct(sanitized);
      }
    };

    URLPatternInit& init = input.SetAsURLPatternInit();
    maybeSetField(init.mProtocol);
    maybeSetField(init.mUsername);
    maybeSetField(init.mPassword);
    maybeSetField(init.mHostname);
    maybeSetField(init.mPort);
    maybeSetField(init.mPathname);
    maybeSetField(init.mSearch);
    maybeSetField(init.mHash);
    maybeSetField(init.mBaseURL);
  } else {
    // Plain UTF8String
    std::string str = fdp.ConsumeRandomLengthString();
    auto& utf8Str = input.RawSetAsUTF8String();
    SanitizeToUTF8(str, *reinterpret_cast<nsCString*>(&utf8Str));
  }
}

static int FuzzingRunURLPattern(const uint8_t* data, size_t size) {
  FuzzedDataProvider fdp(data, size);

  AutoJSAPI jsapi;
  MOZ_RELEASE_ASSERT(jsapi.Init(global));
  JSContext* cx = jsapi.cx();
  GlobalObject globalObj(cx, global);

  UTF8StringOrURLPatternInit input;
  CreateURLPatternInput(fdp, input);

  URLPatternOptions options;
  options.mIgnoreCase = fdp.ConsumeBool();

  ErrorResult rv;

  RefPtr<URLPattern> pattern;
  if (fdp.ConsumeBool()) {
    pattern = URLPattern::Constructor(globalObj, input, options, rv);
  } else {
    nsCString base;
    std::string str = fdp.ConsumeRandomLengthString();
    SanitizeToUTF8(str, base);
    pattern = URLPattern::Constructor(globalObj, input, base, options, rv);
  }

  if (MOZ_UNLIKELY(rv.Failed())) {
    return 0;
  }

  // Table of getters
  using GetterFunc = void (URLPattern::*)(nsACString&) const;
  static const GetterFunc kGetters[] = {
      &URLPattern::GetProtocol, &URLPattern::GetUsername,
      &URLPattern::GetPassword, &URLPattern::GetHostname,
      &URLPattern::GetPort,     &URLPattern::GetPathname,
      &URLPattern::GetSearch,   &URLPattern::GetHash,
  };

  while (fdp.remaining_bytes() > 0) {
    uint8_t operation = fdp.ConsumeIntegralInRange<uint8_t>(0, 10);
    if (operation <= 7) {
      // Access getters
      nsAutoCString result;
      (pattern.get()->*kGetters[operation])(result);
    } else if (operation == 8) {
      (void)pattern->HasRegExpGroups();
    } else if (operation == 9) {
      // Test
      UTF8StringOrURLPatternInit testInput;
      CreateURLPatternInput(fdp, testInput);

      Optional<nsACString> base;
      nsCString baseUrl;
      MaybeCreateBaseURL(fdp, base, baseUrl);

      ErrorResult testRv;
      (void)pattern->Test(testInput, base, testRv);
    } else if (operation == 10) {
      // Exec
      UTF8StringOrURLPatternInit execInput;
      CreateURLPatternInput(fdp, execInput);

      Optional<nsACString> base;
      nsCString baseUrl;
      MaybeCreateBaseURL(fdp, base, baseUrl);

      Nullable<URLPatternResult> result;
      ErrorResult execRv;
      pattern->Exec(execInput, base, result, execRv);
    }
  }

  return 0;
}

MOZ_FUZZING_INTERFACE_RAW(FuzzingInit, FuzzingRunURLPattern, URLPattern);
