/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "NotificationParent.h"

#include "NotificationHandler.h"
#include "NotificationUtils.h"
#include "mozilla/AlertNotification.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/ServiceWorkerManager.h"
#include "mozilla/glean/DomNotificationMetrics.h"
#include "mozilla/ipc/Endpoint.h"
#include "nsComponentManagerUtils.h"
#include "nsIServiceWorkerManager.h"
#include "nsIURIClassifier.h"
#include "nsNetCID.h"
#include "nsThreadUtils.h"

namespace mozilla::dom::notification {

NS_IMPL_ISUPPORTS0(NotificationParent)

// TODO(krosylight): Would be nice to replace nsIObserver with something like:
//
// nsINotificationManager.NotifyClick(notification.id [, notification.action])
class NotificationObserver final : public nsIObserver {
 public:
  NS_DECL_ISUPPORTS

  NotificationObserver(const nsAString& aScope, nsIPrincipal* aPrincipal,
                       IPCNotification aNotification,
                       NotificationParent& aParent)
      : mScope(aScope),
        mPrincipal(aPrincipal),
        mNotification(std::move(aNotification)),
        mActor(&aParent) {}

  NS_IMETHODIMP Observe(nsISupports* aSubject, const char* aTopic,
                        const char16_t* aData) override {
    AlertTopic topic = ToAlertTopic(aTopic, aData);

    // These two never fire any content event directly
    if (topic == AlertTopic::Disable) {
      return RemovePermission(mPrincipal);
    }
    if (topic == AlertTopic::Settings) {
      return OpenSettings(mPrincipal);
    }

    RefPtr<NotificationParent> actor(mActor);

    if (actor && actor->CanSend()) {
      // The actor is alive, call it to ping the content process and/or to make
      // it clean up itself
      actor->HandleAlertTopic(topic);
      if (mScope.IsEmpty()) {
        // The actor covered everything we need.
        return NS_OK;
      }
    } else if (mScope.IsEmpty()) {
      if (topic == AlertTopic::Click) {
        // No actor there, we need to open up a window ourselves
        return OpenWindowFor(mPrincipal);
      }
      // Nothing to do
      return NS_OK;
    }

    // We have a Service Worker to call
    MOZ_ASSERT(!mScope.IsEmpty());
    if (topic == AlertTopic::Show) {
      (void)NS_WARN_IF(NS_FAILED(
          AdjustPushQuota(mPrincipal, NotificationStatusChange::Shown)));
      nsresult rv = PersistNotification(mPrincipal, mNotification, mScope);
      if (NS_FAILED(rv)) {
        NS_WARNING("Could not persist Notification");
      }
      return NS_OK;
    }

    MOZ_ASSERT(topic == AlertTopic::Click || topic == AlertTopic::Finished ||
               topic == AlertTopic::Closed);

    if (topic == AlertTopic::Click) {
      nsCOMPtr<nsIAlertAction> action = do_QueryInterface(aSubject);
      nsAutoString actionName;
      if (action) {
        MOZ_TRY(action->GetAction(actionName));
      }
      return RespondOnClick(mPrincipal, mScope, mNotification, actionName);
    }

    RefPtr<ServiceWorkerManager> swm = ServiceWorkerManager::GetInstance();
    if (!swm) {
      return NS_ERROR_FAILURE;
    }

    nsAutoCString originSuffix;
    MOZ_TRY(mPrincipal->GetOriginSuffix(originSuffix));

    MOZ_ASSERT(topic == AlertTopic::Finished || topic == AlertTopic::Closed);
    (void)NS_WARN_IF(NS_FAILED(
        AdjustPushQuota(mPrincipal, NotificationStatusChange::Closed)));
    (void)NS_WARN_IF(
        NS_FAILED(UnpersistNotification(mPrincipal, mNotification.id())));
    (void)swm->SendNotificationCloseEvent(originSuffix, mScope, mNotification);

    return NS_OK;
  }

 private:
  virtual ~NotificationObserver() = default;

  static AlertTopic ToAlertTopic(const char* aTopic, const char16_t* aData) {
    if (!strcmp("alertdisablecallback", aTopic)) {
      return AlertTopic::Disable;
    }
    if (!strcmp("alertsettingscallback", aTopic)) {
      return AlertTopic::Settings;
    }
    if (!strcmp("alertclickcallback", aTopic)) {
      return AlertTopic::Click;
    }
    if (!strcmp("alertshow", aTopic)) {
      return AlertTopic::Show;
    }
    if (!strcmp("alertfinished", aTopic)) {
      if (aData && nsDependentString(aData) == u"close"_ns) {
        // Backends with asynchronous system API may hint that they are
        // intentionally closing the notification, to disambiguate from an early
        // alertfinished which is recognized as an error.
        // (Not introducing alertclose for compatibility with existing browser
        // script callers.)
        return AlertTopic::Closed;
      }
      return AlertTopic::Finished;
    }
    MOZ_ASSERT_UNREACHABLE("Unknown alert topic");
    return AlertTopic::Finished;
  }

  // May want to replace with SWR ID, see bug 1881812
  nsString mScope;
  nsCOMPtr<nsIPrincipal> mPrincipal;
  IPCNotification mNotification;
  WeakPtr<NotificationParent> mActor;
};

NS_IMPL_ISUPPORTS(NotificationObserver, nsIObserver)

using SafeBrowsingPromise = MozPromise<bool, nsresult, false>;

class SafeBrowsingClassificationCallback final
    : public nsIURIClassifierCallback {
 public:
  NS_DECL_ISUPPORTS

  SafeBrowsingClassificationCallback() = default;

  already_AddRefed<SafeBrowsingPromise> Promise() {
    return mPromiseHolder.Ensure(__func__);
  }

  NS_IMETHOD OnClassifyComplete(nsresult aErrorCode, const nsACString& aList,
                                const nsACString& aProvider,
                                const nsACString& aFullHash) override {
    if (NS_FAILED(aErrorCode)) {
      mPromiseHolder.Reject(aErrorCode, __func__);
    } else {
      mPromiseHolder.Resolve(true, __func__);
    }
    return NS_OK;
  }

 private:
  ~SafeBrowsingClassificationCallback() {
    mPromiseHolder.RejectIfExists(NS_ERROR_ABORT, __func__);
  }

  MozPromiseHolder<SafeBrowsingPromise> mPromiseHolder;
};

NS_IMPL_ISUPPORTS(SafeBrowsingClassificationCallback, nsIURIClassifierCallback)

nsresult NotificationParent::HandleAlertTopic(AlertTopic aTopic) {
  if (aTopic == AlertTopic::Click) {
    return FireClickEvent();
  }
  if (aTopic == AlertTopic::Show) {
    if (!mResolver) {
#ifdef ANDROID
      // XXX: This can happen as alertshow happens asynchronously on Android as
      // we go through GeckoView.
      //
      // For example, if two same-tagged notifications are requested at the same
      // time, the first one will be canceled but can still fire alertshow,
      // while the second one will also fire one, and the handler for the second
      // one would get both.
      //
      // We may want to reintroduce UUID for such asynchronous case, but for now
      // it's very edge case and can be ignored.
      return NS_OK;
#else
      MOZ_ASSERT_UNREACHABLE("Are we getting double show events?");
      return NS_ERROR_FAILURE;
#endif
    }
    mResolver.take().value()(CopyableErrorResult());
    return NS_OK;
  }
  if (mResolver) {
    if (aTopic == AlertTopic::Closed) {
      // Closing without ever being shown, but intentionally by the backend
      mResolver.take().value()(CopyableErrorResult());
    } else if (aTopic == AlertTopic::Finished) {
      // alertshow happens first before alertfinished, and it should have
      // nullified mResolver. If not it means it failed to show and is bailing
      // out.
      // NOTE(krosylight): The spec does not define what to do when a
      // permission-granted notification fails to open, we throw TypeError
      // here as that's the error for when permission is denied.
      CopyableErrorResult rv;
      rv.ThrowTypeError(
          "Failed to show notification, potentially because the browser did "
          "not have the corresponding OS-level permission."_ns);
      mResolver.take().value()(rv);
    }
  }

  if (aTopic == AlertTopic::Finished || aTopic == AlertTopic::Closed) {
    // Unpersisted already and being unregistered already by nsIAlertsService
    mDangling = true;
    Close();

    return NS_OK;
  }

  MOZ_ASSERT_UNREACHABLE("Unknown notification topic");

  return NS_OK;
}

nsresult NotificationParent::FireClickEvent() {
  if (!mArgs.mScope.IsEmpty()) {
    return NS_OK;
  }
  if (SendNotifyClick()) {
    return NS_OK;
  }
  return NS_ERROR_FAILURE;
}

// Step 4 of
// https://notifications.spec.whatwg.org/#dom-notification-notification
mozilla::ipc::IPCResult NotificationParent::RecvShow(Maybe<IPCImage>&& aIcon,
                                                     ShowResolver&& aResolver) {
  MOZ_ASSERT(mId.IsEmpty(), "ID should not be given for a new notification");

  mResolver.emplace(std::move(aResolver));

  // Step 4.1: If the result of getting the notifications permission state is
  // not "granted", then queue a task to fire an event named error on this, and
  // abort these steps.
  NotificationPermission permission = GetNotificationPermission(
      mArgs.mPrincipal, mArgs.mEffectiveStoragePrincipal,
      mArgs.mIsSecureContext, PermissionCheckPurpose::NotificationShow);
  if (permission != NotificationPermission::Granted) {
    CopyableErrorResult rv;
    rv.ThrowTypeError("Permission to show Notification denied.");
    mResolver.take().value()(rv);
    mDangling = true;
    return IPC_OK();
  }

  auto showNotification = [self = RefPtr(this)](Maybe<IPCImage>&& aIcon) {
    // Step 4.2: Run the fetch steps for notification. (Already happened in the
    // child)
    //
    // Step 4.3: Run the show steps for notification.
    nsresult rv = self->Show(std::move(aIcon));
    // It's possible that we synchronously received a notification while in
    // Show, so mResolver may now be empty.
    if (NS_FAILED(rv) && self->mResolver) {
      self->mResolver.take().value()(CopyableErrorResult(rv));
    }
    // If not failed, the resolver will be called asynchronously by
    // NotificationObserver.
  };

  // Check Safe Browsing blocklist if the feature is enabled (bug 1986300).
  if (StaticPrefs::dom_webnotifications_block_if_on_safebrowsing()) {
    nsresult rv = NS_OK;
    nsCOMPtr<nsIURIClassifier> uriClassifier =
        do_GetService(NS_URICLASSIFIERSERVICE_CONTRACTID, &rv);

    if (NS_FAILED(rv) || !uriClassifier) {
      NS_WARNING("URI classifier unavailable for notification check");
    } else {
      RefPtr<SafeBrowsingClassificationCallback> callback =
          new SafeBrowsingClassificationCallback();
      RefPtr<SafeBrowsingPromise> promise = callback->Promise();

      bool willClassify = false;
      rv = uriClassifier->Classify(mArgs.mPrincipal, callback, &willClassify);

      if (NS_SUCCEEDED(rv) && willClassify) {
        glean::web_notification::show_safe_browsing_block.AddToDenominator(1);

        mShowPending = true;
        promise->Then(
            GetMainThreadSerialEventTarget(), __func__,
            [self = RefPtr(this), showNotification,
             icon = std::move(aIcon)](bool) mutable {
              self->mShowPending = false;

              // Always show first to register with the alert system, even if
              // close was requested while pending. This ensures platforms like
              // Android can properly trigger onCloseNotification callbacks.
              showNotification(std::move(icon));

              // Handle close() called while SafeBrowsing check was in progress.
              if (self->mClosePending) {
                self->mClosePending = false;
                self->Unregister();
                self->Close();
              }
            },
            [self = RefPtr(this)](nsresult) {
              // SafeBrowsing classification determined the notification is
              // unsafe, reject the show request and revoke permission.
              self->mShowPending = false;
              self->mClosePending = false;

              glean::web_notification::show_safe_browsing_block.AddToNumerator(
                  1);
              RemovePermission(self->mArgs.mPrincipal);

              CopyableErrorResult rv;
              rv.ThrowTypeError("Permission to show Notification denied.");
              self->mResolver.take().value()(rv);

              self->mDangling = true;
            });

        return IPC_OK();
      }
    }
  }

  showNotification(std::move(aIcon));
  return IPC_OK();
}

nsresult NotificationParent::Show(Maybe<IPCImage>&& aIcon) {
  // Step 4.3 the show steps, which are almost all about processing `tag` and
  // then displaying the notification. Both are handled by
  // nsIAlertsService::ShowAlert. The below is all about constructing the
  // observer (for show and close events) right and ultimately call the alerts
  // service function.

  // In the case of IPC, the parent process uses the cookie to map to
  // nsIObserver. Thus the cookie must be unique to differentiate observers.
  // XXX(krosylight): This is about ContentChild::mAlertObserver which is not
  // useful when called by the parent process. This should be removed when we
  // make nsIAlertsService parent process only.
  nsString obsoleteCookie = u"notification:"_ns;

  const IPCNotificationOptions& options = mArgs.mNotification.options();

  bool requireInteraction = options.requireInteraction();
  if (!StaticPrefs::dom_webnotifications_requireinteraction_enabled()) {
    requireInteraction = false;
  }

  nsCOMPtr<nsIAlertNotification> alert =
      do_CreateInstance(ALERT_NOTIFICATION_CONTRACTID);
  if (!alert) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  nsCOMPtr<nsIPrincipal> principal = mArgs.mPrincipal;
  nsAutoCString iconUrl;
  if (RefPtr<nsIURI> iconUri = options.icon()) {
    iconUri->GetSpec(iconUrl);
  }
  MOZ_TRY(alert->Init(options.tag(), NS_ConvertUTF8toUTF16(iconUrl),
                      options.title(), options.body(), true, obsoleteCookie,
                      NS_ConvertASCIItoUTF16(GetEnumString(options.dir())),
                      options.lang(), options.dataSerialized(), principal,
                      principal->GetIsInPrivateBrowsing(), requireInteraction,
                      options.silent(), options.vibrate()));

  if (aIcon) {
    if (nsCOMPtr<imgIContainer> image =
            nsContentUtils::IPCImageToImage(*aIcon)) {
      alert->SetImage(image);
    }
  }

  nsTArray<RefPtr<nsIAlertAction>> actions;
  MOZ_ASSERT(options.actions().Length() <= kMaxActions);
  for (const auto& action : options.actions()) {
    actions.AppendElement(new AlertAction(action.name(), action.title()));
  }

  alert->SetActions(actions);

  MOZ_TRY(alert->GetId(mId));

  RefPtr<NotificationObserver> observer = new NotificationObserver(
      mArgs.mScope, principal, IPCNotification(mId, options), *this);
  MOZ_TRY(ShowAlertWithCleanup(alert, observer));

  return NS_OK;
}

mozilla::ipc::IPCResult NotificationParent::RecvClose() {
  // If SafeBrowsing check is in progress, defer the close until it completes.
  // We need to call Show() first to register with the alert system before
  // Unregister() can properly trigger close callbacks (e.g.,
  // onCloseNotification on Android).
  if (mShowPending) {
    mClosePending = true;
    return IPC_OK();
  }

  Unregister();
  Close();
  return IPC_OK();
}

void NotificationParent::Unregister() {
  if (mDangling) {
    // We had no permission, so nothing to clean up.
    return;
  }

  mDangling = true;
  UnregisterNotification(mArgs.mPrincipal, mId);
}

nsresult NotificationParent::CreateOnMainThread(
    NotificationParentArgs&& mArgs,
    Endpoint<PNotificationParent>&& aParentEndpoint,
    PBackgroundParent::CreateNotificationParentResolver&& aResolver) {
  if (mArgs.mNotification.options().actions().Length() > kMaxActions) {
    return NS_ERROR_INVALID_ARG;
  }

  nsCOMPtr<nsIThread> thread = NS_GetCurrentThread();

  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "NotificationParent::BindToMainThread",
      [args = std::move(mArgs), endpoint = std::move(aParentEndpoint),
       resolver = std::move(aResolver), thread]() mutable {
        RefPtr<NotificationParent> actor =
            new NotificationParent(std::move(args));
        bool result = endpoint.Bind(actor);
        thread->Dispatch(NS_NewRunnableFunction(
            "NotificationParent::BindToMainThreadResult",
            [result, resolver = std::move(resolver)]() { resolver(result); }));
      }));

  return NS_OK;
}

}  // namespace mozilla::dom::notification
