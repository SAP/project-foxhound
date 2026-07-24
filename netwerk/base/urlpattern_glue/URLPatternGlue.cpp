/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/net/URLPatternGlue.h"

#include "mozilla/dom/ScriptSettings.h"  // for AutoJSAPI
#include "js/RegExp.h"
#include "js/RegExpFlags.h"
#include "js/RootingAPI.h"
#include "js/Array.h"         // JS::GetArrayLength
#include "js/GlobalObject.h"  // JS::CurrentGlobalOrNull
#include "nsJSUtils.h"
#include "mozilla/dom/BindingUtils.h"

mozilla::LazyLogModule gUrlPatternLog("urlpattern");

namespace mozilla::net {

UrlPatternInput CreateUrlPatternInput(const nsACString& url) {
  UrlPatternInput input;
  input.string_or_init_type = UrlPatternStringOrInitType::String;
  input.str = url;
  return input;
}

UrlPatternInput CreateUrlPatternInput(const UrlPatternInit& init) {
  UrlPatternInput input;
  input.string_or_init_type = UrlPatternStringOrInitType::Init;
  input.init = init;
  return input;
}

MaybeString CreateMaybeString(const nsACString& str, bool valid) {
  return MaybeString{.string = nsCString(str), .valid = valid};
}

MaybeString CreateMaybeStringNone() {
  return MaybeString{.string = ""_ns, .valid = false};
}

nsAutoCString UrlPatternGetProtocol(const UrlPatternGlue aPattern) {
  nsAutoCString result;
  urlpattern_component_get_pattern_string(
      urlpattern_get_protocol_component(aPattern), &result);
  return result;
}

nsAutoCString UrlPatternGetUsername(const UrlPatternGlue aPattern) {
  nsAutoCString result;
  urlpattern_component_get_pattern_string(
      urlpattern_get_username_component(aPattern), &result);
  return result;
}

nsAutoCString UrlPatternGetPassword(const UrlPatternGlue aPattern) {
  nsAutoCString result;
  urlpattern_component_get_pattern_string(
      urlpattern_get_password_component(aPattern), &result);
  return result;
}

nsAutoCString UrlPatternGetHostname(const UrlPatternGlue aPattern) {
  nsAutoCString result;
  urlpattern_component_get_pattern_string(
      urlpattern_get_hostname_component(aPattern), &result);
  return result;
}

nsAutoCString UrlPatternGetPort(const UrlPatternGlue aPattern) {
  nsAutoCString result;
  urlpattern_component_get_pattern_string(
      urlpattern_get_port_component(aPattern), &result);
  return result;
}

nsAutoCString UrlPatternGetPathname(const UrlPatternGlue aPattern) {
  nsAutoCString result;
  urlpattern_component_get_pattern_string(
      urlpattern_get_pathname_component(aPattern), &result);
  return result;
}

nsAutoCString UrlPatternGetSearch(const UrlPatternGlue aPattern) {
  nsAutoCString result;
  urlpattern_component_get_pattern_string(
      urlpattern_get_search_component(aPattern), &result);
  return result;
}

nsAutoCString UrlPatternGetHash(const UrlPatternGlue aPattern) {
  nsAutoCString result;
  urlpattern_component_get_pattern_string(
      urlpattern_get_hash_component(aPattern), &result);
  return result;
}

// https://urlpattern.spec.whatwg.org/#create-a-component-match-result
Maybe<UrlPatternComponentResult> ComponentMatches(
    UrlPatternComponentPtr* aComponentPtr, nsACString& aInput,
    bool aMatchOnly) {
  UrlPatternComponentResult res;
  // if a component's regexp is empty then we can skip prefix/suffix parsing,
  // any capture or regexp logic and group list building
  // and simply match on the empty string
  if (urlpattern_component_is_regexp_string_empty(aComponentPtr)) {
    if (aInput != "") {
      return Nothing();
    }
  } else {  // non-empty regexp requires deeper matching and group population
    nsTArray<MaybeString> matches;
    if (!urlpattern_component_matches(aComponentPtr, &aInput, aMatchOnly,
                                      &matches)) {
      return Nothing();
    }

    // if we are only doing a pattern.test(), then we don't need the
    // ComponentResults (groups and input) to be fully populated,
    // we just need to know they exist. so we can cut out early
    if (aMatchOnly) {
      return Some(res);
    }

    nsTArray<nsCString> groupNames;
    urlpattern_component_get_group_name_list(aComponentPtr, &groupNames);
    for (size_t i = 0; i < matches.Length(); i++) {
      // Insert all capture groups, both matched and unmatched
      // The valid flag will be used later to set undefined vs string value
      res.mGroups.InsertOrUpdate(groupNames[i], std::move(matches[i]));
    }
  }
  res.mInput = aInput;
  return Some(res);
}

Maybe<UrlPatternResult> AllComponentMatches(const UrlPatternGlue aPattern,
                                            UrlPatternMatchInput& aMatchInput,
                                            bool aMatchOnly) {
  UrlPatternResult res;
  res.mProtocol = ComponentMatches(urlpattern_get_protocol_component(aPattern),
                                   aMatchInput.protocol, aMatchOnly);
  if (res.mProtocol.isNothing()) {
    return Nothing();
  }

  res.mUsername = ComponentMatches(urlpattern_get_username_component(aPattern),
                                   aMatchInput.username, aMatchOnly);
  if (res.mUsername.isNothing()) {
    return Nothing();
  }

  res.mPassword = ComponentMatches(urlpattern_get_password_component(aPattern),
                                   aMatchInput.password, aMatchOnly);
  if (res.mPassword.isNothing()) {
    return Nothing();
  }

  res.mHostname = ComponentMatches(urlpattern_get_hostname_component(aPattern),
                                   aMatchInput.hostname, aMatchOnly);
  if (res.mHostname.isNothing()) {
    return Nothing();
  }

  res.mPort = ComponentMatches(urlpattern_get_port_component(aPattern),
                               aMatchInput.port, aMatchOnly);
  if (res.mPort.isNothing()) {
    return Nothing();
  }

  res.mPathname = ComponentMatches(urlpattern_get_pathname_component(aPattern),
                                   aMatchInput.pathname, aMatchOnly);
  if (res.mPathname.isNothing()) {
    return Nothing();
  }

  res.mSearch = ComponentMatches(urlpattern_get_search_component(aPattern),
                                 aMatchInput.search, aMatchOnly);
  if (res.mSearch.isNothing()) {
    return Nothing();
  }

  res.mHash = ComponentMatches(urlpattern_get_hash_component(aPattern),
                               aMatchInput.hash, aMatchOnly);
  if (res.mHash.isNothing()) {
    return Nothing();
  }

  return Some(res);
}

Maybe<UrlPatternResult> UrlPatternExec(UrlPatternGlue aPattern,
                                       const UrlPatternInput& aInput,
                                       Maybe<nsAutoCString> aMaybeBaseUrl,
                                       bool aIgnoreCase) {
  MOZ_LOG(gUrlPatternLog, LogLevel::Debug, ("UrlPatternExec()...\n"));
  UrlPatternMatchInputAndInputs matchInputAndInputs;
  if (aInput.string_or_init_type == UrlPatternStringOrInitType::Init) {
    MOZ_ASSERT(aMaybeBaseUrl.isNothing());
    if (!urlpattern_process_match_input_from_init(&aInput.init, nullptr,
                                                  &matchInputAndInputs)) {
      return Nothing();
    }
  } else {
    nsAutoCString* baseUrl = nullptr;
    if (aMaybeBaseUrl.isSome()) {
      baseUrl = &aMaybeBaseUrl.ref();
    }
    if (!urlpattern_process_match_input_from_string(&aInput.str, baseUrl,
                                                    &matchInputAndInputs)) {
      return Nothing();
    }
  }

  // shouldn't be any need to convert the urlpatternwrapper to quirks wrapper
  // the all_component_matches signature should be able to receive as a wrapper
  Maybe<UrlPatternResult> res =
      AllComponentMatches(aPattern, matchInputAndInputs.input, false);
  if (res.isNothing()) {
    return Nothing();
  }

  if (matchInputAndInputs.inputs.string_or_init_type ==
      UrlPatternStringOrInitType::Init) {
    res->mInputs.AppendElement(
        CreateUrlPatternInput(matchInputAndInputs.inputs.init));
  } else {
    res->mInputs.AppendElement(
        CreateUrlPatternInput(matchInputAndInputs.inputs.str));
    if (matchInputAndInputs.inputs.base.valid) {
      res->mInputs.AppendElement(
          CreateUrlPatternInput(matchInputAndInputs.inputs.base.string));
    }
  }

  return res;
}

bool UrlPatternTest(UrlPatternGlue aPattern, const UrlPatternInput& aInput,
                    Maybe<nsAutoCString> aMaybeBaseUrl, bool aIgnoreCase) {
  MOZ_LOG(gUrlPatternLog, LogLevel::Debug, ("UrlPatternTest()...\n"));
  UrlPatternMatchInputAndInputs matchInputAndInputs;
  if (aInput.string_or_init_type == UrlPatternStringOrInitType::Init) {
    MOZ_ASSERT(aMaybeBaseUrl.isNothing());
    if (!urlpattern_process_match_input_from_init(&aInput.init, nullptr,
                                                  &matchInputAndInputs)) {
      return false;
    }
  } else {
    nsAutoCString* baseUrl = nullptr;
    if (aMaybeBaseUrl.isSome()) {
      baseUrl = &aMaybeBaseUrl.ref();
    }
    if (!urlpattern_process_match_input_from_string(&aInput.str, baseUrl,
                                                    &matchInputAndInputs)) {
      return false;
    }
  }

  // shouldn't be any need to convert the urlpatternwrapper to quirks wrapper
  // the all_component_matches signature should be able to receive as a wrapper
  Maybe<UrlPatternResult> res =
      AllComponentMatches(aPattern, matchInputAndInputs.input, true);
  return !res.isNothing();
}

// Implementation for the same object represented in rust as RegExpObjWrapper
// we are using this class to root the spidermonkey regexp object returned
// from parsing so that we can hold onto it longer without it getting cleaned up
// by garbage collection.
// As noted elsewhere, this object gets held by SpiderMonkeyRegexp,
// which is ultimately held by the dom::URLPattern.
class RegExpObjImpl {
 public:
  // should be okay but doesn't participate in slicing of incremental GC
  // alternative: implement trace method, called from dom::URLPattern
  JS::PersistentRooted<JSObject*> mRegexp;  // advertising directly to GC
  explicit RegExpObjImpl(JSContext* cx, JSObject* aJsObj)
      : mRegexp(cx, aJsObj) {}
};

extern "C" bool parse_regexp_ffi(const uint16_t* pattern, uintptr_t pattern_len,
                                 const uint16_t* flags, uintptr_t flags_len,
                                 RegExpObjWrapper** res) {
  dom::AutoJSAPI jsapi;
  jsapi.Init();
  JSContext* cx = jsapi.cx();
  AutoDisableJSInterruptCallback disabler(cx);
  JSAutoRealm ar(
      cx, dom::binding_detail::UnprivilegedJunkScopeOrWorkerGlobal(fallible));

  const char16_t* flagsStr = reinterpret_cast<const char16_t*>(flags);
  JS::RegExpFlags regexpFlags = JS::RegExpFlag::UnicodeSets;
  for (uintptr_t i = 0; i < flags_len; i++) {
    switch (flagsStr[i]) {
      case u'i':
        regexpFlags = regexpFlags | JS::RegExpFlag::IgnoreCase;
        break;
      default:
        break;
    }
  }

  const char16_t* patternStr = reinterpret_cast<const char16_t*>(pattern);
  JS::Rooted<JSObject*> regexp(
      cx, JS::NewUCRegExpObject(cx, patternStr, pattern_len, regexpFlags));
  if (!regexp) {
    if (JS_IsExceptionPending(cx)) {
      JS_ClearPendingException(cx);
    }
    return false;
  }

  RegExpObjImpl* w = new RegExpObjImpl(cx, regexp);
  *res =
      reinterpret_cast<RegExpObjWrapper*>(w);  // can't static_cast to void **
  return true;
}

bool matches_regexp(RegExpObjWrapper* const* regexpWrapper,
                    const uint8_t* aText, uintptr_t aTextLen, bool aMatchOnly,
                    bool* aMatchResult, nsTArray<MaybeString>* aRegexResults) {
  dom::AutoJSAPI jsapi;
  jsapi.Init();
  JSContext* cx = jsapi.cx();
  AutoDisableJSInterruptCallback disabler(cx);

  RegExpObjImpl* regExpObjImpl =
      reinterpret_cast<RegExpObjImpl*>(*regexpWrapper);
  JSAutoRealm ar(cx, regExpObjImpl->mRegexp);

  // SM expects utf-16 strings and the matches_regexp API has been simplified to
  // only deal with utf-8, so we convert as necessary here
  nsDependentCSubstring utf8Text(reinterpret_cast<const char*>(aText),
                                 aTextLen);
  NS_ConvertUTF8toUTF16 utf16Text(utf8Text);
  const char16_t* text = utf16Text.get();

  JS::Rooted<JS::Value> regexResult(cx, JS::NullValue());
  size_t textLen = utf16Text.Length();

  size_t index = 0;
  if (!JS::ExecuteRegExpNoStatics(cx, regExpObjImpl->mRegexp, text, textLen,
                                  &index, aMatchOnly, &regexResult)) {
    return false;
  }

  // On no match, ExecuteRegExpNoStatics returns Null
  if (regexResult.isNull()) {
    *aMatchResult = false;
    return true;
  }

  // We have a match
  *aMatchResult = true;

  // early exit if we requested aMatchOnly because we don't need the results
  if (aMatchOnly) {
    MOZ_ASSERT(regexResult.isBoolean() && regexResult.toBoolean());
    return true;
  }

  if (aRegexResults == nullptr) {
    return false;
  }

  // Now we know we have a result, and we need to extract it so we can read it.
  uint32_t length;
  JS::Rooted<JSObject*> regexResultObj(cx, &regexResult.toObject());
  if (!JS::GetArrayLength(cx, regexResultObj, &length)) {
    return false;
  }

  // Skip index 0 (the full match) and only return captured groups
  for (uint32_t i = 1; i < length; i++) {
    JS::Rooted<JS::Value> element(cx);
    if (!JS_GetElement(cx, regexResultObj, i, &element)) {
      return false;
    }

    // If capture group didn't match (is undefined), add invalid MaybeString
    if (element.isUndefined()) {
      aRegexResults->AppendElement(CreateMaybeStringNone());
      continue;
    }

    nsAutoJSString value;
    if (!value.init(cx, element)) {
      return false;
    }

    aRegexResults->AppendElement(
        CreateMaybeString(NS_ConvertUTF16toUTF8(value), true));
  }
  return true;
}

extern "C" bool matches_regexp_ffi(RegExpObjWrapper* const* regexp_wrapper,
                                   const uint8_t* string, uintptr_t string_len,
                                   bool match_only, bool* match_result,
                                   nsTArray<MaybeString>* res) {
  if (!matches_regexp(regexp_wrapper, string, string_len, match_only,
                      match_result, res)) {
    return false;
  }

  return true;
}

extern "C" void free_regexp_ffi(RegExpObjWrapper* regexp_wrapper) {
  if (regexp_wrapper) {
    RegExpObjImpl* impl = reinterpret_cast<RegExpObjImpl*>(regexp_wrapper);
    delete impl;
  }
}

}  // namespace mozilla::net
