/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Code for dealing with creating/deleting SoundTouch objects across DLL
// boundaries.

#include <soundtouch/STTypes.h>
#include <soundtouch/SoundTouch.h>
#include <soundtouch/RLBoxSoundTouchFactory.h>

extern "C" namespace soundtouch
{
soundtouch::SoundTouch*
createSoundTouchObj();

void
destroySoundTouchObj(soundtouch::SoundTouch* aObj);
}
