/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_widget_FileTransferPortal_h
#define mozilla_widget_FileTransferPortal_h

#include "mozilla/GRefPtr.h"
#include "mozilla/GUniquePtr.h"
#include "mozilla/MozPromise.h"
#include "nsTArray.h"
#include "nsString.h"

namespace mozilla::widget {

// Wraps the org.freedesktop.portal.FileTransfer portal interface.
class FileTransferPortal final {
 public:
  using RegisterFilesPromise = MozPromise<nsCString, GUniquePtr<GError>, true>;
  using RetrieveFilesPromise =
      MozPromise<nsTArray<nsCString>, GUniquePtr<GError>, true>;

  static FileTransferPortal* GetPortal();
  static void Shutdown();

  RefPtr<RegisterFilesPromise> RegisterFiles(const nsTArray<nsCString>& aFiles,
                                             bool aWritable);

  nsresult RegisterFilesSync(const nsTArray<nsCString>& aFiles, bool aWritable,
                             nsCString& aOutKey);

  RefPtr<RetrieveFilesPromise> RetrieveFiles(const char* aKey);

  GUniquePtr<char*> RetrieveFilesSync(const char* aKey);

 private:
  FileTransferPortal() = default;
  bool Init();

  GUniquePtr<char*> ConvertToURIs(GUniquePtr<char*> aFileList);

  RefPtr<MozPromise<bool, GUniquePtr<GError>, true>> AddFilesBatch(
      const nsCString& aKey, const nsTArray<nsCString>& aFiles, int aStart);

  RefPtr<GDBusProxy> mProxy;
  GUniquePtr<GCancellable> mCancellable;

  static FileTransferPortal* sPortal;
};

}  // namespace mozilla::widget

#endif
