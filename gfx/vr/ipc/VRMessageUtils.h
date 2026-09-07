/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_gfx_vr_VRMessageUtils_h
#define mozilla_gfx_vr_VRMessageUtils_h

#include "ipc/EnumSerializer.h"
#include "ipc/IPCMessageUtils.h"
#include "mozilla/GfxMessageUtils.h"
#include "mozilla/dom/GamepadMessageUtils.h"
#include "mozilla/ParamTraits_TiedFields.h"

#include "gfxVR.h"

namespace IPC {

template <>
struct ParamTraits<mozilla::gfx::VRHMDSensorState> final
    : public ParamTraits_TiedFields<mozilla::gfx::VRHMDSensorState> {};
template <>
struct ParamTraits<mozilla::gfx::VRDisplayInfo> final
    : public ParamTraits_TiedFields<mozilla::gfx::VRDisplayInfo> {};
template <>
struct ParamTraits<mozilla::gfx::VRDisplayState> final
    : public ParamTraits_TiedFields<mozilla::gfx::VRDisplayState> {};
template <>
struct ParamTraits<mozilla::gfx::VRControllerState> final
    : public ParamTraits_TiedFields<mozilla::gfx::VRControllerState> {};
template <>
struct ParamTraits<mozilla::gfx::VRFieldOfView> final
    : public ParamTraits_TiedFields<mozilla::gfx::VRFieldOfView> {};
template <>
struct ParamTraits<mozilla::gfx::Point3D_POD> final
    : public ParamTraits_TiedFields<mozilla::gfx::Point3D_POD> {};
template <>
struct ParamTraits<mozilla::gfx::IntSize_POD> final
    : public ParamTraits_TiedFields<mozilla::gfx::IntSize_POD> {};
template <>
struct ParamTraits<mozilla::gfx::FloatSize_POD> final
    : public ParamTraits_TiedFields<mozilla::gfx::FloatSize_POD> {};
template <>
struct ParamTraits<mozilla::gfx::VRPose> final
    : public ParamTraits_TiedFields<mozilla::gfx::VRPose> {};

// -

template <>
struct ParamTraits<mozilla::gfx::VRControllerType>
    : public ContiguousEnumSerializer<mozilla::gfx::VRControllerType,
                                      mozilla::gfx::VRControllerType::_empty,
                                      mozilla::gfx::VRControllerType::_end> {};

template <>
struct ParamTraits<mozilla::gfx::TargetRayMode>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::TargetRayMode, mozilla::gfx::TargetRayMode::Gaze,
          mozilla::gfx::TargetRayMode::Screen> {};

template <>
struct ParamTraits<mozilla::gfx::GamepadMappingType>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::GamepadMappingType,
          mozilla::gfx::GamepadMappingType::_empty,
          mozilla::gfx::GamepadMappingType::XRStandard> {};

template <>
struct ParamTraits<mozilla::gfx::VRDisplayBlendMode>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::VRDisplayBlendMode,
          mozilla::gfx::VRDisplayBlendMode::Opaque,
          mozilla::gfx::VRDisplayBlendMode::AlphaBlend> {};

// -

template <>
struct ParamTraits<mozilla::gfx::VRSubmitFrameResultInfo> {
  typedef mozilla::gfx::VRSubmitFrameResultInfo paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mBase64Image);
    WriteParam(aWriter, aParam.mFormat);
    WriteParam(aWriter, aParam.mWidth);
    WriteParam(aWriter, aParam.mHeight);
    WriteParam(aWriter, aParam.mFrameNum);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    if (!ReadParam(aReader, &(aResult->mBase64Image)) ||
        !ReadParam(aReader, &(aResult->mFormat)) ||
        !ReadParam(aReader, &(aResult->mWidth)) ||
        !ReadParam(aReader, &(aResult->mHeight)) ||
        !ReadParam(aReader, &(aResult->mFrameNum))) {
      return false;
    }

    return true;
  }
};

template <>
struct ParamTraits<mozilla::gfx::VRDisplayCapabilityFlags>
    : public BitFlagsEnumSerializer<
          mozilla::gfx::VRDisplayCapabilityFlags,
          mozilla::gfx::VRDisplayCapabilityFlags::Cap_All> {};

}  // namespace IPC

#endif  // mozilla_gfx_vr_VRMessageUtils_h
