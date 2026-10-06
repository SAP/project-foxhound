/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RetrievalContextGtk.h"

#include "AsyncClipboardRequest.h"
#include "mozilla/TimeStamp.h"
#include "prtime.h"

#include <gtk/gtk.h>

using namespace mozilla;
using namespace mozilla::widget;

constinit ClipboardTargets RetrievalContextGtk::sClipboardTargets;
constinit ClipboardTargets RetrievalContextGtk::sPrimaryTargets;

RetrievalContextGtk::RetrievalContextGtk() = default;

ClipboardTargets RetrievalContextGtk::GetTargetsImpl(int32_t aWhichClipboard) {
  MOZ_CLIPBOARD_LOG("RetrievalContextGtk::GetTargetsImpl()\n");

  return WaitForClipboardData(ClipboardDataType::Targets, aWhichClipboard)
      .ExtractTargets();
}

ClipboardData RetrievalContextGtk::GetClipboardData(const char* aMimeType,
                                                    int32_t aWhichClipboard) {
  MOZ_CLIPBOARD_LOG("RetrievalContextGtk::GetClipboardData() mime %s\n",
                    aMimeType);

  return WaitForClipboardData(ClipboardDataType::Data, aWhichClipboard,
                              aMimeType);
}

GUniquePtr<char> RetrievalContextGtk::GetClipboardText(
    int32_t aWhichClipboard) {
  GdkAtom selection = GetSelectionAtom(aWhichClipboard);

  MOZ_CLIPBOARD_LOG(
      "RetrievalContextGtk::GetClipboardText(), clipboard %s\n",
      (selection == GDK_SELECTION_PRIMARY) ? "Primary" : "Selection");

  return WaitForClipboardData(ClipboardDataType::Text, aWhichClipboard)
      .ExtractText();
}

ClipboardData RetrievalContextGtk::WaitForClipboardData(
    ClipboardDataType aDataType, int32_t aWhichClipboard,
    const char* aMimeType) {
  MOZ_CLIPBOARD_LOG("RetrievalContextGtk::WaitForClipboardData, MIME %s\n",
                    aMimeType);

  AsyncGtkClipboardRequest request(aDataType, aWhichClipboard, aMimeType);
  int iteration = 1;

  PRTime entryTime = PR_Now();
  while (!request.HasCompleted()) {
    if (iteration++ > kClipboardFastIterationNum) {
      if (PR_Now() - entryTime > kClipboardTimeout) {
        MOZ_CLIPBOARD_LOG(
            "  failed to get async clipboard data in time limit\n");
        break;
      }
    }
    MOZ_CLIPBOARD_LOG("doing iteration %d msec %ld ...\n", (iteration - 1),
                      (long)((PR_Now() - entryTime) / 1000));
    gtk_main_iteration();
  }

  return request.TakeResult();
}

ClipboardTargets RetrievalContextGtk::GetTargets(int32_t aWhichClipboard) {
  MOZ_CLIPBOARD_LOG("RetrievalContextGtk::GetTargets(%s)\n",
                    aWhichClipboard == nsClipboard::kSelectionClipboard
                        ? "primary"
                        : "clipboard");
  ClipboardTargets& storedTargets =
      (aWhichClipboard == nsClipboard::kSelectionClipboard) ? sPrimaryTargets
                                                            : sClipboardTargets;
  if (!storedTargets) {
    MOZ_CLIPBOARD_LOG("  getting targets from system");
    storedTargets.Set(GetTargetsImpl(aWhichClipboard));
  } else {
    MOZ_CLIPBOARD_LOG("  using cached targets");
  }
  return storedTargets.Clone();
}

void RetrievalContextGtk::ClearCachedTargets(int32_t aWhichClipboard) {
  MOZ_CLIPBOARD_LOG("RetrievalContextGtk::ClearCachedTargets(%s)",
                    aWhichClipboard == nsClipboard::kSelectionClipboard
                        ? "primary"
                        : "clipboard");
  if (aWhichClipboard == nsClipboard::kSelectionClipboard) {
    sPrimaryTargets.Clear();
  } else {
    sClipboardTargets.Clear();
  }
}
