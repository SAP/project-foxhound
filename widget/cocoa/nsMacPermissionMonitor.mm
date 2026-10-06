/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsMacPermissionMonitor.h"

#include <CoreLocation/CLError.h>
#include <CoreLocation/CLLocation.h>
#include <CoreLocation/CLLocationManager.h>
#include <CoreLocation/CLLocationManagerDelegate.h>

#include "nsAString.h"
#include "MainThreadUtils.h"
#include "mozilla/Services.h"
#include "nsIObserverService.h"

static auto* PERMISSION_CHANGED_TOPIC = "system-permission-changed";
static auto* GEOLOCATION_NAME = u"location";

@interface CLLMDelegate : NSObject <CLLocationManagerDelegate> {
 @private
  bool mWasGranted;
  bool mHasSentFirstNotification;
}
- (id)init;
- (void)commonLocationAuthorizationIsGranted:(bool)aPermissionIsGranted;
// For OS 11.0+
- (void)locationManagerDidChangeAuthorization:(CLLocationManager*)aManager;
// For OS 10.15.
- (void)locationManager:(CLLocationManager*)aManager
    didChangeAuthorizationStatus:(CLAuthorizationStatus)aStatus;
- (void)locationManager:(CLLocationManager*)aManager
       didFailWithError:(NSError*)aError;
@end

NS_IMPL_ISUPPORTS(nsMacPermissionMonitor, nsIPermissionMonitor)

static bool StatusIsGranted(CLAuthorizationStatus aStatus) {
  return aStatus == kCLAuthorizationStatusAuthorizedAlways;
}

nsMacPermissionMonitor::~nsMacPermissionMonitor() {
  if (mLocationManager) {
    if (mLocationManager.delegate) {
      [mLocationManager.delegate release];
      mLocationManager.delegate = nil;
    }
    [mLocationManager release];
  }
}

nsresult nsMacPermissionMonitor::StartMonitoring(
    const nsAString& aCapabilityName) {
  if (aCapabilityName != GEOLOCATION_NAME) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  if (mLocationManager) {
    // Already monitoring.
    return NS_OK;
  }

  mLocationManager = [[CLLocationManager alloc] init];
  if (!mLocationManager) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  // Listen for permission changes.
  mLocationManager.delegate = [[CLLMDelegate alloc] init];
  if (!mLocationManager.delegate) {
    [mLocationManager release];
    mLocationManager = nil;
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

@implementation CLLMDelegate

- (id)init {
  if ((self = [super init])) {
    mWasGranted = false;
    mHasSentFirstNotification = false;
  }
  return self;
}

- (void)commonLocationAuthorizationIsGranted:(bool)aPermissionIsGranted {
  if (aPermissionIsGranted != mWasGranted || !mHasSentFirstNotification) {
    nsCOMPtr<nsIObserverService> obs = mozilla::services::GetObserverService();
    NS_ENSURE_TRUE_VOID(obs);
    obs->NotifyObservers(nullptr, PERMISSION_CHANGED_TOPIC, GEOLOCATION_NAME);
    mWasGranted = aPermissionIsGranted;
  }
  mHasSentFirstNotification = true;
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager*)aManager {
  MOZ_ASSERT(NS_IsMainThread());
  if (@available(macOS 11.0, *)) {
    bool isGranted = StatusIsGranted([aManager authorizationStatus]);
    [self commonLocationAuthorizationIsGranted:isGranted];
    return;
  }
  MOZ_ASSERT_UNREACHABLE("This method is not called before MacOS 11");
}

- (void)locationManager:(CLLocationManager*)aManager
    didChangeAuthorizationStatus:(CLAuthorizationStatus)aStatus {
  MOZ_ASSERT(NS_IsMainThread());
  if (!@available(macOS 11.0, *)) {
    bool isGranted = StatusIsGranted(aStatus);
    [self commonLocationAuthorizationIsGranted:isGranted];
    return;
  }
  MOZ_ASSERT_UNREACHABLE("This method is not called after MacOS 10.15");
}

- (void)locationManager:(CLLocationManager*)aManager
       didFailWithError:(NSError*)aError {
  MOZ_ASSERT(NS_IsMainThread());
  if (aError.code == kCLErrorDenied) {
    [self commonLocationAuthorizationIsGranted:false];
  }
}
@end
