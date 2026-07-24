/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! Dependency tracking for tile invalidation
//!
//! This module contains types and logic for tracking dependencies that affect
//! tile invalidation, including transform comparisons, spatial node tracking,
//! and primitive comparison.

use api::{ImageKey, PropertyBindingId, ColorU};
use euclid::approxeq::ApproxEq;
use crate::invalidation::PrimitiveCompareResult;
use crate::spatial_tree::{SpatialTree, SpatialNodeIndex, CoordinateSpaceMapping};
use crate::internal_types::{FastHashMap, FastHashSet, FrameId};
use crate::intern::ItemUid;
use crate::resource_cache::{ResourceCache, ImageGeneration};
use crate::invalidation::cached_surface::{PrimitiveDependencyIndex, PrimitiveDescriptor, CachedSurfaceDescriptor};
use peek_poke::{PeekPoke, peek_from_slice};
use std::collections::hash_map::Entry;

/// A comparable transform matrix, that compares with epsilon checks.
#[derive(Debug, Clone)]
pub struct MatrixKey {
    pub m: [f32; 16],
}

impl PartialEq for MatrixKey {
    fn eq(&self, other: &Self) -> bool {
        const EPSILON: f32 = 0.001;

        // TODO(gw): It's possible that we may need to adjust the epsilon
        //           to be tighter on most of the matrix, except the
        //           translation parts?
        for (i, j) in self.m.iter().zip(other.m.iter()) {
            if !i.approx_eq_eps(j, &EPSILON) {
                return false;
            }
        }

        true
    }
}

/// A comparable scale-offset, that compares with epsilon checks.
#[derive(Debug, Clone)]
pub struct ScaleOffsetKey {
    pub sx: f32,
    pub sy: f32,
    pub tx: f32,
    pub ty: f32,
}

impl PartialEq for ScaleOffsetKey {
    fn eq(&self, other: &Self) -> bool {
        const EPSILON: f32 = 0.001;

        self.sx.approx_eq_eps(&other.sx, &EPSILON) &&
        self.sy.approx_eq_eps(&other.sy, &EPSILON) &&
        self.tx.approx_eq_eps(&other.tx, &EPSILON) &&
        self.ty.approx_eq_eps(&other.ty, &EPSILON)
    }
}

/// A comparable / hashable version of a coordinate space mapping. Used to determine
/// if a transform dependency for a tile has changed.
#[derive(Debug, PartialEq, Clone)]
pub enum TransformKey {
    Local,
    ScaleOffset {
        so: ScaleOffsetKey,
    },
    Transform {
        m: MatrixKey,
    }
}

impl<Src, Dst> From<CoordinateSpaceMapping<Src, Dst>> for TransformKey {
    fn from(transform: CoordinateSpaceMapping<Src, Dst>) -> TransformKey {
        match transform {
            CoordinateSpaceMapping::Local => {
                TransformKey::Local
            }
            CoordinateSpaceMapping::ScaleOffset(ref scale_offset) => {
                TransformKey::ScaleOffset {
                    so: ScaleOffsetKey {
                        sx: scale_offset.scale.x,
                        sy: scale_offset.scale.y,
                        tx: scale_offset.offset.x,
                        ty: scale_offset.offset.y,
                    }
                }
            }
            CoordinateSpaceMapping::Transform(ref m) => {
                TransformKey::Transform {
                    m: MatrixKey {
                        m: m.to_array(),
                    },
                }
            }
        }
    }
}

/// Get the transform key for a spatial node relative to a cache spatial node.
pub fn get_transform_key(
    spatial_node_index: SpatialNodeIndex,
    cache_spatial_node_index: SpatialNodeIndex,
    spatial_tree: &SpatialTree,
) -> TransformKey {
    spatial_tree.get_relative_transform(
        spatial_node_index,
        cache_spatial_node_index,
    ).into()
}


/// Information about the state of a binding.
#[derive(Debug)]
pub struct BindingInfo<T> {
    /// The current value retrieved from dynamic scene properties.
    pub value: T,
    /// True if it was changed (or is new) since the last frame build.
    pub changed: bool,
}

/// Information stored in a tile descriptor for a binding.
#[derive(Debug, PartialEq, Clone, Copy, PeekPoke)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
pub enum Binding<T> {
    Value(T),
    Binding(PropertyBindingId),
}

impl<T: Default> Default for Binding<T> {
    fn default() -> Self {
        Binding::Value(T::default())
    }
}

impl<T> From<api::PropertyBinding<T>> for Binding<T> {
    fn from(binding: api::PropertyBinding<T>) -> Binding<T> {
        match binding {
            api::PropertyBinding::Binding(key, _) => Binding::Binding(key.id),
            api::PropertyBinding::Value(value) => Binding::Value(value),
        }
    }
}

pub type OpacityBinding = Binding<f32>;
pub type OpacityBindingInfo = BindingInfo<f32>;

pub type ColorBinding = Binding<ColorU>;
pub type ColorBindingInfo = BindingInfo<ColorU>;

/// Types of dependencies that a primitive can have
#[derive(PeekPoke)]
pub enum PrimitiveDependency {
    OpacityBinding {
        binding: OpacityBinding,
    },
    ColorBinding {
        binding: ColorBinding,
    },
    SpatialNode {
        index: SpatialNodeIndex,
    },
    Clip {
        clip: ItemUid,
    },
    Image {
        image: ImageDependency,
    },
}

/// Information stored an image dependency
#[derive(Debug, Copy, Clone, PartialEq, PeekPoke, Default)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
pub struct ImageDependency {
    pub key: ImageKey,
    pub generation: ImageGeneration,
}

impl ImageDependency {
    pub const INVALID: ImageDependency = ImageDependency {
        key: ImageKey::DUMMY,
        generation: ImageGeneration::INVALID,
    };
}

/// A dependency for a transform is defined by the spatial node index + frame it was used
#[derive(Copy, Clone, Debug, Eq, PartialEq, Hash, PeekPoke, Default)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
pub struct SpatialNodeKey {
    pub spatial_node_index: SpatialNodeIndex,
    pub frame_id: FrameId,
}

/// A helper for comparing spatial nodes between frames. The comparisons
/// are done by-value, so that if the shape of the spatial node tree
/// changes, invalidations aren't done simply due to the spatial node
/// index changing between display lists.
pub struct SpatialNodeComparer {
    /// The root spatial node index of the tile cache
    ref_spatial_node_index: SpatialNodeIndex,
    /// Maintains a map of currently active transform keys
    spatial_nodes: FastHashMap<SpatialNodeKey, TransformKey>,
    /// A cache of recent comparisons between prev and current spatial nodes
    compare_cache: FastHashMap<(SpatialNodeKey, SpatialNodeKey), bool>,
    /// A set of frames that we need to retain spatial node entries for
    referenced_frames: FastHashSet<FrameId>,
}

impl SpatialNodeComparer {
    /// Construct a new comparer
    pub fn new() -> Self {
        SpatialNodeComparer {
            ref_spatial_node_index: SpatialNodeIndex::INVALID,
            spatial_nodes: FastHashMap::default(),
            compare_cache: FastHashMap::default(),
            referenced_frames: FastHashSet::default(),
        }
    }

    /// Advance to the next frame
    pub fn next_frame(
        &mut self,
        ref_spatial_node_index: SpatialNodeIndex,
    ) {
        // Drop any node information for unreferenced frames, to ensure that the
        // hashmap doesn't grow indefinitely!
        let referenced_frames = &self.referenced_frames;
        self.spatial_nodes.retain(|key, _| {
            referenced_frames.contains(&key.frame_id)
        });

        // Update the root spatial node for this comparer
        self.ref_spatial_node_index = ref_spatial_node_index;
        self.compare_cache.clear();
        self.referenced_frames.clear();
    }

    /// Register a transform that is used, and build the transform key for it if new.
    pub fn register_used_transform(
        &mut self,
        spatial_node_index: SpatialNodeIndex,
        frame_id: FrameId,
        spatial_tree: &SpatialTree,
    ) {
        let key = SpatialNodeKey {
            spatial_node_index,
            frame_id,
        };

        if let Entry::Vacant(entry) = self.spatial_nodes.entry(key) {
            entry.insert(
                get_transform_key(
                    spatial_node_index,
                    self.ref_spatial_node_index,
                    spatial_tree,
                )
            );
        }
    }

    /// Return true if the transforms for two given spatial nodes are considered equivalent
    pub fn are_transforms_equivalent(
        &mut self,
        prev_spatial_node_key: &SpatialNodeKey,
        curr_spatial_node_key: &SpatialNodeKey,
    ) -> bool {
        let key = (*prev_spatial_node_key, *curr_spatial_node_key);
        let spatial_nodes = &self.spatial_nodes;

        *self.compare_cache
            .entry(key)
            .or_insert_with(|| {
                let prev = &spatial_nodes[&prev_spatial_node_key];
                let curr = &spatial_nodes[&curr_spatial_node_key];
                curr == prev
            })
    }

    /// Ensure that the comparer won't GC any nodes for a given frame id
    pub fn retain_for_frame(&mut self, frame_id: FrameId) {
        self.referenced_frames.insert(frame_id);
    }
}

/// A key for storing primitive comparison results during tile dependency tests.
#[derive(Debug, Copy, Clone, Eq, Hash, PartialEq)]
pub struct PrimitiveComparisonKey {
    pub prev_index: PrimitiveDependencyIndex,
    pub curr_index: PrimitiveDependencyIndex,
}

/// A helper struct to compare a primitive and all its sub-dependencies.
pub struct PrimitiveComparer<'a> {
    prev_data: &'a [u8],
    curr_data: &'a [u8],
    prev_frame_id: FrameId,
    curr_frame_id: FrameId,
    resource_cache: &'a ResourceCache,
    spatial_node_comparer: &'a mut SpatialNodeComparer,
    opacity_bindings: &'a FastHashMap<PropertyBindingId, OpacityBindingInfo>,
    color_bindings: &'a FastHashMap<PropertyBindingId, ColorBindingInfo>,
}

impl<'a> PrimitiveComparer<'a> {
    pub fn new(
        prev: &'a CachedSurfaceDescriptor,
        curr: &'a CachedSurfaceDescriptor,
        resource_cache: &'a ResourceCache,
        spatial_node_comparer: &'a mut SpatialNodeComparer,
        opacity_bindings: &'a FastHashMap<PropertyBindingId, OpacityBindingInfo>,
        color_bindings: &'a FastHashMap<PropertyBindingId, ColorBindingInfo>,
    ) -> Self {
        PrimitiveComparer {
            prev_data: &prev.dep_data,
            curr_data: &curr.dep_data,
            prev_frame_id: prev.last_updated_frame_id,
            curr_frame_id: curr.last_updated_frame_id,
            resource_cache,
            spatial_node_comparer,
            opacity_bindings,
            color_bindings,
        }
    }

    /// Check if two primitive descriptors are the same.
    pub fn compare_prim(
        &mut self,
        prev_desc: &PrimitiveDescriptor,
        curr_desc: &PrimitiveDescriptor,
    ) -> PrimitiveCompareResult {
        let resource_cache = self.resource_cache;
        let spatial_node_comparer = &mut self.spatial_node_comparer;
        let opacity_bindings = self.opacity_bindings;
        let color_bindings = self.color_bindings;

        // Check equality of the PrimitiveDescriptor
        if prev_desc != curr_desc {
            return PrimitiveCompareResult::Descriptor;
        }

        let mut prev_dep_data = &self.prev_data[prev_desc.dep_offset as usize ..];
        let mut curr_dep_data = &self.curr_data[curr_desc.dep_offset as usize ..];

        let mut prev_dep = PrimitiveDependency::SpatialNode { index: SpatialNodeIndex::INVALID };
        let mut curr_dep = PrimitiveDependency::SpatialNode { index: SpatialNodeIndex::INVALID };

        debug_assert_eq!(prev_desc.dep_count, curr_desc.dep_count);

        for _ in 0 .. prev_desc.dep_count {
            prev_dep_data = peek_from_slice(prev_dep_data, &mut prev_dep);
            curr_dep_data = peek_from_slice(curr_dep_data, &mut curr_dep);

            match (&prev_dep, &curr_dep) {
                (PrimitiveDependency::Clip { clip: prev }, PrimitiveDependency::Clip { clip: curr }) => {
                    if prev != curr {
                        return PrimitiveCompareResult::Clip;
                    }
                }
                (PrimitiveDependency::SpatialNode { index: prev }, PrimitiveDependency::SpatialNode { index: curr }) => {
                    let prev_key = SpatialNodeKey {
                        spatial_node_index: *prev,
                        frame_id: self.prev_frame_id,
                    };
                    let curr_key = SpatialNodeKey {
                        spatial_node_index: *curr,
                        frame_id: self.curr_frame_id,
                    };
                    if !spatial_node_comparer.are_transforms_equivalent(&prev_key, &curr_key) {
                        return PrimitiveCompareResult::Transform;
                    }
                }
                (PrimitiveDependency::OpacityBinding { binding: prev }, PrimitiveDependency::OpacityBinding { binding: curr }) => {
                    if prev != curr {
                        return PrimitiveCompareResult::OpacityBinding;
                    }

                    if let OpacityBinding::Binding(id) = curr {
                        if opacity_bindings
                            .get(id)
                            .map_or(true, |info| info.changed) {
                            return PrimitiveCompareResult::OpacityBinding;
                        }
                    }
                }
                (PrimitiveDependency::ColorBinding { binding: prev }, PrimitiveDependency::ColorBinding { binding: curr }) => {
                    if prev != curr {
                        return PrimitiveCompareResult::ColorBinding;
                    }

                    if let ColorBinding::Binding(id) = curr {
                        if color_bindings
                            .get(id)
                            .map_or(true, |info| info.changed) {
                            return PrimitiveCompareResult::ColorBinding;
                        }
                    }
                }
                (PrimitiveDependency::Image { image: prev }, PrimitiveDependency::Image { image: curr }) => {
                    if prev != curr {
                        return PrimitiveCompareResult::Image;
                    }

                    if resource_cache.get_image_generation(curr.key) != curr.generation {
                        return PrimitiveCompareResult::Image;
                    }
                }
                _ => {
                    // There was a mismatch between types of dependencies, so something changed
                    return PrimitiveCompareResult::Descriptor;
                }
            }
        }

        PrimitiveCompareResult::Equal
    }
}
