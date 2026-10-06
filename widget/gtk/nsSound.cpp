/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nscore.h"
#include "prlink.h"

#include "nsSound.h"

#include "CubebUtils.h"
#include "HeadlessSound.h"
#include "nsCOMPtr.h"
#include "nsServiceManagerUtils.h"
#include "nsString.h"
#include "mozilla/WidgetUtils.h"
#include "nsIXULAppInfo.h"
#include "gfxPlatform.h"
#include "mozilla/ClearOnShutdown.h"

#include <unistd.h>

#include <gtk/gtk.h>
static PRLibrary* libcanberra = nullptr;

/* used to play sounds with libcanberra. */
typedef struct _ca_context ca_context;
typedef struct _ca_proplist ca_proplist;

typedef void (*ca_finish_callback_t)(ca_context* c, uint32_t id, int error_code,
                                     void* userdata);

typedef int (*ca_context_create_fn)(ca_context**);
typedef int (*ca_context_destroy_fn)(ca_context*);
typedef int (*ca_context_set_driver_fn)(ca_context*, const char*);
typedef int (*ca_context_play_fn)(ca_context* c, uint32_t id, ...);
typedef int (*ca_context_change_props_fn)(ca_context* c, ...);
typedef int (*ca_proplist_create_fn)(ca_proplist**);
typedef int (*ca_proplist_destroy_fn)(ca_proplist*);
typedef int (*ca_proplist_sets_fn)(ca_proplist* c, const char* key,
                                   const char* value);

static ca_context_create_fn ca_context_create;
static ca_context_destroy_fn ca_context_destroy;
static ca_context_set_driver_fn ca_context_set_driver;
static ca_context_play_fn ca_context_play;
static ca_context_change_props_fn ca_context_change_props;
static ca_proplist_create_fn ca_proplist_create;
static ca_proplist_destroy_fn ca_proplist_destroy;
static ca_proplist_sets_fn ca_proplist_sets;

static ca_context* ca_context_get_default() {
  // This allows us to avoid race conditions with freeing the context by handing
  // that responsibility to Glib, and still use one context at a time
  static GPrivate ctx_private =
      G_PRIVATE_INIT((GDestroyNotify)ca_context_destroy);

  ca_context* ctx = (ca_context*)g_private_get(&ctx_private);

  if (ctx) {
    return ctx;
  }

  ca_context_create(&ctx);
  if (!ctx) {
    return nullptr;
  }

#if !defined(XP_OPENBSD) && ((defined MOZ_ALSA) || (defined MOZ_SNDIO))
  {
    // On most platforms, libcanberra is configured to prefer pulse.
    // If the pulse daemon is not running then every time a sound is played
    // libcanberra will dlopen libpulse.so and try to create a new context,
    // which will fail.
    // We don't really want this to happen every time a sound is played (this
    // will stall the main thread, for instance, when opening a context menu),
    // so try to use ALSA or sndio if cubeb is already using that.
    // There is no point in doing this on OpenBSD, as system libcanberra
    // already prefers sndio there, which should always work.
    nsAutoString backend;
    mozilla::CubebUtils::GetCurrentBackend(backend);

    // Only check for each backend if we have support compiled in.
#  ifdef MOZ_ALSA
    if (backend == u"alsa"_ns) {
      ca_context_set_driver(ctx, "alsa");
    }
#  endif
#  ifdef MOZ_SNDIO
    if (backend == u"sndio"_ns) {
      ca_context_set_driver(ctx, "sndio");
    }
#  endif
  }
#endif
  g_private_set(&ctx_private, ctx);

  GtkSettings* settings = gtk_settings_get_default();
  if (g_object_class_find_property(G_OBJECT_GET_CLASS(settings),
                                   "gtk-sound-theme-name")) {
    gchar* sound_theme_name = nullptr;
    g_object_get(settings, "gtk-sound-theme-name", &sound_theme_name, nullptr);

    if (sound_theme_name) {
      ca_context_change_props(ctx, "canberra.xdg-theme.name", sound_theme_name,
                              nullptr);
      g_free(sound_theme_name);
    }
  }

  nsAutoString wbrand;
  mozilla::widget::WidgetUtils::GetBrandShortName(wbrand);
  ca_context_change_props(ctx, "application.name",
                          NS_ConvertUTF16toUTF8(wbrand).get(), nullptr);

  nsCOMPtr<nsIXULAppInfo> appInfo =
      do_GetService("@mozilla.org/xre/app-info;1");
  if (appInfo) {
    nsAutoCString version;
    appInfo->GetVersion(version);

    ca_context_change_props(ctx, "application.version", version.get(), nullptr);
  }

  ca_context_change_props(ctx, "application.icon_name", MOZ_APP_NAME, nullptr);

  return ctx;
}

NS_IMPL_ISUPPORTS(nsSound, nsISound)

////////////////////////////////////////////////////////////////////////
nsSound::nsSound() { mInited = false; }

nsSound::~nsSound() = default;

NS_IMETHODIMP
nsSound::Init() {
  // This function is designed so that no library is compulsory, and
  // one library missing doesn't cause the other(s) to not be used.
  if (mInited) return NS_OK;

  mInited = true;

  if (!libcanberra) {
    libcanberra = PR_LoadLibrary("libcanberra.so.0");
    if (libcanberra) {
      ca_context_create = (ca_context_create_fn)PR_FindFunctionSymbol(
          libcanberra, "ca_context_create");
      if (!ca_context_create) {
#ifdef MOZ_TSAN
        // With TSan, we cannot unload libcanberra once we have loaded it
        // because TSan does not support unloading libraries that are matched
        // from its suppression list. Hence we just keep the library loaded in
        // TSan builds.
        libcanberra = nullptr;
        return NS_OK;
#endif
        PR_UnloadLibrary(libcanberra);
        libcanberra = nullptr;
      } else {
        // at this point we know we have a good libcanberra library
        ca_context_destroy = (ca_context_destroy_fn)PR_FindFunctionSymbol(
            libcanberra, "ca_context_destroy");
        ca_context_set_driver = (ca_context_set_driver_fn)PR_FindFunctionSymbol(
            libcanberra, "ca_context_set_driver");
        ca_context_play = (ca_context_play_fn)PR_FindFunctionSymbol(
            libcanberra, "ca_context_play");
        ca_context_change_props =
            (ca_context_change_props_fn)PR_FindFunctionSymbol(
                libcanberra, "ca_context_change_props");
        ca_proplist_create = (ca_proplist_create_fn)PR_FindFunctionSymbol(
            libcanberra, "ca_proplist_create");
        ca_proplist_destroy = (ca_proplist_destroy_fn)PR_FindFunctionSymbol(
            libcanberra, "ca_proplist_destroy");
        ca_proplist_sets = (ca_proplist_sets_fn)PR_FindFunctionSymbol(
            libcanberra, "ca_proplist_sets");
      }
    }
  }

  return NS_OK;
}

/* static */
void nsSound::Shutdown() {
#ifndef MOZ_TSAN
  if (libcanberra) {
    PR_UnloadLibrary(libcanberra);
    libcanberra = nullptr;
  }
#endif
}

namespace mozilla {
namespace sound {
StaticRefPtr<nsISound> sInstance;
}
}  // namespace mozilla
/* static */
already_AddRefed<nsISound> nsSound::GetInstance() {
  using namespace mozilla::sound;

  if (!sInstance) {
    if (gfxPlatform::IsHeadless()) {
      sInstance = new mozilla::widget::HeadlessSound();
    } else {
      sInstance = new nsSound();
    }
    ClearOnShutdown(&sInstance);
  }

  RefPtr<nsISound> service = sInstance.get();
  return service.forget();
}

NS_IMETHODIMP nsSound::Beep() {
  ::gdk_beep();
  return NS_OK;
}

NS_IMETHODIMP nsSound::PlayEventSound(uint32_t aEventId) {
  if (!mInited) Init();

  if (!libcanberra) return NS_OK;

  // Do we even want alert sounds?
  GtkSettings* settings = gtk_settings_get_default();

  if (g_object_class_find_property(G_OBJECT_GET_CLASS(settings),
                                   "gtk-enable-event-sounds")) {
    gboolean enable_sounds = TRUE;
    g_object_get(settings, "gtk-enable-event-sounds", &enable_sounds, nullptr);

    if (!enable_sounds) {
      return NS_OK;
    }
  }

  ca_context* ctx = ca_context_get_default();
  if (!ctx) {
    return NS_ERROR_OUT_OF_MEMORY;
  }

  switch (aEventId) {
    case EVENT_ALERT_DIALOG_OPEN:
      ca_context_play(ctx, 0, "event.id", "dialog-warning", nullptr);
      break;
    case EVENT_CONFIRM_DIALOG_OPEN:
      ca_context_play(ctx, 0, "event.id", "dialog-question", nullptr);
      break;
    case EVENT_NEW_MAIL_RECEIVED:
      ca_context_play(ctx, 0, "event.id", "message-new-email", nullptr);
      break;
    case EVENT_MENU_EXECUTE:
      ca_context_play(ctx, 0, "event.id", "menu-click", nullptr);
      break;
    case EVENT_MENU_POPUP:
      ca_context_play(ctx, 0, "event.id", "menu-popup", nullptr);
      break;
  }
  return NS_OK;
}
