/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WidgetUtilsGtk.h"

#include "MainThreadUtils.h"
#include "mozilla/StaticPrefs_widget.h"
#include "mozilla/UniquePtr.h"
#include "nsReadableUtils.h"
#include "nsString.h"
#include "nsStringFwd.h"
#include "nsWindow.h"
#include "nsIGfxInfo.h"
#include "mozilla/Components.h"
#include "nsCOMPtr.h"
#include "nsIProperties.h"
#include "nsIFile.h"
#include "nsXULAppAPI.h"
#include "nsXPCOMCID.h"
#include "nsDirectoryServiceDefs.h"
#include "nsString.h"
#include "nsGtkKeyUtils.h"
#include "nsGtkUtils.h"

#include <gtk/gtk.h>
#include <dlfcn.h>
#include <glib.h>

#undef LOGW
#ifdef MOZ_LOGGING
#  include "mozilla/Logging.h"
extern mozilla::LazyLogModule gWidgetLog;
#  define LOGW(...) MOZ_LOG(gWidgetLog, mozilla::LogLevel::Debug, (__VA_ARGS__))
#else
#  define LOGW(...)
#endif /* MOZ_LOGGING */

namespace mozilla::widget {

int32_t WidgetUtilsGTK::IsTouchDeviceSupportPresent() {
  int32_t result = 0;
  GdkDisplay* display = gdk_display_get_default();
  if (!display) {
    return 0;
  }

  GdkDeviceManager* manager = gdk_display_get_device_manager(display);
  if (!manager) {
    return 0;
  }

  GList* devices =
      gdk_device_manager_list_devices(manager, GDK_DEVICE_TYPE_SLAVE);
  GList* list = devices;

  while (devices) {
    GdkDevice* device = static_cast<GdkDevice*>(devices->data);
    if (gdk_device_get_source(device) == GDK_SOURCE_TOUCHSCREEN) {
      result = 1;
      break;
    }
    devices = devices->next;
  }

  if (list) {
    g_list_free(list);
  }

  return result;
}

bool IsMainWindowTransparent() {
  return nsWindow::IsToplevelWindowTransparent();
}

// We avoid linking gdk_*_display_get_type directly in order to avoid a runtime
// dependency on GTK built with both backends. Other X11- and Wayland-specific
// functions get stubbed out by libmozgtk and crash when called, but those
// should only be called when the matching backend is already in use.

bool GdkIsWaylandDisplay(GdkDisplay* display) {
  static auto sGdkWaylandDisplayGetType =
      (GType(*)())dlsym(RTLD_DEFAULT, "gdk_wayland_display_get_type");
  return sGdkWaylandDisplayGetType &&
         G_TYPE_CHECK_INSTANCE_TYPE(display, sGdkWaylandDisplayGetType());
}

bool GdkIsX11Display(GdkDisplay* display) {
  static auto sGdkX11DisplayGetType =
      (GType(*)())dlsym(RTLD_DEFAULT, "gdk_x11_display_get_type");
  return sGdkX11DisplayGetType &&
         G_TYPE_CHECK_INSTANCE_TYPE(display, sGdkX11DisplayGetType());
}

bool IsXWaylandProtocol() {
  static bool isXwayland = [] {
    return !GdkIsWaylandDisplay() && !!getenv("WAYLAND_DISPLAY");
  }();
  return isXwayland;
}

bool GdkIsWaylandDisplay() {
  static bool isWaylandDisplay = gdk_display_get_default() &&
                                 GdkIsWaylandDisplay(gdk_display_get_default());
  return isWaylandDisplay;
}

bool GdkIsX11Display() {
  static bool isX11Display = gdk_display_get_default()
                                 ? GdkIsX11Display(gdk_display_get_default())
                                 : false;
  return isX11Display;
}

GdkDevice* GdkGetPointer() {
  GdkDisplay* display = gdk_display_get_default();
  GdkDeviceManager* deviceManager = gdk_display_get_device_manager(display);
  return gdk_device_manager_get_client_pointer(deviceManager);
}

static GdkEvent* sLastMousePressEvent = nullptr;
GdkEvent* GetLastMousePressEvent() { return sLastMousePressEvent; }

void SetLastMousePressEvent(GdkEvent* aEvent) {
  if (sLastMousePressEvent) {
    GUniquePtr<GdkEvent> event(sLastMousePressEvent);
    sLastMousePressEvent = nullptr;
  }
  if (!aEvent) {
    return;
  }
  GUniquePtr<GdkEvent> event(gdk_event_copy(aEvent));
  sLastMousePressEvent = event.release();
}

bool IsRunningUnderSnap() { return !!GetSnapInstanceName(); }

bool IsRunningUnderFlatpak() {
  // https://gitlab.gnome.org/GNOME/gtk/-/blob/4300a5c609306ce77cbc8a3580c19201dccd8d13/gdk/gdk.c#L472
  static bool sRunning = [] {
    return g_file_test("/.flatpak-info", G_FILE_TEST_EXISTS);
  }();
  return sRunning;
}

bool IsPackagedAppFileExists() {
  static bool sRunning = [] {
    nsresult rv;
    nsCString path;
    nsCOMPtr<nsIFile> file;
    nsCOMPtr<nsIProperties> directoryService;

    directoryService = do_GetService(NS_DIRECTORY_SERVICE_CONTRACTID);
    NS_ENSURE_TRUE(directoryService, FALSE);

    rv = directoryService->Get(NS_GRE_DIR, NS_GET_IID(nsIFile),
                               getter_AddRefs(file));
    NS_ENSURE_SUCCESS(rv, FALSE);

    rv = file->AppendNative("is-packaged-app"_ns);
    NS_ENSURE_SUCCESS(rv, FALSE);

    rv = file->GetNativePath(path);
    NS_ENSURE_SUCCESS(rv, FALSE);

    return g_file_test(path.get(), G_FILE_TEST_EXISTS);
  }();
  return sRunning;
}

const char* GetSnapInstanceName() {
  static const char* sInstanceName = []() -> const char* {
    const char* snapName = g_getenv("SNAP_NAME");
    if (!snapName) {
      return nullptr;
    }
    if (g_strcmp0(snapName, MOZ_APP_NAME)) {
      return nullptr;
    }
    // Intentionally leaked, as keeping a pointer to the environment forever
    // is a bit suspicious.
    if (const char* instanceName = g_getenv("SNAP_INSTANCE_NAME")) {
      return g_strdup(instanceName);
    }
    // Instance name didn't exist for snapd <= 2.35:
    return g_strdup(snapName);
  }();
  return sInstanceName;
}

bool ShouldUsePortal(PortalKind aPortalKind) {
  static bool sPortalEnv = [] {
    if (IsRunningUnderFlatpakOrSnap()) {
      return true;
    }
    const char* portalEnvString = g_getenv("GTK_USE_PORTAL");
    return portalEnvString && atoi(portalEnvString) != 0;
  }();

  bool autoBehavior = sPortalEnv;
  const int32_t pref = [&] {
    switch (aPortalKind) {
      case PortalKind::FilePicker:
        return StaticPrefs::widget_use_xdg_desktop_portal_file_picker();
      case PortalKind::MimeHandler:
        // Mime portal breaks default browser handling, see bug 1516290.
        autoBehavior = IsRunningUnderFlatpakOrSnap();
        return StaticPrefs::widget_use_xdg_desktop_portal_mime_handler();
      case PortalKind::Settings:
        autoBehavior = true;
        return StaticPrefs::widget_use_xdg_desktop_portal_settings();
      case PortalKind::Location:
        return StaticPrefs::widget_use_xdg_desktop_portal_location();
      case PortalKind::OpenUri:
        return StaticPrefs::widget_use_xdg_desktop_portal_open_uri();
    }
    return 2;
  }();

  switch (pref) {
    case 0:
      return false;
    case 1:
      return true;
    default:
      return autoBehavior;
  }
}

nsTArray<nsCString> ParseTextURIList(const nsACString& aData) {
  UniquePtr<char[]> data(ToNewCString(aData));
  gchar** uris = g_uri_list_extract_uris(data.get());

  nsTArray<nsCString> result;
  for (size_t i = 0; i < g_strv_length(uris); i++) {
    result.AppendElement(nsCString(uris[i]));
  }

  g_strfreev(uris);
  return result;
}

#ifdef MOZ_WAYLAND
static gboolean token_failed(gpointer aData);

class XDGTokenRequest {
 public:
  void SetTokenID(const char* aTokenID) {
    LOGW("RequestWaylandFocusPromise() SetTokenID %s", aTokenID);
    mTransferPromise->Resolve(aTokenID, __func__);
  }
  void Cancel() {
    LOGW("RequestWaylandFocusPromise() canceled");
    mTransferPromise->Reject(false, __func__);
    mActivationTimeoutID = 0;
  }

  XDGTokenRequest(xdg_activation_token_v1* aXdgToken,
                  RefPtr<FocusRequestPromise::Private> aTransferPromise)
      : mXdgToken(aXdgToken), mTransferPromise(std::move(aTransferPromise)) {
    mActivationTimeoutID =
        g_timeout_add(sActivationTimeout, token_failed, this);
  }
  ~XDGTokenRequest() {
    MozClearPointer(mXdgToken, xdg_activation_token_v1_destroy);
    if (mActivationTimeoutID) {
      g_source_remove(mActivationTimeoutID);
    }
  }

 private:
  xdg_activation_token_v1* mXdgToken;
  RefPtr<FocusRequestPromise::Private> mTransferPromise;
  guint mActivationTimeoutID;
  // Reject FocusRequestPromise if we don't get XDG token in 0.5 sec.
  static constexpr int sActivationTimeout = 500;
};

// Failed to get token in time
static gboolean token_failed(gpointer data) {
  UniquePtr<XDGTokenRequest> request(static_cast<XDGTokenRequest*>(data));
  request->Cancel();
  return false;
}

// We've got activation token from Wayland compositor so it's time to use it.
static void token_done(gpointer data, struct xdg_activation_token_v1* provider,
                       const char* tokenID) {
  UniquePtr<XDGTokenRequest> request(static_cast<XDGTokenRequest*>(data));
  request->SetTokenID(tokenID);
}

static const struct xdg_activation_token_v1_listener token_listener = {
    token_done,
};
#endif

RefPtr<FocusRequestPromise> RequestWaylandFocusPromise() {
#ifdef MOZ_WAYLAND
  if (!GdkIsWaylandDisplay() || !KeymapWrapper::GetSeat()) {
    LOGW("RequestWaylandFocusPromise() failed.");
    return nullptr;
  }

  RefPtr<nsWindow> sourceWindow = nsWindow::GetFocusedWindow();
  if (!sourceWindow || sourceWindow->IsDestroyed()) {
    LOGW("RequestWaylandFocusPromise() missing source window");
    return nullptr;
  }

  xdg_activation_v1* xdg_activation = WaylandDisplayGet()->GetXdgActivation();
  if (!xdg_activation) {
    LOGW("RequestWaylandFocusPromise() missing xdg_activation");
    return nullptr;
  }

  wl_surface* focusSurface;
  uint32_t focusSerial;
  KeymapWrapper::GetFocusInfo(&focusSurface, &focusSerial);
  if (!focusSurface) {
    LOGW("RequestWaylandFocusPromise() missing focusSurface");
    return nullptr;
  }

  GdkWindow* gdkWindow = sourceWindow->GetToplevelGdkWindow();
  if (!gdkWindow) {
    return nullptr;
  }
  wl_surface* surface = gdk_wayland_window_get_wl_surface(gdkWindow);
  if (focusSurface != surface) {
    LOGW("RequestWaylandFocusPromise() missing wl_surface");
    return nullptr;
  }

  RefPtr<FocusRequestPromise::Private> transferPromise =
      new FocusRequestPromise::Private(__func__);

  xdg_activation_token_v1* aXdgToken =
      xdg_activation_v1_get_activation_token(xdg_activation);
  xdg_activation_token_v1_add_listener(
      aXdgToken, &token_listener,
      new XDGTokenRequest(aXdgToken, transferPromise));
  xdg_activation_token_v1_set_serial(aXdgToken, focusSerial,
                                     KeymapWrapper::GetSeat());
  xdg_activation_token_v1_set_surface(aXdgToken, focusSurface);
  xdg_activation_token_v1_commit(aXdgToken);

  LOGW("RequestWaylandFocusPromise() XDG Token sent");

  return transferPromise.forget();
#else  // !defined(MOZ_WAYLAND)
  return nullptr;
#endif
}

// https://specifications.freedesktop.org/wm-spec/1.3/ar01s05.html
static nsCString GetWindowManagerName() {
  if (!GdkIsX11Display()) {
    return {};
  }

#ifdef MOZ_X11
  Display* xdisplay = gdk_x11_get_default_xdisplay();
  Window root_win =
      GDK_WINDOW_XID(gdk_screen_get_root_window(gdk_screen_get_default()));

  int actual_format_return;
  Atom actual_type_return;
  unsigned long nitems_return;
  unsigned long bytes_after_return;
  unsigned char* prop_return = nullptr;
  auto releaseXProperty = MakeScopeExit([&] {
    if (prop_return) {
      XFree(prop_return);
    }
  });

  Atom property = XInternAtom(xdisplay, "_NET_SUPPORTING_WM_CHECK", true);
  Atom req_type = XInternAtom(xdisplay, "WINDOW", true);
  if (!property || !req_type) {
    return {};
  }
  int result =
      XGetWindowProperty(xdisplay, root_win, property,
                         0L,                  // offset
                         sizeof(Window) / 4,  // length
                         false,               // delete
                         req_type, &actual_type_return, &actual_format_return,
                         &nitems_return, &bytes_after_return, &prop_return);

  if (result != Success || bytes_after_return != 0 || nitems_return != 1) {
    return {};
  }

  Window wmWindow = reinterpret_cast<Window*>(prop_return)[0];
  if (!wmWindow) {
    return {};
  }

  XFree(prop_return);
  prop_return = nullptr;

  property = XInternAtom(xdisplay, "_NET_WM_NAME", true);
  req_type = XInternAtom(xdisplay, "UTF8_STRING", true);
  if (!property || !req_type) {
    return {};
  }
  result =
      XGetWindowProperty(xdisplay, wmWindow, property,
                         0L,         // offset
                         INT32_MAX,  // length
                         false,      // delete
                         req_type, &actual_type_return, &actual_format_return,
                         &nitems_return, &bytes_after_return, &prop_return);
  if (result != Success || bytes_after_return != 0) {
    return {};
  }

  return nsCString(reinterpret_cast<const char*>(prop_return));
#else
  return {};
#endif
}

// Getting a reliable identifier is quite tricky. We try to use the standard
// XDG_CURRENT_DESKTOP environment first, _NET_WM_NAME later, and a set of
// legacy / non-standard environment variables otherwise.
//
// Documentation for some of those can be found in:
//
// https://wiki.archlinux.org/title/Environment_variables#Examples
// https://wiki.archlinux.org/title/Xdg-utils#Environment_variables
const nsCString& GetDesktopEnvironmentIdentifier() {
  MOZ_ASSERT(NS_IsMainThread());
  static const nsDependentCString sIdentifier = [] {
    nsCString ident = [] {
      auto Env = [](const char* aKey) -> const char* {
        const char* v = getenv(aKey);
        return v && *v ? v : nullptr;
      };
      if (const char* currentDesktop = Env("XDG_CURRENT_DESKTOP")) {
        return nsCString(currentDesktop);
      }
      if (auto wm = GetWindowManagerName(); !wm.IsEmpty()) {
        return wm;
      }
      if (const char* sessionDesktop = Env("XDG_SESSION_DESKTOP")) {
        // This is not really standardized in freedesktop.org, but it is
        // documented here, and should be set in systemd systems.
        // https://www.freedesktop.org/software/systemd/man/pam_systemd.html#%24XDG_SESSION_DESKTOP
        return nsCString(sessionDesktop);
      }
      // We try first the DE-specific variables, then SESSION_DESKTOP, to match
      // the documented order in:
      // https://wiki.archlinux.org/title/Xdg-utils#Environment_variables
      if (getenv("GNOME_DESKTOP_SESSION_ID")) {
        return nsCString("gnome"_ns);
      }
      if (getenv("KDE_FULL_SESSION")) {
        return nsCString("kde"_ns);
      }
      if (getenv("MATE_DESKTOP_SESSION_ID")) {
        return nsCString("mate"_ns);
      }
      if (getenv("LXQT_SESSION_CONFIG")) {
        return nsCString("lxqt"_ns);
      }
      if (const char* desktopSession = Env("DESKTOP_SESSION")) {
        // Try the legacy DESKTOP_SESSION as a last resort.
        return nsCString(desktopSession);
      }
      return nsCString();
    }();
    ToLowerCase(ident);
    // Intentionally put into a ToNewCString copy, rather than just making a
    // static nsCString to avoid leakchecking errors, since we really want to
    // leak this string.
    return nsDependentCString(ToNewCString(ident), ident.Length());
  }();
  return sIdentifier;
}

bool IsGnomeDesktopEnvironment() {
  static bool sIsGnome =
      !!FindInReadable("gnome"_ns, GetDesktopEnvironmentIdentifier());
  return sIsGnome;
}

bool IsKdeDesktopEnvironment() {
  static bool sIsKde = GetDesktopEnvironmentIdentifier().EqualsLiteral("kde");
  return sIsKde;
}

bool IsCancelledGError(GError* aGError) {
  return g_error_matches(aGError, G_IO_ERROR, G_IO_ERROR_CANCELLED);
}

}  // namespace mozilla::widget
