/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MAI_HYPERLINK_H_
#define MAI_HYPERLINK_H_

#include "nsMai.h"
#include "mozilla/a11y/Accessible.h"
#include "mozilla/a11y/LocalAccessible.h"
#include "mozilla/a11y/RemoteAccessible.h"
#include "nsDebug.h"

struct _AtkHyperlink;
typedef struct _AtkHyperlink AtkHyperlink;

namespace mozilla {
namespace a11y {

/*
 * MaiHyperlink is a auxiliary class for MaiInterfaceHyperText.
 */

class MaiHyperlink {
 public:
  explicit MaiHyperlink(Accessible* aHyperLink);
  ~MaiHyperlink();

 public:
  AtkHyperlink* GetAtkHyperlink() const { return mMaiAtkHyperlink; }
  Accessible* Acc() {
    if (!mHyperlink) {
      return nullptr;
    }
    NS_ASSERTION(mHyperlink->IsLink(), "Why isn't it a link!");
    return mHyperlink;
  }

 protected:
  Accessible* mHyperlink;
  AtkHyperlink* mMaiAtkHyperlink;
};

}  // namespace a11y
}  // namespace mozilla

#endif /* MAI_HYPERLINK_H_ */
