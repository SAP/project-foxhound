/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsClipboard_h__
#define nsClipboard_h__

#include "nsBaseClipboard.h"
#include "nsIObserver.h"
#include "nsIURI.h"

#include <ole2.h>
#include <windows.h>

class nsITransferable;
class nsIWidget;
class nsIFile;
struct IDataObject;

/**
 * Native Win32 Clipboard wrapper
 */

class nsClipboard : public nsBaseClipboard, public nsIObserver {
  virtual ~nsClipboard();

 public:
  nsClipboard();

  NS_DECL_ISUPPORTS_INHERITED

  // nsIObserver
  NS_DECL_NSIOBSERVER

  // Internal Native Routines
  enum class MightNeedToFlush : bool { No, Yes };
  static nsresult CreateNativeDataObject(nsITransferable* aTransferable,
                                         IDataObject** aDataObj, nsIURI* aUri,
                                         MightNeedToFlush* = nullptr);
  static nsresult SetupNativeDataObject(nsITransferable* aTransferable,
                                        IDataObject* aDataObj,
                                        MightNeedToFlush* = nullptr);
  static nsresult GetDataFromDataObject(IDataObject* aDataObject, UINT anIndex,
                                        nsIWidget* aWindow,
                                        nsITransferable* aTransferable);
  static nsresult GetNativeDataOffClipboard(nsIWidget* aWindow, UINT aIndex,
                                            UINT aFormat, void** aData,
                                            uint32_t* aLen);
  static nsresult GetNativeDataOffClipboard(IDataObject* aDataObject,
                                            UINT aIndex, UINT aFormat,
                                            const char* aMIMEImageFormat,
                                            void** aData, uint32_t* aLen);
  static nsresult GetGlobalData(HGLOBAL aHGBL, void** aData, uint32_t* aLen);

  // This function returns the internal Windows clipboard format identifier
  // for a given Mime string. The default is to map kHTMLMime ("text/html")
  // to the clipboard format CF_HTML ("HTLM Format"), but it can also be
  // registered as clipboard format "text/html" to support previous versions
  // of Gecko.
  static UINT GetFormat(const char* aMimeStr, bool aMapHTMLMime = true);

  static UINT GetClipboardFileDescriptorFormatA();
  static UINT GetClipboardFileDescriptorFormatW();
  static UINT GetHtmlClipboardFormat();
  static UINT GetCustomClipboardFormat();

 protected:
  // @param aDataObject must be non-nullptr.
  static HRESULT FillSTGMedium(IDataObject* aDataObject, UINT aFormat,
                               LPFORMATETC pFE, LPSTGMEDIUM pSTM, DWORD aTymed);

  // Implement the native clipboard behavior.
  NS_IMETHOD SetNativeClipboardData(nsITransferable* aTransferable,
                                    ClipboardType aWhichClipboard) override;
  NS_IMETHOD GetNativeClipboardData(nsITransferable* aTransferable,
                                    ClipboardType aWhichClipboard) override;
  nsresult EmptyNativeClipboardData(ClipboardType aWhichClipboard) override;
  mozilla::Result<int32_t, nsresult> GetNativeClipboardSequenceNumber(
      ClipboardType aWhichClipboard) override;
  mozilla::Result<bool, nsresult> HasNativeClipboardDataMatchingFlavors(
      const nsTArray<nsCString>& aFlavorList,
      ClipboardType aWhichClipboard) override;

  static bool IsInternetShortcut(const nsAString& inFileName);
  static bool FindURLFromLocalFile(IDataObject* inDataObject, UINT inIndex,
                                   void** outData, uint32_t* outDataLen);
  static bool FindURLFromNativeURL(IDataObject* inDataObject, UINT inIndex,
                                   void** outData, uint32_t* outDataLen);
  static bool FindUnicodeFromPlainText(IDataObject* inDataObject, UINT inIndex,
                                       void** outData, uint32_t* outDataLen);
  static bool FindPlatformHTML(IDataObject* inDataObject, UINT inIndex,
                               void** outData, uint32_t* outStartOfData,
                               uint32_t* outDataLen);

  static void ResolveShortcut(nsIFile* inFileName, nsACString& outURL);
  static nsresult GetTempFilePath(const nsAString& aFileName,
                                  nsAString& aFilePath);
  static nsresult SaveStorageOrStream(IDataObject* aDataObject, UINT aIndex,
                                      const nsAString& aFileName);

  nsIWidget* mWindow;
};

#define SET_FORMATETC(fe, cf, td, asp, li, med) \
  {                                             \
    (fe).cfFormat = cf;                         \
    (fe).ptd = td;                              \
    (fe).dwAspect = asp;                        \
    (fe).lindex = li;                           \
    (fe).tymed = med;                           \
  }

#endif  // nsClipboard_h__
