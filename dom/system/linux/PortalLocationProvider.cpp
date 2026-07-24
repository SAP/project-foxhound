/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PortalLocationProvider.h"

#include <gio/gio.h>
#include <glib-object.h>

#include "GeolocationPosition.h"
#include "MLSFallback.h"
#include "mozilla/FloatingPoint.h"
#include "mozilla/GUniquePtr.h"
#include "mozilla/Logging.h"
#include "mozilla/XREAppData.h"
#include "mozilla/dom/GeolocationPositionErrorBinding.h"
#include "mozilla/glean/DomGeolocationMetrics.h"
#include "nsAppShell.h"
#include "prtime.h"

extern const mozilla::XREAppData* gAppData;

namespace mozilla::dom {

#ifdef MOZ_LOGGING
static LazyLogModule sPortalLog("Portal");
#  define LOG_PORTALD(...) MOZ_LOG(sPortalLog, LogLevel::Debug, (__VA_ARGS__))
#  define LOG_PORTALI(...) MOZ_LOG(sPortalLog, LogLevel::Info, (__VA_ARGS__))
#else
#  define LOG_PORTALD(...)
#  define LOG_PORTALI(...)
#endif /* MOZ_LOGGING */

const char kDesktopBusName[] = "org.freedesktop.portal.Desktop";
const char kSessionInterfaceName[] = "org.freedesktop.portal.Session";

/**
 * |MLSGeolocationUpdate| provides a fallback if Portal is not supported.
 */
class PortalLocationProvider::MLSGeolocationUpdate final
    : public nsIGeolocationUpdate {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIGEOLOCATIONUPDATE

  explicit MLSGeolocationUpdate(nsIGeolocationUpdate* aCallback);

 protected:
  ~MLSGeolocationUpdate() = default;

 private:
  const nsCOMPtr<nsIGeolocationUpdate> mCallback;
};

PortalLocationProvider::MLSGeolocationUpdate::MLSGeolocationUpdate(
    nsIGeolocationUpdate* aCallback)
    : mCallback(aCallback) {
  MOZ_ASSERT(mCallback);
}

NS_IMPL_ISUPPORTS(PortalLocationProvider::MLSGeolocationUpdate,
                  nsIGeolocationUpdate);

// nsIGeolocationUpdate
//

NS_IMETHODIMP
PortalLocationProvider::MLSGeolocationUpdate::Update(
    nsIDOMGeoPosition* aPosition) {
  nsCOMPtr<nsIDOMGeoPositionCoords> coords;
  aPosition->GetCoords(getter_AddRefs(coords));
  if (!coords) {
    return NS_ERROR_FAILURE;
  }
  LOG_PORTALD("MLS is updating position");
  return mCallback->Update(aPosition);
}

NS_IMETHODIMP
PortalLocationProvider::MLSGeolocationUpdate::NotifyError(uint16_t aError) {
  nsCOMPtr<nsIGeolocationUpdate> callback(mCallback);
  return callback->NotifyError(aError);
}

//
// PortalLocationProvider
//

PortalLocationProvider::PortalLocationProvider() = default;

PortalLocationProvider::~PortalLocationProvider() {
  if (mDBUSLocationProxy || mRefreshTimer || mMLSProvider) {
    NS_WARNING(
        "PortalLocationProvider: Shutdown() had not been called before "
        "destructor.");
    Shutdown();
  }
}

void PortalLocationProvider::Update(nsIDOMGeoPosition* aPosition) {
  if (!mCallback) {
    return;  // not initialized or already shut down
  }

  if (mMLSProvider) {
    LOG_PORTALD(
        "Update from location portal received: Cancelling fallback MLS "
        "provider");
    mMLSProvider->Shutdown(MLSFallback::ShutdownReason::ProviderResponded);
    mMLSProvider = nullptr;
  }

  LOG_PORTALD("Send updated location to the callback %p", mCallback.get());
  mCallback->Update(aPosition);

  aPosition->GetCoords(getter_AddRefs(mLastGeoPositionCoords));
  // Schedule sending repetitive updates because we don't get more until
  // position is changed from portal. That would lead to timeout on the
  // Firefox side.
  SetRefreshTimer(5000);
}

void PortalLocationProvider::NotifyError(int aError) {
  LOG_PORTALD("*****NotifyError %d", aError);
  if (!mCallback) {
    return;  // not initialized or already shut down
  }

  if (!mMLSProvider) {
    /* With Portal failed, we restart MLS. It will be canceled once we
     * get another location from Portal. Start it immediately.
     */
    mMLSProvider = MakeAndAddRef<MLSFallback>(0);
    mMLSProvider->Startup(new MLSGeolocationUpdate(mCallback));
  }

  nsCOMPtr<nsIGeolocationUpdate> callback(mCallback);
  callback->NotifyError(aError);
}

NS_IMPL_ISUPPORTS(PortalLocationProvider, nsIGeolocationProvider)

static void location_updated_signal_cb(GDBusProxy* proxy, gchar* sender_name,
                                       gchar* signal_name, GVariant* parameters,
                                       gpointer user_data) {
  LOG_PORTALD("Signal: %s received from: %s", sender_name, signal_name);

  if (g_strcmp0(signal_name, "LocationUpdated")) {
    LOG_PORTALD("Unexpected signal %s received", signal_name);
    return;
  }

  auto* locationProvider = static_cast<PortalLocationProvider*>(user_data);
  RefPtr<GVariant> response_data;
  gchar* session_handle;
  g_variant_get(parameters, "(o@a{sv})", &session_handle,
                response_data.StartAssignment());
  if (!response_data) {
    LOG_PORTALI("Missing response data from portal");
    glean::geolocation::linux_portal_error
        .EnumGet(glean::geolocation::LinuxPortalErrorLabel::eEmptyResponse)
        .Add();
    locationProvider->NotifyError(
        GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
    return;
  }

  LOG_PORTALD("Session handle: %s Response data: %s", session_handle,
              GUniquePtr<gchar>(g_variant_print(response_data, TRUE)).get());
  g_free(session_handle);

  double lat = 0;
  double lon = 0;
  if (!g_variant_lookup(response_data, "Latitude", "d", &lat) ||
      !g_variant_lookup(response_data, "Longitude", "d", &lon)) {
    LOG_PORTALI("Failed to read response data from portal");
    glean::geolocation::linux_portal_error
        .EnumGet(glean::geolocation::LinuxPortalErrorLabel::eCantReadResponse)
        .Add();
    locationProvider->NotifyError(
        GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
    return;
  }

  double alt = UnspecifiedNaN<double>();
  g_variant_lookup(response_data, "Altitude", "d", &alt);
  double vError = 0;
  double hError = UnspecifiedNaN<double>();
  g_variant_lookup(response_data, "Accuracy", "d", &hError);
  double heading = UnspecifiedNaN<double>();
  g_variant_lookup(response_data, "Heading", "d", &heading);
  double speed = UnspecifiedNaN<double>();
  g_variant_lookup(response_data, "Speed", "d", &speed);

  locationProvider->Update(new nsGeoPosition(lat, lon, alt, hError, vError,
                                             heading, speed,
                                             PR_Now() / PR_USEC_PER_MSEC));
}

NS_IMETHODIMP
PortalLocationProvider::Startup() {
  LOG_PORTALD("Starting location portal");
  if (mDBUSLocationProxy) {
    LOG_PORTALD("Proxy already started.");
    return NS_OK;
  }

  // Create dbus proxy for the Location portal
  GUniquePtr<GError> error;
  nsAppShell::DBusConnectionCheck();
  mDBUSLocationProxy = dont_AddRef(g_dbus_proxy_new_for_bus_sync(
      G_BUS_TYPE_SESSION, G_DBUS_PROXY_FLAGS_NONE,
      nullptr, /* GDBusInterfaceInfo */
      kDesktopBusName, "/org/freedesktop/portal/desktop",
      "org.freedesktop.portal.Location", nullptr, /* GCancellable */
      getter_Transfers(error)));
  if (!mDBUSLocationProxy) {
    g_printerr("Error creating location dbus proxy: %s\n", error->message);
    return NS_OK;  // fallback to MLS
  }

  // Listen to signals which will be send to us with the location data
  mDBUSSignalHandler =
      g_signal_connect(mDBUSLocationProxy, "g-signal",
                       G_CALLBACK(location_updated_signal_cb), this);

  // Call CreateSession of the location portal
  GVariantBuilder builder;

  nsAutoCString appName;
  gAppData->GetDBusAppName(appName);
  g_variant_builder_init(&builder, G_VARIANT_TYPE_VARDICT);
  g_variant_builder_add(&builder, "{sv}", "session_handle_token",
                        g_variant_new_string(appName.get()));

  RefPtr<GVariant> result = dont_AddRef(g_dbus_proxy_call_sync(
      mDBUSLocationProxy, "CreateSession", g_variant_new("(a{sv})", &builder),
      G_DBUS_CALL_FLAGS_NONE, -1, nullptr, getter_Transfers(error)));

  g_variant_builder_clear(&builder);

  if (!result) {
    g_printerr("Error calling CreateSession method: %s\n", error->message);
    return NS_OK;  // fallback to MLS
  }

  // Start to listen to the location changes
  g_variant_builder_init(&builder, G_VARIANT_TYPE_VARDICT);

  // TODO Use wayland:handle as described in
  // https://flatpak.github.io/xdg-desktop-portal/#parent_window
  const gchar* parent_window = "";
  gchar* portalSession;
  g_variant_get_child(result, 0, "o", &portalSession);
  mPortalSession.reset(portalSession);

  result = g_dbus_proxy_call_sync(
      mDBUSLocationProxy, "Start",
      g_variant_new("(osa{sv})", mPortalSession.get(), parent_window, &builder),
      G_DBUS_CALL_FLAGS_NONE, -1, nullptr, getter_Transfers(error));

  g_variant_builder_clear(&builder);

  if (!result) {
    g_printerr("Error calling Start method: %s\n", error->message);
    return NS_OK;  // fallback to MLS
  }

  glean::geolocation::geolocation_service
      .EnumGet(glean::geolocation::GeolocationServiceLabel::eSystem)
      .Add();
  LOG_PORTALI("Portal location provider starting.");
  return NS_OK;
}

NS_IMETHODIMP
PortalLocationProvider::Watch(nsIGeolocationUpdate* aCallback) {
  mCallback = aCallback;

  if (mLastGeoPositionCoords) {
    // We cannot immediately call the Update there becase the window is not
    // yet ready for that.
    LOG_PORTALD(
        "Update location in 1ms because we have the valid coords cached.");
    SetRefreshTimer(1);
    return NS_OK;
  }

  /* The MLS fallback will kick in after 12 seconds if portal
   * doesn't provide location information within time. Once we
   * see the first message from portal, the fallback will be
   * disabled in |Update|.
   */
  mMLSProvider = MakeAndAddRef<MLSFallback>(12000);
  mMLSProvider->Startup(new MLSGeolocationUpdate(aCallback));

  return NS_OK;
}

NS_IMETHODIMP PortalLocationProvider::GetName(nsACString& aName) {
  aName.AssignLiteral("PortalLocationProvider");
  return NS_OK;
}

void PortalLocationProvider::SetRefreshTimer(int aDelay) {
  LOG_PORTALD("SetRefreshTimer for %p to %d ms", this, aDelay);
  if (!mRefreshTimer) {
    NS_NewTimerWithCallback(getter_AddRefs(mRefreshTimer), this, aDelay,
                            nsITimer::TYPE_ONE_SHOT);
  } else {
    mRefreshTimer->Cancel();
    mRefreshTimer->InitWithCallback(this, aDelay, nsITimer::TYPE_ONE_SHOT);
  }
}

NS_IMETHODIMP
PortalLocationProvider::Notify(nsITimer* timer) {
  // We need to reschedule the timer because we won't get any update
  // from portal until the location is changed. That would cause
  // watchPosition to fail with TIMEOUT error.
  SetRefreshTimer(5000);
  if (mLastGeoPositionCoords) {
    LOG_PORTALD("Update location callback with latest coords.");
    mCallback->Update(
        new nsGeoPosition(mLastGeoPositionCoords, PR_Now() / PR_USEC_PER_MSEC));
  }
  return NS_OK;
}

NS_IMETHODIMP
PortalLocationProvider::Shutdown() {
  LOG_PORTALI("Shutdown location provider");
  if (mRefreshTimer) {
    mRefreshTimer->Cancel();
    mRefreshTimer = nullptr;
  }
  mLastGeoPositionCoords = nullptr;
  if (mDBUSLocationProxy) {
    nsAppShell::DBusConnectionCheck();
    g_signal_handler_disconnect(mDBUSLocationProxy, mDBUSSignalHandler);
    LOG_PORTALD("calling Close method to the session interface...");
    RefPtr<GDBusMessage> message = dont_AddRef(g_dbus_message_new_method_call(
        kDesktopBusName, mPortalSession.get(), kSessionInterfaceName, "Close"));
    mPortalSession = nullptr;
    if (message) {
      GUniquePtr<GError> error;
      GDBusConnection* connection =
          g_dbus_proxy_get_connection(mDBUSLocationProxy);
      g_dbus_connection_send_message(
          connection, message, G_DBUS_SEND_MESSAGE_FLAGS_NONE,
          /*out_serial=*/nullptr, getter_Transfers(error));
      if (error) {
        LOG_PORTALI("Failed to close the session: %s", error->message);
      }
    }
    mDBUSLocationProxy = nullptr;
  }
  if (mMLSProvider) {
    mMLSProvider->Shutdown(MLSFallback::ShutdownReason::ProviderShutdown);
    mMLSProvider = nullptr;
  }
  return NS_OK;
}

NS_IMETHODIMP
PortalLocationProvider::SetHighAccuracy(bool aHigh) { return NS_OK; }

}  // namespace mozilla::dom
