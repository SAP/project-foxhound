/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsHtml5Tokenizer.h"

int32_t nsHtml5Tokenizer::StateLoopFastestSIMD(int32_t state, char16_t c,
                                               int32_t pos, char16_t* buf,
                                               bool reconsume,
                                               int32_t returnState,
                                               int32_t endPos) {
  MOZ_RELEASE_ASSERT(false, "Inconsistent build config");
  return 0;
}

int32_t nsHtml5Tokenizer::StateLoopLineColSIMD(int32_t state, char16_t c,
                                               int32_t pos, char16_t* buf,
                                               bool reconsume,
                                               int32_t returnState,
                                               int32_t endPos) {
  MOZ_RELEASE_ASSERT(false, "Inconsistent build config");
  return 0;
}

int32_t nsHtml5Tokenizer::StateLoopViewSourceSIMD(int32_t state, char16_t c,
                                                  int32_t pos, char16_t* buf,
                                                  bool reconsume,
                                                  int32_t returnState,
                                                  int32_t endPos) {
  MOZ_RELEASE_ASSERT(false, "Inconsistent build config");
  return 0;
}
