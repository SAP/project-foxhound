/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "HeadlessSound.h"

namespace mozilla {
namespace widget {

NS_IMPL_ISUPPORTS(HeadlessSound, nsISound)

HeadlessSound::HeadlessSound() = default;

HeadlessSound::~HeadlessSound() = default;

NS_IMETHODIMP
HeadlessSound::Init() { return NS_OK; }

NS_IMETHODIMP HeadlessSound::Beep() { return NS_OK; }

NS_IMETHODIMP HeadlessSound::PlayEventSound(uint32_t aEventId) { return NS_OK; }

}  // namespace widget
}  // namespace mozilla
