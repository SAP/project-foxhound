/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GSettings.h"
#include "nsString.h"
#include "GRefPtr.h"
#include "nsCOMPtr.h"
#include "nsTArray.h"
#include "mozilla/ScopeExit.h"
#include "nsXULAppAPI.h"
#include <gio/gio.h>

namespace mozilla::widget::GSettings {

static bool SchemaExists(const nsCString& aSchema) {
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"
  const char* const* schemas = g_settings_list_schemas();
#pragma GCC diagnostic pop
  while (const char* cur = *schemas++) {
    if (aSchema.Equals(cur)) {
      return true;
    }
  }
  return false;
}

Collection::Collection(const nsCString& aSchema) {
  MOZ_DIAGNOSTIC_ASSERT(XRE_IsParentProcess());
  if (SchemaExists(aSchema)) {
    mSettings = dont_AddRef(g_settings_new(aSchema.get()));
    if (mSettings) {
      mKeys = g_settings_list_keys(mSettings);
    }
  }
}

Collection::~Collection() {
  if (mKeys) {
    g_strfreev(mKeys);
  }
}

bool Collection::HasKey(const nsCString& aKey) const {
  if (!mKeys) {
    return false;
  }
  char** it = mKeys;
  while (const char* cur = *it++) {
    if (aKey.Equals(cur)) {
      return true;
    }
  }
  return false;
}

RefPtr<GVariant> Collection::GetValue(const nsCString& aKey) const {
  if (!HasKey(aKey)) {
    return nullptr;
  }
  return dont_AddRef(g_settings_get_value(mSettings, aKey.get()));
}

bool Collection::SetString(const nsCString& aKey, const nsCString& aValue) {
  if (!HasKey(aKey)) {
    return false;
  }
  return g_settings_set_string(mSettings, aKey.get(), aValue.get());
}

bool Collection::GetString(const nsCString& aKey, nsACString& aResult) const {
  auto value = GetValue(aKey);
  if (!value) {
    return false;
  }
  if (!g_variant_is_of_type(value, G_VARIANT_TYPE_STRING) &&
      !g_variant_is_of_type(value, G_VARIANT_TYPE_OBJECT_PATH) &&
      !g_variant_is_of_type(value, G_VARIANT_TYPE_SIGNATURE)) {
    return false;
  }
  aResult.Assign(g_variant_get_string(value, nullptr));
  return true;
}

bool Collection::GetStringList(const nsCString& aKey,
                               nsTArray<nsCString>& aResult) const {
  auto value = GetValue(aKey);
  if (!value) {
    return false;
  }
  if (!g_variant_is_of_type(value, G_VARIANT_TYPE_STRING_ARRAY)) {
    return false;
  }
  gsize length = 0;
  const gchar** strings = g_variant_get_strv(value, &length);
  if (!strings) {
    return false;
  }
  auto _cleanup = MakeScopeExit([&] { g_free(strings); });
  aResult.SetCapacity(length);
  for (gsize i = 0; i < length; ++i) {
    aResult.AppendElement()->Assign(strings[i]);
  }
  return true;
}

Maybe<bool> Collection::GetBoolean(const nsCString& aKey) const {
  auto value = GetValue(aKey);
  if (!value) {
    return {};
  }
  if (!g_variant_is_of_type(value, G_VARIANT_TYPE_BOOLEAN)) {
    return {};
  }
  return Some(g_variant_get_boolean(value));
}

Maybe<int32_t> Collection::GetInt(const nsCString& aKey) const {
  auto value = GetValue(aKey);
  if (!value) {
    return {};
  }
  if (!g_variant_is_of_type(value, G_VARIANT_TYPE_INT32)) {
    return {};
  }
  return Some(g_variant_get_int32(value));
}

}  // namespace mozilla::widget::GSettings
