/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GTEST_MockWinWidget_H
#define GTEST_MockWinWidget_H

#include <windows.h>

#include "nsIWidget.h"
#include "Units.h"
#include "mozilla/widget/WindowOcclusionState.h"

class MockWinWidget : public nsIWidget {
 public:
  static RefPtr<MockWinWidget> Create(DWORD aStyle, DWORD aExStyle,
                                      const LayoutDeviceIntRect& aRect);

  NS_DECL_ISUPPORTS_INHERITED

  void NotifyOcclusionState(mozilla::widget::OcclusionState aState) override;

  void SetExpectation(mozilla::widget::OcclusionState aExpectation) {
    mExpectation = aExpectation;
  }

  bool IsExpectingCall() const { return mExpectation != mCurrentState; }

  HWND GetWnd() { return mWnd; }

  nsSizeMode SizeMode() override;
  void SetSizeMode(nsSizeMode aMode) override {}

  void* GetNativeData(uint32_t aDataType) override { return nullptr; }

  nsresult Create(nsIWidget* aParent, const LayoutDeviceIntRect& aRect,
                  const InitData&) override {
    return NS_OK;
  }
  nsresult Create(nsIWidget* aParent, const DesktopIntRect& aRect,
                  const InitData&) override {
    return NS_OK;
  }
  void Show(bool aState) override {}
  bool IsVisible() const override { return true; }
  void Move(const DesktopPoint&) override {}
  void Resize(const DesktopSize&, bool aRepaint) override {}
  void Resize(const DesktopRect&, bool aRepaint) override {}

  void Enable(bool aState) override {}
  bool IsEnabled() const override { return true; }
  void SetFocus(Raise, mozilla::dom::CallerType aCallerType) override {}
  void Invalidate(const LayoutDeviceIntRect& aRect) override {}
  nsresult SetTitle(const nsAString& title) override { return NS_OK; }
  LayoutDeviceIntPoint WidgetToScreenOffset() override {
    return LayoutDeviceIntPoint(0, 0);
  }
  void SetInputContext(const InputContext& aContext,
                       const InputContextAction& aAction) override {}
  InputContext GetInputContext() override { abort(); }
  LayoutDeviceIntRect GetBounds() override { return mBounds; }

 private:
  MockWinWidget();
  ~MockWinWidget();

  bool Initialize(DWORD aStyle, DWORD aExStyle,
                  const LayoutDeviceIntRect& aRect);

  HWND mWnd = 0;
  LayoutDeviceIntRect mBounds;

  mozilla::widget::OcclusionState mExpectation =
      mozilla::widget::OcclusionState::UNKNOWN;
  mozilla::widget::OcclusionState mCurrentState =
      mozilla::widget::OcclusionState::UNKNOWN;
};

#endif
