/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#import <ChannelPrefs/ChannelPrefs.h>

#include "ChannelPrefsUtil.h"

#include "nsCocoaUtils.h"

/* static */
bool ChannelPrefsUtil::GetChannelPrefValue(nsACString& aValue) {
  // `ChannelPrefsGetChannel` is resolved at runtime and requires
  // the ChannelPrefs framework to be loaded.
  if (ChannelPrefsGetChannel) {
    nsAutoString value;
    nsCocoaUtils::GetStringForNSString(ChannelPrefsGetChannel(), value);
    CopyUTF16toUTF8(value, aValue);
    return true;
  }

  return false;
}
