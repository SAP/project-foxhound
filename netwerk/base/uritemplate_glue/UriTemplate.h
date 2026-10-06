/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef UriTemplateGlue_h_
#define UriTemplateGlue_h_

#include "mozilla/net/uritemplate_glue.h"

namespace mozilla::net {

class UriTemplateWrapper final {
 public:
  static void Init(const nsACString& aInput, UriTemplateWrapper** aBuilder) {
    uri_template_new(&aInput,
                     (const mozilla::net::UriTemplateWrapper**)aBuilder);
  }

  nsresult Set(const nsACString& aName, const nsACString& aValue) {
    return uri_template_set(this, &aName, &aValue);
  }

  nsresult Set(const nsACString& aName, int32_t aValue) {
    return uri_template_set_int(this, &aName, aValue);
  }

  void Build(nsACString* aResult) { uri_template_build(this, aResult); }

  void AddRef() { uri_template_addref(this); }
  void Release() { uri_template_release(this); }

 private:
  UriTemplateWrapper() = delete;
  ~UriTemplateWrapper() = delete;
  UriTemplateWrapper(const UriTemplateWrapper&) = delete;
  UriTemplateWrapper& operator=(const UriTemplateWrapper&) = delete;
};

}  // namespace mozilla::net

#endif  // UriTemplateGlue_h_
