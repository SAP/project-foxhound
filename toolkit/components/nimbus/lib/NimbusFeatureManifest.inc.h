/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TOOLKIT_COMPONENTS_NIMBUS_LIB_NIMBUSFEATUREMANIFEST_INC_H_
#define TOOLKIT_COMPONENTS_NIMBUS_LIB_NIMBUSFEATUREMANIFEST_INC_H_

Maybe<nsCString> GetNimbusFallbackPrefName(const nsACString& aFeatureId,
                                           const nsACString& aVariable) {
  nsAutoCString manifestKey;
  manifestKey.Append(aFeatureId);
  manifestKey.Append("_");
  manifestKey.Append(aVariable);

  for (const auto& pair : NIMBUS_FALLBACK_PREFS) {
    if (pair.first.Equals(manifestKey.get())) {
      return Some(pair.second);
    }
  }
  return Nothing{};
}

#endif  // TOOLKIT_COMPONENTS_NIMBUS_LIB_NIMBUSFEATUREMANIFEST_INC_H_
