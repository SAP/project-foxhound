/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:expandtab:shiftwidth=2:tabstop=2:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WakeLockListener.h"
#include "WidgetUtilsGtk.h"
#include "mozilla/ScopeExit.h"

#ifdef MOZ_ENABLE_DBUS
#  include <gio/gio.h>
#  include "AsyncDBus.h"
#endif

#if defined(MOZ_X11)
#  include "prlink.h"
#  include <gdk/gdk.h>
#  include <gdk/gdkx.h>
#  include "X11UndefineNone.h"
#endif

#if defined(MOZ_WAYLAND)
#  include "mozilla/widget/nsWaylandDisplay.h"
#  include "nsWindow.h"
#endif

#ifdef MOZ_ENABLE_DBUS
#  define FREEDESKTOP_PORTAL_DESKTOP_TARGET "org.freedesktop.portal.Desktop"
#  define FREEDESKTOP_PORTAL_DESKTOP_OBJECT "/org/freedesktop/portal/desktop"
#  define FREEDESKTOP_PORTAL_DESKTOP_INTERFACE "org.freedesktop.portal.Inhibit"
#  define FREEDESKTOP_PORTAL_DESKTOP_INHIBIT_IDLE_FLAG 8

#  define FREEDESKTOP_SCREENSAVER_TARGET "org.freedesktop.ScreenSaver"
#  define FREEDESKTOP_SCREENSAVER_OBJECT "/ScreenSaver"
#  define FREEDESKTOP_SCREENSAVER_INTERFACE "org.freedesktop.ScreenSaver"

#  define FREEDESKTOP_POWER_TARGET "org.freedesktop.PowerManagement"
#  define FREEDESKTOP_POWER_OBJECT "/org/freedesktop/PowerManagement/Inhibit"
#  define FREEDESKTOP_POWER_INTERFACE "org.freedesktop.PowerManagement.Inhibit"

#  define SESSION_MANAGER_TARGET "org.gnome.SessionManager"
#  define SESSION_MANAGER_OBJECT "/org/gnome/SessionManager"
#  define SESSION_MANAGER_INTERFACE "org.gnome.SessionManager"

#  define DBUS_TIMEOUT (-1)
#endif

using namespace mozilla;
using namespace mozilla::widget;

NS_IMPL_ISUPPORTS(WakeLockListener, nsIDOMMozWakeLockListener)

#define WAKE_LOCK_LOG(str, ...)                        \
  MOZ_LOG(gLinuxWakeLockLog, mozilla::LogLevel::Debug, \
          ("[%p] " str, this, ##__VA_ARGS__))
static mozilla::LazyLogModule gLinuxWakeLockLog("LinuxWakeLock");

enum WakeLockType {
  Initial = 0,
#if defined(MOZ_ENABLE_DBUS)
  FreeDesktopScreensaver = 1,
  FreeDesktopPower = 2,
  FreeDesktopPortal = 3,
  GNOME = 4,
#endif
#if defined(MOZ_X11)
  XScreenSaver = 5,
#endif
#if defined(MOZ_WAYLAND)
  WaylandIdleInhibit = 6,
#endif
  Unsupported = 7,
};

#if defined(MOZ_ENABLE_DBUS)
bool IsDBusWakeLock(int aWakeLockType) {
  switch (aWakeLockType) {
    case FreeDesktopScreensaver:
    case FreeDesktopPower:
    case GNOME:
    case FreeDesktopPortal:
      return true;
    default:
      return false;
  }
}
#endif

#ifdef MOZ_LOGGING
const char* WakeLockTypeNames[] = {
    "Initial",
    "FreeDesktopScreensaver",
    "FreeDesktopPower",
    "FreeDesktopPortal",
    "GNOME",
    "XScreenSaver",
    "WaylandIdleInhibit",
    "Unsupported",
};
#endif

class WakeLockTopic {
 public:
  NS_INLINE_DECL_REFCOUNTING(WakeLockTopic)

  explicit WakeLockTopic(const nsAString& aTopic) {
    CopyUTF16toUTF8(aTopic, mTopic);
    WAKE_LOCK_LOG("WakeLockTopic::WakeLockTopic() created %s", mTopic.get());
    if (sWakeLockType == Initial) {
      SwitchToNextWakeLockType();
    }
#ifdef MOZ_ENABLE_DBUS
    mCancellable = dont_AddRef(g_cancellable_new());
#endif
  }

  nsresult InhibitScreensaver();
  nsresult UninhibitScreensaver();

  void Shutdown();

 private:
  bool SendInhibit();
  bool SendUninhibit();

#if defined(MOZ_X11)
  bool CheckXScreenSaverSupport();
  bool InhibitXScreenSaver(bool inhibit);
#endif

#if defined(MOZ_WAYLAND)
  zwp_idle_inhibitor_v1* mWaylandInhibitor = nullptr;
  static bool CheckWaylandIdleInhibitSupport();
  bool InhibitWaylandIdle();
  bool UninhibitWaylandIdle();
#endif

  bool IsNativeWakeLock(int aWakeLockType);
  bool IsWakeLockTypeAvailable(int aWakeLockType);
  bool SwitchToNextWakeLockType();

#ifdef MOZ_ENABLE_DBUS
  void DBusInhibitScreensaver(const char* aName, const char* aPath,
                              const char* aCall, const char* aMethod,
                              RefPtr<GVariant> aArgs);
  void DBusUninhibitScreensaver(const char* aName, const char* aPath,
                                const char* aCall, const char* aMethod);

  void InhibitFreeDesktopPortal();
  void InhibitFreeDesktopScreensaver();
  void InhibitFreeDesktopPower();
  void InhibitGNOME();

  void UninhibitFreeDesktopPortal();
  void UninhibitFreeDesktopScreensaver();
  void UninhibitFreeDesktopPower();
  void UninhibitGNOME();

  void DBusInhibitSucceeded(uint32_t aInhibitRequestID);
  void DBusInhibitFailed(bool aFatal);
  void DBusUninhibitSucceeded();
  void DBusUninhibitFailed();
  void ClearDBusInhibitToken();
#endif
  ~WakeLockTopic() = default;

  // Why is screensaver inhibited
  nsCString mTopic;

  // Our desired state
  bool mShouldInhibit = false;

  // Our actual sate
  bool mInhibited = false;

#ifdef MOZ_ENABLE_DBUS
  // We're waiting for DBus reply (inhibit/uninhibit calls).
  bool mWaitingForDBusInhibit = false;
  bool mWaitingForDBusUninhibit = false;

  // mInhibitRequestID is received from success screen saver inhibit call
  // and it's needed for screen saver enablement.
  Maybe<uint32_t> mInhibitRequestID;

  RefPtr<GCancellable> mCancellable;
  // Used to uninhibit org.freedesktop.portal.Inhibit request
  nsCString mRequestObjectPath;
#endif

  static int sWakeLockType;
};

int WakeLockTopic::sWakeLockType = Initial;

#ifdef MOZ_ENABLE_DBUS
void WakeLockTopic::DBusInhibitSucceeded(uint32_t aInhibitRequestID) {
  mWaitingForDBusInhibit = false;
  mInhibitRequestID = Some(aInhibitRequestID);
  mInhibited = true;

  WAKE_LOCK_LOG(
      "WakeLockTopic::DBusInhibitSucceeded(), mInhibitRequestID %u "
      "mShouldInhibit %d",
      *mInhibitRequestID, mShouldInhibit);

  // Uninhibit was requested before inhibit request was finished.
  // So ask for it now.
  if (!mShouldInhibit) {
    UninhibitScreensaver();
  }
}

void WakeLockTopic::DBusInhibitFailed(bool aFatal) {
  WAKE_LOCK_LOG("WakeLockTopic::DBusInhibitFailed(%d)", aFatal);

  mWaitingForDBusInhibit = false;
  ClearDBusInhibitToken();

  // Non-recoverable DBus error. Switch to another wake lock type.
  if (aFatal && SwitchToNextWakeLockType()) {
    SendInhibit();
  }
}

void WakeLockTopic::DBusUninhibitSucceeded() {
  WAKE_LOCK_LOG("WakeLockTopic::DBusUninhibitSucceeded() mShouldInhibit %d",
                mShouldInhibit);

  mWaitingForDBusUninhibit = false;
  mInhibited = false;
  ClearDBusInhibitToken();

  // Inhibit was requested before uninhibit request was finished.
  // So ask for it now.
  if (mShouldInhibit) {
    InhibitScreensaver();
  }
}

void WakeLockTopic::DBusUninhibitFailed() {
  WAKE_LOCK_LOG("WakeLockTopic::DBusUninhibitFailed()");
  mWaitingForDBusUninhibit = false;
  mInhibitRequestID = Nothing();
}

void WakeLockTopic::ClearDBusInhibitToken() {
  mRequestObjectPath.Truncate();
  mInhibitRequestID = Nothing();
}

void WakeLockTopic::DBusInhibitScreensaver(const char* aName, const char* aPath,
                                           const char* aCall,
                                           const char* aMethod,
                                           RefPtr<GVariant> aArgs) {
  WAKE_LOCK_LOG(
      "WakeLockTopic::DBusInhibitScreensaver() mWaitingForDBusInhibit %d "
      "mWaitingForDBusUninhibit %d",
      mWaitingForDBusInhibit, mWaitingForDBusUninhibit);
  if (mWaitingForDBusInhibit) {
    WAKE_LOCK_LOG("  already waiting to inihibit, return");
    return;
  }
  if (mWaitingForDBusUninhibit) {
    WAKE_LOCK_LOG("  cancel un-inihibit request");
    g_cancellable_cancel(mCancellable);
    mWaitingForDBusUninhibit = false;
  }
  mWaitingForDBusInhibit = true;

  widget::CreateDBusProxyForBus(
      G_BUS_TYPE_SESSION,
      GDBusProxyFlags(G_DBUS_PROXY_FLAGS_DO_NOT_CONNECT_SIGNALS |
                      G_DBUS_PROXY_FLAGS_DO_NOT_LOAD_PROPERTIES),
      /* aInterfaceInfo = */ nullptr, aName, aPath, aCall, mCancellable)
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [self = RefPtr{this}, this, args = RefPtr{aArgs},
           aMethod](RefPtr<GDBusProxy>&& aProxy) {
            WAKE_LOCK_LOG(
                "WakeLockTopic::DBusInhibitScreensaver() proxy created");
            DBusProxyCall(aProxy.get(), aMethod, args.get(),
                          G_DBUS_CALL_FLAGS_NONE, DBUS_TIMEOUT, mCancellable)
                ->Then(
                    GetCurrentSerialEventTarget(), __func__,
                    [s = RefPtr{this}, this](RefPtr<GVariant>&& aResult) {
                      if (!g_variant_is_of_type(aResult.get(),
                                                G_VARIANT_TYPE_TUPLE) ||
                          g_variant_n_children(aResult.get()) != 1) {
                        WAKE_LOCK_LOG(
                            "WakeLockTopic::DBusInhibitScreensaver() wrong "
                            "reply type %s\n",
                            g_variant_get_type_string(aResult.get()));
                        DBusInhibitFailed(/* aFatal */ true);
                        return;
                      }
                      RefPtr<GVariant> variant = dont_AddRef(
                          g_variant_get_child_value(aResult.get(), 0));
                      if (!g_variant_is_of_type(variant,
                                                G_VARIANT_TYPE_UINT32)) {
                        WAKE_LOCK_LOG(
                            "WakeLockTopic::DBusInhibitScreensaver() wrong "
                            "reply type %s\n",
                            g_variant_get_type_string(aResult.get()));
                        DBusInhibitFailed(/* aFatal */ true);
                        return;
                      }
                      DBusInhibitSucceeded(g_variant_get_uint32(variant));
                    },
                    [s = RefPtr{this}, this,
                     aMethod](GUniquePtr<GError>&& aError) {
                      // Failed to send inhibit request over proxy.
                      // Switch to another wake lock type.
                      WAKE_LOCK_LOG(
                          "WakeLockTopic::DBusInhibitFailed() %s call failed : "
                          "%s\n",
                          aMethod, aError->message);
                      DBusInhibitFailed(
                          /* aFatal */ !IsCancelledGError(aError.get()));
                    });
          },
          [self = RefPtr{this}, this](GUniquePtr<GError>&& aError) {
            // We failed to create DBus proxy. Switch to another
            // wake lock type.
            WAKE_LOCK_LOG(
                "WakeLockTopic::DBusInhibitScreensaver() Proxy creation "
                "failed: %s\n",
                aError->message);
            DBusInhibitFailed(/* aFatal */ !IsCancelledGError(aError.get()));
          });
}

void WakeLockTopic::DBusUninhibitScreensaver(const char* aName,
                                             const char* aPath,
                                             const char* aCall,
                                             const char* aMethod) {
  WAKE_LOCK_LOG(
      "WakeLockTopic::DBusUninhibitScreensaver() mWaitingForDBusInhibit %d "
      "mWaitingForDBusUninhibit %d request id %d",
      mWaitingForDBusInhibit, mWaitingForDBusUninhibit,
      mInhibitRequestID ? *mInhibitRequestID : -1);

  if (mWaitingForDBusUninhibit) {
    WAKE_LOCK_LOG("  already waiting to uninihibit, return");
    return;
  }

  if (mWaitingForDBusInhibit) {
    WAKE_LOCK_LOG("  cancel inihibit request");
    g_cancellable_cancel(mCancellable);
    mWaitingForDBusInhibit = false;
  }

  if (!mInhibitRequestID.isSome()) {
    WAKE_LOCK_LOG("  missing inihibit token, quit.");
    // missing uninhibit token, just quit.
    return;
  }
  mWaitingForDBusUninhibit = true;

  RefPtr<GVariant> variant =
      dont_AddRef(g_variant_ref_sink(g_variant_new("(u)", *mInhibitRequestID)));
  nsCOMPtr<nsISerialEventTarget> target = GetCurrentSerialEventTarget();
  widget::CreateDBusProxyForBus(
      G_BUS_TYPE_SESSION,
      GDBusProxyFlags(G_DBUS_PROXY_FLAGS_DO_NOT_CONNECT_SIGNALS |
                      G_DBUS_PROXY_FLAGS_DO_NOT_LOAD_PROPERTIES),
      /* aInterfaceInfo = */ nullptr, aName, aPath, aCall, mCancellable)
      ->Then(
          target, __func__,
          [self = RefPtr{this}, this, args = std::move(variant), target,
           aMethod](RefPtr<GDBusProxy>&& aProxy) {
            WAKE_LOCK_LOG(
                "WakeLockTopic::DBusUninhibitScreensaver() proxy created");
            DBusProxyCall(aProxy.get(), aMethod, args.get(),
                          G_DBUS_CALL_FLAGS_NONE, DBUS_TIMEOUT, mCancellable)
                ->Then(
                    target, __func__,
                    [s = RefPtr{this}, this](RefPtr<GVariant>&& aResult) {
                      DBusUninhibitSucceeded();
                    },
                    [s = RefPtr{this}, this,
                     aMethod](GUniquePtr<GError>&& aError) {
                      WAKE_LOCK_LOG(
                          "WakeLockTopic::DBusUninhibitFailed() %s call failed "
                          ": %s\n",
                          aMethod, aError->message);
                      DBusUninhibitFailed();
                    });
          },
          [self = RefPtr{this}, this](GUniquePtr<GError>&& aError) {
            WAKE_LOCK_LOG(
                "WakeLockTopic::DBusUninhibitFailed() Proxy creation failed: "
                "%s\n",
                aError->message);
            DBusUninhibitFailed();
          });
}

void WakeLockTopic::InhibitFreeDesktopPortal() {
  WAKE_LOCK_LOG(
      "WakeLockTopic::InhibitFreeDesktopPortal() mWaitingForDBusInhibit %d "
      "mWaitingForDBusUninhibit %d",
      mWaitingForDBusInhibit, mWaitingForDBusUninhibit);
  if (mWaitingForDBusInhibit) {
    WAKE_LOCK_LOG("  already waiting to inihibit, return");
    return;
  }
  if (mWaitingForDBusUninhibit) {
    WAKE_LOCK_LOG("  cancel un-inihibit request");
    g_cancellable_cancel(mCancellable);
    mWaitingForDBusUninhibit = false;
  }
  mWaitingForDBusInhibit = true;

  CreateDBusProxyForBus(
      G_BUS_TYPE_SESSION,
      GDBusProxyFlags(G_DBUS_PROXY_FLAGS_DO_NOT_CONNECT_SIGNALS |
                      G_DBUS_PROXY_FLAGS_DO_NOT_LOAD_PROPERTIES),
      nullptr, FREEDESKTOP_PORTAL_DESKTOP_TARGET,
      FREEDESKTOP_PORTAL_DESKTOP_OBJECT, FREEDESKTOP_PORTAL_DESKTOP_INTERFACE,
      mCancellable)
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [self = RefPtr{this}, this](RefPtr<GDBusProxy>&& aProxy) {
            GVariantBuilder b;
            g_variant_builder_init(&b, G_VARIANT_TYPE_VARDICT);
            g_variant_builder_add(&b, "{sv}", "reason",
                                  g_variant_new_string(self->mTopic.get()));

            // From
            // https://flatpak.github.io/xdg-desktop-portal/docs/#gdbus-org.freedesktop.portal.Inhibit
            DBusProxyCall(
                aProxy.get(), "Inhibit",
                g_variant_new("(sua{sv})", g_get_prgname(),
                              FREEDESKTOP_PORTAL_DESKTOP_INHIBIT_IDLE_FLAG, &b),
                G_DBUS_CALL_FLAGS_NONE, DBUS_TIMEOUT, mCancellable)
                ->Then(
                    GetCurrentSerialEventTarget(), __func__,
                    [s = RefPtr{this}, this](RefPtr<GVariant>&& aResult) {
                      gchar* requestObjectPath = nullptr;
                      g_variant_get(aResult, "(o)", &requestObjectPath);
                      if (!requestObjectPath) {
                        WAKE_LOCK_LOG(
                            "WakeLockTopic::InhibitFreeDesktopPortal(): Unable "
                            "to get requestObjectPath\n");
                        DBusInhibitFailed(/* aFatal */ true);
                        return;
                      }
                      WAKE_LOCK_LOG(
                          "WakeLockTopic::InhibitFreeDesktopPortal(): "
                          "inhibited, objpath to unihibit: %s\n",
                          requestObjectPath);
                      mRequestObjectPath.Adopt(requestObjectPath);
                      DBusInhibitSucceeded(0);
                    },
                    [s = RefPtr{this}, this](GUniquePtr<GError>&& aError) {
                      DBusInhibitFailed(
                          /* aFatal */ !IsCancelledGError(aError.get()));
                      WAKE_LOCK_LOG(
                          "Failed to create DBus proxy for "
                          "org.freedesktop.portal.Desktop: %s\n",
                          aError->message);
                    });
          },
          [self = RefPtr{this}, this](GUniquePtr<GError>&& aError) {
            WAKE_LOCK_LOG(
                "Failed to create DBus proxy for "
                "org.freedesktop.portal.Desktop: %s\n",
                aError->message);
            DBusInhibitFailed(/* aFatal */ !IsCancelledGError(aError.get()));
          });
}

void WakeLockTopic::InhibitFreeDesktopScreensaver() {
  WAKE_LOCK_LOG("InhibitFreeDesktopScreensaver()");
  DBusInhibitScreensaver(FREEDESKTOP_SCREENSAVER_TARGET,
                         FREEDESKTOP_SCREENSAVER_OBJECT,
                         FREEDESKTOP_SCREENSAVER_INTERFACE, "Inhibit",
                         dont_AddRef(g_variant_ref_sink(g_variant_new(
                             "(ss)", g_get_prgname(), mTopic.get()))));
}

void WakeLockTopic::InhibitFreeDesktopPower() {
  WAKE_LOCK_LOG("InhibitFreeDesktopPower()");
  DBusInhibitScreensaver(FREEDESKTOP_POWER_TARGET, FREEDESKTOP_POWER_OBJECT,
                         FREEDESKTOP_POWER_INTERFACE, "Inhibit",
                         dont_AddRef(g_variant_ref_sink(g_variant_new(
                             "(ss)", g_get_prgname(), mTopic.get()))));
}

void WakeLockTopic::InhibitGNOME() {
  WAKE_LOCK_LOG("InhibitGNOME()");
  static const uint32_t xid = 0;
  static const uint32_t flags = (1 << 3);  // Inhibit idle
  DBusInhibitScreensaver(
      SESSION_MANAGER_TARGET, SESSION_MANAGER_OBJECT, SESSION_MANAGER_INTERFACE,
      "Inhibit",
      dont_AddRef(g_variant_ref_sink(
          g_variant_new("(susu)", g_get_prgname(), xid, mTopic.get(), flags))));
}

void WakeLockTopic::UninhibitFreeDesktopPortal() {
  WAKE_LOCK_LOG(
      "WakeLockTopic::UninhibitFreeDesktopPortal() mWaitingForDBusInhibit %d "
      "mWaitingForDBusUninhibit %d object path: %s",
      mWaitingForDBusInhibit, mWaitingForDBusUninhibit,
      mRequestObjectPath.get());

  if (mWaitingForDBusUninhibit) {
    WAKE_LOCK_LOG("  already waiting to uninihibit, return");
    return;
  }

  if (mWaitingForDBusInhibit) {
    WAKE_LOCK_LOG("  cancel inihibit request");
    g_cancellable_cancel(mCancellable);
    mWaitingForDBusInhibit = false;
  }
  if (mRequestObjectPath.IsEmpty()) {
    WAKE_LOCK_LOG("UninhibitFreeDesktopPortal() failed: unknown object path\n");
    return;
  }
  mWaitingForDBusUninhibit = true;

  nsCOMPtr<nsISerialEventTarget> target = GetCurrentSerialEventTarget();
  CreateDBusProxyForBus(
      G_BUS_TYPE_SESSION,
      GDBusProxyFlags(G_DBUS_PROXY_FLAGS_DO_NOT_CONNECT_SIGNALS |
                      G_DBUS_PROXY_FLAGS_DO_NOT_LOAD_PROPERTIES),
      nullptr, FREEDESKTOP_PORTAL_DESKTOP_TARGET, mRequestObjectPath.get(),
      "org.freedesktop.portal.Request", mCancellable)
      ->Then(
          target, __func__,
          [self = RefPtr{this}, target, this](RefPtr<GDBusProxy>&& aProxy) {
            DBusProxyCall(aProxy.get(), "Close", nullptr,
                          G_DBUS_CALL_FLAGS_NONE, DBUS_TIMEOUT, mCancellable)
                ->Then(
                    target, __func__,
                    [s = RefPtr{this}, this](RefPtr<GVariant>&& aResult) {
                      DBusUninhibitSucceeded();
                      WAKE_LOCK_LOG(
                          "WakeLockTopic::UninhibitFreeDesktopPortal() Inhibit "
                          "removed\n");
                    },
                    [s = RefPtr{this}, this](GUniquePtr<GError>&& aError) {
                      DBusUninhibitFailed();
                      WAKE_LOCK_LOG(
                          "WakeLockTopic::UninhibitFreeDesktopPortal() "
                          "Removing inhibit failed: %s\n",
                          aError->message);
                    });
          },
          [self = RefPtr{this}, this](GUniquePtr<GError>&& aError) {
            WAKE_LOCK_LOG(
                "WakeLockTopic::UninhibitFreeDesktopPortal() Proxy creation "
                "failed: %s\n",
                aError->message);
            DBusUninhibitFailed();
          });
}

void WakeLockTopic::UninhibitFreeDesktopScreensaver() {
  WAKE_LOCK_LOG("UninhibitFreeDesktopScreensaver()");
  DBusUninhibitScreensaver(FREEDESKTOP_SCREENSAVER_TARGET,
                           FREEDESKTOP_SCREENSAVER_OBJECT,
                           FREEDESKTOP_SCREENSAVER_INTERFACE, "UnInhibit");
}

void WakeLockTopic::UninhibitFreeDesktopPower() {
  WAKE_LOCK_LOG("UninhibitFreeDesktopPower()");
  DBusUninhibitScreensaver(FREEDESKTOP_POWER_TARGET, FREEDESKTOP_POWER_OBJECT,
                           FREEDESKTOP_POWER_INTERFACE, "UnInhibit");
}

void WakeLockTopic::UninhibitGNOME() {
  WAKE_LOCK_LOG("UninhibitGNOME()");
  DBusUninhibitScreensaver(SESSION_MANAGER_TARGET, SESSION_MANAGER_OBJECT,
                           SESSION_MANAGER_INTERFACE, "Uninhibit");
}
#endif

#if defined(MOZ_X11)
// TODO: Merge with Idle service?
typedef Bool (*_XScreenSaverQueryExtension_fn)(Display* dpy, int* event_base,
                                               int* error_base);
typedef Bool (*_XScreenSaverQueryVersion_fn)(Display* dpy, int* major,
                                             int* minor);
typedef void (*_XScreenSaverSuspend_fn)(Display* dpy, Bool suspend);

static PRLibrary* sXssLib = nullptr;
static _XScreenSaverQueryExtension_fn _XSSQueryExtension = nullptr;
static _XScreenSaverQueryVersion_fn _XSSQueryVersion = nullptr;
static _XScreenSaverSuspend_fn _XSSSuspend = nullptr;

/* static */
bool WakeLockTopic::CheckXScreenSaverSupport() {
  if (!sXssLib) {
    sXssLib = PR_LoadLibrary("libXss.so.1");
    if (!sXssLib) {
      return false;
    }
  }

  _XSSQueryExtension = (_XScreenSaverQueryExtension_fn)PR_FindFunctionSymbol(
      sXssLib, "XScreenSaverQueryExtension");
  _XSSQueryVersion = (_XScreenSaverQueryVersion_fn)PR_FindFunctionSymbol(
      sXssLib, "XScreenSaverQueryVersion");
  _XSSSuspend = (_XScreenSaverSuspend_fn)PR_FindFunctionSymbol(
      sXssLib, "XScreenSaverSuspend");
  if (!_XSSQueryExtension || !_XSSQueryVersion || !_XSSSuspend) {
    return false;
  }

  GdkDisplay* gDisplay = gdk_display_get_default();
  if (!GdkIsX11Display(gDisplay)) {
    return false;
  }
  Display* display = GDK_DISPLAY_XDISPLAY(gDisplay);

  int throwaway;
  if (!_XSSQueryExtension(display, &throwaway, &throwaway)) return false;

  int major, minor;
  if (!_XSSQueryVersion(display, &major, &minor)) return false;
  // Needs to be compatible with version 1.1
  if (major != 1) return false;
  if (minor < 1) return false;

  WAKE_LOCK_LOG("XScreenSaver supported.");
  return true;
}

/* static */
bool WakeLockTopic::InhibitXScreenSaver(bool inhibit) {
  WAKE_LOCK_LOG("InhibitXScreenSaver %d", inhibit);

  // Should only be called if CheckXScreenSaverSupport returns true.
  // There's a couple of safety checks here nonetheless.
  if (!_XSSSuspend) {
    return false;
  }
  GdkDisplay* gDisplay = gdk_display_get_default();
  if (!GdkIsX11Display(gDisplay)) {
    return false;
  }
  Display* display = GDK_DISPLAY_XDISPLAY(gDisplay);
  _XSSSuspend(display, inhibit);

  WAKE_LOCK_LOG("InhibitXScreenSaver %d succeeded", inhibit);
  mInhibited = inhibit;
  return true;
}
#endif

#if defined(MOZ_WAYLAND)
/* static */
bool WakeLockTopic::CheckWaylandIdleInhibitSupport() {
  nsWaylandDisplay* waylandDisplay = WaylandDisplayGet();
  return waylandDisplay && waylandDisplay->GetIdleInhibitManager() != nullptr;
}

bool WakeLockTopic::InhibitWaylandIdle() {
  WAKE_LOCK_LOG("InhibitWaylandIdle()");

  nsWaylandDisplay* waylandDisplay = WaylandDisplayGet();
  if (!waylandDisplay) {
    return false;
  }

  nsWindow* focusedWindow = nsWindow::GetFocusedWindow();
  if (!focusedWindow) {
    return false;
  }

  UninhibitWaylandIdle();

  MozContainerSurfaceLock lock(focusedWindow->GetMozContainer());
  struct wl_surface* waylandSurface = lock.GetSurface();
  if (waylandSurface) {
    mWaylandInhibitor = zwp_idle_inhibit_manager_v1_create_inhibitor(
        waylandDisplay->GetIdleInhibitManager(), waylandSurface);
    mInhibited = true;
  }

  WAKE_LOCK_LOG("InhibitWaylandIdle() %s",
                !!mWaylandInhibitor ? "succeeded" : "failed");
  return !!mWaylandInhibitor;
}

bool WakeLockTopic::UninhibitWaylandIdle() {
  WAKE_LOCK_LOG("UninhibitWaylandIdle() mWaylandInhibitor %p",
                mWaylandInhibitor);

  mInhibited = false;
  if (!mWaylandInhibitor) {
    return false;
  }
  zwp_idle_inhibitor_v1_destroy(mWaylandInhibitor);
  mWaylandInhibitor = nullptr;
  return true;
}
#endif

bool WakeLockTopic::SendInhibit() {
  WAKE_LOCK_LOG("WakeLockTopic::SendInhibit() WakeLockType %s",
                WakeLockTypeNames[sWakeLockType]);
  MOZ_ASSERT(sWakeLockType != Initial);

  switch (sWakeLockType) {
#if defined(MOZ_ENABLE_DBUS)
    case FreeDesktopPortal:
      InhibitFreeDesktopPortal();
      break;
    case FreeDesktopScreensaver:
      InhibitFreeDesktopScreensaver();
      break;
    case FreeDesktopPower:
      InhibitFreeDesktopPower();
      break;
    case GNOME:
      InhibitGNOME();
      break;
#endif
#if defined(MOZ_X11)
    case XScreenSaver:
      return InhibitXScreenSaver(true);
#endif
#if defined(MOZ_WAYLAND)
    case WaylandIdleInhibit:
      return InhibitWaylandIdle();
#endif
    default:
      return false;
  }
  return true;
}

bool WakeLockTopic::SendUninhibit() {
  WAKE_LOCK_LOG("WakeLockTopic::SendUninhibit() WakeLockType %s",
                WakeLockTypeNames[sWakeLockType]);
  MOZ_ASSERT(sWakeLockType != Initial);
  switch (sWakeLockType) {
#if defined(MOZ_ENABLE_DBUS)
    case FreeDesktopPortal:
      UninhibitFreeDesktopPortal();
      break;
    case FreeDesktopScreensaver:
      UninhibitFreeDesktopScreensaver();
      break;
    case FreeDesktopPower:
      UninhibitFreeDesktopPower();
      break;
    case GNOME:
      UninhibitGNOME();
      break;
#endif
#if defined(MOZ_X11)
    case XScreenSaver:
      return InhibitXScreenSaver(false);
#endif
#if defined(MOZ_WAYLAND)
    case WaylandIdleInhibit:
      return UninhibitWaylandIdle();
#endif
    default:
      return false;
  }
  return true;
}

nsresult WakeLockTopic::InhibitScreensaver() {
  WAKE_LOCK_LOG("WakeLockTopic::InhibitScreensaver() Inhibited %d", mInhibited);

  if (mInhibited) {
    // Screensaver is inhibited. Nothing to do here.
    return NS_OK;
  }
  mShouldInhibit = true;

  // Iterate through wake lock types in case of failure.
  while (!SendInhibit()) {
    // We don't switch away from native locks. Just try again.
    if (IsNativeWakeLock(sWakeLockType)) {
      return NS_ERROR_FAILURE;
    }
    if (!SwitchToNextWakeLockType()) {
      return NS_ERROR_FAILURE;
    }
  }

  return (sWakeLockType != Unsupported) ? NS_OK : NS_ERROR_FAILURE;
}

void WakeLockTopic::Shutdown() {
  WAKE_LOCK_LOG("WakeLockTopic::Shutdown() state %d", mInhibited);
#ifdef MOZ_ENABLE_DBUS
  if (mWaitingForDBusUninhibit) {
    return;
  }
  g_cancellable_cancel(mCancellable);
#endif
  if (mInhibited) {
    UninhibitScreensaver();
  }
}

nsresult WakeLockTopic::UninhibitScreensaver() {
  WAKE_LOCK_LOG("WakeLockTopic::UninhibitScreensaver() Inhibited %d",
                mInhibited);

  if (!mInhibited) {
    // Screensaver isn't inhibited. Nothing to do here.
    return NS_OK;
  }
  mShouldInhibit = false;

  // Don't switch wake lock type in case of failure.
  // We need to use the same lock/unlock type.
  return SendUninhibit() ? NS_OK : NS_ERROR_FAILURE;
}

bool WakeLockTopic::IsWakeLockTypeAvailable(int aWakeLockType) {
  switch (aWakeLockType) {
#if defined(MOZ_ENABLE_DBUS)
    case FreeDesktopPortal:
    case FreeDesktopScreensaver:
    case FreeDesktopPower:
    case GNOME:
      return true;
#endif
#if defined(MOZ_X11)
    case XScreenSaver:
      if (!GdkIsX11Display()) {
        return false;
      }
      if (!CheckXScreenSaverSupport()) {
        WAKE_LOCK_LOG("  XScreenSaverSupport is missing!");
        return false;
      }
      return true;
#endif
#if defined(MOZ_WAYLAND)
    case WaylandIdleInhibit:
      if (!GdkIsWaylandDisplay()) {
        return false;
      }
      if (!CheckWaylandIdleInhibitSupport()) {
        WAKE_LOCK_LOG("  WaylandIdleInhibitSupport is missing!");
        return false;
      }
      return true;
#endif
    default:
      return false;
  }
}

bool WakeLockTopic::IsNativeWakeLock(int aWakeLockType) {
  switch (aWakeLockType) {
#if defined(MOZ_X11)
    case XScreenSaver:
      return true;
#endif
#if defined(MOZ_WAYLAND)
    case WaylandIdleInhibit:
      return true;
#endif
    default:
      return false;
  }
}

bool WakeLockTopic::SwitchToNextWakeLockType() {
  WAKE_LOCK_LOG("WakeLockTopic::SwitchToNextWakeLockType() WakeLockType %s",
                WakeLockTypeNames[sWakeLockType]);

  if (sWakeLockType == Unsupported) {
    return false;
  }

#ifdef MOZ_LOGGING
  auto printWakeLocktype = MakeScopeExit([&] {
    WAKE_LOCK_LOG("  switched to WakeLockType %s",
                  WakeLockTypeNames[sWakeLockType]);
  });
#endif

#if defined(MOZ_ENABLE_DBUS)
  if (IsDBusWakeLock(sWakeLockType)) {
    // We're switching out of DBus wakelock - clear our recent DBus states.
    mWaitingForDBusInhibit = false;
    mWaitingForDBusUninhibit = false;
    mInhibited = false;
    ClearDBusInhibitToken();
  }
#endif

  while (sWakeLockType != Unsupported) {
    sWakeLockType++;
    if (IsWakeLockTypeAvailable(sWakeLockType)) {
      return true;
    }
  }
  return false;
}

WakeLockListener::WakeLockListener() = default;

WakeLockListener::~WakeLockListener() {
  for (const auto& topic : mTopics.Values()) {
    topic->Shutdown();
  }
}

nsresult WakeLockListener::Callback(const nsAString& topic,
                                    const nsAString& state) {
  if (!topic.Equals(u"screen"_ns) && !topic.Equals(u"video-playing"_ns) &&
      !topic.Equals(u"autoscroll"_ns)) {
    return NS_OK;
  }

  RefPtr<WakeLockTopic> topicLock = mTopics.LookupOrInsertWith(
      topic, [&] { return MakeRefPtr<WakeLockTopic>(topic); });

  // Treat "locked-background" the same as "unlocked" on desktop linux.
  bool shouldLock = state.EqualsLiteral("locked-foreground");
  WAKE_LOCK_LOG("WakeLockListener topic %s state %s request lock %d",
                NS_ConvertUTF16toUTF8(topic).get(),
                NS_ConvertUTF16toUTF8(state).get(), shouldLock);

  return shouldLock ? topicLock->InhibitScreensaver()
                    : topicLock->UninhibitScreensaver();
}
