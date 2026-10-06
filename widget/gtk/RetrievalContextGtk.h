/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef RetrievalContextGtk_h
#define RetrievalContextGtk_h

#include "mozilla/Mutex.h"
#include "nsClipboard.h"

namespace mozilla::widget {

class RetrievalContextGtk final : public RetrievalContext {
 public:
  RetrievalContextGtk();

  ClipboardData GetClipboardData(const char* aMimeType,
                                 int32_t aWhichClipboard) override;
  mozilla::GUniquePtr<char> GetClipboardText(int32_t aWhichClipboard) override;
  ClipboardTargets GetTargets(int32_t aWhichClipboard) override;

  void ClearCachedTargets(int32_t aWhichClipboard) override;

 private:
  ClipboardTargets GetTargetsImpl(int32_t aWhichClipboard);

  ClipboardData WaitForClipboardData(ClipboardDataType, int32_t aWhichClipboard,
                                     const char* aMimeType = nullptr);

  static ClipboardTargets sClipboardTargets;
  static ClipboardTargets sPrimaryTargets;
};

}  // namespace mozilla::widget

#endif /* RetrievalContextGtk_h */
