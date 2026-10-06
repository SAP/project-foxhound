/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsPrintData_h_
#define nsPrintData_h_

// Interfaces
#include "nsCOMArray.h"
#include "nsDeviceContext.h"
#include "nsIPrintSettings.h"
#include "nsISupportsImpl.h"

class nsPrintObject;
class nsIWebProgressListener;

class nsPrintData {
 public:
  typedef enum { eIsPrinting, eIsPrintPreview } ePrintDataType;

  explicit nsPrintData(ePrintDataType aType);

  NS_INLINE_DECL_REFCOUNTING(nsPrintData)

  // Listener Helper Methods
  void OnEndPrinting();
  void OnStartPrinting();
  void DoOnProgressChange(int32_t aProgress, int32_t aMaxProgress,
                          bool aDoStartStop, int32_t aFlag);

  void DoOnStatusChange(nsresult aStatus);

  ePrintDataType mType;  // the type of data this is (Printing or Print Preview)
  RefPtr<nsDeviceContext> mPrintDC;

  nsCOMArray<nsIWebProgressListener> mPrintProgressListeners;

  bool mOnStartSent;
  bool mIsAborted;  // tells us the document is being aborted

  nsPrintData() = delete;
  nsPrintData& operator=(const nsPrintData& aOther) = delete;

 private:
  ~nsPrintData();  // non-virtual
};

#endif /* nsPrintData_h_ */
