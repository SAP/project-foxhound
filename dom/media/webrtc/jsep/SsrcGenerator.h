/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef SSRCGENERATOR_H_
#define SSRCGENERATOR_H_

#include <cstdint>
#include <set>

namespace mozilla {
class SsrcGenerator {
 public:
  bool GenerateSsrc(uint32_t* ssrc);

 private:
  std::set<uint32_t> mSsrcs;
};
}  // namespace mozilla

#endif  // SSRCGENERATOR_H_
