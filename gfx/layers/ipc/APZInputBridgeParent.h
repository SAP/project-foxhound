/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_layers_APZInputBridgeParent_h
#define mozilla_layers_APZInputBridgeParent_h

#include "mozilla/layers/PAPZInputBridgeParent.h"

namespace mozilla {
namespace layers {

class IAPZCTreeManager;

class APZInputBridgeParent final : public PAPZInputBridgeParent {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(APZInputBridgeParent, final)

 public:
  explicit APZInputBridgeParent(const LayersId& aLayersId);

  static void Create(const LayersId& aLayersId,
                     Endpoint<PAPZInputBridgeParent>&& aEndpoint);

  mozilla::ipc::IPCResult RecvReceiveMultiTouchInputEvent(
      const MultiTouchInput& aEvent, bool aWantsCallback,
      APZEventResult* aOutResult, MultiTouchInput* aOutEvent);

  mozilla::ipc::IPCResult RecvReceiveMouseInputEvent(const MouseInput& aEvent,
                                                     bool aWantsCallback,
                                                     APZEventResult* aOutResult,
                                                     MouseInput* aOutEvent);

  mozilla::ipc::IPCResult RecvReceivePanGestureInputEvent(
      const PanGestureInput& aEvent, bool aWantsCallback,
      APZEventResult* aOutResult, PanGestureInput* aOutEvent);

  mozilla::ipc::IPCResult RecvReceivePinchGestureInputEvent(
      const PinchGestureInput& aEvent, bool aWantsCallback,
      APZEventResult* aOutResult, PinchGestureInput* aOutEvent);

  mozilla::ipc::IPCResult RecvReceiveTapGestureInputEvent(
      const TapGestureInput& aEvent, bool aWantsCallback,
      APZEventResult* aOutResult, TapGestureInput* aOutEvent);

  mozilla::ipc::IPCResult RecvReceiveScrollWheelInputEvent(
      const ScrollWheelInput& aEvent, bool aWantsCallback,
      APZEventResult* aOutResult, ScrollWheelInput* aOutEvent);

  mozilla::ipc::IPCResult RecvReceiveKeyboardInputEvent(
      const KeyboardInput& aEvent, bool aWantsCallback,
      APZEventResult* aOutResult, KeyboardInput* aOutEvent);

  mozilla::ipc::IPCResult RecvUpdateWheelTransaction(
      const LayoutDeviceIntPoint& aRefPoint, const EventMessage& aEventMessage,
      const Maybe<ScrollableLayerGuid>& aTargetGuid);

  mozilla::ipc::IPCResult RecvProcessUnhandledEvent(
      const LayoutDeviceIntPoint& aRefPoint, LayoutDeviceIntPoint* aOutRefPoint,
      ScrollableLayerGuid* aOutTargetGuid, uint64_t* aOutFocusSequenceNumber,
      LayersId* aOutLayersId);

  void ActorDestroy(ActorDestroyReason aWhy) override;

 protected:
  virtual ~APZInputBridgeParent();

 private:
  RefPtr<IAPZCTreeManager> mTreeManager;
  LayersId mLayersId;
};

}  // namespace layers
}  // namespace mozilla

#endif  // mozilla_layers_APZInputBridgeParent_h
