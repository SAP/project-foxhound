/*
 * Copyright 2011 Google Inc.
 *
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

#include "include/core/SkFlattenable.h"

#if defined(SK_DISABLE_EFFECT_DESERIALIZATION)

    void SkFlattenable::PrivateInitializer::InitEffects() {}
    void SkFlattenable::PrivateInitializer::InitImageFilters() {}

#else

    #include "include/core/SkMaskFilter.h"
    #include "src/core/SkImageFilter_Base.h"
    #include "src/effects/colorfilters/SkColorFilterBase.h"
    #include "src/effects/SkDashImpl.h"
    #include "src/shaders/gradients/SkGradientBaseShader.h"

    /**
     *  Register most effects for deserialization.
     *
     *  None of these are strictly required for Skia to operate, so if you're
     *  not using deserialization yourself, you can define
     *  SK_DISABLE_EFFECT_SERIALIZATION, or modify/replace this file as needed.
     */
    void SkFlattenable::PrivateInitializer::InitEffects() {
        // Shaders.
        SkRegisterLinearGradientShaderFlattenable();
        SkRegisterRadialGradientShaderFlattenable();
        SkRegisterSweepGradientShaderFlattenable();
        SkRegisterConicalGradientShaderFlattenable();

        // Color filters.
        SkRegisterComposeColorFilterFlattenable();
        SkRegisterModeColorFilterFlattenable();
        SkRegisterSkColorSpaceXformColorFilterFlattenable();
        SkRegisterWorkingFormatColorFilterFlattenable();

        // Mask filters.
        SkMaskFilter::RegisterFlattenables();

        // Path effects.
        SK_REGISTER_FLATTENABLE(SkDashImpl);
    }

    /*
     *  Register SkImageFilters for deserialization.
     *
     *  None of these are strictly required for Skia to operate, so if you're
     *  not using deserialization yourself, you can define
     *  SK_DISABLE_EFFECT_SERIALIZATION, or modify/replace this file as needed.
     */
    void SkFlattenable::PrivateInitializer::InitImageFilters() {
        SkRegisterBlendImageFilterFlattenable();
        SkRegisterBlurImageFilterFlattenable();
        SkRegisterComposeImageFilterFlattenable();
        SkRegisterCropImageFilterFlattenable();
    }

#endif
