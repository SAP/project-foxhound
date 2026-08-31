/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsDragServiceWayland_h_
#define nsDragServiceWayland_h_

#include "RetrievalContextWayland.h"

namespace mozilla::widget {

/**
 * Wayland specific D&D routines
 */
class nsDragSessionWayland : public nsDragSession {
 public:
  void ReplyToDragMotion(RefPtr<mozilla::widget::DataOffer> aDataOffer);
  void ReplyToDragMotion() override;

  void UpdateDragAction(RefPtr<mozilla::widget::DataOffer> aDataOffer);
  void UpdateDragAction() override;

  void TargetDataReceived(RefPtr<mozilla::widget::DataOffer> aDataOffer);
  void ScheduleMotionEvent(RefPtr<mozilla::widget::DataOffer> aDataOffer);
  void ScheduleDropEvent(RefPtr<mozilla::widget::DataOffer> aDataOffer);
  void ScheduleLeaveEvent() override;

  // Update Drag&Drop state according child process state.
  // UpdateDragEffect() is called by IPC bridge when child process
  // accepts/denies D&D operation and uses stored
  // data offer.
  NS_IMETHOD UpdateDragEffect() override;

 public:
  nsDragSessionWayland();

 protected:
  virtual ~nsDragSessionWayland() = default;

  void EndDragSessionImplBackend() override;

  void SetRemoteContext() override;
  void DropFinish(bool aSucceed) override;

  bool IsTargetContextList(void) override;
  bool IsDragFlavorAvailable(GdkAtom aRequestedFlavor) override;

  bool GetDragDataImpl(GdkAtom aRequestedFlavor) override;

  nsWindow* GetMostRecentDestWindow() override;

  bool DragDataReceived(mozilla::ClipboardData& aData, GdkAtom aTarget);

 private:
  struct DragTaskWayland : public DragTask {
    explicit DragTaskWayland(DragTaskType aType = eDragTaskNone)
        : DragTask(aType) {};
    DragTaskWayland(DragTaskType aType, mozilla::widget::DataOffer* aDataOffer);
    virtual ~DragTaskWayland() = default;

    void Reset() override {
      mType = eDragTaskNone;
      mWindow = nullptr;
      mDataOffer = nullptr;
    }
    uintptr_t GetContextID() override {
      return reinterpret_cast<uintptr_t>(mDataOffer.get());
    }

    RefPtr<mozilla::widget::DataOffer> mDataOffer;
  };

  RefPtr<mozilla::widget::DataOffer> mDataOfferForRemote;
};

}  // namespace mozilla::widget

#endif  // nsDragServiceWayland_h_
