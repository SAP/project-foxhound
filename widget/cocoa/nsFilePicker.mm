/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#import <Cocoa/Cocoa.h>

#include "nsFilePicker.h"
#include "nsCOMPtr.h"
#include "nsReadableUtils.h"
#include "nsNetUtil.h"
#include "nsIFile.h"
#include "nsILocalFileMac.h"
#include "nsArrayEnumerator.h"
#include "nsIStringBundle.h"
#include "nsCocoaUtils.h"
#include "nsThreadUtils.h"
#include "mozilla/Preferences.h"

// This must be included last:
#include "nsObjCExceptions.h"

using namespace mozilla;

const float kAccessoryViewPadding = 5;
const int kSaveTypeControlTag = 1;

const char kShowHiddenFilesPref[] = "filepicker.showHiddenFiles";

// This class is an observer of NSPopUpButton selection change.
@interface MOZFilePickerPopUpObserver : NSObject {
  NSPopUpButton* mPopUpButton;
  NSOpenPanel* mOpenPanel;
  RefPtr<nsFilePicker> mFilePicker;
}
- (void)setPopUpButton:(NSPopUpButton*)aPopUpButton;
- (void)setOpenPanel:(NSOpenPanel*)aOpenPanel;
- (void)setFilePicker:(nsFilePicker*)aFilePicker;
- (void)menuChangedItem:(NSNotification*)aSender;
@end

@interface MOZSaveFilePickerPopUpObserver : NSObject {
  NSPopUpButton* mPopUpButton;
  NSSavePanel* mSavePanel;
  RefPtr<nsFilePicker> mFilePicker;
}
- (void)setPopUpButton:(NSPopUpButton*)aPopUpButton;
- (void)setSavePanel:(NSSavePanel*)aSavePanel;
- (void)setFilePicker:(nsFilePicker*)aFilePicker;
- (void)menuChangedItem:(NSNotification*)aSender;
@end

NS_IMPL_ISUPPORTS(nsFilePicker, nsIFilePicker)

static void SetShowHiddenFileState(NSSavePanel* panel) {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;

  bool show = false;
  if (NS_SUCCEEDED(Preferences::GetBool(kShowHiddenFilesPref, &show))) {
    [panel setShowsHiddenFiles:show];
  }

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

// On macOS 26 (Tahoe), the panel's sheet completion handler can run before the
// modal session has fully unwound. Invoking the callback synchronously here
// would let a consumer open another modal on top of a session that is still
// tearing down, which hangs (bug 2053177). Deferring to a fresh main-thread
// turn lets the modal finish unwinding before the callback runs.
static void InvokeFilePickerCallbackDeferred(
    nsIFilePickerShownCallback* aCallback, nsIFilePicker::ResultCode aResult) {
  if (!aCallback) {
    return;
  }
  nsCOMPtr<nsIFilePickerShownCallback> callback = aCallback;
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "nsFilePicker::InvokeCallback",
      [callback, aResult]() { callback->Done(aResult); }));
}

nsFilePicker::nsFilePicker() = default;

nsFilePicker::~nsFilePicker() = default;

void nsFilePicker::InitNative(nsIWidget* aParent, const nsAString& aTitle) {
  mParentWidget = aParent;
  mTitle = aTitle;
}

NSView* nsFilePicker::GetAccessoryView() {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  NSView* accessoryView =
      [[[NSView alloc] initWithFrame:NSMakeRect(0, 0, 0, 0)] autorelease];

  // Set a label's default value.
  NSString* label = @"Format:";

  // Try to get the localized string.
  nsCOMPtr<nsIStringBundleService> sbs =
      do_GetService(NS_STRINGBUNDLE_CONTRACTID);
  nsCOMPtr<nsIStringBundle> bundle;
  nsresult rv = sbs->CreateBundle(
      "chrome://global/locale/filepicker.properties", getter_AddRefs(bundle));
  if (NS_SUCCEEDED(rv)) {
    nsAutoString localizedLabel;
    rv = bundle->GetStringFromName("formatLabel", localizedLabel);
    if (NS_SUCCEEDED(rv)) {
      label = [NSString stringWithCharacters:reinterpret_cast<const unichar*>(
                                                 localizedLabel.get())
                                      length:localizedLabel.Length()];
    }
  }

  // set up label text field
  NSTextField* textField = [[[NSTextField alloc] init] autorelease];
  [textField setEditable:NO];
  [textField setSelectable:NO];
  [textField setDrawsBackground:NO];
  [textField setBezeled:NO];
  [textField setBordered:NO];
  [textField setFont:[NSFont labelFontOfSize:13.0]];
  [textField setStringValue:label];
  [textField setTag:0];
  [textField sizeToFit];

  // set up popup button
  NSPopUpButton* popupButton =
      [[[NSPopUpButton alloc] initWithFrame:NSMakeRect(0, 0, 0, 0)
                                  pullsDown:NO] autorelease];
  uint32_t numMenuItems = mTitles.Length();
  for (uint32_t i = 0; i < numMenuItems; i++) {
    const nsString& currentTitle = mTitles[i];
    NSString* titleString;
    if (currentTitle.IsEmpty()) {
      const nsString& currentFilter = mFilters[i];
      titleString =
          [[NSString alloc] initWithCharacters:reinterpret_cast<const unichar*>(
                                                   currentFilter.get())
                                        length:currentFilter.Length()];
    } else {
      titleString =
          [[NSString alloc] initWithCharacters:reinterpret_cast<const unichar*>(
                                                   currentTitle.get())
                                        length:currentTitle.Length()];
    }
    [popupButton addItemWithTitle:titleString];
    [titleString release];
  }
  if (mSelectedTypeIndex >= 0 &&
      static_cast<uint32_t>(mSelectedTypeIndex) < numMenuItems) {
    [popupButton selectItemAtIndex:mSelectedTypeIndex];
  }
  [popupButton setTag:kSaveTypeControlTag];
  [popupButton sizeToFit];  // we have to do sizeToFit to get the height
                            // calculated for us
  // This is just a default width that works well, doesn't truncate the vast
  // majority of things that might end up in the menu.
  [popupButton setFrameSize:NSMakeSize(180, [popupButton frame].size.height)];

  // position everything based on control sizes with kAccessoryViewPadding pix
  // padding on each side kAccessoryViewPadding pix horizontal padding between
  // controls
  float greatestHeight = [textField frame].size.height;
  if ([popupButton frame].size.height > greatestHeight) {
    greatestHeight = [popupButton frame].size.height;
  }
  float totalViewHeight = greatestHeight + kAccessoryViewPadding * 2;
  float totalViewWidth = [textField frame].size.width +
                         [popupButton frame].size.width +
                         kAccessoryViewPadding * 3;
  [accessoryView setFrameSize:NSMakeSize(totalViewWidth, totalViewHeight)];

  float textFieldOriginY =
      ((greatestHeight - [textField frame].size.height) / 2 + 1) +
      kAccessoryViewPadding;
  [textField
      setFrameOrigin:NSMakePoint(kAccessoryViewPadding, textFieldOriginY)];

  float popupOriginX = [textField frame].size.width + kAccessoryViewPadding * 2;
  float popupOriginY =
      ((greatestHeight - [popupButton frame].size.height) / 2) +
      kAccessoryViewPadding;
  [popupButton setFrameOrigin:NSMakePoint(popupOriginX, popupOriginY)];

  [accessoryView addSubview:textField];
  [accessoryView addSubview:popupButton];
  return accessoryView;

  NS_OBJC_END_TRY_BLOCK_RETURN(nil);
}

NS_IMETHODIMP
nsFilePicker::Open(nsIFilePickerShownCallback* aCallback) {
  if (MaybeBlockFilePicker(aCallback)) {
    return NS_OK;
  }

  RefPtr<nsFilePicker> self = this;
  nsCOMPtr<nsIFilePickerShownCallback> callback = aCallback;
  return NS_DispatchToMainThread(
      NS_NewRunnableFunction("nsFilePicker::Open", [self, callback]() mutable {
        switch (self->mMode) {
          case modeOpen:
            self->PresentOpenPanel(false, callback);
            break;
          case modeOpenMultiple:
            self->PresentOpenPanel(true, callback);
            break;
          case modeSave:
            self->PresentSavePanel(callback);
            break;
          case modeGetFolder:
            self->PresentFolderPanel(callback);
            break;
          default:
            NS_ERROR("Unknown file picker mode");
            if (callback) {
              callback->Done(nsIFilePicker::returnCancel);
            }
            break;
        }
      }));
}

void nsFilePicker::BeginPanelAsync(NSSavePanel* aPanel,
                                   void (^aHandler)(NSModalResponse)) {
  NSWindow* parentWindow = nil;
  if (mParentWidget) {
    parentWindow =
        static_cast<NSWindow*>(mParentWidget->GetNativeData(NS_NATIVE_WINDOW));
  }
  if (parentWindow) {
    [aPanel beginSheetModalForWindow:parentWindow completionHandler:aHandler];
  } else {
    [aPanel beginWithCompletionHandler:aHandler];
  }
}

static void UpdatePanelFileTypes(NSOpenPanel* aPanel, NSArray* aFilters) {
  // If we show all file types, also "expose" bundles' contents.
  [aPanel setTreatsFilePackagesAsDirectories:!aFilters];

  [aPanel setAllowedFileTypes:aFilters];
}

@implementation MOZFilePickerPopUpObserver
- (void)setPopUpButton:(NSPopUpButton*)aPopUpButton {
  mPopUpButton = aPopUpButton;
}

- (void)setOpenPanel:(NSOpenPanel*)aOpenPanel {
  mOpenPanel = aOpenPanel;
}

- (void)setFilePicker:(nsFilePicker*)aFilePicker {
  mFilePicker = aFilePicker;
}

- (void)menuChangedItem:(NSNotification*)aSender {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;
  int32_t selectedItem = [mPopUpButton indexOfSelectedItem];
  if (selectedItem < 0) {
    return;
  }

  mFilePicker->SetFilterIndex(selectedItem);
  UpdatePanelFileTypes(mOpenPanel, mFilePicker->GetFilterList());

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}
@end

@implementation MOZSaveFilePickerPopUpObserver
- (void)setPopUpButton:(NSPopUpButton*)aPopUpButton {
  mPopUpButton = aPopUpButton;
}

- (void)setSavePanel:(NSSavePanel*)aSavePanel {
  mSavePanel = aSavePanel;
}

- (void)setFilePicker:(nsFilePicker*)aFilePicker {
  mFilePicker = aFilePicker;
}

- (void)menuChangedItem:(NSNotification*)aSender {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;
  int32_t selectedItem = [mPopUpButton indexOfSelectedItem];
  if (selectedItem < 0) {
    return;
  }

  mFilePicker->SetFilterIndex(selectedItem);
  NSArray* filterList = mFilePicker->GetFilterList();

  if (filterList && [filterList count] > 0) {
    NSString* newExtension = [filterList objectAtIndex:0];
    NSString* currentName = [mSavePanel nameFieldStringValue];
    NSString* baseName = [currentName stringByDeletingPathExtension];
    if (baseName.length > 0) {
      [mSavePanel setNameFieldStringValue:
                      [baseName stringByAppendingPathExtension:newExtension]];
      // Keep the panel's allowed type in sync with the name field so the new
      // extension is preserved on the saved file.
      mSavePanel.allowedFileTypes = @[ newExtension ];
    }
  }
  // For the "All Files" filter GetFilterList returns nil; we leave the name
  // field and the allowed type untouched so the current extension is kept.

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}
@end

void nsFilePicker::PresentOpenPanel(bool aAllowMultiple,
                                    nsIFilePickerShownCallback* aCallback) {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;
  MOZ_ASSERT(NS_IsMainThread());

  mFiles.Clear();

  NSOpenPanel* thePanel = [NSOpenPanel openPanel];

  SetShowHiddenFileState(thePanel);

  // Set the options for how the get file dialog will appear
  SetDialogTitle(mTitle, thePanel);
  [thePanel setAllowsMultipleSelection:aAllowMultiple];
  [thePanel setCanSelectHiddenExtension:YES];
  [thePanel setCanChooseDirectories:NO];
  [thePanel setCanChooseFiles:YES];
  [thePanel setResolvesAliases:YES];

  // Get filters
  // filters may be null, if we should allow all file types.
  NSArray* filters = GetFilterList();

  NSString* theDir = PanelDefaultDirectory();
  // If no other dir was set and this is the "Choose application..." dialog
  // then use the Applications folder.
  if (!theDir && filters && [filters count] == 1 &&
      [static_cast<NSString*>([filters objectAtIndex:0])
          isEqualToString:@"app"]) {
    theDir = @"/Applications/";
  }
  if (theDir) {
    [thePanel setDirectoryURL:[NSURL fileURLWithPath:theDir isDirectory:YES]];
  }

  MOZFilePickerPopUpObserver* observer = nil;
  if (mFilters.Length() > 1) {
    observer = [[MOZFilePickerPopUpObserver alloc] init];

    NSView* accessoryView = GetAccessoryView();
    [thePanel setAccessoryView:accessoryView];

    NSPopUpButton* popupButton =
        [accessoryView viewWithTag:kSaveTypeControlTag];
    [observer setPopUpButton:popupButton];
    [observer setOpenPanel:thePanel];
    [observer setFilePicker:this];

    [[NSNotificationCenter defaultCenter]
        addObserver:observer
           selector:@selector(menuChangedItem:)
               name:NSMenuWillSendActionNotification
             object:[popupButton menu]];

    UpdatePanelFileTypes(thePanel, filters);
  } else {
    // If we show all file types, also "expose" bundles' contents.
    if (!filters) {
      [thePanel setTreatsFilePackagesAsDirectories:YES];
    }
    [thePanel setAllowedFileTypes:filters];
  }

  RefPtr<nsFilePicker> self = this;
  nsCOMPtr<nsIFilePickerShownCallback> callback = aCallback;

  BeginPanelAsync(thePanel, ^(NSModalResponse result) {
    NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;
    if (observer) {
      [[NSNotificationCenter defaultCenter] removeObserver:observer];
      [observer release];
    }

    ResultCode retVal = returnCancel;
    if (result != NSModalResponseCancel) {
      for (NSURL* url in [thePanel URLs]) {
        if (!url) {
          continue;
        }
        nsCOMPtr<nsILocalFileMac> macLocalFile;
        if (NS_SUCCEEDED(NS_NewLocalFileWithCFURL(
                static_cast<CFURLRef>(url), getter_AddRefs(macLocalFile)))) {
          self->mFiles.AppendObject(macLocalFile);
        }
      }
      if (self->mFiles.Count() > 0) {
        retVal = returnOK;
      }
    }
    InvokeFilePickerCallbackDeferred(callback, retVal);
    NS_OBJC_END_TRY_IGNORE_BLOCK;
  });

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

void nsFilePicker::PresentFolderPanel(nsIFilePickerShownCallback* aCallback) {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;
  MOZ_ASSERT(NS_IsMainThread());

  mFiles.Clear();

  NSOpenPanel* thePanel = [NSOpenPanel openPanel];

  SetShowHiddenFileState(thePanel);

  // Set the options for how the get file dialog will appear
  SetDialogTitle(mTitle, thePanel);
  [thePanel setAllowsMultipleSelection:NO];
  [thePanel setCanSelectHiddenExtension:YES];
  [thePanel setCanChooseDirectories:YES];
  [thePanel setCanChooseFiles:NO];
  [thePanel setResolvesAliases:YES];
  [thePanel setCanCreateDirectories:YES];

  // packages != folders
  [thePanel setTreatsFilePackagesAsDirectories:NO];

  // set up default directory
  NSString* theDir = PanelDefaultDirectory();
  if (theDir) {
    [thePanel setDirectoryURL:[NSURL fileURLWithPath:theDir isDirectory:YES]];
  }

  RefPtr<nsFilePicker> self = this;
  nsCOMPtr<nsIFilePickerShownCallback> callback = aCallback;

  BeginPanelAsync(thePanel, ^(NSModalResponse result) {
    NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;
    ResultCode retVal = returnCancel;
    if (result != NSModalResponseCancel) {
      // get the path for the folder (we allow just 1, so that's all we get)
      NSArray* urls = [thePanel URLs];
      if ([urls count] > 0) {
        NSURL* theURL = [urls objectAtIndex:0];
        if (theURL) {
          nsCOMPtr<nsILocalFileMac> macLocalFile;
          if (NS_SUCCEEDED(
                  NS_NewLocalFileWithCFURL(static_cast<CFURLRef>(theURL),
                                           getter_AddRefs(macLocalFile)))) {
            self->mFiles.AppendObject(macLocalFile);
            retVal = returnOK;
          }
        }
      }
    }
    InvokeFilePickerCallbackDeferred(callback, retVal);
    NS_OBJC_END_TRY_IGNORE_BLOCK;
  });

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

void nsFilePicker::PresentSavePanel(nsIFilePickerShownCallback* aCallback) {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;
  MOZ_ASSERT(NS_IsMainThread());

  mFiles.Clear();

  NSSavePanel* thePanel = [NSSavePanel savePanel];

  SetShowHiddenFileState(thePanel);

  SetDialogTitle(mTitle, thePanel);

  // set up default file name
  NSString* defaultFilename =
      [NSString stringWithCharacters:reinterpret_cast<const unichar*>(
                                         mDefaultFilename.get())
                              length:mDefaultFilename.Length()];

  // set up accessory view for file format options
  MOZSaveFilePickerPopUpObserver* observer = nil;
  if (mFilters.Length()) {
    NSView* accessoryView = GetAccessoryView();
    [thePanel setAccessoryView:accessoryView];

    observer = [[MOZSaveFilePickerPopUpObserver alloc] init];
    NSPopUpButton* popupButton =
        [accessoryView viewWithTag:kSaveTypeControlTag];
    [observer setPopUpButton:popupButton];
    [observer setSavePanel:thePanel];
    [observer setFilePicker:this];

    [[NSNotificationCenter defaultCenter]
        addObserver:observer
           selector:@selector(menuChangedItem:)
               name:NSMenuWillSendActionNotification
             object:[popupButton menu]];
  }

  // Declare the default file's extension as the allowed type so that saving
  // without changing the format popup keeps it on the file. The observer
  // updates this when the user changes the format.
  NSString* defaultExtension = defaultFilename.pathExtension;
  if (defaultExtension.length != 0) {
    thePanel.allowedFileTypes = @[ defaultExtension ];
  }

  // Allow users to change the extension.
  thePanel.allowsOtherFileTypes = YES;

  // If extensions are hidden and we’re saving a file with multiple extensions,
  // only the last extension will be hidden in the panel (".tar.gz" will become
  // ".tar"). If the remaining extension is known, the OS will think that we're
  // trying to add a non-default extension. To avoid the confusion, we ensure
  // that all extensions are shown in the panel if the remaining extension is
  // known by the OS.
  NSString* fileName =
      [[defaultFilename lastPathComponent] stringByDeletingPathExtension];
  NSString* otherExtension = fileName.pathExtension;
  if (otherExtension.length != 0) {
    // There's another extension here. Get the UTI.
    CFStringRef type = UTTypeCreatePreferredIdentifierForTag(
        kUTTagClassFilenameExtension, static_cast<CFStringRef>(otherExtension),
        nullptr);
    if (type) {
      if (!CFStringHasPrefix(type, CFSTR("dyn."))) {
        // We have a UTI, otherwise the type would have a "dyn." prefix. Ensure
        // extensions are shown in the panel.
        [thePanel setExtensionHidden:NO];
      }
      CFRelease(type);
    }
  }

  // set up default directory
  NSString* theDir = PanelDefaultDirectory();
  if (theDir) {
    [thePanel setDirectoryURL:[NSURL fileURLWithPath:theDir isDirectory:YES]];
  }

  [thePanel setNameFieldStringValue:defaultFilename];

  RefPtr<nsFilePicker> self = this;
  nsCOMPtr<nsIFilePickerShownCallback> callback = aCallback;

  BeginPanelAsync(thePanel, ^(NSModalResponse result) {
    NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;
    if (observer) {
      [[NSNotificationCenter defaultCenter] removeObserver:observer];
      [observer release];
    }

    ResultCode retVal = returnCancel;
    if (result != NSModalResponseCancel) {
      // get the save type
      NSPopUpButton* popupButton =
          [[thePanel accessoryView] viewWithTag:kSaveTypeControlTag];
      if (popupButton) {
        self->mSelectedTypeIndex = [popupButton indexOfSelectedItem];
      }

      NSURL* fileURL = [thePanel URL];
      if (fileURL) {
        nsCOMPtr<nsILocalFileMac> macLocalFile;
        if (NS_SUCCEEDED(
                NS_NewLocalFileWithCFURL(static_cast<CFURLRef>(fileURL),
                                         getter_AddRefs(macLocalFile)))) {
          self->mFiles.AppendObject(macLocalFile);
          // We tell if we are replacing by looking to see if the
          // file exists. The user will only have hit OK if they meant to
          // replace the file.
          if ([[NSFileManager defaultManager]
                  fileExistsAtPath:[fileURL path]]) {
            retVal = returnReplace;
          } else {
            retVal = returnOK;
          }
        }
      }
    }
    InvokeFilePickerCallbackDeferred(callback, retVal);
    NS_OBJC_END_TRY_IGNORE_BLOCK;
  });

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

NSArray* nsFilePicker::GetFilterList() {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  if (!mFilters.Length()) {
    return nil;
  }

  if (mFilters.Length() <= static_cast<uint32_t>(mSelectedTypeIndex)) {
    NS_WARNING("An out of range index has been selected. Using the first index "
               "instead.");
    mSelectedTypeIndex = 0;
  }

  const nsString& filterWide = mFilters[mSelectedTypeIndex];
  if (!filterWide.Length()) {
    return nil;
  }

  if (filterWide.Equals(u"*"_ns)) {
    return nil;
  }

  // The extensions in filterWide are in the format "*.ext" but are expected
  // in the format "ext" by NSOpenPanel. So we need to filter some characters.
  NSMutableString* filterString = [[[NSMutableString alloc]
      initWithString:[NSString
                         stringWithCharacters:reinterpret_cast<const unichar*>(
                                                  filterWide.get())
                                       length:filterWide.Length()]]
      autorelease];
  NSCharacterSet* set =
      [NSCharacterSet characterSetWithCharactersInString:@". *"];
  NSRange range = [filterString rangeOfCharacterFromSet:set];
  while (range.length) {
    [filterString replaceCharactersInRange:range withString:@""];
    range = [filterString rangeOfCharacterFromSet:set];
  }

  return [[[NSArray alloc]
      initWithArray:[filterString componentsSeparatedByString:@";"]]
      autorelease];

  NS_OBJC_END_TRY_BLOCK_RETURN(nil);
}

// Sets the dialog title to whatever it should be.  If it fails, eh,
// the OS will provide a sensible default.
void nsFilePicker::SetDialogTitle(const nsString& inTitle, id aPanel) {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;

  [aPanel
      setTitle:[NSString stringWithCharacters:reinterpret_cast<const unichar*>(
                                                  inTitle.get())
                                       length:inTitle.Length()]];

  if (!mOkButtonLabel.IsEmpty()) {
    [aPanel setPrompt:[NSString
                          stringWithCharacters:reinterpret_cast<const unichar*>(
                                                   mOkButtonLabel.get())
                                        length:mOkButtonLabel.Length()]];
  }

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

// Converts path from an nsIFile into a NSString path
// If it fails, returns an empty string.
NSString* nsFilePicker::PanelDefaultDirectory() {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  NSString* directory = nil;
  if (mDisplayDirectory) {
    nsAutoString pathStr;
    mDisplayDirectory->GetPath(pathStr);
    directory = [[[NSString alloc]
        initWithCharacters:reinterpret_cast<const unichar*>(pathStr.get())
                    length:pathStr.Length()] autorelease];
  }
  return directory;

  NS_OBJC_END_TRY_BLOCK_RETURN(nil);
}

NS_IMETHODIMP nsFilePicker::GetFile(nsIFile** aFile) {
  NS_ENSURE_ARG_POINTER(aFile);
  *aFile = nullptr;

  // just return the first file
  if (mFiles.Count() > 0) {
    *aFile = mFiles.ObjectAt(0);
    NS_IF_ADDREF(*aFile);
  }

  return NS_OK;
}

NS_IMETHODIMP nsFilePicker::GetFileURL(nsIURI** aFileURL) {
  NS_ENSURE_ARG_POINTER(aFileURL);
  *aFileURL = nullptr;

  if (mFiles.Count() == 0) {
    return NS_OK;
  }

  return NS_NewFileURI(aFileURL, mFiles.ObjectAt(0));
}

NS_IMETHODIMP nsFilePicker::GetFiles(nsISimpleEnumerator** aFiles) {
  return NS_NewArrayEnumerator(aFiles, mFiles, NS_GET_IID(nsIFile));
}

NS_IMETHODIMP nsFilePicker::SetDefaultString(const nsAString& aString) {
  mDefaultFilename = aString;
  return NS_OK;
}

NS_IMETHODIMP nsFilePicker::GetDefaultString(nsAString& aString) {
  return NS_ERROR_FAILURE;
}

NS_IMETHODIMP nsFilePicker::GetDefaultExtension(nsAString& aExtension) {
  aExtension.Truncate();
  return NS_OK;
}

NS_IMETHODIMP nsFilePicker::SetDefaultExtension(const nsAString& aExtension) {
  return NS_OK;
}

NS_IMETHODIMP
nsFilePicker::AppendFilter(const nsAString& aTitle, const nsAString& aFilter) {
  // "..apps" has to be translated with native executable extensions.
  if (aFilter.EqualsLiteral("..apps")) {
    mFilters.AppendElement(u"*.app"_ns);
  } else {
    mFilters.AppendElement(aFilter);
  }
  mTitles.AppendElement(aTitle);

  return NS_OK;
}

NS_IMETHODIMP nsFilePicker::GetFilterIndex(int32_t* aFilterIndex) {
  *aFilterIndex = mSelectedTypeIndex;
  return NS_OK;
}

NS_IMETHODIMP nsFilePicker::SetFilterIndex(int32_t aFilterIndex) {
  mSelectedTypeIndex = aFilterIndex;
  return NS_OK;
}
