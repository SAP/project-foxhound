/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsFilePicker_h_
#define nsFilePicker_h_

#include "nsBaseFilePicker.h"
#include "nsString.h"
#include "nsCOMArray.h"
#include "nsTArray.h"

class nsIFile;
class nsILocalFileMac;
@class NSArray;
@class NSSavePanel;

class nsFilePicker final : public nsBaseFilePicker {
 public:
  nsFilePicker();
  using nsIFilePicker::ResultCode;

  NS_DECL_ISUPPORTS

  // nsIFilePicker (less what's in nsBaseFilePicker)
  NS_IMETHOD Open(nsIFilePickerShownCallback* aCallback) override;
  NS_IMETHOD GetDefaultString(nsAString& aDefaultString) override;
  NS_IMETHOD SetDefaultString(const nsAString& aDefaultString) override;
  NS_IMETHOD GetDefaultExtension(nsAString& aDefaultExtension) override;
  NS_IMETHOD GetFilterIndex(int32_t* aFilterIndex) override;
  NS_IMETHOD SetFilterIndex(int32_t aFilterIndex) override;
  NS_IMETHOD SetDefaultExtension(const nsAString& aDefaultExtension) override;
  NS_IMETHOD GetFile(nsIFile** aFile) override;
  NS_IMETHOD GetFileURL(nsIURI** aFileURL) override;
  NS_IMETHOD GetFiles(nsISimpleEnumerator** aFiles) override;
  NS_IMETHOD AppendFilter(const nsAString& aTitle,
                          const nsAString& aFilter) override;

  /**
   * Returns the current filter list in the format used by Cocoa's NSSavePanel
   * and NSOpenPanel.
   * Returns nil if no filter currently apply.
   */
  NSArray* GetFilterList();

 protected:
  virtual ~nsFilePicker();

  virtual void InitNative(nsIWidget* aParent, const nsAString& aTitle) override;

  // Configure and present the requested panel asynchronously. The panel is
  // shown as a window-modal sheet on the parent widget's NSWindow when one is
  // available, or modelessly otherwise. Each method invokes aCallback->Done on
  // the main thread when the user dismisses the panel.
  void PresentOpenPanel(bool aAllowMultiple,
                        nsIFilePickerShownCallback* aCallback);
  void PresentFolderPanel(nsIFilePickerShownCallback* aCallback);
  void PresentSavePanel(nsIFilePickerShownCallback* aCallback);

  // Presents aPanel asynchronously using the best available AppKit API: as a
  // sheet attached to the parent widget's NSWindow when one exists, otherwise
  // as a modeless window. aHandler is invoked on the main thread once the user
  // dismisses the panel.
  //
  // The parameter is typed as NSSavePanel* because that is the common
  // superclass in AppKit for NSSavePanel and NSOpenPanel; both inherit
  // `beginSheetModalForWindow:completionHandler:` and
  // `beginWithCompletionHandler:` from it. An NSOpenPanel may be passed here.
  void BeginPanelAsync(NSSavePanel* aPanel, void (^aHandler)(NSModalResponse));

  void SetDialogTitle(const nsString& inTitle, id aDialog);
  NSString* PanelDefaultDirectory();
  NSView* GetAccessoryView();

  nsCOMPtr<nsIWidget> mParentWidget;
  nsString mTitle;
  nsCOMArray<nsIFile> mFiles;
  nsString mDefaultFilename;

  nsTArray<nsString> mFilters;
  nsTArray<nsString> mTitles;

  int32_t mSelectedTypeIndex = 0;
};

#endif  // nsFilePicker_h_
