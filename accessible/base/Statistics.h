/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef A11Y_STATISTICS_H_
#define A11Y_STATISTICS_H_

#include "mozilla/glean/AccessibleMetrics.h"

namespace mozilla {
namespace a11y {
namespace statistics {

inline void A11yConsumers(uint32_t aConsumer) {
  glean::a11y::consumers.AccumulateSingleSample(aConsumer);
}

}  // namespace statistics
}  // namespace a11y
}  // namespace mozilla

#endif
