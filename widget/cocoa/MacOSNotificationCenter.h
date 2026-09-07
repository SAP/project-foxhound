/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MacOSNotificationCenter_h
#define MacOSNotificationCenter_h

#import <Foundation/Foundation.h>
#include "nsIAlertsService.h"
#include "nsTArray.h"
#include "mozilla/RefPtr.h"

// mozNotificationCenterDelegate is used to access the macOS notification
// center. It is not related to the DesktopNotificationCenter object, which was
// removed in bug 952453. While there are no direct references to this class
// elsewhere, removing this will cause push notifications on macOS to stop
// working.
@class mozNotificationCenterDelegate;

namespace mozilla {

class MacOSNotificationInfo;

class MacOSNotificationCenter : public nsIAlertsService,
                                public nsIAlertsDoNotDisturb {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIALERTSSERVICE
  NS_DECL_NSIALERTSDONOTDISTURB

  MacOSNotificationCenter();

  nsresult Init();
  void CloseAlertCocoaString(NSString* aAlertName);
  void OnActivate(NSString* aAlertName,
                  NSUserNotificationActivationType aActivationType,
                  NSUserNotificationAction* aAdditionalActivationAction);

 protected:
  virtual ~MacOSNotificationCenter();

 private:
  mozNotificationCenterDelegate* mDelegate;
  nsTArray<RefPtr<MacOSNotificationInfo> > mActiveAlerts;
  bool mSuppressForScreenSharing;
};

}  // namespace mozilla

#endif  // MacOSNotificationCenter_h
