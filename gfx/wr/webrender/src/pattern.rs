/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use api::ColorF;

use crate::{render_task_graph::RenderTaskId, renderer::GpuBufferBuilder, scene::SceneProperties};

#[repr(u32)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum PatternKind {
    ColorOrTexture = 0,
    RadialGradient = 1,
    ConicGradient = 2,

    Mask = 3,
    // When adding patterns, don't forget to update the NUM_PATTERNS constant.
}

pub const NUM_PATTERNS: u32 = 4;

impl PatternKind {
    pub fn from_u32(val: u32) -> Self {
        assert!(val < NUM_PATTERNS);
        unsafe { std::mem::transmute(val) }
    }
}

/// A 32bit payload used as input for the pattern-specific logic in the shader.
///
/// Patterns typically use it as a GpuBuffer offset to fetch their data.
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PatternShaderInput(pub i32, pub i32);

impl Default for PatternShaderInput {
    fn default() -> Self {
        PatternShaderInput(0, 0)
    }
}

#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PatternTextureInput {
    pub task_id: RenderTaskId,
}

impl Default for PatternTextureInput {
    fn default() -> Self {
        PatternTextureInput {
            task_id: RenderTaskId::INVALID,
        }
    }
}

pub struct PatternBuilderContext<'a> {
    pub scene_properties: &'a SceneProperties,
}

pub struct PatternBuilderState<'a> {
    pub frame_gpu_data: &'a mut GpuBufferBuilder,
}

pub trait PatternBuilder {
    fn build(
        &self,
        _ctx: &PatternBuilderContext,
        _state: &mut PatternBuilderState,
    ) -> Pattern;
}

#[derive(Clone, Debug)]
pub struct Pattern {
    pub kind: PatternKind,
    pub shader_input: PatternShaderInput,
    pub texture_input: PatternTextureInput,
    pub base_color: ColorF,
    pub is_opaque: bool,
}

impl Pattern {
    pub fn color(color: ColorF) -> Self {
        Pattern {
            kind: PatternKind::ColorOrTexture,
            shader_input: PatternShaderInput::default(),
            texture_input: PatternTextureInput::default(),
            base_color: color,
            is_opaque: color.a >= 1.0,
        }
    }

    pub fn clear() -> Self {
        // Opaque black with operator dest out
        Pattern {
            kind: PatternKind::ColorOrTexture,
            shader_input: PatternShaderInput::default(),
            texture_input: PatternTextureInput::default(),
            base_color: ColorF::BLACK,
            is_opaque: false,
        }
    }
}
