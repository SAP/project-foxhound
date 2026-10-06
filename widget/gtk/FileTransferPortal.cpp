/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This is re-implementation of gtk3/filetransferportal.c code.

#include "FileTransferPortal.h"

#include <errno.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#include <dlfcn.h>

#include <gio/gio.h>
#include <gio/gunixfdlist.h>

#include "AsyncDBus.h"
#include "mozilla/GRefPtr.h"
#include "mozilla/GUniquePtr.h"
#include "mozilla/UniquePtrExtensions.h"

using namespace mozilla;

#undef LOGDRAG
#ifdef MOZ_LOGGING
extern mozilla::LazyLogModule gWidgetDragLog;
#  define LOGDRAG(str, ...) \
    MOZ_LOG(gWidgetDragLog, mozilla::LogLevel::Debug, (str, ##__VA_ARGS__))
#else
#  define LOGDRAG(...)
#endif

namespace mozilla::widget {

#ifndef O_PATH
#  define O_PATH 0
#endif

#ifndef O_CLOEXEC
#  define O_CLOEXEC 0
#else
#  define HAVE_O_CLOEXEC 1
#endif

static constexpr int kMaxFDsPerCall = 16;

static GUnixFDList* moz_g_unix_fd_list_new() {
  static auto g_unix_fd_list_new =
      (GUnixFDList * (*)()) dlsym(RTLD_DEFAULT, "g_unix_fd_list_new");
  if (g_unix_fd_list_new) {
    return g_unix_fd_list_new();
  }
  return nullptr;
}

gint moz_g_unix_fd_list_append(GUnixFDList* list, gint fd, GError** error) {
  static auto g_unix_fd_list_append =
      (gint (*)(GUnixFDList* list, gint fd, GError** error))dlsym(
          RTLD_DEFAULT, "g_unix_fd_list_append");
  if (g_unix_fd_list_append) {
    return g_unix_fd_list_append(list, fd, error);
  }
  *error = nullptr;
  return -1;
}

bool FileTransferPortal::Init() {
  LOGDRAG("FileTransferPortal::Init()");
  mProxy = dont_AddRef(g_dbus_proxy_new_for_bus_sync(
      G_BUS_TYPE_SESSION,
      GDBusProxyFlags(G_DBUS_PROXY_FLAGS_DO_NOT_LOAD_PROPERTIES |
                      G_DBUS_PROXY_FLAGS_DO_NOT_CONNECT_SIGNALS |
                      G_DBUS_PROXY_FLAGS_DO_NOT_AUTO_START),
      nullptr, "org.freedesktop.portal.Documents",
      "/org/freedesktop/portal/documents",
      "org.freedesktop.portal.FileTransfer", nullptr, nullptr));

  if (!mProxy) {
    LOGDRAG("  missing org.freedesktop.portal.Documents!");
    return false;
  }
  GUniquePtr<gchar> owner(g_dbus_proxy_get_name_owner(mProxy));
  if (!owner) {
    LOGDRAG("  missing owner of org.freedesktop.portal.Documents!");
    mProxy = nullptr;
    return false;
  }
  g_signal_connect(
      g_dbus_proxy_get_connection(mProxy), "closed",
      G_CALLBACK(+[](GDBusConnection*, gboolean, GError*, gpointer) {
        FileTransferPortal::Shutdown();
      }),
      nullptr);
  return true;
}

// Builds a GUnixFDList and variant array for a batch of files starting at
// aStart, up to kMaxFDsPerCall entries.  Returns the number of files
// actually added, or an error.
static nsresult BuildFDBatch(const nsTArray<nsCString>& aFiles, int aStart,
                             GUnixFDList** aOutFDList, GVariantBuilder* aOutFDs,
                             int* aOutCount) {
  *aOutFDList = moz_g_unix_fd_list_new();
  g_variant_builder_init(aOutFDs, G_VARIANT_TYPE("ah"));

  int count = 0;
  for (int i = 0; i < kMaxFDsPerCall && aStart + i < (int)aFiles.Length();
       i++) {
    int fd = open(aFiles[aStart + i].get(), O_PATH | O_CLOEXEC);
    if (fd == -1) {
      g_printerr("FileTransferPortal: failed to open %s: %s\n",
                 aFiles[aStart + i].get(), g_strerror(errno));
      g_variant_builder_clear(aOutFDs);
      g_object_unref(*aOutFDList);
      return NS_ERROR_FILE_NOT_FOUND;
    }

#ifndef HAVE_O_CLOEXEC
    fcntl(fd, F_SETFD, FD_CLOEXEC);
#endif

    GUniquePtr<GError> error;
    int fdIndex =
        moz_g_unix_fd_list_append(*aOutFDList, fd, getter_Transfers(error));
    close(fd);

    if (fdIndex == -1) {
      g_printerr("FileTransferPortal: g_unix_fd_list_append failed: %s\n",
                 error ? error->message : "unknown error");
      g_variant_builder_clear(aOutFDs);
      g_object_unref(*aOutFDList);
      return NS_ERROR_FAILURE;
    }

    g_variant_builder_add(aOutFDs, "h", fdIndex);
    count++;
  }

  *aOutCount = count;
  return NS_OK;
}

using AddFilesPromise = MozPromise<bool, GUniquePtr<GError>, true>;

RefPtr<AddFilesPromise> FileTransferPortal::AddFilesBatch(
    const nsCString& aKey, const nsTArray<nsCString>& aFiles, int aStart) {
  if (aStart >= (int)aFiles.Length()) {
    return AddFilesPromise::CreateAndResolve(true, __func__);
  }

  GUnixFDList* rawFDList = nullptr;
  GVariantBuilder fds;
  int count = 0;
  nsresult rv = BuildFDBatch(aFiles, aStart, &rawFDList, &fds, &count);
  if (NS_FAILED(rv)) {
    GUniquePtr<GError> error(g_error_new_literal(G_IO_ERROR, G_IO_ERROR_FAILED,
                                                 "Failed to open file"));
    return AddFilesPromise::CreateAndReject(std::move(error), __func__);
  }

  RefPtr<GUnixFDList> fdList = dont_AddRef(rawFDList);

  GVariantBuilder options;
  g_variant_builder_init(&options, G_VARIANT_TYPE_VARDICT);

  nsTArray<nsCString> filesCopy(aFiles.Clone());
  nsCString keyCopy(aKey);
  int nextStart = aStart + count;

  mCancellable = GUniquePtr<GCancellable>(g_cancellable_new());
  auto promise = MakeRefPtr<AddFilesPromise::Private>(__func__);
  DBusProxyCallWithUnixFDList(
      mProxy, "AddFiles",
      g_variant_new("(saha{sv})", aKey.get(), &fds, &options),
      G_DBUS_CALL_FLAGS_NONE, /* timeout */ -1, fdList, mCancellable.get())
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [this, promise, keyCopy = std::move(keyCopy),
           filesCopy = std::move(filesCopy),
           nextStart](RefPtr<GVariant>&&) mutable {
            AddFilesBatch(keyCopy, filesCopy, nextStart)
                ->Then(
                    GetCurrentSerialEventTarget(), __func__,
                    [promise](bool aVal) { promise->Resolve(aVal, __func__); },
                    [promise](GUniquePtr<GError>&& aError) {
                      promise->Reject(std::move(aError), __func__);
                    });
          },
          [promise](GUniquePtr<GError>&& aError) {
            promise->Reject(std::move(aError), __func__);
          });
  return promise;
}

RefPtr<FileTransferPortal::RegisterFilesPromise>
FileTransferPortal::RegisterFiles(const nsTArray<nsCString>& aFiles,
                                  bool aWritable) {
  if (!mProxy) {
    GUniquePtr<GError> error(g_error_new_literal(
        G_IO_ERROR, G_IO_ERROR_NOT_SUPPORTED, "No portal found"));
    return RegisterFilesPromise::CreateAndReject(std::move(error), __func__);
  }

  GVariantBuilder options;
  g_variant_builder_init(&options, G_VARIANT_TYPE_VARDICT);
  g_variant_builder_add(&options, "{sv}", "writable",
                        g_variant_new_boolean(aWritable));
  g_variant_builder_add(&options, "{sv}", "autostop",
                        g_variant_new_boolean(TRUE));

  nsTArray<nsCString> filesCopy(aFiles.Clone());
  auto promise = MakeRefPtr<RegisterFilesPromise::Private>(__func__);

  mCancellable = GUniquePtr<GCancellable>(g_cancellable_new());
  DBusProxyCall(mProxy, "StartTransfer", g_variant_new("(a{sv})", &options),
                G_DBUS_CALL_FLAGS_NONE, /* timeout */ -1, mCancellable.get())
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [this, promise, filesCopy = std::move(filesCopy)](
              RefPtr<GVariant>&& aResult) mutable {
            const char* key = nullptr;
            g_variant_get(aResult, "(&s)", &key);
            nsCString keyCopy(key);

            AddFilesBatch(keyCopy, filesCopy, 0)
                ->Then(
                    GetCurrentSerialEventTarget(), __func__,
                    [promise, keyCopy](bool) {
                      promise->Resolve(keyCopy, __func__);
                    },
                    [promise](GUniquePtr<GError>&& aError) {
                      promise->Reject(std::move(aError), __func__);
                    });
          },
          [promise](GUniquePtr<GError>&& aError) {
            promise->Reject(std::move(aError), __func__);
          });
  return promise;
}

// TODO: Implement aWritable/autostop parameters?
nsresult FileTransferPortal::RegisterFilesSync(
    const nsTArray<nsCString>& aFiles, bool aWritable, nsCString& aOutKey) {
  if (!mProxy) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  GVariantBuilder options;
  g_variant_builder_init(&options, G_VARIANT_TYPE_VARDICT);

  GUniquePtr<GError> error;
  RefPtr<GVariant> ret = dont_AddRef(g_dbus_proxy_call_sync(
      mProxy, "StartTransfer", g_variant_new("(a{sv})", &options),
      G_DBUS_CALL_FLAGS_NONE, -1, nullptr, getter_Transfers(error)));
  if (!ret) {
    g_printerr(
        "FileTransferPortal::RegisterFilesSync() StartTransfer failed: %s\n",
        error ? error->message : "unknown error");
    return NS_ERROR_FAILURE;
  }

  const char* value = nullptr;
  g_variant_get(ret, "(&s)", &value);
  aOutKey = value;

  int fileCount = (int)aFiles.Length();

  GUnixFDList* fdList = nullptr;
  GVariantBuilder fds;

  for (int i = 0; i < fileCount; i++) {
    if (!fdList) {
      g_variant_builder_init(&fds, G_VARIANT_TYPE("ah"));
      fdList = moz_g_unix_fd_list_new();
    }

    int fd = open(aFiles[i].get(), O_PATH | O_CLOEXEC);
    if (fd == -1) {
      g_printerr(
          "FileTransferPortal::RegisterFilesSync() failed to open %s: %s\n",
          aFiles[i].get(), g_strerror(errno));
      g_variant_builder_clear(&fds);
      g_object_unref(fdList);
      aOutKey.Truncate();
      return NS_ERROR_FILE_NOT_FOUND;
    }

#ifndef HAVE_O_CLOEXEC
    fcntl(fd, F_SETFD, FD_CLOEXEC);
#endif

    int fdIndex =
        moz_g_unix_fd_list_append(fdList, fd, getter_Transfers(error));
    close(fd);

    if (fdIndex == -1) {
      g_printerr(
          "FileTransferPortal::RegisterFilesSync() fd_list_append failed: %s\n",
          error ? error->message : "unknown error");
      g_variant_builder_clear(&fds);
      g_object_unref(fdList);
      aOutKey.Truncate();
      return NS_ERROR_FAILURE;
    }

    g_variant_builder_add(&fds, "h", fdIndex);

    if ((i + 1) % kMaxFDsPerCall == 0 || i + 1 == fileCount) {
      g_variant_builder_init(&options, G_VARIANT_TYPE_VARDICT);
      ret = dont_AddRef(g_dbus_proxy_call_with_unix_fd_list_sync(
          mProxy, "AddFiles",
          g_variant_new("(saha{sv})", aOutKey.get(), &fds, &options),
          G_DBUS_CALL_FLAGS_NONE, -1, fdList, nullptr, nullptr,
          getter_Transfers(error)));
      g_clear_object(&fdList);

      if (!ret) {
        g_printerr(
            "FileTransferPortal::RegisterFilesSync() AddFiles failed: %s\n",
            error ? error->message : "unknown error");
        aOutKey.Truncate();
        return NS_ERROR_FAILURE;
      }
    }
  }

  return NS_OK;
}

RefPtr<FileTransferPortal::RetrieveFilesPromise>
FileTransferPortal::RetrieveFiles(const char* aKey) {
  if (!mProxy) {
    GUniquePtr<GError> error(g_error_new_literal(
        G_IO_ERROR, G_IO_ERROR_NOT_SUPPORTED, "No portal found"));
    return RetrieveFilesPromise::CreateAndReject(std::move(error), __func__);
  }

  GVariantBuilder options;
  g_variant_builder_init(&options, G_VARIANT_TYPE_VARDICT);

  auto promise = MakeRefPtr<RetrieveFilesPromise::Private>(__func__);
  mCancellable = GUniquePtr<GCancellable>(g_cancellable_new());

  DBusProxyCall(mProxy, "RetrieveFiles",
                g_variant_new("(sa{sv})", aKey, &options),
                G_DBUS_CALL_FLAGS_NONE, /* timeout */ -1, mCancellable.get())
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [promise](RefPtr<GVariant>&& aResult) {
            const char** files = nullptr;
            g_variant_get(aResult, "(^a&s)", &files);

            nsTArray<nsCString> result;
            if (files) {
              for (int i = 0; files[i]; i++) {
                result.AppendElement(nsCString(files[i]));
              }
              g_free(files);
            }
            promise->Resolve(std::move(result), __func__);
          },
          [promise](GUniquePtr<GError>&& aError) {
            promise->Reject(std::move(aError), __func__);
          });
  return promise;
}

GUniquePtr<char*> FileTransferPortal::RetrieveFilesSync(const char* aKey) {
  if (!mProxy) {
    return nullptr;
  }

  GVariantBuilder options;
  g_variant_builder_init(&options, G_VARIANT_TYPE_VARDICT);

  GUniquePtr<GError> error;
  RefPtr<GVariant> ret = dont_AddRef(g_dbus_proxy_call_sync(
      mProxy, "RetrieveFiles", g_variant_new("(sa{sv})", aKey, &options),
      G_DBUS_CALL_FLAGS_NONE, -1, nullptr, getter_Transfers(error)));
  if (!ret) {
    g_printerr("FileTransferPortal::RetrieveFilesSync() failed: %s\n",
               error ? error->message : "unknown error");
    return nullptr;
  }

  char** files = nullptr;
  g_variant_get(ret, "(^as)", &files);
  return ConvertToURIs(GUniquePtr<char*>(files));
}

GUniquePtr<char*> FileTransferPortal::ConvertToURIs(
    GUniquePtr<char*> aFileList) {
  GPtrArray* uriList = g_ptr_array_new();
  for (int i = 0; aFileList.get()[i]; i++) {
    if (auto* fileName =
            g_filename_to_uri(aFileList.get()[i], nullptr, nullptr)) {
      g_ptr_array_add(uriList, fileName);
    }
  }
  g_ptr_array_add(uriList, nullptr);
  return GUniquePtr<char*>(
      reinterpret_cast<char**>(g_ptr_array_free(uriList, false)));
}

FileTransferPortal* FileTransferPortal::sPortal = nullptr;

FileTransferPortal* FileTransferPortal::GetPortal() {
  if (!sPortal) {
    sPortal = new FileTransferPortal();
    if (!sPortal->Init()) {
      Shutdown();
    }
  }
  return sPortal;
}

void FileTransferPortal::Shutdown() {
  delete sPortal;
  sPortal = nullptr;
}

}  // namespace mozilla::widget
