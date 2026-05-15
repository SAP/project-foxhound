/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "WindowsLegacyLocationChild.h"

#include <locationapi.h>

#include "WindowsLocationProvider.h"
#include "mozilla/dom/GeolocationPosition.h"
#include "mozilla/dom/GeolocationPositionErrorBinding.h"
#include "mozilla/glean/DomGeolocationMetrics.h"
#include "nsCOMPtr.h"
#include "nsIGeolocationProvider.h"
#include "prtime.h"

namespace mozilla::dom {

extern LazyLogModule gWindowsLocationProviderLog;
#define LOGD(...) \
  MOZ_LOG(gWindowsLocationProviderLog, LogLevel::Debug, (__VA_ARGS__))
#define LOGI(...) \
  MOZ_LOG(gWindowsLocationProviderLog, LogLevel::Info, (__VA_ARGS__))

// Use string lookup since dual_labeled_counter does not yet support enums.
static void AddFailureTelemetry(const nsACString& aReason) {
  glean::geolocation::windows_failure.Get("legacy"_ns, aReason).Add();
}

class LocationEvent final : public ILocationEvents {
 public:
  explicit LocationEvent(WindowsLocationChild* aActor)
      : mActor(aActor), mRefCnt(0) {}

  // IUnknown interface
  STDMETHODIMP_(ULONG) AddRef() override;
  STDMETHODIMP_(ULONG) Release() override;
  STDMETHODIMP QueryInterface(REFIID iid, void** ppv) override;

  // ILocationEvents interface
  STDMETHODIMP OnStatusChanged(REFIID aReportType,
                               LOCATION_REPORT_STATUS aStatus) override;
  STDMETHODIMP OnLocationChanged(REFIID aReportType,
                                 ILocationReport* aReport) override;

 private:
  // Making this a WeakPtr breaks the following cycle of strong references:
  // WindowsLocationChild -> ILocation -> ILocationEvents (this)
  //   -> WindowsLocationChild.
  WeakPtr<WindowsLocationChild> mActor;

  ULONG mRefCnt;
};

STDMETHODIMP_(ULONG)
LocationEvent::AddRef() { return InterlockedIncrement(&mRefCnt); }

STDMETHODIMP_(ULONG)
LocationEvent::Release() {
  ULONG count = InterlockedDecrement(&mRefCnt);
  if (!count) {
    delete this;
    return 0;
  }
  return count;
}

STDMETHODIMP
LocationEvent::QueryInterface(REFIID iid, void** ppv) {
  if (!ppv) {
    return E_INVALIDARG;
  }

  if (iid == IID_IUnknown) {
    *ppv = static_cast<IUnknown*>(this);
  } else if (iid == IID_ILocationEvents) {
    *ppv = static_cast<ILocationEvents*>(this);
  } else {
    *ppv = nullptr;
    return E_NOINTERFACE;
  }

  AddRef();
  return S_OK;
}

STDMETHODIMP
LocationEvent::OnStatusChanged(REFIID aReportType,
                               LOCATION_REPORT_STATUS aStatus) {
  LOGD("LocationEvent::OnStatusChanged(%p, %p, %s, %04x)", this, mActor.get(),
       aReportType == IID_ILatLongReport ? "true" : "false",
       static_cast<uint32_t>(aStatus));

  if (!mActor || aReportType != IID_ILatLongReport) {
    return S_OK;
  }

  // When registering event, REPORT_INITIALIZING is fired at first.
  // Then, when the location is found, REPORT_RUNNING is fired.
  // We ignore those messages.
  uint16_t err;
  switch (aStatus) {
    case REPORT_ACCESS_DENIED:
      AddFailureTelemetry("permission denied"_ns);
      err = GeolocationPositionError_Binding::PERMISSION_DENIED;
      break;
    case REPORT_NOT_SUPPORTED:
    case REPORT_ERROR:
      AddFailureTelemetry(aStatus == REPORT_NOT_SUPPORTED
                              ? "not supported"_ns
                              : "geoservice error"_ns);
      err = GeolocationPositionError_Binding::POSITION_UNAVAILABLE;
      break;
    default:
      return S_OK;
  }

  mActor->SendFailed(err);
  return S_OK;
}

STDMETHODIMP
LocationEvent::OnLocationChanged(REFIID aReportType, ILocationReport* aReport) {
  LOGD("LocationEvent::OnLocationChanged(%p, %p, %s)", this, mActor.get(),
       aReportType == IID_ILatLongReport ? "true" : "false");

  if (!mActor || aReportType != IID_ILatLongReport) {
    return S_OK;
  }

  RefPtr<ILatLongReport> latLongReport;
  if (FAILED(aReport->QueryInterface(IID_ILatLongReport,
                                     getter_AddRefs(latLongReport)))) {
    return E_FAIL;
  }

  DOUBLE latitude = 0.0;
  latLongReport->GetLatitude(&latitude);

  DOUBLE longitude = 0.0;
  latLongReport->GetLongitude(&longitude);

  DOUBLE alt = UnspecifiedNaN<double>();
  latLongReport->GetAltitude(&alt);

  DOUBLE herror = 0.0;
  latLongReport->GetErrorRadius(&herror);

  DOUBLE verror = UnspecifiedNaN<double>();
  latLongReport->GetAltitudeError(&verror);

  double heading = UnspecifiedNaN<double>();
  double speed = UnspecifiedNaN<double>();

  // nsGeoPositionCoords will convert NaNs to null for optional properties of
  // the JavaScript Coordinates object.
  RefPtr<nsGeoPosition> position =
      new nsGeoPosition(latitude, longitude, alt, herror, verror, heading,
                        speed, PR_Now() / PR_USEC_PER_MSEC);
  mActor->SendUpdate(position);

  return S_OK;
}

WindowsLegacyLocationChild::WindowsLegacyLocationChild() {
  LOGD("WindowsLegacyLocationChild::WindowsLegacyLocationChild(%p)", this);
}

WindowsLegacyLocationChild::~WindowsLegacyLocationChild() {
  LOGD("WindowsLegacyLocationChild::~WindowsLegacyLocationChild(%p)", this);
}

::mozilla::ipc::IPCResult WindowsLegacyLocationChild::Startup() {
  LOGD("WindowsLegacyLocationChild::Startup(%p, %p)", this, mLocation.get());
  if (mLocation) {
    return IPC_OK();
  }

  RefPtr<ILocation> location;
  if (FAILED(::CoCreateInstance(CLSID_Location, nullptr, CLSCTX_INPROC_SERVER,
                                IID_ILocation, getter_AddRefs(location)))) {
    LOGD("WindowsLegacyLocationChild(%p) failed to create ILocation", this);
    // We will use MLS provider
    AddFailureTelemetry("creation error"_ns);
    SendFailed(GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
    return IPC_OK();
  }

  IID reportTypes[] = {IID_ILatLongReport};
  auto hr = location->RequestPermissions(nullptr, reportTypes, 1, FALSE);
  if (FAILED(hr)) {
    LOGD(
        "WindowsLegacyLocationChild(%p) failed to set ILocation permissions. "
        "Error: %ld",
        this, hr);
    // We will use MLS provider.
    // The docs for RequestPermissions say that the call returns different
    // error codes for sync vs async calls.  We log the sync call errors
    // since what async call means here is not explained (or possible).
    if (hr == HRESULT_FROM_WIN32(ERROR_ACCESS_DENIED)) {
      AddFailureTelemetry("requestpermissions denied"_ns);
    } else if (hr == HRESULT_FROM_WIN32(ERROR_CANCELLED)) {
      AddFailureTelemetry("requestpermissions canceled"_ns);
    } else {
      AddFailureTelemetry("unexpected error"_ns);
    }
    SendFailed(GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
    return IPC_OK();
  }

  mLocation = location;
  return IPC_OK();
}

::mozilla::ipc::IPCResult WindowsLegacyLocationChild::SetHighAccuracy(
    const bool& aEnable) {
  LOGD("WindowsLegacyLocationChild::SetHighAccuracy(%p, %p, %s)", this,
       mLocation.get(), aEnable ? "true" : "false");

  // We sometimes call SetHighAccuracy before Startup, so we save the
  // request and set it later, in RegisterForReport.
  mHighAccuracy = aEnable;

  return IPC_OK();
}

::mozilla::ipc::IPCResult WindowsLegacyLocationChild::RegisterForReport() {
  LOGD("WindowsLegacyLocationChild::RegisterForReport(%p, %p)", this,
       mLocation.get());

  if (!mLocation) {
    AddFailureTelemetry("not registered"_ns);
    SendFailed(GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
    return IPC_OK();
  }

  LOCATION_DESIRED_ACCURACY desiredAccuracy;
  if (mHighAccuracy) {
    desiredAccuracy = LOCATION_DESIRED_ACCURACY_HIGH;
  } else {
    desiredAccuracy = LOCATION_DESIRED_ACCURACY_DEFAULT;
  }

  if (NS_WARN_IF(FAILED(mLocation->SetDesiredAccuracy(IID_ILatLongReport,
                                                      desiredAccuracy)))) {
    AddFailureTelemetry("unexpected error"_ns);
    SendFailed(GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
    return IPC_OK();
  }

  auto event = MakeRefPtr<LocationEvent>(this);
  if (NS_WARN_IF(
          FAILED(mLocation->RegisterForReport(event, IID_ILatLongReport, 0)))) {
    AddFailureTelemetry("failed to register"_ns);
    SendFailed(GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
  }

  glean::geolocation::geolocation_service
      .EnumGet(glean::geolocation::GeolocationServiceLabel::eSystem)
      .Add();
  LOGI("WindowsLocationChild::RecvRegisterForReport successfully registered");
  return IPC_OK();
}

::mozilla::ipc::IPCResult WindowsLegacyLocationChild::UnregisterForReport() {
  LOGI("WindowsLegacyLocationChild::UnregisterForReport(%p, %p)", this,
       mLocation.get());

  if (!mLocation) {
    return IPC_OK();
  }

  // This will free the LocationEvent we created in RecvRegisterForReport.
  (void)NS_WARN_IF(FAILED(mLocation->UnregisterForReport(IID_ILatLongReport)));

  // The ILocation object is not reusable.  Unregistering, restarting and
  // re-registering for reports does not work;  the callback is never
  // called in that case.  For that reason, we re-create the ILocation
  // object with a call to Startup after unregistering if we need it again.
  mLocation = nullptr;
  return IPC_OK();
}

void WindowsLegacyLocationChild::ActorDestroy(ActorDestroyReason aWhy) {
  LOGD("WindowsLegacyLocationChild::ActorDestroy(%p, %p)", this,
       mLocation.get());
  mLocation = nullptr;
}

}  // namespace mozilla::dom
