/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsSound.h"
#include "nsObjCExceptions.h"

#import <Cocoa/Cocoa.h>

NS_IMPL_ISUPPORTS(nsSound, nsISound)

nsSound::nsSound() {}

nsSound::~nsSound() {}

NS_IMETHODIMP
nsSound::Beep() {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  NSBeep();
  return NS_OK;

  NS_OBJC_END_TRY_BLOCK_RETURN(NS_ERROR_FAILURE);
}

NS_IMETHODIMP
nsSound::Init() { return NS_OK; }

NS_IMETHODIMP
nsSound::PlayEventSound(uint32_t aEventId) {
  // Mac doesn't have system sound settings for each user actions.
  return NS_OK;
}
