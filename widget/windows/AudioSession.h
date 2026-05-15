/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef WIDGET_WINDOWS_AUDIOSESSION_H_
#define WIDGET_WINDOWS_AUDIOSESSION_H_

#include "nsString.h"

namespace mozilla {
namespace widget {

// Create the audio session.  Must only be called in the main (parent) process.
void CreateAudioSession();

// Destroy the audio session.  Must only be called in the main (parent)
// process and during app shutdown.
void DestroyAudioSession();

}  // namespace widget
}  // namespace mozilla

#endif  // WIDGET_WINDOWS_AUDIOSESSION_H_
