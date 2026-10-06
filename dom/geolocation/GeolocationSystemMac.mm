/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#import <AppKit/AppKit.h>
#include <CoreLocation/CLError.h>
#include <CoreLocation/CLLocation.h>
#include <CoreLocation/CLLocationManager.h>
#include <CoreLocation/CLLocationManagerDelegate.h>

#include "GeolocationSystem.h"
#include "mozilla/Components.h"
#include "mozilla/StaticPrefs_geo.h"
#include "mozilla/WeakPtr.h"
#include "mozilla/dom/BrowsingContext.h"
#include "nsIGeolocationUIUtils.h"

extern mozilla::LazyLogModule gGeolocationLog;

#define LOGD(...) \
  MOZ_LOG(gGeolocationLog, mozilla::LogLevel::Debug, (__VA_ARGS__))
#define LOGI(...) \
  MOZ_LOG(gGeolocationLog, mozilla::LogLevel::Info, (__VA_ARGS__))
#define LOGE(...) \
  MOZ_LOG(gGeolocationLog, mozilla::LogLevel::Error, (__VA_ARGS__))

namespace mozilla::dom::geolocation {
class MacGeolocationPermissionRequest;
}

@interface LocationPermissionDelegate : NSObject <CLLocationManagerDelegate> {
 @private
  mozilla::WeakPtr<mozilla::dom::geolocation::MacGeolocationPermissionRequest>
      mRequest;
}
- (id)initWithRequest:
    (mozilla::WeakPtr<
        mozilla::dom::geolocation::MacGeolocationPermissionRequest>)aRequest;
- (void)locationManagerDidChangeAuthorization:(CLLocationManager*)manager;
@end

namespace mozilla::dom::geolocation {

class MacGeolocationPermissionRequest final
    : public SystemGeolocationPermissionRequest,
      public SupportsWeakPtr {
 public:
  NS_INLINE_DECL_REFCOUNTING(MacGeolocationPermissionRequest, override);

  explicit MacGeolocationPermissionRequest(BrowsingContext* aBrowsingContext)
      : mBrowsingContext(aBrowsingContext) {}

  void Init(ParentRequestResolver&& aResolver, bool aSystemWillPrompt) {
    if (@available(macOS 11.0, *)) {
      mLocationManager = [[CLLocationManager alloc] init];
      if (!mLocationManager) {
        aResolver(GeolocationPermissionStatus::Error);
        return;
      }

      // Listen for permission changes.
      mLocationManager.delegate =
          [[LocationPermissionDelegate alloc] initWithRequest:WeakPtr(this)];
      if (!mLocationManager.delegate) {
        [mLocationManager release];
        mLocationManager = nil;
        aResolver(GeolocationPermissionStatus::Error);
        return;
      }

      if (aSystemWillPrompt) {
        // The system prompt will change permission from NotDetermined to
        // Allowed or Denied.  We want to abort the UI, regardless.
        mShouldDismissUI = true;

        // Issue request that will query the user.
        if (@available(macOS 15.0, *)) {
          LOGD("%s | requestWhenInUseAuthorization", __func__);
          [mLocationManager requestWhenInUseAuthorization];
        } else {
          // On earlier versions of MacOS, we need to start a location
          // listener, but we can stop listening for location as soon as we get
          // one.  We would eventually do this anyway in the CoreLocation
          // provider -- we do this now so we can wait for the permission to be
          // granted first.
          LOGD("%s | startUpdatingLocation", __func__);
          [mLocationManager startUpdatingLocation];
        }
      } else {
        LOGI("%s | Opening system geolocation settings", __func__);
        // We only stop the UI if the user grants permission in MacOS or
        // presses Cancel in our dialog.  Ignore any setting to
        // PermissionDenied -- keep waiting in that case.
        mShouldDismissUI = false;

        // Open system geolocation settings.
        NSURL* url = [NSURL
            URLWithString:@"x-apple.systempreferences:com.apple.preference."
                          @"security?Privacy_LocationServices"];
        [[NSWorkspace sharedWorkspace] openURL:url];
      }

      mResolver = std::move(aResolver);
      mIsRunning = true;
      return;
    }

    aResolver(GeolocationPermissionStatus::Error);
  }

  // Stop will be called when we get a locationManagerDidChangeAuthorization
  // with a useful auth value (granted or not), or when the user presses cancel.
  void Stop() override {
    MOZ_ASSERT(NS_IsMainThread());
    if (!mIsRunning) {
      return;
    }
    mIsRunning = false;

    if (PermissionIsGranted()) {
      LOGI("%s | Resolving permission granted", __func__);
      mResolver(GeolocationPermissionStatus::Granted);
    } else {
      // Denied or Restricted or NotDetermined (so the user pressed cancel).
      LOGI("%s | Resolving permission canceled", __func__);
      mResolver(GeolocationPermissionStatus::Canceled);
    }

    MOZ_ASSERT(mLocationManager);
    if (!@available(macOS 15.0, *)) {
      if (mShouldDismissUI) {
        [mLocationManager stopUpdatingLocation];
      }
    }
    if (mLocationManager) {
      if (mLocationManager.delegate) {
        [mLocationManager.delegate release];
        mLocationManager.delegate = nil;
      }
      [mLocationManager release];
      mLocationManager = nil;
    }

    DismissPrompt();
  }

  bool IsStopped() { return !mIsRunning; }

  bool PermissionIsGranted() {
    return GetAuthorizationStatus() == kCLAuthorizationStatusAuthorized;
  }

  bool PermissionChangeDismissesUI() {
    return PermissionIsGranted() ||
           (mShouldDismissUI &&
            GetAuthorizationStatus() == kCLAuthorizationStatusDenied);
  }

 protected:
  virtual ~MacGeolocationPermissionRequest() { Stop(); }

  nsresult DismissPrompt() {
    nsresult rv;
    nsCOMPtr<nsIGeolocationUIUtils> utils =
        do_GetService("@mozilla.org/geolocation/ui-utils;1", &rv);
    NS_ENSURE_SUCCESS(rv, rv);
    return utils->DismissPrompts(mBrowsingContext);
  }

  CLAuthorizationStatus GetAuthorizationStatus() {
    MOZ_ASSERT(mLocationManager);
    if (@available(macOS 11.0, *)) {
      return [mLocationManager authorizationStatus];
    }
    MOZ_ASSERT_UNREACHABLE(
        "Should not request authorization status on MacOS 10.15");
    return kCLAuthorizationStatusAuthorized;
  }

  ParentRequestResolver mResolver;
  RefPtr<BrowsingContext> mBrowsingContext;
  CLLocationManager* mLocationManager = nil;
  bool mShouldDismissUI = false;
  bool mIsRunning = false;
};

SystemGeolocationPermissionBehavior GetGeolocationPermissionBehavior() {
  if (@available(macOS 11.0, *)) {
    CLLocationManager* locationManager = [[CLLocationManager alloc] init];
    NS_ENSURE_TRUE(locationManager,
                   SystemGeolocationPermissionBehavior::NoPrompt);
    CLAuthorizationStatus authStatus = [locationManager authorizationStatus];
    [locationManager release];

    switch (authStatus) {
      case kCLAuthorizationStatusDenied:
        // The user has turned off geolocation but has asked us to grant it to
        // the web page.  We ask the user ourselves, since the system may not
        // if it feels that would be intrusive.  We know it isn't an intrusion,
        // since they asked for it.
        LOGI("%s | kCLAuthorizationStatusDenied.  GeckoWillPromptUser.",
             __func__);
        return SystemGeolocationPermissionBehavior::GeckoWillPromptUser;
      case kCLAuthorizationStatusNotDetermined:
        // The system says that it will ask the user if they want to give us
        // permission, but it often doesn't.  We think this behavior is due to
        // throttling that MacOS does to prevent the app spamming the user
        // with requests -- it seems to return this value even when it plans
        // to throttle.  Ideally, we would be returning SystemWillPromptUser.
        // If we return GeckoWillPromptUser instead, we end up spamming users
        // with the permissions prompt, despite them having permanently
        // granted site permission.  This is because system permissions are
        // normally required for geolocation, so we still need to ask for them,
        // despite site permissions.  Additionally, the additional information
        // would probably be wrong as this error is returned for users with
        // location permission already enabled in MacOS.  For these reasons,
        // when we get this error, we give up and silently leave setting
        // correct system permissions to the user.
        // NB: Because of this behavior, if the
        // kCLAuthorizationStatusNotDetermined error persists then
        // we will soon resort to the network geolocation fallback.  That
        // will not happen for other errors.
        LOGI("%s | kCLAuthorizationStatusNotDetermined.  SystemWillPromptUser "
             "overridden as NoPrompt.",
             __func__);
        return SystemGeolocationPermissionBehavior::NoPrompt;
      case kCLAuthorizationStatusAuthorized:
        // Authorized is used by older versions of MacOS that we still support
        // but is deprecated in newer versions.  AuthorizedAlways is for mobile
        // and Mac Catalyst.  They both represent the same number (3), so they
        // can't both be listed here, but we do mean to match both of them.
        // case kCLAuthorizationStatusAuthorizedAlways:
        LOGI("%s | kCLAuthorizationStatusAuthorized.  NoPrompt.", __func__);
        return SystemGeolocationPermissionBehavior::NoPrompt;
      case kCLAuthorizationStatusRestricted:
        // Geolocation permission is deactivated by a policy of some kind.  We
        // can't help the user enable geolocation permissions by just opening
        // settings.  If the user still wants to activate geolocation, they
        // will be on their own.
        [[fallthrough]];
      default:
        LOGI("%s | status = %u.  NoPrompt.", __func__,
             static_cast<uint32_t>(authStatus));
        return SystemGeolocationPermissionBehavior::NoPrompt;
    }
  } else {
    // We don't have [CLLocationManager authorizationStatus].  We show no
    // prompts since we don't know whether permission is already granted or
    // not.
    return SystemGeolocationPermissionBehavior::NoPrompt;
  }
}

already_AddRefed<SystemGeolocationPermissionRequest>
RequestLocationPermissionFromUser(BrowsingContext* aBrowsingContext,
                                  ParentRequestResolver&& aResolver) {
  auto permission = GetGeolocationPermissionBehavior();
  if (permission == SystemGeolocationPermissionBehavior::NoPrompt) {
    // We unexpectedly got permission somehow.  Nothing to do.
    aResolver(GeolocationPermissionStatus::Granted);
    return nullptr;
  }
  RefPtr<MacGeolocationPermissionRequest> permissionRequest =
      new MacGeolocationPermissionRequest(aBrowsingContext);
  permissionRequest->Init(
      std::move(aResolver),
      permission == SystemGeolocationPermissionBehavior::SystemWillPromptUser);
  if (permissionRequest->IsStopped()) {
    return nullptr;
  }
  return permissionRequest.forget();
}

}  // namespace mozilla::dom::geolocation

@implementation LocationPermissionDelegate

- (id)initWithRequest:
    (mozilla::WeakPtr<
        mozilla::dom::geolocation::MacGeolocationPermissionRequest>)aRequest {
  if ((self = [super init])) {
    mRequest = aRequest;
  }
  return self;
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager*)aManager {
  RefPtr<mozilla::dom::geolocation::MacGeolocationPermissionRequest> request(
      mRequest);
  // We only stop on auth change if the change is to grant permission.
  // Otherwise, we wait for the user to press cancel.
  if (request && request->PermissionChangeDismissesUI()) {
    request->Stop();
  }
}

- (void)locationManager:(CLLocationManager*)aManager
     didUpdateLocations:(NSArray<CLLocation*>*)aLocations {
  // Assume the system has processed the permissions dialog by now.
  [aManager stopUpdatingLocation];
}

- (void)locationManager:(CLLocationManager*)aManager
       didFailWithError:(NSError*)aError {
  // Assume the system has processed the permissions dialog by now.
  [aManager stopUpdatingLocation];
}
@end

#undef LOGD
#undef LOGI
#undef LOGE
