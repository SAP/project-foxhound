/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef RetrievalContextX11_h
#define RetrievalContextX11_h

#include <gtk/gtk.h>
#include "nsClipboard.h"

namespace mozilla::widget {

class RetrievalContextX11 : public RetrievalContext {
 public:
  ClipboardData GetClipboardData(const char* aMimeType,
                                 int32_t aWhichClipboard) override;
  mozilla::GUniquePtr<char> GetClipboardText(int32_t aWhichClipboard) override;
  ClipboardTargets GetTargets(int32_t aWhichClipboard) override;

  void ClearCachedTargets(int32_t aWhichClipboard) override;

  RetrievalContextX11();

 private:
  ~RetrievalContextX11();

  ClipboardTargets GetTargetsImpl(int32_t aWhichClipboard);

  // Spins X event loop until timing out or being completed.
  ClipboardData WaitForClipboardData(ClipboardDataType aDataType,
                                     int32_t aWhichClipboard,
                                     const char* aMimeType = nullptr);

  static ClipboardTargets sClipboardTargets;
  static ClipboardTargets sPrimaryTargets;
};

};  // namespace mozilla::widget

#endif /* RetrievalContextX11_h */
