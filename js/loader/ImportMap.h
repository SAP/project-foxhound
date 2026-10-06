/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef js_loader_ImportMap_h
#define js_loader_ImportMap_h

#include <functional>
#include <map>

#include "js/SourceText.h"
#include "mozilla/Logging.h"
#include "mozilla/RefPtr.h"
#include "mozilla/UniquePtr.h"
#include "nsStringFwd.h"
#include "nsTArray.h"
#include "ResolveResult.h"

struct JSContext;
class nsIScriptElement;
class nsIURI;

namespace JS::loader {
class ModuleLoaderBase;
class ScriptFetchInfo;
class ScriptLoadRequest;
class ScriptLoaderInterface;

/**
 * A helper class to report warning to ScriptLoaderInterface.
 */
class ReportWarningHelper {
 public:
  ReportWarningHelper(ScriptLoaderInterface* aLoader,
                      ScriptLoadRequest* aRequest)
      : mLoader(aLoader), mRequest(aRequest) {}

  template <typename... Args>
  void Report(const char* aMessageName, Args&&... aArgs) const;

 private:
  RefPtr<ScriptLoaderInterface> mLoader;
  ScriptLoadRequest* mRequest;
};

// Specifier map from import maps.
// https://html.spec.whatwg.org/multipage/webappapis.html#module-specifier-map
using SpecifierMap =
    std::map<nsString, nsCOMPtr<nsIURI>, std::greater<nsString>>;

// Scope map from import maps.
// https://html.spec.whatwg.org/multipage/webappapis.html#concept-import-map-scopes
using ScopeMap = std::map<nsCString, mozilla::UniquePtr<SpecifierMap>,
                          std::greater<nsCString>>;

// Integrity map from import maps.
// https://html.spec.whatwg.org/multipage/webappapis.html#concept-import-map-integrity
using IntegrityMap = std::map<nsCString, nsString, std::greater<nsCString>>;

/**
 * Implementation of Import maps.
 * https://html.spec.whatwg.org/multipage/webappapis.html#import-maps
 */
class ImportMap {
 public:
  ImportMap(mozilla::UniquePtr<SpecifierMap> aImports,
            mozilla::UniquePtr<ScopeMap> aScopes,
            mozilla::UniquePtr<IntegrityMap> aIntegrity)
      : mImports(aImports ? std::move(aImports)
                          : mozilla::MakeUnique<SpecifierMap>()),
        mScopes(aScopes ? std::move(aScopes) : mozilla::MakeUnique<ScopeMap>()),
        mIntegrity(aIntegrity ? std::move(aIntegrity)
                              : mozilla::MakeUnique<IntegrityMap>()) {}

  static mozilla::UniquePtr<ImportMap> CreateEmpty() {
    return mozilla::MakeUnique<ImportMap>(nullptr, nullptr, nullptr);
  }

  /**
   * A helper function to get the "dom.multiple_import_maps.enabled" pref.
   * The pref's type is of non-atomic, which can be only accessed on the main
   * thread.
   * If this function is called from a non-main thread, it safely returns false.
   */
  static bool IsMultipleImportMapsSupported();

  /**
   * Parse the JSON string from the Import map script.
   * This function will throw a TypeError if there's any invalid key or value in
   * the JSON text according to the spec.
   *
   * https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string
   */
  static mozilla::UniquePtr<ImportMap> ParseString(
      JSContext* aCx, SourceText<char16_t>& aInput, nsIURI* aBaseURL,
      const ReportWarningHelper& aWarning);

  /**
   * This implements "Resolve a module specifier" algorithm defined in the
   * Import maps spec.
   *
   * See
   * https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier
   */
  static ResolveResult ResolveModuleSpecifier(ImportMap* aImportMap,
                                              ScriptLoaderInterface* aLoader,
                                              ScriptFetchInfo* aFetchInfo,
                                              const nsAString& aSpecifier);

  static mozilla::Maybe<nsString> LookupIntegrity(ImportMap* aImportMap,
                                                  nsIURI* aURL);

  /**
   * Merge the new import map with the existing one.
   *
   * https://html.spec.whatwg.org/#merge-existing-and-new-import-maps
   */
  static void Merge(ModuleLoaderBase* aModuleLoader,
                    mozilla::UniquePtr<ImportMap> aNewMap,
                    const ReportWarningHelper& aWarning);

  // Logging
  static mozilla::LazyLogModule gImportMapLog;

 private:
  /**
   * https://html.spec.whatwg.org/multipage/webappapis.html#import-map-processing-model
   *
   * Formally, an import map is a struct with three items:
   * 1. imports, a module specifier map, and
   * 2. scopes, an ordered map of URLs to module specifier maps.
   * 3. integrity, a module integrity map.
   */
  mozilla::UniquePtr<SpecifierMap> mImports;
  mozilla::UniquePtr<ScopeMap> mScopes;
  mozilla::UniquePtr<IntegrityMap> mIntegrity;
};

}  // namespace JS::loader

#endif  // js_loader_ImportMap_h
