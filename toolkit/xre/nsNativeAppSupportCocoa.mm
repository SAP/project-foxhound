/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsString.h"

#import <CoreServices/CoreServices.h>
#import <Cocoa/Cocoa.h>

#include "nsCOMPtr.h"
#include "nsCocoaFeatures.h"
#include "nsNativeAppSupportBase.h"
#include "nsServiceManagerUtils.h"

#include "nsIBaseWindow.h"
#include "nsCommandLine.h"
#include "mozIDOMWindow.h"
#include "nsIWidget.h"
#include "nsIWindowMediator.h"
#include "nsPIDOMWindow.h"
#include "WidgetUtils.h"

// This must be included last:
#include "nsObjCExceptions.h"

using mozilla::widget::WidgetUtils;

nsresult GetNativeWindowPointerFromDOMWindow(mozIDOMWindowProxy* a_window,
                                             NSWindow** a_nativeWindow) {
  *a_nativeWindow = nil;
  if (!a_window) return NS_ERROR_INVALID_ARG;

  nsPIDOMWindowOuter* win = nsPIDOMWindowOuter::From(a_window);
  nsCOMPtr<nsIWidget> widget = WidgetUtils::DOMWindowToWidget(win);
  if (!widget) {
    return NS_ERROR_FAILURE;
  }

  *a_nativeWindow = (NSWindow*)widget->GetNativeData(NS_NATIVE_WINDOW);
  if (!*a_nativeWindow) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

class nsNativeAppSupportCocoa : public nsNativeAppSupportBase {
 public:
  nsNativeAppSupportCocoa() : mCanShowUI(false) {}

  NS_IMETHOD Start(bool* aRetVal) override;
  NS_IMETHOD ReOpen() override;
  NS_IMETHOD Enable() override;

 private:
  bool mCanShowUI;
};

NS_IMETHODIMP
nsNativeAppSupportCocoa::Enable() {
  mCanShowUI = true;
  return NS_OK;
}

NS_IMETHODIMP nsNativeAppSupportCocoa::Start(bool* _retval) {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  *_retval = false;

  int major, minor, bugfix;
  nsCocoaFeatures::GetSystemVersion(major, minor, bugfix);
  if (major >= 11 || (major == 10 && minor >= 15)) {
    *_retval = true;
  } else {
    NSLog(@"Minimum OS version requirement not met!");
  }

  return NS_OK;

  NS_OBJC_END_TRY_BLOCK_RETURN(NS_ERROR_FAILURE);
}

NS_IMETHODIMP
nsNativeAppSupportCocoa::ReOpen() {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  if (!mCanShowUI) return NS_ERROR_FAILURE;

  bool haveNonMiniaturized = false;
  bool haveOpenWindows = false;
  bool done = false;

  nsCOMPtr<nsIWindowMediator> wm(do_GetService(NS_WINDOWMEDIATOR_CONTRACTID));
  if (!wm) {
    return NS_ERROR_FAILURE;
  } else {
    nsCOMPtr<nsISimpleEnumerator> windowList;
    wm->GetAppWindowEnumerator(nullptr, getter_AddRefs(windowList));
    if (!windowList) {
      return NS_ERROR_FAILURE;
    }

    bool more = false;
    windowList->HasMoreElements(&more);
    while (more) {
      nsCOMPtr<nsISupports> nextWindow = nullptr;
      windowList->GetNext(getter_AddRefs(nextWindow));
      nsCOMPtr<nsIBaseWindow> baseWindow(do_QueryInterface(nextWindow));
      if (!baseWindow) {
        windowList->HasMoreElements(&more);
        continue;
      } else {
        haveOpenWindows = true;
      }

      nsCOMPtr<nsIWidget> widget = baseWindow->GetMainWidget();
      if (!widget || !widget->IsVisible()) {
        windowList->HasMoreElements(&more);
        continue;
      }
      NSWindow* cocoaWindow =
          (NSWindow*)widget->GetNativeData(NS_NATIVE_WINDOW);
      if (cocoaWindow && ![cocoaWindow isMiniaturized]) {
        haveNonMiniaturized = true;
        break;  // have un-minimized windows, nothing to do
      }
      windowList->HasMoreElements(&more);
    }  // end while

    if (!haveNonMiniaturized) {
      // Prioritize browser windows for deminiaturization
      nsCOMPtr<mozIDOMWindowProxy> mru;
      wm->GetMostRecentBrowserWindow(getter_AddRefs(mru));

      // Failing that, deminiaturize the most recently used window
      if (!mru) {
        wm->GetMostRecentWindow(nullptr, getter_AddRefs(mru));
      }

      if (mru) {
        NSWindow* cocoaMru = nil;
        GetNativeWindowPointerFromDOMWindow(mru, &cocoaMru);
        if (cocoaMru) {
          [cocoaMru deminiaturize:nil];
          done = true;
        }
      }
    }  // end if have non miniaturized

    if (!haveOpenWindows && !done) {
      char* argv[] = {nullptr};

      // use an empty command line to make the right kind(s) of window open
      nsCOMPtr<nsICommandLineRunner> cmdLine(new nsCommandLine());
      if (!cmdLine) {
        return NS_ERROR_FAILURE;
      }

      nsresult rv = cmdLine->Init(0, argv, nullptr,
                                  nsICommandLine::STATE_REMOTE_EXPLICIT);
      NS_ENSURE_SUCCESS(rv, rv);

      return cmdLine->Run();
    }

  }  // got window mediator
  return NS_OK;

  NS_OBJC_END_TRY_BLOCK_RETURN(NS_ERROR_FAILURE);
}

#pragma mark -

// Create and return an instance of class nsNativeAppSupportCocoa.
nsresult NS_CreateNativeAppSupport(nsINativeAppSupport** aResult) {
  *aResult = new nsNativeAppSupportCocoa;
  NS_ADDREF(*aResult);
  return NS_OK;
}
