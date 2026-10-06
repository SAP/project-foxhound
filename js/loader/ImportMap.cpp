/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ImportMap.h"

#include "js/Array.h"                 // IsArrayObject
#include "js/friend/ErrorMessages.h"  // js::GetErrorMessage, JSMSG_*
#include "js/JSON.h"                  // JS_ParseJSON
#include "js/PropertyDescriptor.h"    // JS::PropertyDescriptor
#include "mozilla/StaticPrefs_dom.h"
#include "LoadedScript.h"
#include "ModuleLoaderBase.h"  // ScriptLoaderInterface
#include "nsContentUtils.h"
#include "nsIScriptElement.h"
#include "nsIScriptError.h"
#include "nsJSUtils.h"  // nsAutoJSString
#include "nsNetUtil.h"  // NS_NewURI
#include "ScriptLoadRequest.h"

using JS::SourceText;
using mozilla::Err;
using mozilla::LazyLogModule;
using mozilla::MakeUnique;
using mozilla::UniquePtr;
using mozilla::WrapNotNull;

namespace JS::loader {

LazyLogModule ImportMap::gImportMapLog("ImportMap");

#undef LOG
#define LOG(args) \
  MOZ_LOG(ImportMap::gImportMapLog, mozilla::LogLevel::Debug, args)

#define LOG_ENABLED() \
  MOZ_LOG_TEST(ImportMap::gImportMapLog, mozilla::LogLevel::Debug)

template <typename... Args>
void ReportWarningHelper::Report(const char* aMessageName,
                                 Args&&... aArgs) const {
  AutoTArray<nsString, sizeof...(aArgs)> array;
  (array.AppendElement(aArgs), ...);
  mLoader->ReportWarningToConsole(mRequest, aMessageName, array);
}

using ResolveURLLikeResult =
    mozilla::Result<mozilla::NotNull<nsCOMPtr<nsIURI>>, ResolveError>;

// https://html.spec.whatwg.org/multipage/webappapis.html#resolving-a-url-like-module-specifier
static ResolveURLLikeResult ResolveURLLikeModuleSpecifier(
    const nsAString& aSpecifier, nsIURI* aBaseURL) {
  nsCOMPtr<nsIURI> uri;
  nsresult rv;

  // Step 1. If specifier starts with "/", "./", or "../", then:
  if (StringBeginsWith(aSpecifier, u"/"_ns) ||
      StringBeginsWith(aSpecifier, u"./"_ns) ||
      StringBeginsWith(aSpecifier, u"../"_ns)) {
    // Step 1.1. Let url be the result of parsing specifier with baseURL as the
    // base URL.
    rv = NS_NewURI(getter_AddRefs(uri), aSpecifier, nullptr, aBaseURL);
    // Step 1.2. If url is failure, then return null.
    if (NS_FAILED(rv)) {
      return Err(ResolveError::Failure);
    }

    // Step 1.3. Return url.
    return WrapNotNull(uri);
  }

  // Step 2. Let url be the result of parsing specifier (with no base URL).
  rv = NS_NewURI(getter_AddRefs(uri), aSpecifier);
  // Step 3. If url is failure, then return null.
  if (NS_FAILED(rv)) {
    return Err(ResolveError::FailureMayBeBare);
  }

  // Step 4. Return url.
  return WrapNotNull(uri);
}

// https://html.spec.whatwg.org/multipage/webappapis.html#normalizing-a-specifier-key
static void NormalizeSpecifierKey(const nsAString& aSpecifierKey,
                                  nsIURI* aBaseURL,
                                  const ReportWarningHelper& aWarning,
                                  nsAString& aRetVal) {
  // Step 1. If specifierKey is the empty string, then:
  if (aSpecifierKey.IsEmpty()) {
    // Step 1.1. Report a warning to the console that specifier keys cannot be
    // the empty string.
    aWarning.Report("ImportMapEmptySpecifierKeys");

    // Step 1.2. Return null.
    aRetVal = EmptyString();
    return;
  }

  // Step 2. Let url be the result of resolving a URL-like module specifier,
  // given specifierKey and baseURL.
  auto parseResult = ResolveURLLikeModuleSpecifier(aSpecifierKey, aBaseURL);

  // Step 3. If url is not null, then return the serialization of url.
  if (parseResult.isOk()) {
    nsCOMPtr<nsIURI> url = parseResult.unwrap();
    aRetVal = NS_ConvertUTF8toUTF16(url->GetSpecOrDefault());
    return;
  }

  // Step 4. Return specifierKey.
  aRetVal = aSpecifierKey;
}

// https://html.spec.whatwg.org/multipage/webappapis.html#sorting-and-normalizing-a-module-specifier-map
static UniquePtr<SpecifierMap> SortAndNormalizeSpecifierMap(
    JSContext* aCx, HandleObject aOriginalMap, nsIURI* aBaseURL,
    const ReportWarningHelper& aWarning) {
  // Step 1. Let normalized be an empty ordered map.
  UniquePtr<SpecifierMap> normalized = MakeUnique<SpecifierMap>();

  Rooted<IdVector> specifierKeys(aCx, IdVector(aCx));
  if (!JS_Enumerate(aCx, aOriginalMap, &specifierKeys)) {
    return nullptr;
  }

  // Step 2. For each specifierKey → value of originalMap,
  for (size_t i = 0; i < specifierKeys.length(); i++) {
    const RootedId specifierId(aCx, specifierKeys[i]);
    nsAutoJSString specifierKey;
    NS_ENSURE_TRUE(specifierKey.init(aCx, specifierId), nullptr);

    // Step 2.1. Let normalizedSpecifierKey be the result of normalizing a
    // specifier key given specifierKey and baseURL.
    nsString normalizedSpecifierKey;
    NormalizeSpecifierKey(specifierKey, aBaseURL, aWarning,
                          normalizedSpecifierKey);

    // Step 2.2. If normalizedSpecifierKey is null, then continue.
    if (normalizedSpecifierKey.IsEmpty()) {
      continue;
    }

    RootedValue idVal(aCx);
    NS_ENSURE_TRUE(JS_GetPropertyById(aCx, aOriginalMap, specifierId, &idVal),
                   nullptr);
    // Step 2.3. If value is not a string, then:
    if (!idVal.isString()) {
      // Step 2.3.1. The user agent may report a warning to the console
      // indicating that addresses need to be strings.
      aWarning.Report("ImportMapAddressesNotStrings");

      // Step 2.3.2. Set normalized[normalizedSpecifierKey] to null.
      normalized->insert_or_assign(normalizedSpecifierKey, nullptr);

      // Step 2.3.3. Continue.
      continue;
    }

    nsAutoJSString value;
    NS_ENSURE_TRUE(value.init(aCx, idVal), nullptr);

    // Step 2.4. Let addressURL be the result of resolving a URL-like module
    // specifier given value and baseURL.
    auto parseResult = ResolveURLLikeModuleSpecifier(value, aBaseURL);

    // Step 2.5. If addressURL is null, then:
    if (parseResult.isErr()) {
      // Step 2.5.1. The user agent may report a warning to the console
      // indicating that the address was invalid.
      aWarning.Report("ImportMapInvalidAddress", value);

      // Step 2.5.2. Set normalized[normalizedSpecifierKey] to null.
      normalized->insert_or_assign(normalizedSpecifierKey, nullptr);

      // Step 2.5.3. Continue.
      continue;
    }

    nsCOMPtr<nsIURI> addressURL = parseResult.unwrap();
    nsCString address = addressURL->GetSpecOrDefault();
    // Step 2.6. If specifierKey ends with U+002F (/), and the serialization
    // of addressURL does not end with U+002F (/), then:
    if (StringEndsWith(specifierKey, u"/"_ns) &&
        !StringEndsWith(address, "/"_ns)) {
      // Step 2.6.1. The user agent may report a warning to the console
      // indicating that an invalid address was given for the specifier key
      // specifierKey; since specifierKey ends with a slash, the address needs
      // to as well.
      aWarning.Report("ImportMapAddressNotEndsWithSlash", specifierKey,
                      NS_ConvertUTF8toUTF16(address));

      // Step 2.6.2. Set normalized[normalizedSpecifierKey] to null.
      normalized->insert_or_assign(normalizedSpecifierKey, nullptr);

      // Step 2.6.3. Continue.
      continue;
    }

    LOG(("ImportMap::SortAndNormalizeSpecifierMap {%s, %s}",
         NS_ConvertUTF16toUTF8(normalizedSpecifierKey).get(),
         addressURL->GetSpecOrDefault().get()));

    // Step 2.7. Set normalized[normalizedSpecifierKey] to addressURL.
    normalized->insert_or_assign(normalizedSpecifierKey, addressURL);
  }

  // Step 3: Return the result of sorting normalized, with an entry a being
  // less than an entry b if b’s key is code unit less than a’s key.
  //
  // Impl note: The sorting is done when inserting the entry.
  return normalized;
}

// Check if it's a map defined in
// https://infra.spec.whatwg.org/#ordered-map
//
// If it is, *aIsMap will be set to true.
static bool IsMapObject(JSContext* aCx, HandleValue aMapVal, bool* aIsMap) {
  MOZ_ASSERT(aIsMap);

  *aIsMap = false;
  if (!aMapVal.isObject()) {
    return true;
  }

  bool isArray;
  if (!IsArrayObject(aCx, aMapVal, &isArray)) {
    return false;
  }

  *aIsMap = !isArray;
  return true;
}

// https://html.spec.whatwg.org/multipage/webappapis.html#sorting-and-normalizing-scopes
static UniquePtr<ScopeMap> SortAndNormalizeScopes(
    JSContext* aCx, HandleObject aOriginalMap, nsIURI* aBaseURL,
    const ReportWarningHelper& aWarning) {
  Rooted<IdVector> scopeKeys(aCx, IdVector(aCx));
  if (!JS_Enumerate(aCx, aOriginalMap, &scopeKeys)) {
    return nullptr;
  }

  // Step 1. Let normalized be an empty map.
  UniquePtr<ScopeMap> normalized = MakeUnique<ScopeMap>();

  // Step 2. For each scopePrefix → potentialSpecifierMap of originalMap,
  for (size_t i = 0; i < scopeKeys.length(); i++) {
    const RootedId scopeKey(aCx, scopeKeys[i]);
    nsAutoJSString scopePrefix;
    NS_ENSURE_TRUE(scopePrefix.init(aCx, scopeKey), nullptr);

    // Step 2.1. If potentialSpecifierMap is not an ordered map, then throw a
    // TypeError indicating that the value of the scope with prefix scopePrefix
    // needs to be a JSON object.
    RootedValue mapVal(aCx);
    NS_ENSURE_TRUE(JS_GetPropertyById(aCx, aOriginalMap, scopeKey, &mapVal),
                   nullptr);

    bool isMap;
    if (!IsMapObject(aCx, mapVal, &isMap)) {
      return nullptr;
    }
    if (!isMap) {
      const char16_t* scope = scopePrefix.get();
      JS_ReportErrorNumberUC(aCx, js::GetErrorMessage, nullptr,
                             JSMSG_IMPORT_MAPS_SCOPE_VALUE_NOT_A_MAP, scope);
      return nullptr;
    }

    // Step 2.2. Let scopePrefixURL be the result of URL parsing scopePrefix
    // with baseURL.
    nsCOMPtr<nsIURI> scopePrefixURL;
    nsresult rv = NS_NewURI(getter_AddRefs(scopePrefixURL), scopePrefix,
                            nullptr, aBaseURL);

    // Step 2.3. If scopePrefixURL is failure, then:
    if (NS_FAILED(rv)) {
      // Step 2.3.1. The user agent may report a warning to the console that
      // the scope prefix URL was not parseable.
      aWarning.Report("ImportMapScopePrefixNotParseable", scopePrefix);

      // Step 2.3.2. Continue.
      continue;
    }

    // Step 2.4. Let normalizedScopePrefix be the serialization of
    // scopePrefixURL.
    nsCString normalizedScopePrefix = scopePrefixURL->GetSpecOrDefault();

    // Step 2.5. Set normalized[normalizedScopePrefix] to the result of sorting
    // and normalizing a specifier map given potentialSpecifierMap and baseURL.
    RootedObject potentialSpecifierMap(aCx, &mapVal.toObject());
    UniquePtr<SpecifierMap> specifierMap = SortAndNormalizeSpecifierMap(
        aCx, potentialSpecifierMap, aBaseURL, aWarning);
    if (!specifierMap) {
      return nullptr;
    }

    normalized->insert_or_assign(normalizedScopePrefix,
                                 std::move(specifierMap));
  }

  // Step 3. Return the result of sorting in descending order normalized, with
  // an entry a being less than an entry b if a's key is code unit less than b's
  // key.
  //
  // Impl note: The sorting is done when inserting the entry.
  return normalized;
}

// https://html.spec.whatwg.org/multipage/webappapis.html#normalizing-a-module-integrity-map
static UniquePtr<IntegrityMap> NormalizeIntegrity(
    JSContext* aCx, HandleObject aOriginalMap, nsIURI* aBaseURL,
    const ReportWarningHelper& aWarning) {
  // Step 1. Let normalized be an empty ordered map.
  UniquePtr<IntegrityMap> normalized = MakeUnique<IntegrityMap>();

  Rooted<IdVector> keys(aCx, IdVector(aCx));
  if (!JS_Enumerate(aCx, aOriginalMap, &keys)) {
    return nullptr;
  }

  // Step 2. For each key → value of originalMap,
  for (size_t i = 0; i < keys.length(); i++) {
    const RootedId keyId(aCx, keys[i]);
    nsAutoJSString key;
    NS_ENSURE_TRUE(key.init(aCx, keyId), nullptr);

    // Step 2.1. Let resolvedURL be the result of resolving a URL-like module
    // specifier given key and baseURL.
    auto parseResult = ResolveURLLikeModuleSpecifier(key, aBaseURL);

    // Step 2.2. If resolvedURL is null, then:
    if (parseResult.isErr()) {
      // Step 2.2.1. The user agent may report a warning to the console
      // indicating that the key failed to resolve.
      aWarning.Report("ImportMapInvalidAddress", key);

      // Step 2.2.2. Continue.
      continue;
    }

    nsCOMPtr<nsIURI> resolvedURL = parseResult.unwrap();

    RootedValue idVal(aCx);
    NS_ENSURE_TRUE(JS_GetPropertyById(aCx, aOriginalMap, keyId, &idVal),
                   nullptr);

    // Step 2.3. If value is not a string, then:
    if (!idVal.isString()) {
      // Step 2.3.1. The user agent may report a warning to the console
      // indicating that integrity metadata values need to be strings.
      aWarning.Report("ImportMapIntegrityValuesNotStrings");
      // Step 2.3.2. Continue.
      continue;
    }

    nsAutoJSString value;
    NS_ENSURE_TRUE(value.init(aCx, idVal), nullptr);

    // Step 2.4. Set normalized[resolvedURL] to value.
    normalized->insert_or_assign(resolvedURL->GetSpecOrDefault(), value);
  }

  // Step 3: Return normalized.
  //
  // Impl note: The sorting is done when inserting the entry.
  return normalized;
}

static bool GetOwnProperty(JSContext* aCx, Handle<JSObject*> aObj,
                           const char* aName, MutableHandle<Value> aValueOut) {
  JS::Rooted<mozilla::Maybe<JS::PropertyDescriptor>> desc(aCx);
  if (!JS_GetOwnPropertyDescriptor(aCx, aObj, aName, &desc)) {
    return false;
  }

  if (desc.isNothing()) {
    return true;
  }
  MOZ_ASSERT(!desc->isAccessorDescriptor());
  aValueOut.set(desc->value());
  return true;
}

// static
bool ImportMap::IsMultipleImportMapsSupported() {
  return NS_IsMainThread() &&
         mozilla::StaticPrefs::dom_multiple_import_maps_enabled();
}

// https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string
// static
UniquePtr<ImportMap> ImportMap::ParseString(
    JSContext* aCx, SourceText<char16_t>& aInput, nsIURI* aBaseURL,
    const ReportWarningHelper& aWarning) {
  // Step 1. Let parsed be the result of parsing JSON into Infra values given
  // input.
  Rooted<Value> parsedVal(aCx);
  if (!JS_ParseJSON(aCx, aInput.get(), aInput.length(), &parsedVal)) {
    NS_WARNING("Parsing Import map string failed");

    // If JS_ParseJSON fails we check if it throws a SyntaxError.
    // If so we update the error message from JSON parser to make it more clear
    // that the parsing of import map has failed.
    MOZ_ASSERT(JS_IsExceptionPending(aCx));
    Rooted<Value> exn(aCx);
    if (!JS_GetPendingException(aCx, &exn)) {
      return nullptr;
    }
    MOZ_ASSERT(exn.isObject());
    Rooted<JSObject*> obj(aCx, &exn.toObject());
    JS::BorrowedErrorReport err(aCx);
    MOZ_ALWAYS_TRUE(JS_ErrorFromException(aCx, obj, err));
    if (err->exnType == JSEXN_SYNTAXERR) {
      JS_ClearPendingException(aCx);
      JS_ReportErrorNumberASCII(aCx, js::GetErrorMessage, nullptr,
                                JSMSG_IMPORT_MAPS_PARSE_FAILED,
                                err->message().c_str());
    }

    return nullptr;
  }

  // Step 2. If parsed is not an ordered map, then throw a TypeError indicating
  // that the top-level value needs to be a JSON object.
  bool isMap;
  if (!IsMapObject(aCx, parsedVal, &isMap)) {
    return nullptr;
  }
  if (!isMap) {
    JS_ReportErrorNumberASCII(aCx, js::GetErrorMessage, nullptr,
                              JSMSG_IMPORT_MAPS_NOT_A_MAP);
    return nullptr;
  }

  RootedObject parsedObj(aCx, &parsedVal.toObject());
  RootedValue importsVal(aCx);
  if (!GetOwnProperty(aCx, parsedObj, "imports", &importsVal)) {
    return nullptr;
  }

  // Step 3. Let sortedAndNormalizedImports be an empty ordered map.
  //
  // Impl note: If parsed["imports"] doesn't exist, we will allocate
  // sortedAndNormalizedImports to an empty map in Step 8 below.
  UniquePtr<SpecifierMap> sortedAndNormalizedImports = nullptr;

  // Step 4. If parsed["imports"] exists, then:
  if (!importsVal.isUndefined()) {
    // Step 4.1. If parsed["imports"] is not an ordered map, then throw a
    // TypeError indicating that the "imports" top-level key needs to be a JSON
    // object.
    bool isMap;
    if (!IsMapObject(aCx, importsVal, &isMap)) {
      return nullptr;
    }
    if (!isMap) {
      JS_ReportErrorNumberASCII(aCx, js::GetErrorMessage, nullptr,
                                JSMSG_IMPORT_MAPS_IMPORTS_NOT_A_MAP);
      return nullptr;
    }

    // Step 4.2. Set sortedAndNormalizedImports to the result of sorting and
    // normalizing a module specifier map given parsed["imports"] and baseURL.
    RootedObject importsObj(aCx, &importsVal.toObject());
    sortedAndNormalizedImports =
        SortAndNormalizeSpecifierMap(aCx, importsObj, aBaseURL, aWarning);
    if (!sortedAndNormalizedImports) {
      return nullptr;
    }
  }

  RootedValue scopesVal(aCx);
  if (!GetOwnProperty(aCx, parsedObj, "scopes", &scopesVal)) {
    return nullptr;
  }

  // Step 5. Let sortedAndNormalizedScopes be an empty ordered map.
  //
  // Impl note: If parsed["scopes"] doesn't exist, we will allocate
  // sortedAndNormalizedScopes to an empty map in Step 8 below.
  UniquePtr<ScopeMap> sortedAndNormalizedScopes = nullptr;

  // Step 6. If parsed["scopes"] exists, then:
  if (!scopesVal.isUndefined()) {
    // Step 6.1. If parsed["scopes"] is not an ordered map, then throw a
    // TypeError indicating that the "scopes" top-level key needs to be a JSON
    // object.
    bool isMap;
    if (!IsMapObject(aCx, scopesVal, &isMap)) {
      return nullptr;
    }
    if (!isMap) {
      JS_ReportErrorNumberASCII(aCx, js::GetErrorMessage, nullptr,
                                JSMSG_IMPORT_MAPS_SCOPES_NOT_A_MAP);
      return nullptr;
    }

    // Step 6.2. Set sortedAndNormalizedScopes to the result of sorting and
    // normalizing scopes given parsed["scopes"] and baseURL.
    RootedObject scopesObj(aCx, &scopesVal.toObject());
    sortedAndNormalizedScopes =
        SortAndNormalizeScopes(aCx, scopesObj, aBaseURL, aWarning);
    if (!sortedAndNormalizedScopes) {
      return nullptr;
    }
  }

  RootedValue integrityVal(aCx);
  if (!GetOwnProperty(aCx, parsedObj, "integrity", &integrityVal)) {
    return nullptr;
  }

  // Step 7. Let normalizedIntegrity be an empty ordered map.
  //
  // Impl note: If parsed["integrity"] doesn't exist, we will allocate
  // normalizedIntegrity to an empty map in Step 8 below.
  UniquePtr<IntegrityMap> normalizedIntegrity = nullptr;

  // Step 8. If parsed["integrity"] exists, then:
  if (!integrityVal.isUndefined()) {
    // Step 6.1. If parsed["integrity"] is not an ordered map, then throw a
    // TypeError indicating that the "integrity" top-level key needs to be a
    // JSON object.
    bool isMap;
    if (!IsMapObject(aCx, integrityVal, &isMap)) {
      return nullptr;
    }
    if (!isMap) {
      JS_ReportErrorNumberASCII(aCx, js::GetErrorMessage, nullptr,
                                JSMSG_IMPORT_MAPS_INTEGRITY_NOT_A_MAP);
      return nullptr;
    }

    // Step 6.2. Set normalizedIntegrity to the result of normalizing
    // integrities given parsed["integrity"] and baseURL.
    RootedObject integrityObj(aCx, &integrityVal.toObject());
    normalizedIntegrity =
        NormalizeIntegrity(aCx, integrityObj, aBaseURL, aWarning);
    if (!normalizedIntegrity) {
      return nullptr;
    }
  }

  // Step 9. If parsed's keys contains any items besides "imports", "scopes",
  // or "integrity", then the user agent should report a warning to the console
  // indicating that an invalid top-level key was present in the import map.
  Rooted<IdVector> keys(aCx, IdVector(aCx));
  if (!JS_Enumerate(aCx, parsedObj, &keys)) {
    return nullptr;
  }

  for (size_t i = 0; i < keys.length(); i++) {
    const RootedId key(aCx, keys[i]);
    nsAutoJSString val;
    NS_ENSURE_TRUE(val.init(aCx, key), nullptr);
    if (val.EqualsLiteral("imports") || val.EqualsLiteral("scopes") ||
        val.EqualsLiteral("integrity")) {
      continue;
    }

    aWarning.Report("ImportMapInvalidTopLevelKey", val);
  }

  // Step 10. Return an import map whose imports are
  // sortedAndNormalizedImports, whose scopes are
  // sortedAndNormalizedScopes, and whose integrity
  // are normalizedIntegrity.
  return MakeUnique<ImportMap>(std::move(sortedAndNormalizedImports),
                               std::move(sortedAndNormalizedScopes),
                               std::move(normalizedIntegrity));
}

// https://url.spec.whatwg.org/#is-special
static bool IsSpecialScheme(nsIURI* aURI) {
  nsAutoCString scheme;
  aURI->GetScheme(scheme);
  return scheme.EqualsLiteral("ftp") || scheme.EqualsLiteral("file") ||
         scheme.EqualsLiteral("http") || scheme.EqualsLiteral("https") ||
         scheme.EqualsLiteral("ws") || scheme.EqualsLiteral("wss");
}

// https://html.spec.whatwg.org/#merge-module-specifier-maps
static UniquePtr<SpecifierMap> MergeSpecifierMaps(
    SpecifierMap* newMap, SpecifierMap* oldMap,
    const ReportWarningHelper& aWarning) {
  // 1. Let mergedMap be a deep copy of oldMap.
  UniquePtr<SpecifierMap> mergedMap = MakeUnique<SpecifierMap>();
  for (auto&& [k, v] : *oldMap) {
    mergedMap->emplace(k, v);
  }

  // 2. For each specifier → url of newMap:
  for (auto&& [specifier, url] : *newMap) {
    // 1. If specifier exists in oldMap, then:
    auto iter = oldMap->find(specifier);
    if (iter != oldMap->end()) {
      // 1. The user agent may report a warning to the console indicating the
      //    ignored rule. They may choose to avoid reporting if the rule is
      //    identical to an existing one.
      aWarning.Report("ImportMapSpecifierMapEntryIgnored", specifier);

      // 2. Continue.
      continue;
    }

    if (LOG_ENABLED()) {
      nsAutoCString urlSpec;
      if (url) {
        url->GetSpec(urlSpec);
      }
      LOG(("ImportMap::MergeSpecifierMaps, added entry {%s, %s}",
           NS_ConvertUTF16toUTF8(specifier).get(), urlSpec.get()));
    }

    // 2. Set mergedMap[specifier] to url.
    mergedMap->insert_or_assign(specifier, url);
  }

  // 3. Return mergedMap.
  return mergedMap;
}

// static
void ImportMap::Merge(ModuleLoaderBase* aModuleLoader,
                      mozilla::UniquePtr<ImportMap> aNewMap,
                      const ReportWarningHelper& aWarning) {
  // 1. Let newImportMapScopes be a deep copy of newImportMap's scopes.
  //
  // TODO: https://github.com/whatwg/html/issues/12006
  // Deep copy is redudant.
  UniquePtr<ScopeMap> newScopes =
      aNewMap->mScopes ? std::move(aNewMap->mScopes) : MakeUnique<ScopeMap>();
  MOZ_ASSERT(newScopes);

  // 2. Let oldImportMap be global's import map.
  if (!aModuleLoader->GetImportMap()) {
    aModuleLoader->mImportMap = ImportMap::CreateEmpty();
  }
  ImportMap* oldMap = aModuleLoader->GetImportMap();
  MOZ_ASSERT(oldMap);

  // 3. Let newImportMapImports be a deep copy of newImportMap's imports.
  UniquePtr<SpecifierMap> newImports = aNewMap->mImports
                                           ? std::move(aNewMap->mImports)
                                           : MakeUnique<SpecifierMap>();
  MOZ_ASSERT(newImports);

  // 4. For each scopePrefix → scopeImports of newImportMapScopes:
  for (auto&& [scopePrefix, scopeImports] : *newScopes) {
    // 1. For each record of global's resolved module set:
    // TODO: Bug 2005269: Revise the matching of resolved module set
    for (auto resolvedIter = aModuleLoader->GetResolvedModuleSet()->iter();
         !resolvedIter.done(); resolvedIter.next()) {
      const auto& record = resolvedIter.get();

      // 1. If scopePrefix is record's serialized base URL, or if scopePrefix
      //    ends with U+002F (/) and scopePrefix is a code unit prefix of
      //    record's serialized base URL, then:
      if (scopePrefix.Equals(record->SerializedBaseURL()) ||
          (StringEndsWith(scopePrefix, "/"_ns) &&
           StringBeginsWith(record->SerializedBaseURL(), scopePrefix))) {
        // 1. For each specifierKey → resolutionResult of scopeImports:
        for (auto iter = scopeImports->begin(); iter != scopeImports->end();) {
          const auto& specifierKey = iter->first;
          // 1. If specifierKey is record's specifier, or if all of the
          //    following conditions are true:
          //    - specifierKey ends with U+002F (/);
          //    - specifierKey is a code unit prefix of record's specifier;
          //    - either record's specifier as a URL is null or is special,
          if (specifierKey.Equals(record->NormalizedSpecifier()) ||
              (StringEndsWith(specifierKey, u"/"_ns) &&
               StringBeginsWith(record->NormalizedSpecifier(), specifierKey) &&
               (record->IsAsURLNull() || record->IsSpecialScheme()))) {
            LOG(
                ("ImportMap::Merge, scopes map: prefix:{%s}, specifier:{%s} "
                 "matches the resolved module specifier {%s} and will be "
                 "ignored",
                 scopePrefix.get(), NS_ConvertUTF16toUTF8(specifierKey).get(),
                 NS_ConvertUTF16toUTF8(record->NormalizedSpecifier()).get()));

            // 1. report warning
            aWarning.Report("ImportMapScopeEntryIgnored",
                            NS_ConvertUTF8toUTF16(scopePrefix), specifierKey,
                            record->NormalizedSpecifier());

            // 2. Remove scopeImports[specifierKey].
            iter = scopeImports->erase(iter);
          } else {
            ++iter;
          }
        }
      }
    }

    // 2. If scopePrefix exists in oldImportMap's scopes, then set
    //    oldImportMap's scopes[scopePrefix] to the result of merging module
    //    specifier maps, given scopeImports and oldImportMap's
    //    scopes[scopePrefix].
    auto scopeIter = oldMap->mScopes->find(scopePrefix);
    if ((scopeIter != oldMap->mScopes->end())) {
      UniquePtr<SpecifierMap> result = MergeSpecifierMaps(
          scopeImports.get(), scopeIter->second.get(), aWarning);
      MOZ_ASSERT(result);

      oldMap->mScopes->insert_or_assign(scopePrefix, std::move(result));
    } else {
      // 3. Otherwise, set oldImportMap's scopes[scopePrefix] to scopeImports.
      oldMap->mScopes->insert(
          std::make_pair(scopePrefix, std::move(scopeImports)));
    }
  }

  // 5. For each url → integrity of newImportMap's integrity:
  for (auto&& [url, integrity] : *aNewMap->mIntegrity) {
    // 1. If url exists in oldImportMap's integrity, then:
    auto it = oldMap->mIntegrity->find(url);
    if (it != oldMap->mIntegrity->end()) {
      LOG(
          ("ImportMap::Merge, integrity map: entry {%s} exists and will be "
           "ignored",
           url.get()));
      // 1. report warning
      aWarning.Report("ImportMapIntegrityEntryIgnored",
                      NS_ConvertUTF8toUTF16(url));

      // 2. Continue.
      continue;
    }

    // 2. Set oldImportMap's integrity[url] to integrity.
    oldMap->mIntegrity->insert(std::make_pair(url, integrity));
  }

  // 6. For each record of global's resolved module set:
  for (auto resolvedIter = aModuleLoader->GetResolvedModuleSet()->iter();
       !resolvedIter.done(); resolvedIter.next()) {
    const auto& record = resolvedIter.get();

    // 1. For each specifier → url of newImportMapImports:
    for (auto iter = newImports->begin(); iter != newImports->end();) {
      const auto& specifier = iter->first;

      // 1. If specifier starts with record's specifier, then:
      //   Impl note: See https://github.com/whatwg/html/issues/11875
      //   it should be:
      //   "1. If record's specifier starts with specifier"
      if (StringBeginsWith(record->NormalizedSpecifier(), specifier)) {
        LOG(
            ("ImportMap::Merge, imports map: specifier {%s} matches the "
             "resolved module specifier {%s} and will be ignored",
             NS_ConvertUTF16toUTF8(specifier).get(),
             NS_ConvertUTF16toUTF8(record->NormalizedSpecifier()).get()));
        // 1. report warning
        aWarning.Report("ImportMapImportsEntryIgnored", specifier,
                        record->NormalizedSpecifier());

        // 2. Remove newImportMapImports[specifier].
        iter = newImports->erase(iter);
      } else {
        ++iter;
      }
    }
  }

  // 7. Set oldImportMap's imports to the result of merge module specifier maps,
  //  given newImportMapImports and oldImportMap's imports.
  UniquePtr<SpecifierMap> result =
      MergeSpecifierMaps(newImports.get(), oldMap->mImports.get(), aWarning);
  MOZ_ASSERT(result);

  oldMap->mImports = std::move(result);
}

// https://html.spec.whatwg.org/multipage/webappapis.html#resolving-an-imports-match
static mozilla::Result<nsCOMPtr<nsIURI>, ResolveError> ResolveImportsMatch(
    nsString& aNormalizedSpecifier, nsIURI* aAsURL,
    const SpecifierMap* aSpecifierMap) {
  // Step 1. For each specifierKey → resolutionResult of specifierMap,
  for (auto&& [specifierKey, resolutionResult] : *aSpecifierMap) {
    // Step 1.1. If specifierKey is normalizedSpecifier, then:
    if (specifierKey.Equals(aNormalizedSpecifier)) {
      // Step 1.1.1. If resolutionResult is null, then throw a TypeError
      // indicating that resolution of specifierKey was blocked by a null entry.
      // This will terminate the entire resolve a module specifier algorithm,
      // without any further fallbacks.
      if (!resolutionResult) {
        LOG(
            ("ImportMap::ResolveImportsMatch normalizedSpecifier: %s, "
             "specifierKey: %s, but resolution is null.",
             NS_ConvertUTF16toUTF8(aNormalizedSpecifier).get(),
             NS_ConvertUTF16toUTF8(specifierKey).get()));
        return Err(ResolveError::BlockedByNullEntry);
      }

      // Step 1.1.2. Assert: resolutionResult is a URL.
      MOZ_ASSERT(resolutionResult);

      // Step 1.1.3. Return resolutionResult.
      return resolutionResult;
    }

    // Step 1.2. If all of the following are true:
    // specifierKey ends with U+002F (/),
    // specifierKey is a code unit prefix of normalizedSpecifier, and
    // either asURL is null, or asURL is special
    if (StringEndsWith(specifierKey, u"/"_ns) &&
        StringBeginsWith(aNormalizedSpecifier, specifierKey) &&
        (!aAsURL || IsSpecialScheme(aAsURL))) {
      // Step 1.2.1. If resolutionResult is null, then throw a TypeError
      // indicating that resolution of specifierKey was blocked by a null entry.
      // This will terminate the entire resolve a module specifier algorithm,
      // without any further fallbacks.
      if (!resolutionResult) {
        LOG(
            ("ImportMap::ResolveImportsMatch normalizedSpecifier: %s, "
             "specifierKey: %s, but resolution is null.",
             NS_ConvertUTF16toUTF8(aNormalizedSpecifier).get(),
             NS_ConvertUTF16toUTF8(specifierKey).get()));
        return Err(ResolveError::BlockedByNullEntry);
      }

      // Step 1.2.2. Assert: resolutionResult is a URL.
      MOZ_ASSERT(resolutionResult);

      // Step 1.2.3. Let afterPrefix be the portion of normalizedSpecifier after
      // the initial specifierKey prefix.
      nsAutoString afterPrefix(
          Substring(aNormalizedSpecifier, specifierKey.Length()));

      // Step 1.2.4. Assert: resolutionResult, serialized, ends with U+002F (/),
      // as enforced during parsing
      MOZ_ASSERT(StringEndsWith(resolutionResult->GetSpecOrDefault(), "/"_ns));

      // Step 1.2.5. Let url be the result of URL parsing afterPrefix with
      // resolutionResult.
      nsCOMPtr<nsIURI> url;
      nsresult rv = NS_NewURI(getter_AddRefs(url), afterPrefix, nullptr,
                              resolutionResult);

      // Step 1.2.6. If url is failure, then throw a TypeError indicating that
      // resolution of normalizedSpecifier was blocked since the afterPrefix
      // portion could not be URL-parsed relative to the resolutionResult mapped
      // to by the specifierKey prefix.
      //
      // This will terminate the entire resolve a module specifier algorithm,
      // without any further fallbacks.
      if (NS_FAILED(rv)) {
        LOG(
            ("ImportMap::ResolveImportsMatch normalizedSpecifier: %s, "
             "specifierKey: %s, resolutionResult: %s, afterPrefix: %s, "
             "but URL is not parsable.",
             NS_ConvertUTF16toUTF8(aNormalizedSpecifier).get(),
             NS_ConvertUTF16toUTF8(specifierKey).get(),
             resolutionResult->GetSpecOrDefault().get(),
             NS_ConvertUTF16toUTF8(afterPrefix).get()));
        return Err(ResolveError::BlockedByAfterPrefix);
      }

      // Step 1.2.7. Assert: url is a URL.
      MOZ_ASSERT(url);

      // Step 1.2.8. If the serialization of resolutionResult is not a code unit
      // prefix of the serialization of url, then throw a TypeError indicating
      // that resolution of normalizedSpecifier was blocked due to it
      // backtracking above its prefix specifierKey.
      //
      // This will terminate the entire resolve a module specifier algorithm,
      // without any further fallbacks.
      if (!StringBeginsWith(url->GetSpecOrDefault(),
                            resolutionResult->GetSpecOrDefault())) {
        LOG(
            ("ImportMap::ResolveImportsMatch normalizedSpecifier: %s, "
             "specifierKey: %s, "
             "url %s does not start with resolutionResult %s.",
             NS_ConvertUTF16toUTF8(aNormalizedSpecifier).get(),
             NS_ConvertUTF16toUTF8(specifierKey).get(),
             url->GetSpecOrDefault().get(),
             resolutionResult->GetSpecOrDefault().get()));
        return Err(ResolveError::BlockedByBacktrackingPrefix);
      }

      // Step 1.2.9. Return url.
      return std::move(url);
    }
  }

  // Step 2. Return null.
  return nsCOMPtr<nsIURI>(nullptr);
}

static UniquePtr<SpecifierResolutionRecord> CreateResolutionRecord(
    ScriptLoaderInterface* aLoader, nsCString& aSerializedBaseURL,
    nsString& aNormalizedSpecifier, nsIURI* aAsURL, nsIURI* aResult) {
  bool isURLLike = !!aAsURL;
  bool isSpecial = aAsURL ? IsSpecialScheme(aAsURL) : false;

  return mozilla::MakeUnique<SpecifierResolutionRecord>(
      aSerializedBaseURL, aNormalizedSpecifier, aResult, isURLLike, isSpecial);
}

// https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier
// static
ResolveResult ImportMap::ResolveModuleSpecifier(ImportMap* aImportMap,
                                                ScriptLoaderInterface* aLoader,
                                                ScriptFetchInfo* aFetchInfo,
                                                const nsAString& aSpecifier) {
  nsCOMPtr<nsIURI> baseURL;
  if (aFetchInfo && !aFetchInfo->IsForEvent()) {
    baseURL = aFetchInfo->BaseURL();
  } else {
    baseURL = aLoader->GetBaseURI();
  }

  // 6. Let serializedBaseURL be baseURL, serialized.
  nsCString serializedBaseURL = baseURL->GetSpecOrDefault();

  LOG(("ResolveModuleSpecifier baseURL:%s, specifier: %s",
       serializedBaseURL.get(), NS_ConvertUTF16toUTF8(aSpecifier).get()));

  // 7. Let asURL be the result of resolving a URL-like module specifier
  //    given specifier and baseURL.
  auto parseResult = ResolveURLLikeModuleSpecifier(aSpecifier, baseURL);
  nsCOMPtr<nsIURI> asURL;
  if (parseResult.isOk()) {
    asURL = parseResult.unwrap();
  }

  // 8. Let normalizedSpecifier be the serialization of asURL, if asURL
  //    is non-null; otherwise, specifier.
  nsAutoString normalizedSpecifier =
      asURL ? NS_ConvertUTF8toUTF16(asURL->GetSpecOrDefault())
            : nsAutoString{aSpecifier};

  // Step 9. Let result be a URL-or-null, initially null.
  nsCOMPtr<nsIURI> result;

  if (aImportMap) {
    // Step 10. For each scopePrefix → scopeImports of importMap’s scopes,
    for (auto&& [scopePrefix, scopeImports] : *aImportMap->mScopes) {
      // 1. If scopePrefix is serializedBaseURL, or if scopePrefix ends with
      //    U+002F (/) and scopePrefix is a code unit prefix of
      //    serializedBaseURL, then:
      if (scopePrefix.Equals(serializedBaseURL) ||
          (StringEndsWith(scopePrefix, "/"_ns) &&
           StringBeginsWith(serializedBaseURL, scopePrefix))) {
        // 1. Let scopeImportsMatch be the result of resolving an
        //    imports match given normalizedSpecifier, asURL, and scopeImports.
        auto resolveResult =
            ResolveImportsMatch(normalizedSpecifier, asURL, scopeImports.get());
        if (resolveResult.isErr()) {
          return resolveResult.propagateErr();
        }

        nsCOMPtr<nsIURI> scopeImportsMatch = resolveResult.unwrap();
        // 2. If scopeImportsMatch is not null, then set resolveResult to
        //    scopeImportsMatch, and break.
        if (scopeImportsMatch) {
          result = scopeImportsMatch;
          break;
        }
      }
    }

    // 11. If result is null, set result to the result of resolving an imports
    //     match given normalizedSpecifier, asURL, and importMap's imports.
    if (!result) {
      auto resolveResult = ResolveImportsMatch(normalizedSpecifier, asURL,
                                               aImportMap->mImports.get());
      if (resolveResult.isErr()) {
        return resolveResult.propagateErr();
      }

      result = resolveResult.unwrap();
    }
  }

  // 12. If result is null, set it to asURL.
  if (!result) {
    result = asURL;
  }

  // 13. If result is not null, then:
  if (result) {
    LOG(("ResolveModuleSpecifier returns result: %s",
         result->GetSpecOrDefault().get()));
    // 1. Add module to resolved module set given settingsObject,
    //    serializedBaseURL, normalizedSpecifier, and asURL.
    //
    // Impl note: Implemented in the caller(ModuleLoaderBase), as we need to
    // store the result if this resolution is for preload.

    // 2. Return result.
    return CreateResolutionRecord(aLoader, serializedBaseURL,
                                  normalizedSpecifier, asURL, result);
  }

  LOG(("ResolveModuleSpecifier failed to resolve specifier: %s",
       NS_ConvertUTF16toUTF8(aSpecifier).get()));

  // 14. Throw a TypeError indicating that specifier was a bare specifier,
  //     but was not remapped to anything by importMap.
  if (parseResult.unwrapErr() != ResolveError::FailureMayBeBare) {
    // We may have failed to parse a non-bare specifier for another reason.
    return Err(ResolveError::Failure);
  }

  return Err(ResolveError::InvalidBareSpecifier);
}

mozilla::Maybe<nsString> ImportMap::LookupIntegrity(ImportMap* aImportMap,
                                                    nsIURI* aURL) {
  auto it = aImportMap->mIntegrity->find(aURL->GetSpecOrDefault());
  if (it == aImportMap->mIntegrity->end()) {
    return mozilla::Nothing();
  }

  return mozilla::Some(it->second);
}

#undef LOG
#undef LOG_ENABLED
}  // namespace JS::loader
