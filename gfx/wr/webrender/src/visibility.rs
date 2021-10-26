/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! # Visibility pass
//!
//! TODO: document what this pass does!
//!

use api::{ColorF, DebugFlags};
use api::units::*;
use euclid::Scale;
use std::{usize, mem};
use crate::image_tiling;
use crate::segment::EdgeAaSegmentMask;
use crate::clip::{ClipStore, ClipChainStack};
use crate::composite::CompositeState;
use crate::spatial_tree::{ROOT_SPATIAL_NODE_INDEX, SpatialTree, SpatialNodeIndex};
use crate::clip::{ClipInstance, ClipChainInstance};
use crate::debug_colors;
use crate::frame_builder::FrameBuilderConfig;
use crate::gpu_cache::GpuCache;
use crate::internal_types::FastHashMap;
use crate::picture::{PictureCompositeMode, ClusterFlags, SurfaceInfo, TileCacheInstance};
use crate::picture::{PrimitiveList, SurfaceIndex, RasterConfig, SliceId};
use crate::prim_store::{ClipTaskIndex, PictureIndex, PrimitiveInstanceKind};
use crate::prim_store::{PrimitiveStore, PrimitiveInstance};
use crate::prim_store::image::VisibleImageTile;
use crate::render_backend::{DataStores, ScratchBuffer};
use crate::render_task_graph::RenderTaskGraph;
use crate::resource_cache::{ResourceCache, ImageProperties, ImageRequest};
use crate::scene::SceneProperties;
use crate::space::{SpaceMapper, SpaceSnapper};
use crate::internal_types::Filter;
use crate::util::{MaxRect};

pub struct FrameVisibilityContext<'a> {
    pub spatial_tree: &'a SpatialTree,
    pub global_screen_world_rect: WorldRect,
    pub global_device_pixel_scale: DevicePixelScale,
    pub surfaces: &'a [SurfaceInfo],
    pub debug_flags: DebugFlags,
    pub scene_properties: &'a SceneProperties,
    pub config: FrameBuilderConfig,
}

pub struct FrameVisibilityState<'a> {
    pub clip_store: &'a mut ClipStore,
    pub resource_cache: &'a mut ResourceCache,
    pub gpu_cache: &'a mut GpuCache,
    pub scratch: &'a mut ScratchBuffer,
    pub tile_cache: Option<Box<TileCacheInstance>>,
    pub data_stores: &'a mut DataStores,
    pub clip_chain_stack: ClipChainStack,
    pub render_tasks: &'a mut RenderTaskGraph,
    pub composite_state: &'a mut CompositeState,
    /// A stack of currently active off-screen surfaces during the
    /// visibility frame traversal.
    pub surface_stack: Vec<SurfaceIndex>,
}

impl<'a> FrameVisibilityState<'a> {
    pub fn push_surface(
        &mut self,
        surface_index: SurfaceIndex,
        shared_clips: &[ClipInstance],
        spatial_tree: &SpatialTree,
    ) {
        self.surface_stack.push(surface_index);
        self.clip_chain_stack.push_surface(shared_clips, spatial_tree);
    }

    pub fn pop_surface(&mut self) {
        self.surface_stack.pop().unwrap();
        self.clip_chain_stack.pop_surface();
    }
}

/// A bit mask describing which dirty regions a primitive is visible in.
/// A value of 0 means not visible in any region, while a mask of 0xffff
/// would be considered visible in all regions.
#[derive(Debug, Copy, Clone)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
pub struct PrimitiveVisibilityMask {
    bits: u16,
}

impl PrimitiveVisibilityMask {
    /// Construct a default mask, where no regions are considered visible
    pub fn empty() -> Self {
        PrimitiveVisibilityMask {
            bits: 0,
        }
    }

    pub fn all() -> Self {
        PrimitiveVisibilityMask {
            bits: !0,
        }
    }

    pub fn include(&mut self, other: PrimitiveVisibilityMask) {
        self.bits |= other.bits;
    }

    pub fn intersects(&self, other: PrimitiveVisibilityMask) -> bool {
        (self.bits & other.bits) != 0
    }

    /// Mark a given region index as visible
    pub fn set_visible(&mut self, region_index: usize) {
        debug_assert!(region_index < PrimitiveVisibilityMask::MAX_DIRTY_REGIONS);
        self.bits |= 1 << region_index;
    }

    /// Returns true if there are no visible regions
    pub fn is_empty(&self) -> bool {
        self.bits == 0
    }

    /// The maximum number of supported dirty regions.
    pub const MAX_DIRTY_REGIONS: usize = 8 * mem::size_of::<PrimitiveVisibilityMask>();
}

bitflags! {
    /// A set of bitflags that can be set in the visibility information
    /// for a primitive instance. This can be used to control how primitives
    /// are treated during batching.
    // TODO(gw): We should also move `is_compositor_surface` to be part of
    //           this flags struct.
    #[cfg_attr(feature = "capture", derive(Serialize))]
    pub struct PrimitiveVisibilityFlags: u16 {
        /// Implies that this primitive covers the entire picture cache slice,
        /// and can thus be dropped during batching and drawn with clear color.
        const IS_BACKDROP = 1;
    }
}

/// Contains the current state of the primitive's visibility.
#[derive(Debug)]
#[cfg_attr(feature = "capture", derive(Serialize))]
pub enum VisibilityState {
    /// Uninitialized - this should never be encountered after prim reset
    Unset,
    /// Culled for being off-screen, or not possible to render (e.g. missing image resource)
    Culled,
    /// During picture cache dependency update, was found to be intersecting with one
    /// or more visible tiles. The rect in picture cache space is stored here to allow
    /// the detailed calculations below.
    Coarse {
        rect_in_pic_space: PictureRect,
    },
    /// Once coarse visibility is resolved, this provides a bitmask of which dirty tiles
    /// this primitive should be rasterized into.
    Detailed {
        /// A mask defining which of the dirty regions this primitive is visible in.
        visibility_mask: PrimitiveVisibilityMask,
    },
}

/// Information stored for a visible primitive about the visible
/// rect and associated clip information.
#[derive(Debug)]
#[cfg_attr(feature = "capture", derive(Serialize))]
pub struct PrimitiveVisibility {
    /// The clip chain instance that was built for this primitive.
    pub clip_chain: ClipChainInstance,

    /// Current visibility state of the primitive.
    // TODO(gw): Move more of the fields from this struct into
    //           the state enum.
    pub state: VisibilityState,

    /// An index into the clip task instances array in the primitive
    /// store. If this is ClipTaskIndex::INVALID, then the primitive
    /// has no clip mask. Otherwise, it may store the offset of the
    /// global clip mask task for this primitive, or the first of
    /// a list of clip task ids (one per segment).
    pub clip_task_index: ClipTaskIndex,

    /// A set of flags that define how this primitive should be handled
    /// during batching of visibile primitives.
    pub flags: PrimitiveVisibilityFlags,

    /// The current combined local clip for this primitive, from
    /// the primitive local clip above and the current clip chain.
    pub combined_local_clip_rect: LayoutRect,
}

impl PrimitiveVisibility {
    pub fn new() -> Self {
        PrimitiveVisibility {
            state: VisibilityState::Unset,
            clip_chain: ClipChainInstance::empty(),
            clip_task_index: ClipTaskIndex::INVALID,
            flags: PrimitiveVisibilityFlags::empty(),
            combined_local_clip_rect: LayoutRect::zero(),
        }
    }

    pub fn reset(&mut self) {
        self.state = VisibilityState::Culled;
        self.clip_task_index = ClipTaskIndex::INVALID;
        self.flags = PrimitiveVisibilityFlags::empty();
    }
}

/// Update visibility pass - update each primitive visibility struct, and
/// build the clip chain instance if appropriate.
pub fn update_primitive_visibility(
    store: &mut PrimitiveStore,
    pic_index: PictureIndex,
    parent_surface_index: SurfaceIndex,
    world_culling_rect: &WorldRect,
    frame_context: &FrameVisibilityContext,
    frame_state: &mut FrameVisibilityState,
    tile_caches: &mut FastHashMap<SliceId, Box<TileCacheInstance>>,
) -> Option<PictureRect> {
    profile_scope!("update_visibility");
    let (mut prim_list, surface_index, apply_local_clip_rect, world_culling_rect, is_composite) = {
        let pic = &mut store.pictures[pic_index.0];
        let mut world_culling_rect = *world_culling_rect;

        let prim_list = mem::replace(&mut pic.prim_list, PrimitiveList::empty());
        let (surface_index, is_composite) = match pic.raster_config {
            Some(ref raster_config) => (raster_config.surface_index, true),
            None => (parent_surface_index, false)
        };

        match pic.raster_config {
            Some(RasterConfig { composite_mode: PictureCompositeMode::TileCache { slice_id }, .. }) => {
                let mut tile_cache = tile_caches
                    .remove(&slice_id)
                    .expect("bug: non-existent tile cache");

                // If we have a tile cache for this picture, see if any of the
                // relative transforms have changed, which means we need to
                // re-map the dependencies of any child primitives.
                world_culling_rect = tile_cache.pre_update(
                    layout_rect_as_picture_rect(&pic.estimated_local_rect),
                    surface_index,
                    frame_context,
                    frame_state,
                );

                // Push a new surface, supplying the list of clips that should be
                // ignored, since they are handled by clipping when drawing this surface.
                frame_state.push_surface(
                    surface_index,
                    &tile_cache.shared_clips,
                    frame_context.spatial_tree,
                );
                frame_state.tile_cache = Some(tile_cache);
            }
            _ => {
                if is_composite {
                    frame_state.push_surface(
                        surface_index,
                        &[],
                        frame_context.spatial_tree,
                    );
                }
            }
        }

        (prim_list, surface_index, pic.apply_local_clip_rect, world_culling_rect, is_composite)
    };

    let surface = &frame_context.surfaces[surface_index.0 as usize];

    let mut map_local_to_surface = surface
        .map_local_to_surface
        .clone();

    let map_surface_to_world = SpaceMapper::new_with_target(
        ROOT_SPATIAL_NODE_INDEX,
        surface.surface_spatial_node_index,
        frame_context.global_screen_world_rect,
        frame_context.spatial_tree,
    );

    let mut surface_rect = PictureRect::zero();

    for cluster in &mut prim_list.clusters {
        profile_scope!("cluster");
        // Get the cluster and see if is visible
        if !cluster.flags.contains(ClusterFlags::IS_VISIBLE) {
            // Each prim instance must have reset called each frame, to clear
            // indices into various scratch buffers. If this doesn't occur,
            // the primitive may incorrectly be considered visible, which can
            // cause unexpected conditions to occur later during the frame.
            // Primitive instances are normally reset in the main loop below,
            // but we must also reset them in the rare case that the cluster
            // visibility has changed (due to an invalid transform and/or
            // backface visibility changing for this cluster).
            // TODO(gw): This is difficult to test for in CI - as a follow up,
            //           we should add a debug flag that validates the prim
            //           instance is always reset every frame to catch similar
            //           issues in future.
            for prim_instance in &mut prim_list.prim_instances[cluster.prim_range()] {
                prim_instance.reset();
            }
            continue;
        }

        map_local_to_surface.set_target_spatial_node(
            cluster.spatial_node_index,
            frame_context.spatial_tree,
        );

        for prim_instance in &mut prim_list.prim_instances[cluster.prim_range()] {
            prim_instance.reset();

            if prim_instance.is_chased() {
                #[cfg(debug_assertions)] // needed for ".id" part
                println!("\tpreparing {:?} in {:?}", prim_instance.id, pic_index);
                println!("\t{:?}", prim_instance.kind);
            }

            let (is_passthrough, prim_local_rect, prim_shadowed_rect) = match prim_instance.kind {
                PrimitiveInstanceKind::Picture { pic_index, .. } => {
                    let (is_visible, is_passthrough) = {
                        let pic = &store.pictures[pic_index.0];
                        (pic.is_visible(), pic.raster_config.is_none())
                    };

                    if !is_visible {
                        continue;
                    }

                    if is_passthrough {
                        frame_state.clip_chain_stack.push_clip(
                            prim_instance.clip_set.clip_chain_id,
                            frame_state.clip_store,
                        );
                    }

                    let pic_surface_rect = update_primitive_visibility(
                        store,
                        pic_index,
                        surface_index,
                        &world_culling_rect,
                        frame_context,
                        frame_state,
                        tile_caches,
                    );

                    if is_passthrough {
                        frame_state.clip_chain_stack.pop_clip();
                    }

                    let pic = &store.pictures[pic_index.0];

                    if prim_instance.is_chased() && pic.estimated_local_rect != pic.precise_local_rect {
                        println!("\testimate {:?} adjusted to {:?}", pic.estimated_local_rect, pic.precise_local_rect);
                    }

                    let mut shadow_rect = pic.precise_local_rect;
                    match pic.raster_config {
                        Some(ref rc) => match rc.composite_mode {
                            // If we have a drop shadow filter, we also need to include the shadow in
                            // our shadowed local rect for the purpose of calculating the size of the
                            // picture.
                            PictureCompositeMode::Filter(Filter::DropShadows(ref shadows)) => {
                                for shadow in shadows {
                                    shadow_rect = shadow_rect.union(&pic.precise_local_rect.translate(shadow.offset));
                                }
                            }
                            _ => {}
                        }
                        None => {
                            // If the primitive does not have its own raster config, we need to
                            // propogate the surface rect calculation to the parent.
                            if let Some(ref rect) = pic_surface_rect {
                                surface_rect = surface_rect.union(rect);
                            }
                        }
                    }

                    (is_passthrough, pic.precise_local_rect, shadow_rect)
                }
                _ => {
                    let prim_data = &frame_state.data_stores.as_common_data(&prim_instance);

                    (false, prim_data.prim_rect, prim_data.prim_rect)
                }
            };

            if is_passthrough {
                // Pass through pictures are always considered visible in all dirty tiles.
                prim_instance.vis.state = VisibilityState::Detailed {
                    visibility_mask: PrimitiveVisibilityMask::all(),
                };
            } else {
                if prim_local_rect.size.width <= 0.0 || prim_local_rect.size.height <= 0.0 {
                    if prim_instance.is_chased() {
                        println!("\tculled for zero local rectangle");
                    }
                    continue;
                }

                // Inflate the local rect for this primitive by the inflation factor of
                // the picture context and include the shadow offset. This ensures that
                // even if the primitive itstore is not visible, any effects from the
                // blur radius or shadow will be correctly taken into account.
                let inflation_factor = surface.inflation_factor;
                let local_rect = prim_shadowed_rect
                    .inflate(inflation_factor, inflation_factor)
                    .intersection(&prim_instance.clip_set.local_clip_rect);
                let local_rect = match local_rect {
                    Some(local_rect) => local_rect,
                    None => {
                        if prim_instance.is_chased() {
                            println!("\tculled for being out of the local clip rectangle: {:?}",
                                     prim_instance.clip_set.local_clip_rect);
                        }
                        continue;
                    }
                };

                // Include the clip chain for this primitive in the current stack.
                frame_state.clip_chain_stack.push_clip(
                    prim_instance.clip_set.clip_chain_id,
                    frame_state.clip_store,
                );

                frame_state.clip_store.set_active_clips(
                    prim_instance.clip_set.local_clip_rect,
                    cluster.spatial_node_index,
                    frame_state.clip_chain_stack.current_clips_array(),
                    &frame_context.spatial_tree,
                    &frame_state.data_stores.clip,
                );

                let clip_chain = frame_state
                    .clip_store
                    .build_clip_chain_instance(
                        local_rect,
                        &map_local_to_surface,
                        &map_surface_to_world,
                        &frame_context.spatial_tree,
                        frame_state.gpu_cache,
                        frame_state.resource_cache,
                        surface.device_pixel_scale,
                        &world_culling_rect,
                        &mut frame_state.data_stores.clip,
                        true,
                        prim_instance.is_chased(),
                    );

                // Ensure the primitive clip is popped
                frame_state.clip_chain_stack.pop_clip();

                prim_instance.vis.clip_chain = match clip_chain {
                    Some(clip_chain) => clip_chain,
                    None => {
                        if prim_instance.is_chased() {
                            println!("\tunable to build the clip chain, skipping");
                        }
                        continue;
                    }
                };

                if prim_instance.is_chased() {
                    println!("\teffective clip chain from {:?} {}",
                             prim_instance.vis.clip_chain.clips_range,
                             if apply_local_clip_rect { "(applied)" } else { "" },
                    );
                    println!("\tpicture rect {:?} @{:?}",
                             prim_instance.vis.clip_chain.pic_clip_rect,
                             prim_instance.vis.clip_chain.pic_spatial_node_index,
                    );
                }

                prim_instance.vis.combined_local_clip_rect = if apply_local_clip_rect {
                    prim_instance.vis.clip_chain.local_clip_rect
                } else {
                    prim_instance.clip_set.local_clip_rect
                };

                if prim_instance.vis.combined_local_clip_rect.size.is_empty() {
                    if prim_instance.is_chased() {
                        println!("\tculled for zero local clip rectangle");
                    }
                    continue;
                }

                // Include the visible area for primitive, including any shadows, in
                // the area affected by the surface.
                match prim_instance.vis.combined_local_clip_rect.intersection(&local_rect) {
                    Some(visible_rect) => {
                        if let Some(rect) = map_local_to_surface.map(&visible_rect) {
                            surface_rect = surface_rect.union(&rect);
                        }
                    }
                    None => {
                        if prim_instance.is_chased() {
                            println!("\tculled for zero visible rectangle");
                        }
                        continue;
                    }
                }

                match frame_state.tile_cache {
                    Some(ref mut tile_cache) => {
                        // TODO(gw): Refactor how tile_cache is stored in frame_state
                        //           so that we can pass frame_state directly to
                        //           update_prim_dependencies, rather than splitting borrows.
                        tile_cache.update_prim_dependencies(
                            prim_instance,
                            cluster.spatial_node_index,
                            prim_local_rect,
                            frame_context,
                            frame_state.data_stores,
                            frame_state.clip_store,
                            &store.pictures,
                            frame_state.resource_cache,
                            &store.color_bindings,
                            &frame_state.surface_stack,
                            &mut frame_state.composite_state,
                        );
                    }
                    None => {
                        // When picture cache is not in use, cull against the main world culling rect only.
                        let clipped_world_rect = calculate_prim_clipped_world_rect(
                            &prim_instance.vis.clip_chain.pic_clip_rect,
                            &world_culling_rect,
                            &map_surface_to_world,
                        );

                        prim_instance.vis.state = match clipped_world_rect {
                            Some(_) => {
                                VisibilityState::Detailed {
                                    visibility_mask: PrimitiveVisibilityMask::all(),
                                }
                            }
                            None => {
                                VisibilityState::Culled
                            }
                        };
                    }
                }

                // Skip post visibility prim update if this primitive was culled above.
                match prim_instance.vis.state {
                    VisibilityState::Unset => panic!("bug: invalid state"),
                    VisibilityState::Culled => continue,
                    VisibilityState::Coarse { .. } | VisibilityState::Detailed { .. } => {}
                }

                // When the debug display is enabled, paint a colored rectangle around each
                // primitive.
                if frame_context.debug_flags.contains(::api::DebugFlags::PRIMITIVE_DBG) {
                    let debug_color = match prim_instance.kind {
                        PrimitiveInstanceKind::Picture { .. } => ColorF::TRANSPARENT,
                        PrimitiveInstanceKind::TextRun { .. } => debug_colors::RED,
                        PrimitiveInstanceKind::LineDecoration { .. } => debug_colors::PURPLE,
                        PrimitiveInstanceKind::NormalBorder { .. } |
                        PrimitiveInstanceKind::ImageBorder { .. } => debug_colors::ORANGE,
                        PrimitiveInstanceKind::Rectangle { .. } => ColorF { r: 0.8, g: 0.8, b: 0.8, a: 0.5 },
                        PrimitiveInstanceKind::YuvImage { .. } => debug_colors::BLUE,
                        PrimitiveInstanceKind::Image { .. } => debug_colors::BLUE,
                        PrimitiveInstanceKind::LinearGradient { .. } => debug_colors::PINK,
                        PrimitiveInstanceKind::RadialGradient { .. } => debug_colors::PINK,
                        PrimitiveInstanceKind::ConicGradient { .. } => debug_colors::PINK,
                        PrimitiveInstanceKind::Clear { .. } => debug_colors::CYAN,
                        PrimitiveInstanceKind::Backdrop { .. } => debug_colors::MEDIUMAQUAMARINE,
                    };
                    if debug_color.a != 0.0 {
                        if let Some(rect) = calculate_prim_clipped_world_rect(
                            &prim_instance.vis.clip_chain.pic_clip_rect,
                            &world_culling_rect,
                            &map_surface_to_world,
                        ) {
                            let debug_rect = rect * frame_context.global_device_pixel_scale;
                            frame_state.scratch.primitive.push_debug_rect(debug_rect, debug_color, debug_color.scale_alpha(0.5));
                        }
                    }
                } else if frame_context.debug_flags.contains(::api::DebugFlags::OBSCURE_IMAGES) {
                    let is_image = matches!(
                        prim_instance.kind,
                        PrimitiveInstanceKind::Image { .. } | PrimitiveInstanceKind::YuvImage { .. }
                    );
                    if is_image {
                        // We allow "small" images, since they're generally UI elements.
                        if let Some(rect) = calculate_prim_clipped_world_rect(
                            &prim_instance.vis.clip_chain.pic_clip_rect,
                            &world_culling_rect,
                            &map_surface_to_world,
                        ) {
                            let rect = rect * frame_context.global_device_pixel_scale;
                            if rect.size.width > 70.0 && rect.size.height > 70.0 {
                                frame_state.scratch.primitive.push_debug_rect(rect, debug_colors::PURPLE, debug_colors::PURPLE);
                            }
                        }
                    }
                }

                if prim_instance.is_chased() {
                    println!("\tvisible with {:?}", prim_instance.vis.combined_local_clip_rect);
                }

                // TODO(gw): This should probably be an instance method on PrimitiveInstance?
                update_prim_post_visibility(
                    store,
                    prim_instance,
                    cluster.spatial_node_index,
                    world_culling_rect,
                    &map_surface_to_world,
                    frame_context,
                    frame_state,
                );
            }
        }
    }

    // Similar to above, pop either the clip chain or root entry off the current clip stack.
    if is_composite {
        frame_state.pop_surface();
    }

    let pic = &mut store.pictures[pic_index.0];
    pic.prim_list = prim_list;

    // If the local rect changed (due to transforms in child primitives) then
    // invalidate the GPU cache location to re-upload the new local rect
    // and stretch size. Drop shadow filters also depend on the local rect
    // size for the extra GPU cache data handle.
    // TODO(gw): In future, if we support specifying a flag which gets the
    //           stretch size from the segment rect in the shaders, we can
    //           remove this invalidation here completely.
    if let Some(ref rc) = pic.raster_config {
        // Inflate the local bounding rect if required by the filter effect.
        // This inflaction factor is to be applied to the surface itstore.
        if pic.options.inflate_if_required {
            // The picture's local rect is calculated as the union of the
            // snapped primitive rects, which should result in a snapped
            // local rect, unless it was inflated. This is also done during
            // surface configuration when calculating the picture's
            // estimated local rect.
            let snap_pic_to_raster = SpaceSnapper::new_with_target(
                surface.raster_spatial_node_index,
                pic.spatial_node_index,
                surface.device_pixel_scale,
                frame_context.spatial_tree,
            );

            surface_rect = rc.composite_mode.inflate_picture_rect(surface_rect, surface.scale_factors);
            surface_rect = snap_pic_to_raster.snap_rect(&surface_rect);
        }

        // Layout space for the picture is picture space from the
        // perspective of its child primitives.
        pic.precise_local_rect = surface_rect * Scale::new(1.0);

        // If the precise rect changed since last frame, we need to invalidate
        // any segments and gpu cache handles for drop-shadows.
        // TODO(gw): Requiring storage of the `prev_precise_local_rect` here
        //           is a total hack. It's required because `prev_precise_local_rect`
        //           gets written to twice (during initial vis pass and also during
        //           prepare pass). The proper longer term fix for this is to make
        //           use of the conservative picture rect for segmenting (which should
        //           be done during scene building).
        if pic.precise_local_rect != pic.prev_precise_local_rect {
            match rc.composite_mode {
                PictureCompositeMode::Filter(Filter::DropShadows(..)) => {
                    for handle in &pic.extra_gpu_data_handles {
                        frame_state.gpu_cache.invalidate(handle);
                    }
                }
                _ => {}
            }
            // Invalidate any segments built for this picture, since the local
            // rect has changed.
            pic.segments_are_valid = false;
            pic.prev_precise_local_rect = pic.precise_local_rect;
        }

        if let PictureCompositeMode::TileCache { .. } = rc.composite_mode {
            let mut tile_cache = frame_state.tile_cache.take().unwrap();

            // Build the dirty region(s) for this tile cache.
            tile_cache.post_update(
                frame_context,
                frame_state,
            );

            tile_caches.insert(SliceId::new(tile_cache.slice), tile_cache);
        }

        None
    } else {
        let parent_surface = &frame_context.surfaces[parent_surface_index.0 as usize];
        let map_surface_to_parent_surface = SpaceMapper::new_with_target(
            parent_surface.surface_spatial_node_index,
            surface.surface_spatial_node_index,
            PictureRect::max_rect(),
            frame_context.spatial_tree,
        );
        map_surface_to_parent_surface.map(&surface_rect)
    }
}


fn update_prim_post_visibility(
    store: &mut PrimitiveStore,
    prim_instance: &mut PrimitiveInstance,
    prim_spatial_node_index: SpatialNodeIndex,
    world_culling_rect: WorldRect,
    map_surface_to_world: &SpaceMapper<PicturePixel, WorldPixel>,
    frame_context: &FrameVisibilityContext,
    frame_state: &mut FrameVisibilityState,
) {
    profile_scope!("update_prim_post_visibility");
    match prim_instance.kind {
        PrimitiveInstanceKind::Picture { pic_index, .. } => {
            let pic = &mut store.pictures[pic_index.0];
            // If this picture has a surface, determine the clipped bounding rect for it to
            // minimize the size of the render target that is required.
            if let Some(ref mut raster_config) = pic.raster_config {
                raster_config.clipped_bounding_rect = map_surface_to_world
                    .map(&prim_instance.vis.clip_chain.pic_clip_rect)
                    .and_then(|rect| {
                        rect.intersection(&world_culling_rect)
                    })
                    .unwrap_or(WorldRect::zero());
            }
        }
        PrimitiveInstanceKind::TextRun { .. } => {
            // Text runs can't request resources early here, as we don't
            // know until TileCache::post_update() whether we are drawing
            // on an opaque surface.
            // TODO(gw): We might be able to detect simple cases of this earlier,
            //           during the picture traversal. But it's probably not worth it?
        }
        PrimitiveInstanceKind::Image { data_handle, image_instance_index, .. } => {
            let prim_data = &mut frame_state.data_stores.image[data_handle];
            let common_data = &mut prim_data.common;
            let image_data = &mut prim_data.kind;
            let image_instance = &mut store.images[image_instance_index];

            let image_properties = frame_state
                .resource_cache
                .get_image_properties(image_data.key);

            let request = ImageRequest {
                key: image_data.key,
                rendering: image_data.image_rendering,
                tile: None,
            };

            match image_properties {
                Some(ImageProperties { tiling: None, .. }) => {

                    frame_state.resource_cache.request_image(
                        request,
                        frame_state.gpu_cache,
                    );
                }
                Some(ImageProperties { tiling: Some(tile_size), visible_rect, .. }) => {
                    image_instance.visible_tiles.clear();
                    // TODO: rename the blob's visible_rect into something that doesn't conflict
                    // with the terminology we use during culling since it's not really the same
                    // thing.
                    let active_rect = visible_rect;

                    // Tighten the clip rect because decomposing the repeated image can
                    // produce primitives that are partially covering the original image
                    // rect and we want to clip these extra parts out.
                    let prim_info = &prim_instance.vis;
                    let tight_clip_rect = prim_info
                        .combined_local_clip_rect
                        .intersection(&common_data.prim_rect).unwrap();
                    image_instance.tight_local_clip_rect = tight_clip_rect;

                    let visible_rect = compute_conservative_visible_rect(
                        &prim_instance.vis.clip_chain,
                        world_culling_rect,
                        prim_spatial_node_index,
                        frame_context.spatial_tree,
                    );

                    let base_edge_flags = edge_flags_for_tile_spacing(&image_data.tile_spacing);

                    let stride = image_data.stretch_size + image_data.tile_spacing;

                    // We are performing the decomposition on the CPU here, no need to
                    // have it in the shader.
                    common_data.may_need_repetition = false;

                    let repetitions = image_tiling::repetitions(
                        &common_data.prim_rect,
                        &visible_rect,
                        stride,
                    );

                    for image_tiling::Repetition { origin, edge_flags } in repetitions {
                        let edge_flags = base_edge_flags | edge_flags;

                        let layout_image_rect = LayoutRect {
                            origin,
                            size: image_data.stretch_size,
                        };

                        let tiles = image_tiling::tiles(
                            &layout_image_rect,
                            &visible_rect,
                            &active_rect,
                            tile_size as i32,
                        );

                        for tile in tiles {
                            frame_state.resource_cache.request_image(
                                request.with_tile(tile.offset),
                                frame_state.gpu_cache,
                            );

                            image_instance.visible_tiles.push(VisibleImageTile {
                                tile_offset: tile.offset,
                                edge_flags: tile.edge_flags & edge_flags,
                                local_rect: tile.rect,
                                local_clip_rect: tight_clip_rect,
                            });
                        }
                    }

                    if image_instance.visible_tiles.is_empty() {
                        // Mark as invisible
                        prim_instance.clear_visibility();
                    }
                }
                None => {}
            }
        }
        PrimitiveInstanceKind::ImageBorder { data_handle, .. } => {
            let prim_data = &mut frame_state.data_stores.image_border[data_handle];
            prim_data.kind.request_resources(
                frame_state.resource_cache,
                frame_state.gpu_cache,
            );
        }
        PrimitiveInstanceKind::YuvImage { data_handle, .. } => {
            let prim_data = &mut frame_state.data_stores.yuv_image[data_handle];
            prim_data.kind.request_resources(
                frame_state.resource_cache,
                frame_state.gpu_cache,
            );
        }
        _ => {}
    }
}

fn edge_flags_for_tile_spacing(tile_spacing: &LayoutSize) -> EdgeAaSegmentMask {
    let mut flags = EdgeAaSegmentMask::empty();

    if tile_spacing.width > 0.0 {
        flags |= EdgeAaSegmentMask::LEFT | EdgeAaSegmentMask::RIGHT;
    }
    if tile_spacing.height > 0.0 {
        flags |= EdgeAaSegmentMask::TOP | EdgeAaSegmentMask::BOTTOM;
    }

    flags
}

pub fn compute_conservative_visible_rect(
    clip_chain: &ClipChainInstance,
    world_culling_rect: WorldRect,
    prim_spatial_node_index: SpatialNodeIndex,
    spatial_tree: &SpatialTree,
) -> LayoutRect {
    // Mapping from picture space -> world space
    let map_pic_to_world: SpaceMapper<PicturePixel, WorldPixel> = SpaceMapper::new_with_target(
        ROOT_SPATIAL_NODE_INDEX,
        clip_chain.pic_spatial_node_index,
        world_culling_rect,
        spatial_tree,
    );

    // Mapping from local space -> picture space
    let map_local_to_pic: SpaceMapper<LayoutPixel, PicturePixel> = SpaceMapper::new_with_target(
        clip_chain.pic_spatial_node_index,
        prim_spatial_node_index,
        PictureRect::max_rect(),
        spatial_tree,
    );

    // Unmap the world culling rect from world -> picture space. If this mapping fails due
    // to matrix weirdness, best we can do is use the clip chain's local clip rect.
    let pic_culling_rect = match map_pic_to_world.unmap(&world_culling_rect) {
        Some(rect) => rect,
        None => return clip_chain.local_clip_rect,
    };

    // Intersect the unmapped world culling rect with the primitive's clip chain rect that
    // is in picture space (the clip-chain already takes into account the bounds of the
    // primitive local_rect and local_clip_rect). If there is no intersection here, the
    // primitive is not visible at all.
    let pic_culling_rect = match pic_culling_rect.intersection(&clip_chain.pic_clip_rect) {
        Some(rect) => rect,
        None => return LayoutRect::zero(),
    };

    // Unmap the picture culling rect from picture -> local space. If this mapping fails due
    // to matrix weirdness, best we can do is use the clip chain's local clip rect.
    match map_local_to_pic.unmap(&pic_culling_rect) {
        Some(rect) => rect,
        None => clip_chain.local_clip_rect,
    }
}

fn calculate_prim_clipped_world_rect(
    pic_clip_rect: &PictureRect,
    world_culling_rect: &WorldRect,
    map_surface_to_world: &SpaceMapper<PicturePixel, WorldPixel>,
) -> Option<WorldRect> {
    map_surface_to_world
        .map(pic_clip_rect)
        .and_then(|world_rect| {
            world_rect.intersection(world_culling_rect)
        })
}
