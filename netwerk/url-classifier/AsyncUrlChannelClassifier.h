/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_AsyncUrlChannelClassifier_h
#define mozilla_net_AsyncUrlChannelClassifier_h

#include "nsISupports.h"
#include <functional>

class nsIChannel;

namespace mozilla {
namespace net {

class AsyncUrlChannelClassifier final {
 public:
  // Warm up the classifier, i.e. launch the classifier thread and load the DB.
  static void WarmUp();

  static nsresult CheckChannel(nsIChannel* aChannel,
                               std::function<void()>&& aCallback);
};

class AntiTrackingChannelClassifierUtils final {
  static nsresult CheckChannelHelper(nsIChannel* aChannel,
                                     std::function<void()>&& aCallback,
                                     bool aPerformAnnotations,
                                     bool aPerformBlocking);

 public:
  static nsresult CheckChannelBeforeBeginConnect(
      nsIChannel* aChannel, std::function<void()>&& aCallback);
  static nsresult CheckChannelBeforeProcessResponse(
      nsIChannel* aChannel, std::function<void()>&& aCallback);
};

}  // namespace net
}  // namespace mozilla

#endif  // mozilla_net_AsyncUrlChannelClassifier_h
