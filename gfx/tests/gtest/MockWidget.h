/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GTEST_MOCKWIDGET_H
#define GTEST_MOCKWIDGET_H

#include "mozilla/gfx/Point.h"
#include "mozilla/widget/InProcessCompositorWidget.h"
#include "nsIWidget.h"
#include "GLContext.h"
#include "GLContextProvider.h"

using mozilla::gl::CreateContextFlags;
using mozilla::gl::GLContext;
using mozilla::gl::GLContextProvider;

using mozilla::gfx::IntSize;

class MockWidget : public nsIWidget {
 public:
  MockWidget() : mCompWidth(0), mCompHeight(0) {}
  MockWidget(int aWidth, int aHeight)
      : mCompWidth(aWidth), mCompHeight(aHeight) {}
  NS_DECL_ISUPPORTS_INHERITED

  LayoutDeviceIntRect GetClientBounds() override {
    return LayoutDeviceIntRect(0, 0, mCompWidth, mCompHeight);
  }
  LayoutDeviceIntRect GetBounds() override { return GetClientBounds(); }

  void* GetNativeData(uint32_t aDataType) override {
    if (aDataType == NS_NATIVE_OPENGL_CONTEXT) {
      nsCString discardFailureId;
      RefPtr<GLContext> context = GLContextProvider::CreateHeadless(
          {CreateContextFlags::REQUIRE_COMPAT_PROFILE}, &discardFailureId);
      if (!context) {
        return nullptr;
      }
      if (!context->CreateOffscreenDefaultFb({mCompWidth, mCompHeight})) {
        return nullptr;
      }
      return context.forget().take();
    }
    return nullptr;
  }

  nsresult Create(nsIWidget* aParent, const LayoutDeviceIntRect&,
                  const InitData&) override {
    return NS_OK;
  }
  nsresult Create(nsIWidget* aParent, const DesktopIntRect&,
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

  nsSizeMode SizeMode() override { return mSizeMode; }
  void SetSizeMode(nsSizeMode aMode) override { mSizeMode = aMode; }

  void SetFocus(Raise, mozilla::dom::CallerType aCallerType) override {}
  void Invalidate(const LayoutDeviceIntRect& aRect) override {}
  nsresult SetTitle(const nsAString& title) override { return NS_OK; }
  LayoutDeviceIntPoint WidgetToScreenOffset() override {
    return LayoutDeviceIntPoint();
  }
  void SetInputContext(const InputContext& aContext,
                       const InputContextAction& aAction) override {}
  InputContext GetInputContext() override { abort(); }

 private:
  ~MockWidget() = default;

  nsSizeMode mSizeMode = nsSizeMode_Normal;

  int mCompWidth;
  int mCompHeight;
};

#endif
