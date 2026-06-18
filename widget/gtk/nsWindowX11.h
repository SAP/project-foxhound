/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef _nsWindowX11_h_
#define _nsWindowX11_h_

namespace mozilla::widget {

class nsWindowX11 final : public nsWindow {
 public:
  nsWindowX11* AsX11() override { return this; }

  void GetWorkspaceID(nsAString& workspaceID) override;
  void MoveToWorkspace(const nsAString& workspaceID) override;

  void CreateNative() override;
  void DestroyNative() override;
  void ConfigureToplevelWindowNative() override;

  bool ConfigureX11GLVisual();

  void SetProgress(unsigned long progressPercent) override;

 protected:
  virtual ~nsWindowX11() = default;

  Window GetX11Window();

  void NativeShow(bool aAction) override;

  typedef enum {
    GTK_WIDGET_COMPOSITED_DEFAULT = 0,
    GTK_WIDGET_COMPOSITED_DISABLED = 1,
    GTK_WIDGET_COMPOSITED_ENABLED = 2
  } WindowComposeRequest;

  void SetCompositorHint(WindowComposeRequest aState);
};

}  // namespace mozilla::widget

#endif
