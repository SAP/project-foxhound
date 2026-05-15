/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <dlfcn.h>
#include <gtk/gtk.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

#include "AsyncDBus.h"
#include "nsGtkUtils.h"
#include "nsIFileURL.h"
#include "nsIGIOService.h"
#include "nsIURI.h"
#include "nsIWidget.h"
#include "nsIFile.h"
#include "nsIStringBundle.h"
#include "nsWindow.h"
#include "mozilla/Components.h"
#include "mozilla/Preferences.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/Document.h"

#include "nsArrayEnumerator.h"
#include "nsEnumeratorUtils.h"
#include "nsNetUtil.h"
#include "nsReadableUtils.h"
#include "MozContainer.h"
#include "WidgetUtilsGtk.h"

#include "gfxPlatform.h"
#include "nsXULAppAPI.h"
#include "nsFilePicker.h"

#undef LOG
#ifdef MOZ_LOGGING
#  include "mozilla/Logging.h"
extern mozilla::LazyLogModule gWidgetLog;
#  define LOG(...) MOZ_LOG(gWidgetLog, mozilla::LogLevel::Debug, (__VA_ARGS__))
#else
#  define LOG(...)
#endif /* MOZ_LOGGING */

using namespace mozilla;
using mozilla::dom::Promise;

#define MAX_PREVIEW_SIZE 180
// bug 1935858
#define MAX_PREVIEW_SOURCE_SIZE 8192

static nsIFile* sPrevDisplayDirectory = nullptr;

void nsFilePicker::Shutdown() { NS_IF_RELEASE(sPrevDisplayDirectory); }

#ifdef MOZ_ENABLE_DBUS
static RefPtr<widget::DBusProxyPromise> CreatePickerPortalPromise() {
  return widget::CreateDBusProxyForBus(
      G_BUS_TYPE_SESSION, G_DBUS_PROXY_FLAGS_DO_NOT_CONNECT_SIGNALS,
      /* aInterfaceInfo = */ nullptr, "org.freedesktop.portal.Desktop",
      "/org/freedesktop/portal/desktop", "org.freedesktop.portal.FileChooser");
}
#endif

static GtkFileChooserAction GetGtkFileChooserAction(nsIFilePicker::Mode aMode) {
  GtkFileChooserAction action;

  switch (aMode) {
    case nsIFilePicker::modeSave:
      action = GTK_FILE_CHOOSER_ACTION_SAVE;
      break;

    case nsIFilePicker::modeGetFolder:
      action = GTK_FILE_CHOOSER_ACTION_SELECT_FOLDER;
      break;

    case nsIFilePicker::modeOpen:
    case nsIFilePicker::modeOpenMultiple:
      action = GTK_FILE_CHOOSER_ACTION_OPEN;
      break;

    default:
      NS_WARNING("Unknown nsIFilePicker mode");
      action = GTK_FILE_CHOOSER_ACTION_OPEN;
      break;
  }

  return action;
}

static void UpdateFilePreviewWidget(GtkFileChooser* file_chooser,
                                    gpointer preview_widget_voidptr) {
  GtkImage* preview_widget = GTK_IMAGE(preview_widget_voidptr);
  char* image_filename = gtk_file_chooser_get_preview_filename(file_chooser);
  struct stat st_buf;

  if (!image_filename) {
    gtk_file_chooser_set_preview_widget_active(file_chooser, FALSE);
    return;
  }

  gint preview_width = 0;
  gint preview_height = 0;
  /* check type of file
   * if file is named pipe, Open is blocking which may lead to UI
   *  nonresponsiveness; if file is directory/socket, it also isn't
   *  likely to get preview */
  if (stat(image_filename, &st_buf) || (!S_ISREG(st_buf.st_mode))) {
    g_free(image_filename);
    gtk_file_chooser_set_preview_widget_active(file_chooser, FALSE);
    return; /* stat failed or file is not regular */
  }

  GdkPixbufFormat* preview_format =
      gdk_pixbuf_get_file_info(image_filename, &preview_width, &preview_height);
  if (!preview_format || preview_width <= 0 || preview_height <= 0 ||
      preview_width > MAX_PREVIEW_SOURCE_SIZE ||
      preview_height > MAX_PREVIEW_SOURCE_SIZE) {
    g_free(image_filename);
    gtk_file_chooser_set_preview_widget_active(file_chooser, FALSE);
    return;
  }

  GdkPixbuf* preview_pixbuf = nullptr;
  // Only scale down images that are too big
  if (preview_width > MAX_PREVIEW_SIZE || preview_height > MAX_PREVIEW_SIZE) {
    preview_pixbuf = gdk_pixbuf_new_from_file_at_size(
        image_filename, MAX_PREVIEW_SIZE, MAX_PREVIEW_SIZE, nullptr);
  } else {
    preview_pixbuf = gdk_pixbuf_new_from_file(image_filename, nullptr);
  }

  g_free(image_filename);

  if (!preview_pixbuf) {
    gtk_file_chooser_set_preview_widget_active(file_chooser, FALSE);
    return;
  }

  GdkPixbuf* preview_pixbuf_temp = preview_pixbuf;
  preview_pixbuf = gdk_pixbuf_apply_embedded_orientation(preview_pixbuf_temp);
  g_object_unref(preview_pixbuf_temp);

  // This is the easiest way to do center alignment without worrying about
  // containers Minimum 3px padding each side (hence the 6) just to make things
  // nice
  gint x_padding =
      (MAX_PREVIEW_SIZE + 6 - gdk_pixbuf_get_width(preview_pixbuf)) / 2;
  g_object_set(preview_widget, "padding", x_padding, 0, nullptr);

  gtk_image_set_from_pixbuf(preview_widget, preview_pixbuf);
  g_object_unref(preview_pixbuf);
  gtk_file_chooser_set_preview_widget_active(file_chooser, TRUE);
}

static nsAutoCString MakeCaseInsensitiveShellGlob(const char* aPattern) {
  // aPattern is UTF8
  nsAutoCString result;
  unsigned int len = strlen(aPattern);

  for (unsigned int i = 0; i < len; i++) {
    if (!g_ascii_isalpha(aPattern[i])) {
      // non-ASCII characters will also trigger this path, so unicode
      // is safely handled albeit case-sensitively
      result.Append(aPattern[i]);
      continue;
    }

    // add the lowercase and uppercase version of a character to a bracket
    // match, so it matches either the lowercase or uppercase char.
    result.Append('[');
    result.Append(g_ascii_tolower(aPattern[i]));
    result.Append(g_ascii_toupper(aPattern[i]));
    result.Append(']');
  }

  return result;
}

NS_IMPL_ISUPPORTS(nsFilePicker, nsIFilePicker)

nsFilePicker::nsFilePicker()
#ifdef MOZ_ENABLE_DBUS
    : mPreferPortal(widget::ShouldUsePortal(widget::PortalKind::FilePicker))
#endif
{
}

nsFilePicker::~nsFilePicker() = default;

static void ReadMultipleFiles(gpointer filename, gpointer array) {
  nsCOMPtr<nsIFile> localfile;
  nsresult rv =
      NS_NewNativeLocalFile(nsDependentCString(static_cast<char*>(filename)),
                            getter_AddRefs(localfile));
  if (NS_SUCCEEDED(rv)) {
    nsCOMArray<nsIFile>& files = *static_cast<nsCOMArray<nsIFile>*>(array);
    files.AppendObject(localfile);
  }

  g_free(filename);
}

void nsFilePicker::ReadValuesFromNonPortalFileChooser(
    GtkFileChooser* file_chooser) {
  mFiles.Clear();

  if (mMode == nsIFilePicker::modeOpenMultiple) {
    mFileURL.Truncate();

    GSList* list = gtk_file_chooser_get_filenames(file_chooser);
    g_slist_foreach(list, ReadMultipleFiles, static_cast<gpointer>(&mFiles));
    g_slist_free(list);
  } else {
    gchar* filename = gtk_file_chooser_get_uri(file_chooser);
    mFileURL.Assign(filename);
    g_free(filename);
  }

  GtkFileFilter* filter = gtk_file_chooser_get_filter(file_chooser);
  GSList* filter_list = gtk_file_chooser_list_filters(file_chooser);

  mSelectedType = g_slist_index(filter_list, filter);
  g_slist_free(filter_list);
}

void nsFilePicker::InitNative(nsIWidget* aParent, const nsAString& aTitle) {
  mParentWidget = nsWindow::FromWidget(aParent);
  mTitle.Assign(aTitle);

  if (mParentWidget) {
    if (GtkWidget* widget = mParentWidget->GetGtkWidget()) {
      if (auto* title = gtk_window_get_title(GTK_WINDOW(widget))) {
        mTitle.AppendLiteral(" - ");
        mTitle.Append(NS_ConvertUTF8toUTF16(title));
      }
    }
  }
}

NS_IMETHODIMP
nsFilePicker::IsModeSupported(nsIFilePicker::Mode aMode, JSContext* aCx,
                              Promise** aRetPromise) {
#ifdef MOZ_ENABLE_DBUS
  if (!mPreferPortal || aMode != nsIFilePicker::modeGetFolder) {
    return nsBaseFilePicker::IsModeSupported(aMode, aCx, aRetPromise);
  }

  MOZ_ASSERT(aCx);
  MOZ_ASSERT(aRetPromise);

  nsIGlobalObject* globalObject = xpc::CurrentNativeGlobal(aCx);
  if (NS_WARN_IF(!globalObject)) {
    return NS_ERROR_FAILURE;
  }

  ErrorResult result;
  RefPtr<Promise> retPromise = Promise::Create(globalObject, result);
  if (NS_WARN_IF(result.Failed())) {
    return result.StealNSResult();
  }

  CreatePickerPortalPromise()->Then(
      GetCurrentSerialEventTarget(), __func__,
      [retPromise](RefPtr<GDBusProxy>&& aProxy) {
        const char kFreedesktopPortalVersionProperty[] = "version";
        // Folder selection was added in version 3 of xdg-desktop-portal
        const uint32_t kFreedesktopPortalMinimumVersion = 3;
        uint32_t foundVersion = 0;

        RefPtr<GVariant> property =
            dont_AddRef(g_dbus_proxy_get_cached_property(
                aProxy, kFreedesktopPortalVersionProperty));

        if (property) {
          foundVersion = g_variant_get_uint32(property);
          LOG("Found portal version: %u", foundVersion);
        }

        retPromise->MaybeResolve(foundVersion >=
                                 kFreedesktopPortalMinimumVersion);
      },
      [retPromise](GUniquePtr<GError>&& aError) {
        g_printerr("Failed to create DBUS proxy: %s\n", aError->message);
        retPromise->MaybeReject(NS_ERROR_FAILURE);
      });

  retPromise.forget(aRetPromise);
  return NS_OK;
#else
  return nsBaseFilePicker::IsModeSupported(aMode, aCx, aRetPromise);
#endif
}

NS_IMETHODIMP
nsFilePicker::AppendFilters(int32_t aFilterMask) {
  mAllowURLs = !!(aFilterMask & filterAllowURLs);
  return nsBaseFilePicker::AppendFilters(aFilterMask);
}

NS_IMETHODIMP
nsFilePicker::AppendFilter(const nsAString& aTitle, const nsAString& aFilter) {
  if (aFilter.EqualsLiteral("..apps")) {
    // No platform specific thing we can do here, really....
    return NS_OK;
  }

  nsAutoCString filter, name;
  CopyUTF16toUTF8(aFilter, filter);
  CopyUTF16toUTF8(aTitle, name);

  mFilters.AppendElement(filter);
  mFilterNames.AppendElement(name);

  return NS_OK;
}

NS_IMETHODIMP
nsFilePicker::SetDefaultString(const nsAString& aString) {
  mDefault = aString;

  return NS_OK;
}

NS_IMETHODIMP
nsFilePicker::GetDefaultString(nsAString& aString) {
  // Per API...
  return NS_ERROR_FAILURE;
}

NS_IMETHODIMP
nsFilePicker::SetDefaultExtension(const nsAString& aExtension) {
  mDefaultExtension = aExtension;

  return NS_OK;
}

NS_IMETHODIMP
nsFilePicker::GetDefaultExtension(nsAString& aExtension) {
  aExtension = mDefaultExtension;

  return NS_OK;
}

NS_IMETHODIMP
nsFilePicker::GetFilterIndex(int32_t* aFilterIndex) {
  *aFilterIndex = mSelectedType;

  return NS_OK;
}

NS_IMETHODIMP
nsFilePicker::SetFilterIndex(int32_t aFilterIndex) {
  mSelectedType = aFilterIndex;
  return NS_OK;
}

NS_IMETHODIMP
nsFilePicker::GetFile(nsIFile** aFile) {
  NS_ENSURE_ARG_POINTER(aFile);

  *aFile = nullptr;
  nsCOMPtr<nsIURI> uri;
  nsresult rv = GetFileURL(getter_AddRefs(uri));
  if (!uri) {
    return rv;
  }

  nsCOMPtr<nsIFileURL> fileURL(do_QueryInterface(uri, &rv));
  NS_ENSURE_SUCCESS(rv, rv);

  nsCOMPtr<nsIFile> file;
  rv = fileURL->GetFile(getter_AddRefs(file));
  NS_ENSURE_SUCCESS(rv, rv);

  file.forget(aFile);
  return NS_OK;
}

NS_IMETHODIMP
nsFilePicker::GetFileURL(nsIURI** aFileURL) {
  *aFileURL = nullptr;
  return NS_NewURI(aFileURL, mFileURL);
}

NS_IMETHODIMP
nsFilePicker::GetFiles(nsISimpleEnumerator** aFiles) {
  NS_ENSURE_ARG_POINTER(aFiles);

  if (mMode == nsIFilePicker::modeOpenMultiple) {
    return NS_NewArrayEnumerator(aFiles, mFiles, NS_GET_IID(nsIFile));
  }

  return NS_ERROR_FAILURE;
}

NS_IMETHODIMP
nsFilePicker::Open(nsIFilePickerShownCallback* aCallback) {
  // Can't show two dialogs concurrently with the same filepicker
  if (mIsOpen) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  if (MaybeBlockFilePicker(aCallback)) {
    return NS_OK;
  }

  // Don't attempt to open a real file-picker in headless mode.
  if (gfxPlatform::IsHeadless()) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  mIsOpen = true;
  mCallback = aCallback;

#ifdef MOZ_ENABLE_DBUS
  if (mPreferPortal) {
    TryOpenPortal();
    return NS_OK;
  }
#endif

  OpenNonPortal();
  return NS_OK;
}

static GtkFileFilter* NewFilter(const nsCString& aFilter,
                                const nsCString& aName) {
  // This is fun... the GTK file picker does not accept a list of filters
  // so we need to split out each string, and add it manually.
  char** patterns = g_strsplit(aFilter.get(), ";", -1);
  if (!patterns) {
    return nullptr;
  }
  GtkFileFilter* filter = gtk_file_filter_new();
  for (int j = 0; patterns[j] != nullptr; ++j) {
    nsAutoCString caseInsensitiveFilter =
        MakeCaseInsensitiveShellGlob(g_strstrip(patterns[j]));
    gtk_file_filter_add_pattern(filter, caseInsensitiveFilter.get());
  }
  g_strfreev(patterns);
  // If we have a name for our filter, let's use that, otherwise let's use the
  // pattern.
  gtk_file_filter_set_name(filter,
                           aName.IsEmpty() ? aFilter.get() : aName.get());
  return filter;
}

#ifdef MOZ_ENABLE_DBUS
void nsFilePicker::TryOpenPortal() {
  MOZ_DIAGNOSTIC_ASSERT(!mPortalProxy);
  CreatePickerPortalPromise()->Then(
      GetCurrentSerialEventTarget(), __func__,
      [self = RefPtr{this}](RefPtr<GDBusProxy>&& aProxy) {
        self->mPortalProxy = std::move(aProxy);
        self->FinishOpeningPortal();
      },
      [self = RefPtr{this}](GUniquePtr<GError>&& aError) {
        g_printerr("Failed to create DBUS proxy: %s\n", aError->message);
        self->OpenNonPortal();
      });
}

void nsFilePicker::FinishOpeningPortal() {
  MOZ_DIAGNOSTIC_ASSERT(mPortalProxy);
  MOZ_DIAGNOSTIC_ASSERT(!mExportedParent);
  nsAutoCString parentWindow;
  if (mParentWidget) {
    mParentWidget->ExportHandle()->Then(
        GetCurrentSerialEventTarget(), __func__,
        [self = RefPtr{this}](nsCString&& aResult) {
          self->mExportedParent = true;
          self->FinishOpeningPortalWithParent(aResult);
        },
        [self = RefPtr{this}](bool) {
          self->FinishOpeningPortalWithParent(""_ns);
        });
  } else {
    FinishOpeningPortalWithParent(""_ns);
  }
}

void nsFilePicker::FinishOpeningPortalWithParent(const nsCString& aHandle) {
  LOG("FinishOpeningPortalWithParent(%s)\n", aHandle.get());
  const char* method = [&] {
    switch (mMode) {
      case nsIFilePicker::modeOpen:
      case nsIFilePicker::modeOpenMultiple:
      case nsIFilePicker::modeGetFolder:
        break;
      case nsIFilePicker::modeSave:
        return "SaveFile";
    }
    return "OpenFile";
  }();

  GVariantBuilder opt_builder;
  g_variant_builder_init(&opt_builder, G_VARIANT_TYPE_VARDICT);

  nsAutoCString token;
  widget::MakePortalRequestToken("file_picker"_ns, token);
  g_variant_builder_add(&opt_builder, "{sv}", "handle_token",
                        g_variant_new_string(token.get()));

  g_variant_builder_add(
      &opt_builder, "{sv}", "multiple",
      g_variant_new_boolean(mMode == nsIFilePicker::modeOpenMultiple));
  g_variant_builder_add(
      &opt_builder, "{sv}", "directory",
      g_variant_new_boolean(mMode == nsIFilePicker::modeGetFolder));
  if (!mOkButtonLabel.IsEmpty()) {
    g_variant_builder_add(
        &opt_builder, "{sv}", "accept_label",
        g_variant_new_string(NS_ConvertUTF16toUTF8(mOkButtonLabel).get()));
  }
  g_variant_builder_add(&opt_builder, "{sv}", "modal",
                        g_variant_new_boolean(TRUE));

  // 3.22+ https://docs.gtk.org/gtk3/method.FileFilter.to_gvariant.html
  static auto sGtkFileFilterToGvariant = (GVariant * (*)(GtkFileFilter*))
      dlsym(RTLD_DEFAULT, "gtk_file_filter_to_gvariant");
  if (!mFilters.IsEmpty() && sGtkFileFilterToGvariant) {
    GVariantBuilder filters_builder;
    g_variant_builder_init(&filters_builder, G_VARIANT_TYPE("a(sa(us))"));
    RefPtr<GVariant> currentFilter;
    for (size_t i = 0; i < mFilters.Length(); ++i) {
      auto* filter = NewFilter(mFilters[i], mFilterNames[i]);
      if (!filter) {
        continue;
      }
      RefPtr<GVariant> filterVariant =
          dont_AddRef(g_variant_ref_sink(sGtkFileFilterToGvariant(filter)));
      g_variant_builder_add(&filters_builder, "@(sa(us))", filterVariant.get());
      if (mSelectedType >= 0 && size_t(mSelectedType) == i) {
        currentFilter = filterVariant;
      }
      g_object_unref(filter);
    }
    g_variant_builder_add(&opt_builder, "{sv}", "filters",
                          g_variant_builder_end(&filters_builder));
    if (currentFilter) {
      g_variant_builder_add(&opt_builder, "{sv}", "current_filter",
                            currentFilter.get());
    }
  }

  NS_ConvertUTF16toUTF8 defaultName(mDefault);
  if (!defaultName.IsEmpty() && mMode == nsIFilePicker::modeSave) {
    g_variant_builder_add(&opt_builder, "{sv}", "current_name",
                          g_variant_new_string(defaultName.get()));
  }

  if (nsCOMPtr<nsIFile> defaultPath = GetDefaultPath()) {
    if (!defaultName.IsEmpty() && mMode != nsIFilePicker::modeSave) {
      // Try to select the intended file. Even if it doesn't exist, GTK still
      // switches directories.
      defaultPath->AppendNative(defaultName);
      nsAutoCString path;
      defaultPath->GetNativePath(path);
      g_variant_builder_add(&opt_builder, "{sv}", "current_file",
                            g_variant_new_bytestring(path.get()));
    } else {
      nsAutoCString directory;
      defaultPath->GetNativePath(directory);
      g_variant_builder_add(&opt_builder, "{sv}", "current_folder",
                            g_variant_new_bytestring(directory.get()));
    }
  }

  LOG("FilePickerPortal requesting %s with token %s", method, token.get());
  guint subscriptionId = widget::OnDBusPortalResponse(
      mPortalProxy, token,
      [self = RefPtr{this}](GVariant* aResult) { self->DonePortal(aResult); });

  NS_ConvertUTF16toUTF8 title(mTitle);
  widget::DBusProxyCall(mPortalProxy, method,
                        g_variant_new("(ss@a{sv})", aHandle.get(), title.get(),
                                      g_variant_builder_end(&opt_builder)),
                        G_DBUS_CALL_FLAGS_NONE)
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [self = RefPtr{this}](RefPtr<GVariant>&& aResult) {
            LOG("FilePickerPortal request path: %s",
                GUniquePtr<char>(g_variant_print(aResult, TRUE)).get());
          },
          [subscriptionId, self = RefPtr{this}](GUniquePtr<GError>&& aError) {
            g_printerr("Failed to open portal: %s\n", aError->message);
            g_dbus_connection_signal_unsubscribe(
                g_dbus_proxy_get_connection(self->mPortalProxy),
                subscriptionId);
            self->ClearPortalState();
            self->OpenNonPortal();
          });
}

void nsFilePicker::ReadPortalUriList(GVariant* aUriList) {
  GVariantIter iter;
  g_variant_iter_init(&iter, aUriList);
  gchar* uriString;
  while (g_variant_iter_loop(&iter, "s", &uriString)) {
    LOG("nsFilePickerReadPortalUriList(%s)\n", uriString);
    if (mFileURL.IsEmpty()) {
      mFileURL.Assign(uriString);
    }
    nsCOMPtr<nsIURI> uri;
    NS_NewURI(getter_AddRefs(uri), uriString);
    if (nsCOMPtr<nsIFileURL> fileUrl = do_QueryInterface(uri)) {
      nsCOMPtr<nsIFile> file;
      fileUrl->GetFile(getter_AddRefs(file));
      mFiles.AppendElement(file);
    }
  }
}

void nsFilePicker::ClearPortalState() {
  if (mExportedParent && mParentWidget) {
    mParentWidget->UnexportHandle();
    mExportedParent = false;
  }
  mPortalProxy = nullptr;
}

void nsFilePicker::DonePortal(GVariant* aResult) {
  LOG("nsFilePicker::DonePortal(%s)\n",
      GUniquePtr<char>(g_variant_print(aResult, TRUE)).get());
  ResultCode result = [&] {
    RefPtr<GVariant> resultCode =
        dont_AddRef(g_variant_get_child_value(aResult, 0));
    switch (g_variant_get_uint32(resultCode)) {
      case 0:
        return ResultCode::returnOK;
      case 1:
      default:
        return ResultCode::returnCancel;
    }
  }();

  if (result == returnOK) {
    RefPtr<GVariant> results =
        dont_AddRef(g_variant_get_child_value(aResult, 1));
    GVariantIter iter;
    GVariant* value;
    gchar* key;
    g_variant_iter_init(&iter, results);
    while (g_variant_iter_loop(&iter, "{sv}", &key, &value)) {
      LOG("FilePicker portal got %s: %s\n", key,
          GUniquePtr<char>(g_variant_print(value, TRUE)).get());
      if (!strcmp(key, "current_filter")) {
        RefPtr<GVariant> name =
            dont_AddRef(g_variant_get_child_value(value, 0));
        nsDependentCString filterName(g_variant_get_string(name, nullptr));
        auto index = mFilterNames.IndexOf(filterName);
        if (index == mFilterNames.NoIndex) {
          index = mFilters.IndexOf(filterName);
        }
        if (index != mFilterNames.NoIndex) {
          mSelectedType = index;
        }
      }
      if (!strcmp(key, "uris")) {
        ReadPortalUriList(value);
      }
    }
  }

  ClearPortalState();
  DoneCommon(result);
}
#endif

void nsFilePicker::OpenNonPortal() {
  NS_ConvertUTF16toUTF8 title(mTitle);

  GtkWindow* parent_widget =
      mParentWidget
          ? GTK_WINDOW(mParentWidget->GetNativeData(NS_NATIVE_SHELLWIDGET))
          : nullptr;

  GtkFileChooserAction action = GetGtkFileChooserAction(mMode);

  const gchar* accept_button;
  NS_ConvertUTF16toUTF8 buttonLabel(mOkButtonLabel);
  if (!mOkButtonLabel.IsEmpty()) {
    accept_button = buttonLabel.get();
  } else {
    accept_button = g_dgettext(
        "gtk30", action == GTK_FILE_CHOOSER_ACTION_SAVE ? "_Save" : "_Open");
  }

  GtkFileChooser* file_chooser = GTK_FILE_CHOOSER(gtk_file_chooser_dialog_new(
      title.get(), parent_widget, action, g_dgettext("gtk30", "_Cancel"),
      GTK_RESPONSE_CANCEL, accept_button, GTK_RESPONSE_ACCEPT, nullptr));

  // If we have --enable-proxy-bypass-protection, then don't allow
  // remote URLs to be used.
#ifndef MOZ_PROXY_BYPASS_PROTECTION
  if (mAllowURLs) {
    gtk_file_chooser_set_local_only(GTK_FILE_CHOOSER(file_chooser), FALSE);
  }
#endif

  if (action == GTK_FILE_CHOOSER_ACTION_OPEN ||
      action == GTK_FILE_CHOOSER_ACTION_SAVE) {
    GtkWidget* img_preview = gtk_image_new();
    gtk_file_chooser_set_preview_widget(GTK_FILE_CHOOSER(file_chooser),
                                        img_preview);
    g_signal_connect(file_chooser, "update-preview",
                     G_CALLBACK(UpdateFilePreviewWidget), img_preview);
  }

  gtk_window_set_modal(GTK_WINDOW(file_chooser), true);
  if (parent_widget) {
    gtk_window_set_destroy_with_parent(GTK_WINDOW(file_chooser), TRUE);
  }

  NS_ConvertUTF16toUTF8 defaultName(mDefault);
  switch (mMode) {
    case nsIFilePicker::modeOpenMultiple:
      gtk_file_chooser_set_select_multiple(file_chooser, TRUE);
      break;
    case nsIFilePicker::modeSave:
      gtk_file_chooser_set_current_name(file_chooser, defaultName.get());
      break;

    default:
      /* no additional setup needed */
      break;
  }

  if (nsCOMPtr<nsIFile> defaultPath = GetDefaultPath()) {
    if (!defaultName.IsEmpty() && mMode != nsIFilePicker::modeSave) {
      // Try to select the intended file. Even if it doesn't exist, GTK still
      // switches directories.
      defaultPath->AppendNative(defaultName);
      nsAutoCString path;
      defaultPath->GetNativePath(path);
      gtk_file_chooser_set_filename(file_chooser, path.get());
    } else {
      nsAutoCString directory;
      defaultPath->GetNativePath(directory);

      // Workaround for problematic refcounting in GTK3 before 3.16.
      // We need to keep a reference to the dialog's internal delegate.
      // Otherwise, if our dialog gets destroyed, we'll lose the dialog's
      // delegate by the time this gets processed in the event loop.
      // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1166741
      if (GTK_IS_DIALOG(file_chooser)) {
        GtkDialog* dialog = GTK_DIALOG(file_chooser);
        GtkContainer* area = GTK_CONTAINER(gtk_dialog_get_content_area(dialog));
        gtk_container_forall(
            area,
            [](GtkWidget* widget, gpointer data) {
              if (GTK_IS_FILE_CHOOSER_WIDGET(widget)) {
                auto result = static_cast<GtkFileChooserWidget**>(data);
                *result = GTK_FILE_CHOOSER_WIDGET(widget);
              }
            },
            &mFileChooserDelegate);

        if (mFileChooserDelegate) {
          g_object_ref(mFileChooserDelegate);
        }
      }
      gtk_file_chooser_set_current_folder(file_chooser, directory.get());
    }
  }

  if (GTK_IS_DIALOG(file_chooser)) {
    gtk_dialog_set_default_response(GTK_DIALOG(file_chooser),
                                    GTK_RESPONSE_ACCEPT);
  }

  size_t count = mFilters.Length();
  for (size_t i = 0; i < count; ++i) {
    GtkFileFilter* filter = NewFilter(mFilters[i], mFilterNames[i]);
    if (!filter) {
      continue;
    }
    gtk_file_chooser_add_filter(file_chooser, filter);

    // Set the initially selected filter
    if (mSelectedType >= 0 && size_t(mSelectedType) == i) {
      gtk_file_chooser_set_filter(file_chooser, filter);
    }
  }

  gtk_file_chooser_set_do_overwrite_confirmation(GTK_FILE_CHOOSER(file_chooser),
                                                 TRUE);

  mFileChooser = file_chooser;
  NS_ADDREF_THIS();  // Balanced by the NS_RELEASE_THIS in DoneNonPortal.
  g_signal_connect(file_chooser, "response", G_CALLBACK(OnNonPortalResponse),
                   this);
  g_signal_connect(file_chooser, "destroy", G_CALLBACK(OnNonPortalDestroy),
                   this);
  gtk_widget_show(GTK_WIDGET(file_chooser));
}

already_AddRefed<nsIFile> nsFilePicker::GetDefaultPath() {
  nsCOMPtr<nsIFile> defaultPath;
  if (mDisplayDirectory) {
    mDisplayDirectory->Clone(getter_AddRefs(defaultPath));
  } else if (sPrevDisplayDirectory) {
    sPrevDisplayDirectory->Clone(getter_AddRefs(defaultPath));
  }
  return defaultPath.forget();
}

/* static */
void nsFilePicker::OnNonPortalResponse(GtkWidget* file_chooser,
                                       gint response_id, gpointer user_data) {
  static_cast<nsFilePicker*>(user_data)->DoneNonPortal(file_chooser,
                                                       response_id);
}

/* static */
void nsFilePicker::OnNonPortalDestroy(GtkWidget* file_chooser,
                                      gpointer user_data) {
  static_cast<nsFilePicker*>(user_data)->DoneNonPortal(file_chooser,
                                                       GTK_RESPONSE_CANCEL);
}

bool nsFilePicker::WarnForNonReadableFile() {
  nsCOMPtr<nsIFile> file;
  GetFile(getter_AddRefs(file));
  if (!file) {
    return false;
  }

  bool isReadable = false;
  file->IsReadable(&isReadable);
  if (isReadable) {
    return false;
  }

  nsCOMPtr<nsIStringBundleService> stringService =
      mozilla::components::StringBundle::Service();
  if (!stringService) {
    return false;
  }

  nsCOMPtr<nsIStringBundle> filepickerBundle;
  nsresult rv = stringService->CreateBundle(
      "chrome://global/locale/filepicker.properties",
      getter_AddRefs(filepickerBundle));
  if (NS_FAILED(rv)) {
    return false;
  }

  nsAutoString errorMessage;
  rv = filepickerBundle->GetStringFromName("selectedFileNotReadableError",
                                           errorMessage);
  if (NS_FAILED(rv)) {
    return false;
  }

  GtkDialogFlags flags = GTK_DIALOG_DESTROY_WITH_PARENT;
  GtkWindow* parent_window =
      mParentWidget
          ? GTK_WINDOW(mParentWidget->GetNativeData(NS_NATIVE_SHELLWIDGET))
          : nullptr;
  auto* cancel_dialog = gtk_message_dialog_new(
      parent_window, flags, GTK_MESSAGE_ERROR, GTK_BUTTONS_CLOSE, "%s",
      NS_ConvertUTF16toUTF8(errorMessage).get());
  gtk_dialog_run(GTK_DIALOG(cancel_dialog));
  gtk_widget_destroy(cancel_dialog);

  return true;
}

void nsFilePicker::DoneNonPortal(GtkWidget* file_chooser, gint response) {
  mFileChooser = nullptr;

  nsIFilePicker::ResultCode result;
  switch (response) {
    case GTK_RESPONSE_OK:
    case GTK_RESPONSE_ACCEPT:
      ReadValuesFromNonPortalFileChooser(GTK_FILE_CHOOSER(file_chooser));
      result = nsIFilePicker::returnOK;
      break;

    case GTK_RESPONSE_CANCEL:
    case GTK_RESPONSE_CLOSE:
    case GTK_RESPONSE_DELETE_EVENT:
      result = nsIFilePicker::returnCancel;
      break;

    default:
      NS_WARNING("Unexpected response");
      result = nsIFilePicker::returnCancel;
      break;
  }

  // A "response" signal won't be sent again but "destroy" will be.
  g_signal_handlers_disconnect_by_func(
      file_chooser, FuncToGpointer(OnNonPortalDestroy), this);

  // When response_id is GTK_RESPONSE_DELETE_EVENT or when called from
  // OnDestroy, the widget would be destroyed anyway but it is fine if
  // gtk_widget_destroy is called more than once.  gtk_widget_destroy has
  // requests that any remaining references be released, but the reference
  // count will not be decremented again if GtkWindow's reference has already
  // been released.
  gtk_widget_destroy(GTK_WIDGET(file_chooser));

  if (mFileChooserDelegate) {
    // Properly deref our acquired reference. We call this after
    // gtk_widget_destroy() to try and ensure that pending file info
    // queries caused by updating the current folder have been cancelled.
    // However, we do not know for certain when the callback will run after
    // cancelled.
    g_idle_add(
        [](gpointer data) -> gboolean {
          g_object_unref(data);
          return G_SOURCE_REMOVE;
        },
        mFileChooserDelegate);
    mFileChooserDelegate = nullptr;
  }

  DoneCommon(result);
  NS_RELEASE_THIS();
}

void nsFilePicker::DoneCommon(ResultCode aResult) {
  if (aResult == ResultCode::returnOK) {
    if (mMode == nsIFilePicker::modeSave) {
      nsCOMPtr<nsIFile> file;
      GetFile(getter_AddRefs(file));
      if (file) {
        bool exists = false;
        file->Exists(&exists);
        if (exists) {
          aResult = nsIFilePicker::returnReplace;
        }
      }
    } else if (mMode == nsIFilePicker::modeOpen) {
      if (WarnForNonReadableFile()) {
        aResult = nsIFilePicker::returnCancel;
      }
    }
  }

  // Remember last used directory.
  nsCOMPtr<nsIFile> file;
  GetFile(getter_AddRefs(file));
  if (file) {
    nsCOMPtr<nsIFile> dir;
    file->GetParent(getter_AddRefs(dir));
    if (dir) {
      dir.swap(sPrevDisplayDirectory);
    }
  }

  if (mCallback) {
    mCallback->Done(aResult);
    mCallback = nullptr;
  }
}

#undef LOG
