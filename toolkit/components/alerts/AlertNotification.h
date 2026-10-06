/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_AlertNotification_h_
#define mozilla_AlertNotification_h_

#include "imgINotificationObserver.h"
#include "nsIAlertsService.h"
#include "nsCOMPtr.h"
#include "nsCycleCollectionParticipant.h"
#include "nsICancelable.h"
#include "nsINamed.h"
#include "nsIPrincipal.h"
#include "nsString.h"
#include "nsITimer.h"

namespace mozilla {

class AlertNotification : public nsIAlertNotification {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIALERTNOTIFICATION

 protected:
  virtual ~AlertNotification() = default;

 private:
  nsresult InitId();

  nsString mId;
  nsString mName;
  nsString mImageURL;
  nsCOMPtr<imgIContainer> mImage;
  nsString mTitle;
  nsString mText;
  bool mTextClickable = false;
  nsString mCookie;
  nsString mDir;
  nsString mLang;
  bool mRequireInteraction = false;
  nsString mData;
  nsCOMPtr<nsIPrincipal> mPrincipal;
  bool mInPrivateBrowsing = false;
  bool mSilent = false;
  nsTArray<uint32_t> mVibrate;
  nsTArray<RefPtr<nsIAlertAction>> mActions;
  nsString mOpaqueRelaunchData;
};

class AlertAction : public nsIAlertAction {
  NS_DECL_ISUPPORTS
  NS_DECL_NSIALERTACTION

  AlertAction(const nsAString& aAction, const nsAString& aTitle);
  static Result<already_AddRefed<AlertAction>, nsresult> Copy(
      nsIAlertAction& aAction);

 protected:
  virtual ~AlertAction() = default;

  nsString mAction;
  nsString mTitle;
};

}  // namespace mozilla

#endif /* mozilla_AlertNotification_h_ */
