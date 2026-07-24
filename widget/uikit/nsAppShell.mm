/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#import <UIKit/UIApplication.h>
#import <UIKit/UIScreen.h>
#import <UIKit/UIWindow.h>

#include "mozilla/Components.h"
#include "mozilla/dom/Document.h"
#include "nsIObserverService.h"
#include "gfxPlatform.h"
#include "nsAppRunner.h"
#include "nsAppShell.h"
#include "nsCOMPtr.h"
#include "nsComponentManager.h"
#include "nsDirectoryServiceDefs.h"
#include "nsObjCExceptions.h"
#include "nsString.h"
#include "nsIAppStartup.h"
#include "nsIRollupListener.h"
#include "nsIWidget.h"
#include "nsThreadUtils.h"
#include "nsMemoryPressure.h"
#include "nsServiceManagerUtils.h"
#include "mozilla/widget/EventDispatcher.h"
#include "mozilla/widget/ScreenManager.h"
#include "ScreenHelperUIKit.h"
#include "mozilla/Hal.h"
#include "HeadlessScreenHelper.h"
#include "nsWindow.h"
#include "nsXREDirProvider.h"

using namespace mozilla;
using namespace mozilla::widget;

nsAppShell* nsAppShell::gAppShell = NULL;

#define ALOG(args...)    \
  fprintf(stderr, args); \
  fprintf(stderr, "\n")

static void ApplicationWillTerminate(bool aCallExit);

// AppShellDelegate
//
// Acts as a delegate for the UIApplication

@interface AppShellDelegate : NSObject <UIApplicationDelegate> {
}
@property(strong, nonatomic) UIWindow* window;
@end

@implementation AppShellDelegate

- (BOOL)application:(UIApplication*)application
    didFinishLaunchingWithOptions:(NSDictionary*)launchOptions {
  ALOG("[AppShellDelegate application:didFinishLaunchingWithOptions:]");

  return YES;
}

- (void)applicationWillTerminate:(UIApplication*)application {
  ALOG("[AppShellDelegate applicationWillTerminate:]");
  ApplicationWillTerminate(/* aCallExit */ false);
}

- (void)applicationDidBecomeActive:(UIApplication*)application {
  ALOG("[AppShellDelegate applicationDidBecomeActive:]");
}

- (void)applicationWillResignActive:(UIApplication*)application {
  ALOG("[AppShellDelegate applicationWillResignActive:]");
}

- (void)applicationDidReceiveMemoryWarning:(UIApplication*)application {
  ALOG("[AppShellDelegate applicationDidReceiveMemoryWarning:]");
  NS_NotifyOfMemoryPressure(MemoryPressureState::LowMemory);
}
@end

// nsAppShell implementation

NS_IMETHODIMP
nsAppShell::ResumeNative(void) { return nsBaseAppShell::ResumeNative(); }

nsAppShell::nsAppShell()
    : mAutoreleasePool(NULL),
      mDelegate(NULL),
      mCFRunLoop(NULL),
      mCFRunLoopSource(NULL),
      mUsingNativeEventLoop(false),
      mRunningEventLoop(false),
      mTerminated(false) {
  gAppShell = this;
}

nsAppShell::~nsAppShell() {
  if (mAutoreleasePool) {
    [mAutoreleasePool release];
    mAutoreleasePool = NULL;
  }

  if (mCFRunLoop) {
    if (mCFRunLoopSource) {
      ::CFRunLoopRemoveSource(mCFRunLoop, mCFRunLoopSource,
                              kCFRunLoopCommonModes);
      ::CFRelease(mCFRunLoopSource);
    }
    ::CFRelease(mCFRunLoop);
  }

  gAppShell = NULL;
}

// Init
//
// public
nsresult nsAppShell::Init() {
  mUsingNativeEventLoop = XRE_UseNativeEventProcessing();

  mAutoreleasePool = [[NSAutoreleasePool alloc] init];

  // Add a CFRunLoopSource to the main native run loop.  The source is
  // responsible for interrupting the run loop when Gecko events are ready.

  mCFRunLoop = [[NSRunLoop currentRunLoop] getCFRunLoop];
  NS_ENSURE_STATE(mCFRunLoop);
  ::CFRetain(mCFRunLoop);

  CFRunLoopSourceContext context;
  bzero(&context, sizeof(context));
  // context.version = 0;
  context.info = this;
  context.perform = ProcessGeckoEvents;

  mCFRunLoopSource = ::CFRunLoopSourceCreate(kCFAllocatorDefault, 0, &context);
  NS_ENSURE_STATE(mCFRunLoopSource);

  ::CFRunLoopAddSource(mCFRunLoop, mCFRunLoopSource, kCFRunLoopCommonModes);

  hal::Init();

  if (XRE_IsParentProcess()) {
    ScreenManager& screenManager = ScreenManager::GetSingleton();

    if (gfxPlatform::IsHeadless()) {
      screenManager.SetHelper(mozilla::MakeUnique<HeadlessScreenHelper>());
    } else {
      screenManager.SetHelper(mozilla::MakeUnique<ScreenHelperUIKit>());
    }
  }

  nsresult rv = nsBaseAppShell::Init();

  nsCOMPtr<nsIObserverService> obsServ =
      mozilla::services::GetObserverService();
  if (obsServ) {
    obsServ->AddObserver(this, "profile-after-change", false);
    obsServ->AddObserver(this, "quit-application-granted", false);
    if (XRE_IsParentProcess()) {
      obsServ->AddObserver(this, "chrome-document-loaded", false);
    }
  }

  return rv;
}

NS_IMETHODIMP nsAppShell::Observe(nsISupports* aSubject, const char* aTopic,
                                  const char16_t* aData) {
  AssertIsOnMainThread();

  bool removeObserver = false;
  if (!strcmp(aTopic, "profile-after-change")) {
    // Gecko on iOS follows the iOS app model where it never stops until it is
    // killed by the system or told explicitly to quit. Therefore, we should
    // *not* exit Gecko when there is no window or the last window is closed.
    // nsIAppStartup::Quit will still force Gecko to exit.
    nsCOMPtr<nsIAppStartup> appStartup = components::AppStartup::Service();
    if (appStartup) {
      appStartup->EnterLastWindowClosingSurvivalArea();
    }
    removeObserver = true;
  } else if (!strcmp(aTopic, "quit-application-granted")) {
    // We are told explicitly to quit, perhaps due to
    // nsIAppStartup::Quit being called. We should release our hold on
    // nsIAppStartup and let it continue to quit.
    nsCOMPtr<nsIAppStartup> appStartup = components::AppStartup::Service();
    if (appStartup) {
      appStartup->ExitLastWindowClosingSurvivalArea();
    }
    removeObserver = true;
  } else if (!strcmp(aTopic, "chrome-document-loaded")) {
    // Set the global ready state and enable the window event dispatcher
    // for this particular GeckoView.
    nsCOMPtr<dom::Document> doc = do_QueryInterface(aSubject);
    MOZ_ASSERT(doc);
    if (const RefPtr<nsWindow> window = nsWindow::From(doc->GetWindow())) {
      RefPtr<EventDispatcher> dispatcher = window->GetEventDispatcher();
      dispatcher->Activate();
    }
  } else {
    return nsBaseAppShell::Observe(aSubject, aTopic, aData);
  }

  if (removeObserver) {
    nsCOMPtr<nsIObserverService> obsServ =
        mozilla::services::GetObserverService();
    if (obsServ) {
      obsServ->RemoveObserver(this, aTopic);
    }
  }
  return NS_OK;
}

// ProcessGeckoEvents
//
// The "perform" target of mCFRunLoop, called when mCFRunLoopSource is
// signalled from ScheduleNativeEventCallback.
//
// protected static
void nsAppShell::ProcessGeckoEvents(void* aInfo) {
  nsAppShell* self = static_cast<nsAppShell*>(aInfo);
  if (self->mRunningEventLoop) {
    self->mRunningEventLoop = false;
  }
  self->NativeEventCallback();
  self->Release();
}

// ScheduleNativeEventCallback
//
// protected virtual
void nsAppShell::ScheduleNativeEventCallback() {
  NS_ADDREF_THIS();

  // This will invoke ProcessGeckoEvents on the main thread.
  ::CFRunLoopSourceSignal(mCFRunLoopSource);
  ::CFRunLoopWakeUp(mCFRunLoop);
}

// ProcessNextNativeEvent
//
// protected virtual
bool nsAppShell::ProcessNextNativeEvent(bool aMayWait) {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;

  if (mTerminated) return false;

  bool wasRunningEventLoop = mRunningEventLoop;
  mRunningEventLoop = aMayWait;
  NSString* currentMode = nil;
  NSDate* waitUntil = nil;
  if (aMayWait) waitUntil = [NSDate distantFuture];
  NSRunLoop* currentRunLoop = [NSRunLoop currentRunLoop];

  do {
    currentMode = [currentRunLoop currentMode];
    if (!currentMode) currentMode = NSDefaultRunLoopMode;

    if (aMayWait) {
      [currentRunLoop runMode:currentMode beforeDate:waitUntil];
    } else {
      [currentRunLoop acceptInputForMode:currentMode beforeDate:waitUntil];
    }
  } while (mRunningEventLoop);

  mRunningEventLoop = wasRunningEventLoop;

  NS_OBJC_END_TRY_IGNORE_BLOCK;

  return false;
}

// Run
//
// public
NS_IMETHODIMP
nsAppShell::Run(void) {
  ALOG("nsAppShell::Run");

  nsresult rv = NS_OK;
  if (mUsingNativeEventLoop) {
    char argv[1][4] = {"app"};
    UIApplicationMain(1, (char**)argv, nil, @"AppShellDelegate");
    // UIApplicationMain doesn't exit. :-(
  } else {
    rv = nsBaseAppShell::Run();
  }

  return rv;
}

NS_IMETHODIMP
nsAppShell::Exit(void) {
  if (mTerminated) return NS_OK;

  mTerminated = true;

  if (mUsingNativeEventLoop) {
    // Dispatch a native event to the main queue to terminate. XPCOM doesn't
    // like being shut down from within an XPCOM runnable, so we cannot use
    // `NS_DispatchToMainThread` here.
    dispatch_async(dispatch_get_main_queue(), ^{
      ApplicationWillTerminate(true);
    });
    return NS_OK;
  }

  return nsBaseAppShell::Exit();
}

static bool gNotifiedWillTerminate = false;

static void ApplicationWillTerminate(bool aCallExit) {
  if (std::exchange(gNotifiedWillTerminate, true)) {
    return;
  }

  // Perform the steps which would normally happen after nsAppShell::Run, such
  // as `~ScopedXPCOMStartup`, as UIApplicationMain will never shutdown.
  if (nsCOMPtr<nsIAppStartup> appStartup = components::AppStartup::Service()) {
    // Ensure quit notifications have fired to start the shutdown process, and
    // notify listeners.
    bool userAllowedQuit;
    appStartup->Quit(nsIAppStartup::eForceQuit, 0, &userAllowedQuit);

    appStartup->DestroyHiddenWindow();
  }

  gDirServiceProvider->DoShutdown();

  WriteConsoleLog();

  // Release the final reference to the `nsIServiceManager` which is being held
  // by `ScopedXPCOMStartup`, as we will never destroy that object.
  nsIServiceManager* servMgr = nsComponentManagerImpl::gComponentManager;
  NS_ShutdownXPCOM(servMgr);

  // Matches the ScopedLogger initialized in `XRE_main` which will never be
  // cleaned up.
  NS_LogTerm();

  if (aCallExit) {
    _exit(0);
  }
}
