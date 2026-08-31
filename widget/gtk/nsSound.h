/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef _nsSound_h_
#define _nsSound_h_

#include "nsISound.h"

#include <gtk/gtk.h>

class nsSound : public nsISound {
 public:
  nsSound();

  static void Shutdown();
  static already_AddRefed<nsISound> GetInstance();

  NS_DECL_ISUPPORTS
  NS_DECL_NSISOUND

 private:
  virtual ~nsSound();

  bool mInited;
};

#endif /* _nsSound_h_ */
