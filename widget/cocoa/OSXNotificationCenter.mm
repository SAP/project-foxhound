/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "OSXNotificationCenter.h"
#import <AppKit/AppKit.h>
#include "imgIRequest.h"
#include "imgIContainer.h"
#include "nsICancelable.h"
#include "nsIStringBundle.h"
#include "nsNetUtil.h"
#import "nsCocoaUtils.h"
#include "nsComponentManagerUtils.h"
#include "nsContentUtils.h"
#include "nsObjCExceptions.h"
#include "nsString.h"
#include "nsCOMPtr.h"
#include "nsIObserver.h"

using namespace mozilla;

#define MAX_NOTIFICATION_NAME_LEN 5000

static constexpr nsLiteralString kActionSuffix = u"-moz"_ns;

@interface mozNotificationCenterDelegate
    : NSObject <NSUserNotificationCenterDelegate> {
  OSXNotificationCenter* mOSXNC;
}
- (id)initWithOSXNC:(OSXNotificationCenter*)osxnc;
@end

@implementation mozNotificationCenterDelegate

- (id)initWithOSXNC:(OSXNotificationCenter*)osxnc {
  [super init];
  // We should *never* outlive this OSXNotificationCenter.
  mOSXNC = osxnc;
  return self;
}

- (void)userNotificationCenter:(NSUserNotificationCenter*)center
        didDeliverNotification:(NSUserNotification*)notification {
}

- (void)userNotificationCenter:(NSUserNotificationCenter*)center
       didActivateNotification:(NSUserNotification*)notification {
  mOSXNC->OnActivate([[notification userInfo] valueForKey:@"name"],
                     notification.activationType,
                     notification.additionalActivationAction);
}

- (BOOL)userNotificationCenter:(NSUserNotificationCenter*)center
     shouldPresentNotification:(NSUserNotification*)notification {
  return YES;
}

// This is an undocumented method that we need for parity with Safari.
// Apple bug #15440664.
- (void)userNotificationCenter:(NSUserNotificationCenter*)center
    didRemoveDeliveredNotifications:(NSArray*)notifications {
  for (NSUserNotification* notification in notifications) {
    NSString* name = [[notification userInfo] valueForKey:@"name"];
    mOSXNC->CloseAlertCocoaString(name);
  }
}

// This is an undocumented method that we need to be notified if a user clicks
// the close button.
- (void)userNotificationCenter:(NSUserNotificationCenter*)center
               didDismissAlert:(NSUserNotification*)notification {
  NSString* name = [[notification userInfo] valueForKey:@"name"];
  mOSXNC->CloseAlertCocoaString(name);
}

@end

namespace mozilla {

class OSXNotificationInfo final : public nsISupports {
 private:
  virtual ~OSXNotificationInfo();

 public:
  NS_DECL_ISUPPORTS
  OSXNotificationInfo(NSString* name, nsIAlertNotification* aAlertNotification,
                      nsIObserver* observer, const nsAString& alertCookie);

  NSString* mName;
  nsCOMPtr<nsIAlertNotification> mAlertNotification;
  nsCOMPtr<nsIObserver> mObserver;
  nsString mCookie;
};

NS_IMPL_ISUPPORTS0(OSXNotificationInfo)

OSXNotificationInfo::OSXNotificationInfo(
    NSString* name, nsIAlertNotification* aAlertNotification,
    nsIObserver* observer, const nsAString& alertCookie) {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;

  NS_ASSERTION(name, "Cannot create OSXNotificationInfo without a name!");
  mName = [name retain];
  mAlertNotification = aAlertNotification;
  mObserver = observer;
  mCookie = alertCookie;

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

OSXNotificationInfo::~OSXNotificationInfo() {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;

  [mName release];

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

static NSUserNotificationCenter* GetNotificationCenter() {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  Class c = NSClassFromString(@"NSUserNotificationCenter");
  return [c performSelector:@selector(defaultUserNotificationCenter)];

  NS_OBJC_END_TRY_BLOCK_RETURN(nil);
}

OSXNotificationCenter::OSXNotificationCenter() {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;

  mDelegate = [[mozNotificationCenterDelegate alloc] initWithOSXNC:this];
  GetNotificationCenter().delegate = mDelegate;
  mSuppressForScreenSharing = false;

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

OSXNotificationCenter::~OSXNotificationCenter() {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;

  [GetNotificationCenter() removeAllDeliveredNotifications];
  [mDelegate release];

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

NS_IMPL_ISUPPORTS(OSXNotificationCenter, nsIAlertsService,
                  nsIAlertsDoNotDisturb)

nsresult OSXNotificationCenter::Init() {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  return (!!NSClassFromString(@"NSUserNotification")) ? NS_OK
                                                      : NS_ERROR_FAILURE;

  NS_OBJC_END_TRY_BLOCK_RETURN(NS_ERROR_FAILURE);
}

NS_IMETHODIMP
OSXNotificationCenter::ShowAlert(nsIAlertNotification* aAlert,
                                 nsIObserver* aAlertListener) {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  NS_ENSURE_ARG(aAlert);

  if (mSuppressForScreenSharing) {
    return NS_OK;
  }

  Class unClass = NSClassFromString(@"NSUserNotification");
  NSUserNotification* notification = [[[unClass alloc] init] autorelease];

  nsAutoString title;
  nsresult rv = aAlert->GetTitle(title);
  NS_ENSURE_SUCCESS(rv, rv);
  notification.title = nsCocoaUtils::ToNSString(title);

  nsAutoString hostPort;
  rv = aAlert->GetSource(hostPort);
  NS_ENSURE_SUCCESS(rv, rv);
  nsCOMPtr<nsIStringBundle> bundle;
  nsCOMPtr<nsIStringBundleService> sbs =
      do_GetService(NS_STRINGBUNDLE_CONTRACTID);
  sbs->CreateBundle("chrome://alerts/locale/alert.properties",
                    getter_AddRefs(bundle));

  if (!hostPort.IsEmpty() && bundle) {
    AutoTArray<nsString, 1> formatStrings = {hostPort};
    nsAutoString notificationSource;
    bundle->FormatStringFromName("source.label", formatStrings,
                                 notificationSource);
    notification.subtitle = nsCocoaUtils::ToNSString(notificationSource);
  }

  nsAutoString text;
  rv = aAlert->GetText(text);
  NS_ENSURE_SUCCESS(rv, rv);
  notification.informativeText = nsCocoaUtils::ToNSString(text);

  bool isSilent;
  aAlert->GetSilent(&isSilent);
  notification.soundName = isSilent ? nil : NSUserNotificationDefaultSoundName;

  NSMutableArray* additionalActions = [[NSMutableArray alloc] init];

  nsTArray<RefPtr<nsIAlertAction>> actions;
  MOZ_TRY(aAlert->GetActions(actions));

  for (const RefPtr<nsIAlertAction>& action : actions) {
    nsAutoString actionName;
    MOZ_TRY(action->GetAction(actionName));

    nsAutoString actionTitle;
    MOZ_TRY(action->GetTitle(actionTitle));

    // Add suffix to prevent potential collision with keywords like "settings"
    NSString* actionNameNS =
        nsCocoaUtils::ToNSString(actionName + kActionSuffix);
    NSString* actionTitleNS = nsCocoaUtils::ToNSString(actionTitle);
    NSUserNotificationAction* notificationAction =
        [NSUserNotificationAction actionWithIdentifier:actionNameNS
                                                 title:actionTitleNS];
    [additionalActions addObject:notificationAction];
  }

  // If this is not an application/extension alert, show additional actions
  // dealing with permissions.
  bool isActionable;
  if (bundle && NS_SUCCEEDED(aAlert->GetActionable(&isActionable)) &&
      isActionable) {
    nsAutoString disableButtonTitle;
    if (!hostPort.IsEmpty()) {
      AutoTArray<nsString, 1> formatStrings = {hostPort};
      bundle->FormatStringFromName("webActions.disableForOrigin.label",
                                   formatStrings, disableButtonTitle);
    }

    nsAutoString settingsButtonTitle;
    bundle->GetStringFromName("webActions.settings.label", settingsButtonTitle);

    NSString* actionNameNS = nsCocoaUtils::ToNSString(kAlertActionDisable);
    NSString* actionTitleNS = nsCocoaUtils::ToNSString(disableButtonTitle);
    NSUserNotificationAction* notificationAction =
        [NSUserNotificationAction actionWithIdentifier:actionNameNS
                                                 title:actionTitleNS];
    [additionalActions addObject:notificationAction];

    actionNameNS = nsCocoaUtils::ToNSString(kAlertActionSettings);
    actionTitleNS = nsCocoaUtils::ToNSString(settingsButtonTitle);
    notificationAction =
        [NSUserNotificationAction actionWithIdentifier:actionNameNS
                                                 title:actionTitleNS];
    [additionalActions addObject:notificationAction];
  }

  notification.additionalActions = additionalActions;
  notification.hasActionButton = additionalActions.count == 0;
  [additionalActions release];

  nsAutoString name;
  rv = aAlert->GetName(name);
  // Don't let an alert name be more than MAX_NOTIFICATION_NAME_LEN characters.
  // More than that shouldn't be necessary and userInfo (assigned to below) has
  // a length limit of 16k on OS X 10.11. Exception thrown if limit exceeded.
  if (name.Length() > MAX_NOTIFICATION_NAME_LEN) {
    return NS_ERROR_FAILURE;
  }

  NS_ENSURE_SUCCESS(rv, rv);
  NSString* alertName = nsCocoaUtils::ToNSString(name);
  if (!alertName) {
    return NS_ERROR_FAILURE;
  }
  notification.userInfo = [NSDictionary
      dictionaryWithObjects:[NSArray arrayWithObjects:alertName, nil]
                    forKeys:[NSArray arrayWithObjects:@"name", nil]];

  nsAutoString cookie;
  rv = aAlert->GetCookie(cookie);
  NS_ENSURE_SUCCESS(rv, rv);

  nsCOMPtr<imgIContainer> image;
  MOZ_TRY(aAlert->GetImage(getter_AddRefs(image)));
  if (image) {
    NSImage* cocoaImage = nil;
    // TODO: Pass pres context / ComputedStyle here to support context paint
    // properties.
    // TODO: Do we have a reasonable size to pass around here?
    nsCocoaUtils::CreateDualRepresentationNSImageFromImageContainer(
        image, imgIContainer::FRAME_FIRST, nullptr, NSMakeSize(0, 0),
        &cocoaImage);
    notification.contentImage = cocoaImage;
    [cocoaImage release];
  }

  OSXNotificationInfo* osxni =
      new OSXNotificationInfo(alertName, aAlert, aAlertListener, cookie);

  bool inPrivateBrowsing;
  rv = aAlert->GetInPrivateBrowsing(&inPrivateBrowsing);
  NS_ENSURE_SUCCESS(rv, rv);

  CloseAlertCocoaString(alertName);
  mActiveAlerts.AppendElement(osxni);
  [GetNotificationCenter() deliverNotification:notification];
  if (aAlertListener) {
    aAlertListener->Observe(nullptr, "alertshow", cookie.get());
  }

  return NS_OK;

  NS_OBJC_END_TRY_BLOCK_RETURN(NS_ERROR_FAILURE);
}

NS_IMETHODIMP
OSXNotificationCenter::CloseAlert(const nsAString& aAlertName,
                                  bool aContextClosed) {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  NSString* alertName = nsCocoaUtils::ToNSString(aAlertName);
  CloseAlertCocoaString(alertName);
  return NS_OK;

  NS_OBJC_END_TRY_BLOCK_RETURN(NS_ERROR_FAILURE);
}

NS_IMETHODIMP OSXNotificationCenter::Teardown() {
  mActiveAlerts.Clear();
  return NS_OK;
}

NS_IMETHODIMP OSXNotificationCenter::PbmTeardown() {
  return NS_ERROR_NOT_IMPLEMENTED;
}

void OSXNotificationCenter::CloseAlertCocoaString(NSString* aAlertName) {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;

  if (!aAlertName) {
    return;  // Can't do anything without a name
  }

  NSArray* notifications = [GetNotificationCenter() deliveredNotifications];
  for (NSUserNotification* notification in notifications) {
    NSString* name = [[notification userInfo] valueForKey:@"name"];
    if ([name isEqualToString:aAlertName]) {
      [GetNotificationCenter() removeDeliveredNotification:notification];
      break;
    }
  }

  for (unsigned int i = 0; i < mActiveAlerts.Length(); i++) {
    OSXNotificationInfo* osxni = mActiveAlerts[i];
    if ([aAlertName isEqualToString:osxni->mName]) {
      if (osxni->mObserver) {
        osxni->mObserver->Observe(nullptr, "alertfinished",
                                  osxni->mCookie.get());
      }
      mActiveAlerts.RemoveElementAt(i);
      break;
    }
  }

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

void OSXNotificationCenter::OnActivate(
    NSString* aAlertName, NSUserNotificationActivationType aActivationType,
    NSUserNotificationAction* aAdditionalActivationAction) {
  NS_OBJC_BEGIN_TRY_IGNORE_BLOCK;

  if (!aAlertName) {
    return;  // Can't do anything without a name
  }

  for (unsigned int i = 0; i < mActiveAlerts.Length(); i++) {
    OSXNotificationInfo* osxni = mActiveAlerts[i];
    if ([aAlertName isEqualToString:osxni->mName]) {
      if (osxni->mObserver) {
        switch ((int)aActivationType) {
          case NSUserNotificationActivationTypeAdditionalActionClicked: {
            MOZ_ASSERT(aAdditionalActivationAction);
            nsAutoString actionName;
            nsCocoaUtils::GetStringForNSString(
                aAdditionalActivationAction.identifier, actionName);

            if (actionName == kAlertActionDisable) {
              osxni->mObserver->Observe(nullptr, "alertdisablecallback",
                                        osxni->mCookie.get());
              break;
            }
            if (actionName == kAlertActionSettings) {
              osxni->mObserver->Observe(nullptr, "alertsettingscallback",
                                        osxni->mCookie.get());
              break;
            }

            // Trim the suffix
            actionName.Truncate(actionName.Length() - kActionSuffix.Length());

            nsCOMPtr<nsIAlertAction> action;
            osxni->mAlertNotification->GetAction(actionName,
                                                 getter_AddRefs(action));
            osxni->mObserver->Observe(action, "alertclickcallback",
                                      osxni->mCookie.get());
            break;
          }
          case NSUserNotificationActivationTypeActionButtonClicked:
          default:
            osxni->mObserver->Observe(nullptr, "alertclickcallback",
                                      osxni->mCookie.get());
            break;
        }
      }
      return;
    }
  }

  NS_OBJC_END_TRY_IGNORE_BLOCK;
}

NS_IMETHODIMP
OSXNotificationCenter::GetHistory(nsTArray<nsString>& aResult) {
  // NSUserNotificationCenter doesn't support this, blocked by the migration to
  // UNUserNotificationCenter which has
  // getDeliveredNotificationsWithCompletionHandler
  // https://developer.apple.com/documentation/usernotifications/unusernotificationcenter/getdeliverednotifications(completionhandler:)?language=objc
  // See bug 1971395.
  return NS_ERROR_NOT_IMPLEMENTED;
}

// nsIAlertsDoNotDisturb
NS_IMETHODIMP
OSXNotificationCenter::GetManualDoNotDisturb(bool* aRetVal) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
OSXNotificationCenter::SetManualDoNotDisturb(bool aDoNotDisturb) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
OSXNotificationCenter::GetSuppressForScreenSharing(bool* aRetVal) {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN

  NS_ENSURE_ARG(aRetVal);
  *aRetVal = mSuppressForScreenSharing;
  return NS_OK;

  NS_OBJC_END_TRY_BLOCK_RETURN(NS_ERROR_FAILURE)
}

NS_IMETHODIMP
OSXNotificationCenter::SetSuppressForScreenSharing(bool aSuppress) {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN

  mSuppressForScreenSharing = aSuppress;
  return NS_OK;

  NS_OBJC_END_TRY_BLOCK_RETURN(NS_ERROR_FAILURE)
}

}  // namespace mozilla
