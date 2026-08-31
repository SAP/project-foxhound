/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/layers/TextureSourceProvider.h"
#include "mozilla/layers/TextureHost.h"
#include "mozilla/layers/PTextureParent.h"

namespace mozilla {
namespace layers {

TextureSourceProvider::~TextureSourceProvider() = default;

void TextureSourceProvider::Destroy() {}

}  // namespace layers
}  // namespace mozilla
