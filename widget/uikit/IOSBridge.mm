/* -*- Mode: c++; c-basic-offset: 2; tab-width: 20; indent-tabs-mode: nil; -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IOSBridge.h"

#import "mozilla/widget/GeckoViewSupport.h"

#include "mozilla/widget/EventDispatcher.h"

using namespace mozilla::widget;

/* Implementation file */
NS_IMPL_ISUPPORTS(nsIOSBridge, nsIGeckoViewEventDispatcher, nsIGeckoViewBridge)

nsIOSBridge::nsIOSBridge() {
  RefPtr<mozilla::widget::EventDispatcher> dispatcher =
      new mozilla::widget::EventDispatcher();
  dispatcher->Attach([GetSwiftRuntime() runtimeDispatcher]);
  dispatcher->Activate();
  mEventDispatcher = dispatcher;
}

NS_IMETHODIMP
nsIOSBridge::GetDispatcherByName(const char* aName,
                                 nsIGeckoViewEventDispatcher** aResult) {
  mozilla::AssertIsOnMainThread();
  RefPtr<mozilla::widget::EventDispatcher> dispatcher =
      new mozilla::widget::EventDispatcher();
  dispatcher->Attach([GetSwiftRuntime() dispatcherByName:aName]);
  dispatcher->Activate();
  dispatcher.forget(aResult);
  return NS_OK;
}

nsIOSBridge::~nsIOSBridge() = default;
