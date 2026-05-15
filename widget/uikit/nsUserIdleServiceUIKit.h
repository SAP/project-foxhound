/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:expandtab:shiftwidth=4:tabstop=4:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsUserIdleServiceUIKit_h_
#define nsUserIdleServiceUIKit_h_

#include "nsUserIdleService.h"
#include "mozilla/AppShutdown.h"

class nsUserIdleServiceUIKit : public nsUserIdleService {
 public:
  NS_INLINE_DECL_REFCOUNTING_INHERITED(nsUserIdleServiceUIKit,
                                       nsUserIdleService)

  bool PollIdleTime(uint32_t* aIdleTime) override;

  static already_AddRefed<nsUserIdleServiceUIKit> GetInstance() {
    RefPtr<nsUserIdleService> idleService = nsUserIdleService::GetInstance();
    if (!idleService) {
      // Avoid late instantiation or resurrection during shutdown.
      if (mozilla::AppShutdown::IsInOrBeyond(
              mozilla::ShutdownPhase::AppShutdownConfirmed)) {
        return nullptr;
      }
      idleService = new nsUserIdleServiceUIKit();
    }

    return idleService.forget().downcast<nsUserIdleServiceUIKit>();
  }

 protected:
  nsUserIdleServiceUIKit() {}
  virtual ~nsUserIdleServiceUIKit() {}
};

#endif  // nsUserIdleServiceUIKit_h_
