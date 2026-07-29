/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsFilePicker_h_
#define nsFilePicker_h_

#include <gtk/gtk.h>

#include "nsBaseFilePicker.h"
#include "nsString.h"
#include "nsTArray.h"
#include "nsCOMArray.h"

class nsIWidget;
class nsIFile;

class nsFilePicker final : public nsBaseFilePicker {
 public:
  nsFilePicker();

  NS_DECL_ISUPPORTS

  // nsIFilePicker (less what's in nsBaseFilePicker)
  NS_IMETHOD Open(nsIFilePickerShownCallback* aCallback) override;
  NS_IMETHOD IsModeSupported(nsIFilePicker::Mode, JSContext*,
                             mozilla::dom::Promise**) override;
  NS_IMETHOD AppendFilters(int32_t aFilterMask) override;
  NS_IMETHOD AppendFilter(const nsAString& aTitle,
                          const nsAString& aFilter) override;
  NS_IMETHOD SetDefaultString(const nsAString& aString) override;
  NS_IMETHOD GetDefaultString(nsAString& aString) override;
  NS_IMETHOD SetDefaultExtension(const nsAString& aExtension) override;
  NS_IMETHOD GetDefaultExtension(nsAString& aExtension) override;
  NS_IMETHOD GetFilterIndex(int32_t* aFilterIndex) override;
  NS_IMETHOD SetFilterIndex(int32_t aFilterIndex) override;
  NS_IMETHOD GetFile(nsIFile** aFile) override;
  NS_IMETHOD GetFileURL(nsIURI** aFileURL) override;
  NS_IMETHOD GetFiles(nsISimpleEnumerator** aFiles) override;

  // nsBaseFilePicker
  void InitNative(nsIWidget* aParent, const nsAString& aTitle) override;

  static void Shutdown();

 protected:
  virtual ~nsFilePicker();

  bool WarnForNonReadableFile();
  already_AddRefed<nsIFile> GetDefaultPath();

  static void OnNonPortalResponse(GtkWidget* file_chooser, gint response_id,
                                  gpointer user_data);
  static void OnNonPortalDestroy(GtkWidget* file_chooser, gpointer user_data);
  void ReadValuesFromNonPortalFileChooser(GtkFileChooser* file_chooser);
  void OpenNonPortal();
  void DoneNonPortal(GtkWidget* file_chooser, gint response_id);

#ifdef MOZ_ENABLE_DBUS
  void ReadPortalUriList(GVariant* aUriList);
  void TryOpenPortal();
  void FinishOpeningPortal();
  void FinishOpeningPortalWithParent(const nsCString& aHandle);
  void DonePortal(GVariant*);
  void ClearPortalState();
#endif

  void DoneCommon(ResultCode);

  RefPtr<nsWindow> mParentWidget;
  nsCOMPtr<nsIFilePickerShownCallback> mCallback;
  nsCOMArray<nsIFile> mFiles;

  int32_t mSelectedType = 0;
  bool mAllowURLs = false;
  nsCString mFileURL;
  nsString mTitle;
  nsString mDefault;
  nsString mDefaultExtension;

  nsTArray<nsCString> mFilters;
  nsTArray<nsCString> mFilterNames;

#ifdef MOZ_ENABLE_DBUS
  RefPtr<GDBusProxy> mPortalProxy;
  const bool mPreferPortal;
  bool mExportedParent = false;
#endif

  GtkFileChooser* mFileChooser = nullptr;
  GtkFileChooserWidget* mFileChooserDelegate = nullptr;
  bool mIsOpen = false;
};

#endif
