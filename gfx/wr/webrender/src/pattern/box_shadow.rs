/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use api::{ColorF, units::*};

use crate::{clip::ClipDataHandle, command_buffer::QuadFlags, gpu_types::{BlurEdgeMode, UvRectKind}, pattern::{Pattern, PatternBuilderContext, PatternBuilderState}, render_target::RenderTargetKind, render_task::{BlurTask, PrimTask, RenderTask, RenderTaskKind}, segment::EdgeMask, transform::GpuTransformId};


pub fn box_shadow_pattern(
    outer_shadow_rect: &LayoutRect,
    blur_radius: f32,
    color: ColorF,
    clip: ClipDataHandle,
    sub_rect: Option<DeviceRect>,
    ctx: &PatternBuilderContext,
    state: &mut PatternBuilderState,
) -> crate::pattern::Pattern {

    let raster_spatial_node_index = ctx.spatial_tree.root_reference_frame_index();
    let pattern_rect = *outer_shadow_rect;

    // TODO(gw): Correctly account for scaled blur radius inflation, and device
    //           pixel scale here.

    let (task_size, content_origin, scale_factor, uv_rect_kind) = match sub_rect {
        Some(rect) => {
            let expanded_rect = rect.inflate(32.0, 32.0);
            let uv_rect_kind = crate::picture::calculate_uv_rect_kind(
                expanded_rect,
                pattern_rect.cast_unit(),
            );

            (
                expanded_rect.size().cast_unit().to_i32(),
                expanded_rect.min.cast_unit(),
                DevicePixelScale::new(1.0),
                uv_rect_kind,
            )
        }
        None => {
            (
                pattern_rect.size().cast_unit().to_i32(),
                pattern_rect.min.cast_unit(),
                DevicePixelScale::new(1.0),
                UvRectKind::Rect,
            )
        }
    };

    let blur_radius = blur_radius * scale_factor.0;
    let clips_range = state.clip_store.push_clip_instance(clip);
    let color_pattern = Pattern::color(color);

    let pattern_prim_address_f = crate::quad::write_layout_prim_blocks(
        &mut state.frame_gpu_data.f32,
        &pattern_rect,
        &pattern_rect,
        color_pattern.base_color,
        color_pattern.texture_input.task_id,
        &[],
    );

    let pattern_task_id = state.rg_builder.add().init(RenderTask::new_dynamic(
        task_size,
        RenderTaskKind::Prim(PrimTask {
            pattern: color_pattern.kind,
            pattern_input: color_pattern.shader_input,
            content_origin,
            prim_address_f: pattern_prim_address_f,
            transform_id: GpuTransformId::IDENTITY,
            edge_flags: EdgeMask::empty(),
            quad_flags: QuadFlags::APPLY_RENDER_TASK_CLIP,
            prim_needs_scissor_rect: false,
            texture_input: color_pattern.texture_input.task_id,
        }),
    ));

    let task_rect = DeviceRect::from_origin_and_size(
        content_origin,
        task_size.to_f32(),
    );

    // TODO: Extract out the clip store/interning machinery.
    // We use it here generate a rounded rectangle.
    crate::quad::prepare_clip_range(
        clips_range,
        pattern_task_id,
        &task_rect,
        &pattern_rect,
        raster_spatial_node_index,
        raster_spatial_node_index,
        scale_factor,
        ctx.interned_clips,
        state.clip_store,
        ctx.spatial_tree,
        &mut state.rg_builder,
        &mut state.frame_gpu_data.f32,
        state.transforms,
    );

    let blur_task_v = state.rg_builder.add().init(RenderTask::new_dynamic(
        task_size,
        RenderTaskKind::VerticalBlur(BlurTask {
            blur_std_deviation: blur_radius,
            target_kind: RenderTargetKind::Color,
            blur_region: task_size,
            edge_mode: BlurEdgeMode::Duplicate,
        }),
    ));
    state.rg_builder.add_dependency(blur_task_v, pattern_task_id);

    let blur_task_h = state.rg_builder.add().init(RenderTask::new_dynamic(
        task_size,
        RenderTaskKind::HorizontalBlur(BlurTask {
            blur_std_deviation: blur_radius,
            target_kind: RenderTargetKind::Color,
            blur_region: task_size,
            edge_mode: BlurEdgeMode::Duplicate,
        }),
    ).with_uv_rect_kind(uv_rect_kind));
    state.rg_builder.add_dependency(blur_task_h, blur_task_v);

    Pattern::texture(blur_task_h, color)
}
