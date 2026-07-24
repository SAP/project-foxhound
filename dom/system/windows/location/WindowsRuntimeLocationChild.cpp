/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WindowsRuntimeLocationChild.h"

#include <windows.foundation.h>

#include "mozilla/dom/GeolocationPosition.h"
#include "mozilla/dom/GeolocationPositionErrorBinding.h"
#include "mozilla/glean/DomGeolocationMetrics.h"
#include "nsCOMPtr.h"
#include "nsIGeolocationProvider.h"
#include "prtime.h"

using namespace ABI::Windows::Devices::Geolocation;
using namespace ABI::Windows::Foundation;
using namespace Microsoft::WRL;
using namespace Microsoft::WRL::Wrappers;

using PositionChangedHandler =
    ITypedEventHandler<Geolocator*, PositionChangedEventArgs*>;
using StatusChangedHandler =
    ITypedEventHandler<Geolocator*, StatusChangedEventArgs*>;

namespace mozilla::dom {

extern LazyLogModule gWindowsLocationProviderLog;
#define LOGD(...) \
  MOZ_LOG(gWindowsLocationProviderLog, LogLevel::Debug, (__VA_ARGS__))
#define LOGI(...) \
  MOZ_LOG(gWindowsLocationProviderLog, LogLevel::Info, (__VA_ARGS__))

// Use string lookup since dual_labeled_counter does not yet support enums.
static void AddFailureTelemetry(const nsACString& aReason) {
  glean::geolocation::windows_failure.Get("winrt"_ns, aReason).Add();
}

HRESULT
WindowsRuntimeLocationChild::OnPositionChanged(
    const ComPtr<IGeolocator>& aGeolocator,
    const ComPtr<IPositionChangedEventArgs>& aArgs) {
  LOGD("WindowsRuntimeLocationChild::OnPositionChanged(%p)", this);

  ComPtr<IGeoposition> geoposition;
  HRESULT hr = aArgs->get_Position(&geoposition);
  if (FAILED(hr)) {
    return S_OK;
  }

  ComPtr<IGeocoordinate> coordinate;
  hr = geoposition->get_Coordinate(&coordinate);
  if (FAILED(hr)) {
    return S_OK;
  }

  ComPtr<IGeocoordinateWithPoint> coordinateWithPoint;
  hr = coordinate.As(&coordinateWithPoint);
  if (FAILED(hr)) {
    return S_OK;
  }

  ComPtr<IGeopoint> geopoint;
  hr = coordinateWithPoint->get_Point(&geopoint);
  if (FAILED(hr)) {
    return S_OK;
  }

  BasicGeoposition position;
  hr = geopoint->get_Position(&position);
  if (FAILED(hr)) {
    return S_OK;
  }

  double latitude = position.Latitude;
  double longitude = position.Longitude;
  double altitude = position.Altitude;

  double accuracy = [&] {
    DOUBLE value;
    if (SUCCEEDED(coordinate->get_Accuracy(&value))) {
      return value;
    }
    return UnspecifiedNaN<double>();
  }();

  double altitudeAccuracy = [&] {
    ComPtr<IReference<DOUBLE>> altitudeAccuracyRef;
    (void)coordinate->get_AltitudeAccuracy(&altitudeAccuracyRef);
    if (altitudeAccuracyRef) {
      DOUBLE value;
      if (SUCCEEDED(altitudeAccuracyRef->get_Value(&value))) {
        return value;
      }
    }
    return UnspecifiedNaN<double>();
  }();

  double heading = [&] {
    ComPtr<IReference<DOUBLE>> headingRef;
    (void)coordinate->get_Heading(&headingRef);
    if (headingRef) {
      DOUBLE value;
      if (SUCCEEDED(headingRef->get_Value(&value))) {
        return value;
      }
    }
    return UnspecifiedNaN<double>();
  }();

  double speed = [&] {
    ComPtr<IReference<DOUBLE>> speedRef;
    (void)coordinate->get_Speed(&speedRef);
    if (speedRef) {
      DOUBLE value;
      if (SUCCEEDED(speedRef->get_Value(&value))) {
        return value;
      }
    }
    return UnspecifiedNaN<double>();
  }();

  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "WindowsRuntimeLocationChild::OnPositionChanged",
      [self = RefPtr{this}, latitude, longitude, altitude, accuracy,
       altitudeAccuracy, heading, speed]() {
        // nsGeoPositionCoords will convert NaNs to null for optional properties
        // of the JavaScript Coordinates object.
        RefPtr<nsGeoPosition> geckoGeoPosition = new nsGeoPosition(
            latitude, longitude, altitude, accuracy, altitudeAccuracy, heading,
            speed, PR_Now() / PR_USEC_PER_MSEC);
        self->SendUpdate(geckoGeoPosition);
      }));

  return S_OK;
}

HRESULT
WindowsRuntimeLocationChild::OnStatusChanged(
    const ComPtr<IGeolocator>& aGeolocator,
    const ComPtr<IStatusChangedEventArgs>& aArgs) {
  PositionStatus status;
  HRESULT hr = aArgs->get_Status(&status);
  if (FAILED(hr)) {
    LOGD(
        "WindowsRuntimeLocationChild::OnStatusChanged(%p) failed to get status",
        this);
    return S_OK;
  }

  LOGD("WindowsRuntimeLocationChild::OnStatusChanged(%p, %d)", this, status);

  uint16_t err;
  switch (status) {
    case PositionStatus::PositionStatus_Disabled:
      AddFailureTelemetry("permission denied"_ns);
      err = GeolocationPositionError_Binding::PERMISSION_DENIED;
      break;
    case PositionStatus::PositionStatus_NotAvailable:
      AddFailureTelemetry("not supported"_ns);
      err = GeolocationPositionError_Binding::POSITION_UNAVAILABLE;
      break;
    default:
      return S_OK;
  }

  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "WindowsRuntimeLocationChild::OnStatusChanged",
      [self = RefPtr{this}, err]() { self->SendFailed(err); }));
  return S_OK;
}

WindowsRuntimeLocationChild::WindowsRuntimeLocationChild() {
  LOGD("WindowsRuntimeLocationChild::WindowsRuntimeLocationChild(%p)", this);
}

WindowsRuntimeLocationChild::~WindowsRuntimeLocationChild() {
  LOGD("WindowsRuntimeLocationChild::~WindowsRuntimeLocationChild(%p)", this);
}

mozilla::ipc::IPCResult WindowsRuntimeLocationChild::Startup() {
  LOGD("WindowsRuntimeLocationChild::Startup(%p, %p)", this, mGeolocator.Get());

  if (mGeolocator) {
    return IPC_OK();
  }

  auto sendFailOnError = MakeScopeExit([&] {
    // We will use MLS provider
    SendFailed(GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
  });

  ComPtr<IInspectable> inspectable;
  HRESULT hr = RoActivateInstance(
      HStringReference(RuntimeClass_Windows_Devices_Geolocation_Geolocator)
          .Get(),
      &inspectable);
  if (FAILED(hr)) {
    LOGD(
        "WindowsRuntimeLocationChild(%p) failed to create Geolocator. "
        "HRESULT=%08lx",
        this, hr);
    AddFailureTelemetry("creation error"_ns);
    return IPC_OK();
  }

  ComPtr<IGeolocator> geolocator;
  hr = inspectable.As(&geolocator);
  if (FAILED(hr)) {
    LOGD(
        "WindowsRuntimeLocationChild(%p) failed to get IGeolocator interface. "
        "HRESULT=%08lx",
        this, hr);
    AddFailureTelemetry("unexpected error"_ns);
    return IPC_OK();
  }

  mGeolocator = std::move(geolocator);
  sendFailOnError.release();
  return IPC_OK();
}

mozilla::ipc::IPCResult WindowsRuntimeLocationChild::SetHighAccuracy(
    const bool& aEnable) {
  LOGD("WindowsRuntimeLocationChild::SetHighAccuracy(%p, %p, %s)", this,
       mGeolocator.Get(), aEnable ? "true" : "false");

  // We sometimes call SetHighAccuracy before Startup, so we save the
  // request and set it later, in RegisterForReport.
  mHighAccuracy = aEnable;

  return IPC_OK();
}

mozilla::ipc::IPCResult WindowsRuntimeLocationChild::RegisterForReport() {
  LOGD("WindowsRuntimeLocationChild::RegisterForReport(%p, %p)", this,
       mGeolocator.Get());

  auto sendFailOnError = MakeScopeExit([&] {
    SendFailed(GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
  });

  if (!mGeolocator) {
    AddFailureTelemetry("unexpected error"_ns);
    return IPC_OK();
  }

  HRESULT hr = mGeolocator->put_DesiredAccuracy(
      mHighAccuracy ? PositionAccuracy::PositionAccuracy_High
                    : PositionAccuracy::PositionAccuracy_Default);
  if (FAILED(hr)) {
    AddFailureTelemetry("unexpected error"_ns);
    return IPC_OK();
  }

  RefPtr<WindowsRuntimeLocationChild> self = this;
  hr = mGeolocator->add_PositionChanged(
      Callback<PositionChangedHandler>([self](
                                           IGeolocator* aGeolocator,
                                           IPositionChangedEventArgs* aArgs) {
        return self->OnPositionChanged(
            ComPtr<IGeolocator>(aGeolocator),
            ComPtr<IPositionChangedEventArgs>(aArgs));
      }).Get(),
      &mPositionChangedToken);
  if (FAILED(hr)) {
    AddFailureTelemetry("failed to register"_ns);
    return IPC_OK();
  }

  hr = mGeolocator->add_StatusChanged(
      Callback<StatusChangedHandler>([self](IGeolocator* aGeolocator,
                                            IStatusChangedEventArgs* aArgs) {
        return self->OnStatusChanged(ComPtr<IGeolocator>(aGeolocator),
                                     ComPtr<IStatusChangedEventArgs>(aArgs));
      }).Get(),
      &mStatusChangedToken);
  if (FAILED(hr)) {
    mGeolocator->remove_PositionChanged(mPositionChangedToken);
    mPositionChangedToken.value = 0;
    AddFailureTelemetry("failed to register"_ns);
    return IPC_OK();
  }

  glean::geolocation::geolocation_service
      .EnumGet(glean::geolocation::GeolocationServiceLabel::eSystem)
      .Add();
  LOGI(
      "WindowsRuntimeLocationChild::RecvRegisterForReport successfully "
      "registered");
  sendFailOnError.release();
  return IPC_OK();
}

mozilla::ipc::IPCResult WindowsRuntimeLocationChild::UnregisterForReport() {
  LOGI("WindowsRuntimeLocationChild::UnregisterForReport(%p, %p)", this,
       mGeolocator.Get());

  if (!mGeolocator) {
    return IPC_OK();
  }

  // This IPC call is by IGeolocationProvider.shutdown(), release IGeolocator.
  if (mPositionChangedToken.value != 0) {
    mGeolocator->remove_PositionChanged(mPositionChangedToken);
  }
  if (mStatusChangedToken.value != 0) {
    mGeolocator->remove_StatusChanged(mStatusChangedToken);
  }
  mPositionChangedToken.value = 0;
  mStatusChangedToken.value = 0;
  mGeolocator = nullptr;

  return IPC_OK();
}

void WindowsRuntimeLocationChild::ActorDestroy(ActorDestroyReason aWhy) {
  LOGD("WindowsRuntimeLocationChild::ActorDestroy(%p, %p)", this,
       mGeolocator.Get());

  if (!mGeolocator) {
    return;
  }

  if (mPositionChangedToken.value != 0) {
    mGeolocator->remove_PositionChanged(mPositionChangedToken);
  }
  if (mStatusChangedToken.value != 0) {
    mGeolocator->remove_StatusChanged(mStatusChangedToken);
  }
  mPositionChangedToken.value = 0;
  mStatusChangedToken.value = 0;
  mGeolocator = nullptr;
}

}  // namespace mozilla::dom
