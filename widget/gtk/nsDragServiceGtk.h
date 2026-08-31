/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsDragServiceGtk_h_
#define nsDragServiceGtk_h_

#include "mozilla/RefPtr.h"
#include <gtk/gtk.h>
#include "GRefPtr.h"
#include "GUniquePtr.h"

namespace mozilla::widget {

/**
 * X11 specific D&D routines
 */
class nsDragSessionGtk : public nsDragSession {
 public:
  void ReplyToDragMotion(GdkDragContext* aDragContext, guint aTime);
  void ReplyToDragMotion() override;

  void DragDataReceived(GtkWidget* aWidget, GdkDragContext* aContext, gint aX,
                        gint aY, GtkSelectionData* aSelection_data, guint aInfo,
                        guint32 aTime);
  gboolean ScheduleMotionEvent(nsWindow* aWindow, GdkDragContext* aDragContext,
                               mozilla::LayoutDeviceIntPoint aWindowPoint,
                               guint aTime);
  gboolean ScheduleDropEvent(nsWindow* aWindow, GdkDragContext* aDragContext,
                             mozilla::LayoutDeviceIntPoint aWindowPoint,
                             guint aTime);
  void ScheduleLeaveEvent() override;

  // Update Drag&Drop state according child process state.
  // UpdateDragEffect() is called by IPC bridge when child process
  // accepts/denies D&D operation and uses stored
  // mTargetDragContextForRemote context.
  NS_IMETHOD UpdateDragEffect() override;

  nsWindow* GetMostRecentDestWindow() override;

 public:
  nsDragSessionGtk();

 protected:
  virtual ~nsDragSessionGtk() = default;

 private:
  struct DragTaskGtk : public DragTask {
    explicit DragTaskGtk(DragTaskType aType = eDragTaskNone,
                         GdkDragContext* aDragContext = nullptr,
                         nsWindow* aWindow = nullptr,
                         const mozilla::LayoutDeviceIntPoint& aWindowPoint =
                             mozilla::LayoutDeviceIntPoint(),
                         guint aTime = 0)
        : DragTask(aType, aWindow, aWindowPoint, aTime),
          mDragContext(aDragContext) {};
    virtual ~DragTaskGtk() = default;

    void Reset() override {
      mType = eDragTaskNone;
      mWindow = nullptr;
      mDragContext = nullptr;
    }
    uintptr_t GetContextID() override {
      return reinterpret_cast<uintptr_t>(mDragContext.get());
    }

    ClipboardTargets GetTargets();

    RefPtr<GdkDragContext> mDragContext;
  };

  void UpdateDragAction(GdkDragContext* aDragContext);
  void UpdateDragAction() override;

  bool GetDragDataImpl(GdkAtom aRequestedFlavor) override;

  bool IsTargetContextList(void) override;
  bool IsDragFlavorAvailable(GdkAtom aRequestedFlavor) override;

  void EndDragSessionImplBackend() override;

  void SetRemoteContext() override;
  void DropFinish(bool aSucceed) override;

  // When we route D'n'D request to child process
  // (by EventStateManager::DispatchCrossProcessEvent)
  // we save GdkDragContext to mTargetDragContextForRemote.
  // When we get a reply from child process we use
  // the stored GdkDragContext to send reply to OS.
  //
  // We need to store GdkDragContext because mTargetDragContext is cleared
  // after every D'n'D event.
  RefPtr<GdkDragContext> mTargetDragContextForRemote;

  // Track gtk_drag_get_data() requests here.
  RefPtr<GdkDragContext> mWaitingForDragDataContext;
};

}  // namespace mozilla::widget

#endif  // nsDragServiceGtk_h_
