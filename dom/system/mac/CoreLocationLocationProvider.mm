/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CoreLocationLocationProvider.h"
#include "GeolocationPosition.h"
#include "MLSFallback.h"
#include "mozilla/FloatingPoint.h"
#include "mozilla/Logging.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/GeolocationPositionErrorBinding.h"
#include "mozilla/glean/DomGeolocationMetrics.h"
#include "nsCOMPtr.h"
#include "nsIConsoleService.h"
#include "nsServiceManagerUtils.h"
#include "prtime.h"

#include <CoreLocation/CLError.h>
#include <CoreLocation/CLLocation.h>
#include <CoreLocation/CLLocationManager.h>
#include <CoreLocation/CLLocationManagerDelegate.h>

#include <objc/objc-runtime.h>
#include <objc/objc.h>

#include "nsObjCExceptions.h"

using namespace mozilla;

#define kDefaultAccuracy kCLLocationAccuracyNearestTenMeters

static LazyLogModule gCoreLocationProviderLog("CoreLocation");
#define LOGD(...) \
  MOZ_LOG(gCoreLocationProviderLog, LogLevel::Debug, (__VA_ARGS__))
#define LOGI(...) \
  MOZ_LOG(gCoreLocationProviderLog, LogLevel::Info, (__VA_ARGS__))

static void LogLocationPermissionState() {
  CLAuthorizationStatus authStatus = [CLLocationManager authorizationStatus];
  const char* authStatusStr = "Unknown";
  switch (authStatus) {
    case kCLAuthorizationStatusNotDetermined:
      authStatusStr = "NotDetermined";
      break;
    case kCLAuthorizationStatusRestricted:
      authStatusStr = "Restricted";
      break;
    case kCLAuthorizationStatusDenied:
      authStatusStr = "Denied";
      break;
    case kCLAuthorizationStatusAuthorizedAlways:
      authStatusStr = "AuthorizedAlways";
      break;
    default:
      MOZ_ASSERT_UNREACHABLE("Unknown CLAuthorizationStatus");
      break;
  }

  LOGD("Authorization status: %s (code: %d)", authStatusStr, (int)authStatus);
}

@interface LocationDelegate : NSObject <CLLocationManagerDelegate> {
  CoreLocationLocationProvider* mProvider;
}

- (id)init:(CoreLocationLocationProvider*)aProvider;
- (void)locationManager:(CLLocationManager*)aManager
       didFailWithError:(NSError*)aError;
- (void)locationManager:(CLLocationManager*)aManager
     didUpdateLocations:(NSArray*)locations;
- (void)locationManagerDidChangeAuthorization:(CLLocationManager*)aManager;
- (void)locationManagerDidPauseLocationUpdates:(CLLocationManager*)aManager;
- (void)locationManagerDidResumeLocationUpdates:(CLLocationManager*)aManager;

@end

@implementation LocationDelegate
- (id)init:(CoreLocationLocationProvider*)aProvider {
  if ((self = [super init])) {
    mProvider = aProvider;
  }

  return self;
}

- (void)locationManager:(CLLocationManager*)aManager
       didFailWithError:(NSError*)aError {
  nsCOMPtr<nsIConsoleService> console =
      do_GetService(NS_CONSOLESERVICE_CONTRACTID);

  NS_ENSURE_TRUE_VOID(console);

  LogLocationPermissionState();

  if ([aError code] == kCLErrorLocationUnknown) {
    // The system will keep trying to get location.  See
    // https://developer.apple.com/documentation/corelocation/cllocationmanagerdelegate/locationmanager(_:didfailwitherror:)?language=objc#Discussion
    return;
  }

  NSString* message = [@"Failed to acquire position: "
      stringByAppendingString:[aError localizedDescription]];

  console->LogStringMessage(NS_ConvertUTF8toUTF16([message UTF8String]).get());
  LOGD("%s", [message UTF8String]);

  // Telemetry will store up to 16 different error codes.
  nsAutoCString errorCodeStr;
  errorCodeStr.AppendInt(static_cast<int32_t>([aError code]));
  glean::geolocation::macos_error_code.Get(errorCodeStr).Add();

  // The CL provider does not fallback to GeoIP, so use
  // NetworkGeolocationProvider for this. The concept here is: on error, hand
  // off geolocation to MLS, which will then report back a location or error.
  mProvider->CreateMLSFallbackProvider();
}

- (void)locationManager:(CLLocationManager*)aManager
     didUpdateLocations:(NSArray*)aLocations {
  if (aLocations.count < 1) {
    return;
  }

  mProvider->CancelMLSFallbackProvider();

  CLLocation* location = [aLocations objectAtIndex:0];

  double altitude;
  double altitudeAccuracy;

  // A negative verticalAccuracy indicates that the altitude value is invalid.
  if (location.verticalAccuracy >= 0) {
    altitude = location.altitude;
    altitudeAccuracy = location.verticalAccuracy;
  } else {
    altitude = UnspecifiedNaN<double>();
    altitudeAccuracy = UnspecifiedNaN<double>();
  }

  double speed =
      location.speed >= 0 ? location.speed : UnspecifiedNaN<double>();

  double heading =
      location.course >= 0 ? location.course : UnspecifiedNaN<double>();

  // nsGeoPositionCoords will convert NaNs to null for optional properties of
  // the JavaScript Coordinates object.
  nsCOMPtr<nsIDOMGeoPosition> geoPosition = new nsGeoPosition(
      location.coordinate.latitude, location.coordinate.longitude, altitude,
      location.horizontalAccuracy, altitudeAccuracy, heading, speed,
      PR_Now() / PR_USEC_PER_MSEC);

  if (!mProvider->IsEverUpdated()) {
    // Saw signal without MLS fallback
    glean::geolocation::fallback
        .EnumGet(glean::geolocation::FallbackLabel::eNone)
        .Add();
  }

  LOGD("Location updated.");
  mProvider->Update(geoPosition);
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager*)aManager {
  LOGD("Authorization changed");
  LogLocationPermissionState();
}

- (void)locationManagerDidPauseLocationUpdates:(CLLocationManager*)aManager {
  LOGD("Paused location updates");
}

- (void)locationManagerDidResumeLocationUpdates:(CLLocationManager*)aManager {
  LOGD("Resumed location updates");
}
@end

NS_IMPL_ISUPPORTS(CoreLocationLocationProvider::MLSUpdate,
                  nsIGeolocationUpdate);

CoreLocationLocationProvider::MLSUpdate::MLSUpdate(
    CoreLocationLocationProvider& parentProvider)
    : mParentLocationProvider(parentProvider) {}

NS_IMETHODIMP
CoreLocationLocationProvider::MLSUpdate::Update(nsIDOMGeoPosition* position) {
  nsCOMPtr<nsIDOMGeoPositionCoords> coords;
  position->GetCoords(getter_AddRefs(coords));
  if (!coords) {
    return NS_ERROR_FAILURE;
  }
  mParentLocationProvider.Update(position);
  return NS_OK;
}

NS_IMETHODIMP
CoreLocationLocationProvider::MLSUpdate::NotifyError(uint16_t error) {
  mParentLocationProvider.NotifyError(error);
  return NS_OK;
}

class CoreLocationObjects {
 public:
  nsresult Init(CoreLocationLocationProvider* aProvider) {
    mLocationManager = [[CLLocationManager alloc] init];
    NS_ENSURE_TRUE(mLocationManager, NS_ERROR_NOT_AVAILABLE);

    mLocationDelegate = [[LocationDelegate alloc] init:aProvider];
    NS_ENSURE_TRUE(mLocationDelegate, NS_ERROR_NOT_AVAILABLE);

    mLocationManager.desiredAccuracy = kDefaultAccuracy;
    mLocationManager.delegate = mLocationDelegate;

    return NS_OK;
  }

  ~CoreLocationObjects() {
    if (mLocationManager) {
      [mLocationManager release];
    }

    if (mLocationDelegate) {
      [mLocationDelegate release];
    }
  }

  LocationDelegate* mLocationDelegate;
  CLLocationManager* mLocationManager;
};

NS_IMPL_ISUPPORTS(CoreLocationLocationProvider, nsIGeolocationProvider)

CoreLocationLocationProvider::CoreLocationLocationProvider()
    : mCLObjects(nullptr), mMLSFallbackProvider(nullptr) {}

NS_IMETHODIMP
CoreLocationLocationProvider::Startup() {
  if (!mCLObjects) {
    auto clObjs = MakeUnique<CoreLocationObjects>();

    nsresult rv = clObjs->Init(this);
    NS_ENSURE_SUCCESS(rv, rv);

    mCLObjects = clObjs.release();
  }

  // Must be stopped before starting or response (success or failure) is not
  // guaranteed
  [mCLObjects->mLocationManager stopUpdatingLocation];
  [mCLObjects->mLocationManager startUpdatingLocation];
  glean::geolocation::geolocation_service
      .EnumGet(glean::geolocation::GeolocationServiceLabel::eSystem)
      .Add();
  LOGI("CoreLocationLocationProvider requested location updates.");
  return NS_OK;
}

NS_IMETHODIMP
CoreLocationLocationProvider::Watch(nsIGeolocationUpdate* aCallback) {
  if (mCallback) {
    return NS_OK;
  }

  mCallback = aCallback;
  return NS_OK;
}

NS_IMETHODIMP
CoreLocationLocationProvider::Shutdown() {
  NS_ENSURE_STATE(mCLObjects);

  [mCLObjects->mLocationManager stopUpdatingLocation];

  delete mCLObjects;
  mCLObjects = nullptr;

  if (mMLSFallbackProvider) {
    mMLSFallbackProvider->Shutdown(
        MLSFallback::ShutdownReason::ProviderShutdown);
    mMLSFallbackProvider = nullptr;
  }

  LOGI("CoreLocationLocationProvider stopped location updates.");
  return NS_OK;
}

NS_IMETHODIMP
CoreLocationLocationProvider::SetHighAccuracy(bool aEnable) {
  NS_ENSURE_STATE(mCLObjects);

  mCLObjects->mLocationManager.desiredAccuracy =
      aEnable ? kCLLocationAccuracyBest : kDefaultAccuracy;

  return NS_OK;
}

void CoreLocationLocationProvider::Update(nsIDOMGeoPosition* aSomewhere) {
  if (aSomewhere && mCallback) {
    mCallback->Update(aSomewhere);
  }
  mEverUpdated = true;
}
void CoreLocationLocationProvider::NotifyError(uint16_t aErrorCode) {
  nsCOMPtr<nsIGeolocationUpdate> callback(mCallback);
  callback->NotifyError(aErrorCode);
}
void CoreLocationLocationProvider::CreateMLSFallbackProvider() {
  if (mMLSFallbackProvider) {
    return;
  }

  mMLSFallbackProvider = new MLSFallback(0);
  mMLSFallbackProvider->Startup(new MLSUpdate(*this));
}

void CoreLocationLocationProvider::CancelMLSFallbackProvider() {
  if (!mMLSFallbackProvider) {
    return;
  }

  mMLSFallbackProvider->Shutdown(
      MLSFallback::ShutdownReason::ProviderResponded);
  mMLSFallbackProvider = nullptr;
}
