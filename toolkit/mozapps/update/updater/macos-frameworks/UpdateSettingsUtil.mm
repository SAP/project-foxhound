/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#import "UpdateSettings/UpdateSettings.h"

#include "UpdateSettingsUtil.h"

/* static */
std::optional<std::string> UpdateSettingsUtil::GetAcceptedMARChannelsValue() {
  // `UpdateSettingsGetAcceptedMARChannels` is resolved at runtime and requires
  // the UpdateSettings framework to be loaded.
  if (UpdateSettingsGetAcceptedMARChannels) {
    NSString* marChannels = UpdateSettingsGetAcceptedMARChannels();
    return [marChannels UTF8String];
  }
  return {};
}
