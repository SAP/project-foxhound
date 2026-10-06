/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TOOLKIT_COMPONENTS_MOZINTL_MOZINTLHELPER_H_
#define TOOLKIT_COMPONENTS_MOZINTL_MOZINTLHELPER_H_

#include "mozIMozIntlHelper.h"

namespace mozilla {

class MozIntlHelper final : public mozIMozIntlHelper {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_MOZIMOZINTLHELPER

  MozIntlHelper();

 private:
  ~MozIntlHelper() = default;
};

}  // namespace mozilla

#endif  // TOOLKIT_COMPONENTS_MOZINTL_MOZINTLHELPER_H_
