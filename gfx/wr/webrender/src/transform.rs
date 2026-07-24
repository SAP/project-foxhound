use api::units::{LayoutToPictureTransform, PicturePixel, PictureToLayoutTransform};
use crate::{FastHashMap, frame_allocator::FrameMemory, gpu_types::VECS_PER_TRANSFORM};
use crate::internal_types::FrameVec;
use crate::spatial_tree::{SpatialNodeIndex, SpatialTree};
use crate::util::{TransformedRectKind, MatrixHelpers};

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/// Represents the information about a transform palette
/// entry that is passed to shaders. It includes an index
/// into the transform palette, and a set of flags.
#[derive(Copy, Clone, PartialEq, MallocSizeOf)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
#[repr(C)]
pub struct GpuTransformId(pub u32);

impl GpuTransformId {
    /// Identity transform ID.
    pub const IDENTITY: Self = GpuTransformId(0);
    const INDEX_MASK: u32 = 0x003fffff;

    // Note: we use unset bits instead of set bits to denote certain
    // properties of the transform so that the identity transform id
    // remains zero.

    /// if *not* set, the transform is axis-aligned.
    const AXIS_ALIGNED_2D_BIT: u32 = 1 << 23;
    /// If *not* set, the transform can be represented as a 2d scale + offset.
    const SCALE_OFFSET_2D_BIT: u32 = 1 << 22;

    /// Extract the transform kind from the id.
    pub fn transform_kind(&self) -> TransformedRectKind {
        if (self.0 & Self::AXIS_ALIGNED_2D_BIT) == 0 {
            TransformedRectKind::AxisAligned
        } else {
            TransformedRectKind::Complex
        }
    }

    /// Note: There are transformations that preserve axis-alignment without
    /// being scale + offsets.
    pub fn is_2d_axis_aligned(&self) -> bool {
        self.0 & Self::AXIS_ALIGNED_2D_BIT == 0
    }

    /// Returns true if the transform can be represented by a 2d scale + offset.
    pub fn is_2d_scale_offset(&self) -> bool {
        self.0 & Self::SCALE_OFFSET_2D_BIT == 0
    }

    pub fn metadata(&self) -> TransformMetadata {
        TransformMetadata {
            is_2d_axis_aligned: self.is_2d_axis_aligned(),
            is_2d_scale_offset: self.is_2d_scale_offset(),
        }
    }

    /// Override the kind of transform stored in this id. This can be useful in
    /// cases where we don't want shaders to consider certain transforms axis-
    /// aligned (i.e. perspective warp) even though we may still want to for the
    /// general case.
    pub fn override_transform_kind(&self, kind: TransformedRectKind) -> Self {
        GpuTransformId((self.0 & (1 << 23)) | ((kind as u32) << 23))
    }
}

impl std::fmt::Debug for GpuTransformId {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        if *self == Self::IDENTITY {
            write!(f, "<identity>")
        } else {
            let index = self.0 & Self::INDEX_MASK;
            write!(f, "#{index}")?;
            let flag_bits = Self::AXIS_ALIGNED_2D_BIT | Self::SCALE_OFFSET_2D_BIT;
            if self.0 & flag_bits != flag_bits {
                let axis_aligned = if self.is_2d_axis_aligned() { "axis-aligned" } else { "" };
                let scale_offset = if self.is_2d_scale_offset() { "scale-offset" } else { "" };
                write!(f, "({axis_aligned} {scale_offset})")?;
            }
            Ok(())
        }
    }
}


/// The GPU data payload for a transform palette entry.
#[derive(Debug, Clone)]
#[cfg_attr(feature = "capture", derive(Serialize))]
#[cfg_attr(feature = "replay", derive(Deserialize))]
#[repr(C)]
pub struct TransformData {
    transform: LayoutToPictureTransform,
    inv_transform: PictureToLayoutTransform,
}

impl TransformData {
    fn invalid() -> Self {
        TransformData {
            transform: LayoutToPictureTransform::identity(),
            inv_transform: PictureToLayoutTransform::identity(),
        }
    }
}

// Extra data stored about each transform palette entry.
#[derive(Copy, Clone)]
pub struct TransformMetadata {
    pub is_2d_axis_aligned: bool,
    pub is_2d_scale_offset: bool,
}

impl TransformMetadata {
    pub fn invalid() -> Self {
        TransformMetadata {
            is_2d_axis_aligned: true,
            is_2d_scale_offset: true,
        }
    }

    pub fn flags(&self) -> u32 {
        let mut flags = 0;
        if !self.is_2d_axis_aligned {
            flags |= GpuTransformId::AXIS_ALIGNED_2D_BIT
        };
        if !self.is_2d_scale_offset {
            flags |= GpuTransformId::SCALE_OFFSET_2D_BIT
        };

        flags
    }
}

#[derive(Debug, Hash, Eq, PartialEq)]
struct RelativeTransformKey {
    from_index: SpatialNodeIndex,
    to_index: SpatialNodeIndex,
    scale: u32,
    pre_scale: bool,
}

pub struct TransformPalette {
    pub gpu: GpuTransforms,
}

impl TransformPalette {
    pub fn new(
        count: usize,
        memory: &FrameMemory,
    ) -> Self {
        TransformPalette {
            gpu: GpuTransforms::new(count, memory),
        }
    }

    pub fn finish(self) -> FrameVec<TransformData> {
        self.gpu.finish()
    }
}

// Stores a contiguous list of TransformData structs, that
// are ready for upload to the GPU.
// TODO(gw): For now, this only stores the complete local
//           to world transform for each spatial node. In
//           the future, the transform palette will support
//           specifying a coordinate system that the transform
//           should be relative to.
pub struct GpuTransforms {
    transforms: FrameVec<TransformData>,
    metadata: Vec<TransformMetadata>,
    map: FastHashMap<RelativeTransformKey, usize>,
}

impl GpuTransforms {
    fn new(
        count: usize,
        memory: &FrameMemory,
    ) -> Self {
        let _ = VECS_PER_TRANSFORM;

        let mut transforms = memory.new_vec_with_capacity(count);
        let mut metadata = Vec::with_capacity(count);

        transforms.push(TransformData::invalid());
        metadata.push(TransformMetadata::invalid());

        GpuTransforms {
            transforms,
            metadata,
            map: FastHashMap::default(),
        }
    }

    fn finish(self) -> FrameVec<TransformData> {
        self.transforms
    }

    fn get_index(
        &mut self,
        child_index: SpatialNodeIndex,
        parent_index: SpatialNodeIndex,
        mut scale: Option<f32>,
        pre_scale: bool,
        spatial_tree: &SpatialTree,
    ) -> usize {
        if scale == Some(1.0) {
            scale = None;
        }

        // Deduplicate the common case of identity transforms.
        if child_index == parent_index && scale.is_none() {
            return 0;
        }

        let scale_key = scale.map(|s| s.to_bits()).unwrap_or(0);

        let key = RelativeTransformKey {
            from_index: child_index,
            to_index: parent_index,
            scale: scale_key,
            pre_scale,
        };

        let metadata = &mut self.metadata;
        let transforms = &mut self.transforms;

        *self.map.entry(key).or_insert_with(|| {
            let transform = spatial_tree.get_relative_transform(
                child_index,
                parent_index,
            );

            let is_2d_axis_aligned = transform.is_2d_axis_aligned();
            let is_2d_scale_offset  = transform.is_2d_scale_translation();

            let transform = transform
                .into_transform()
                .with_destination::<PicturePixel>();

            register_gpu_transform(
                metadata,
                transforms,
                transform,
                scale,
                pre_scale,
                TransformMetadata {
                    is_2d_axis_aligned,
                    is_2d_scale_offset,
                }
            )
        })
    }

    // Get a transform palette id for the given spatial node.
    // TODO(gw): In the future, it will be possible to specify
    //           a coordinate system id here, to allow retrieving
    //           transforms in the local space of a given spatial node.
    pub fn get_id(
        &mut self,
        from_index: SpatialNodeIndex,
        to_index: SpatialNodeIndex,
        spatial_tree: &SpatialTree,
    ) -> GpuTransformId {
        let index = self.get_index(
            from_index,
            to_index,
            None,
            false,
            spatial_tree,
        );

        let flags = self.metadata[index].flags();

        GpuTransformId((index as u32) | flags)
    }

    pub fn get_id_with_post_scale(
        &mut self,
        from_index: SpatialNodeIndex,
        to_index: SpatialNodeIndex,
        scale: f32,
        spatial_tree: &SpatialTree,
    ) -> GpuTransformId {
        let index = self.get_index(
            from_index,
            to_index,
            Some(scale),
            false,
            spatial_tree,
        );

        let flags = self.metadata[index].flags();

        GpuTransformId((index as u32) | flags)
    }

    pub fn get_id_with_pre_scale(
        &mut self,
        scale: f32,
        from_index: SpatialNodeIndex,
        to_index: SpatialNodeIndex,
        spatial_tree: &SpatialTree,
    ) -> GpuTransformId {
        let index = self.get_index(
            from_index,
            to_index,
            Some(scale),
            true,
            spatial_tree,
        );

        let flags = self.metadata[index].flags();

        GpuTransformId((index as u32) | flags)
    }

    pub fn get_custom(
        &mut self,
        transform: LayoutToPictureTransform,
    ) -> GpuTransformId {
        let is_2d_scale_offset = transform.is_2d_scale_translation();
        let is_axis_aligned = transform.preserves_2d_axis_alignment();
        let metadata = TransformMetadata {
            is_2d_scale_offset,
            is_2d_axis_aligned: is_axis_aligned,
        };
        let index = register_gpu_transform(
            &mut self.metadata,
            &mut self.transforms,
            transform,
            None,
            false,
            metadata,
        );

        GpuTransformId((index as u32) | metadata.flags())
    }
}

// Set the local -> world transform for a given spatial
// node in the transform palette.
fn register_gpu_transform(
    metadatas: &mut Vec<TransformMetadata>,
    transforms: &mut FrameVec<TransformData>,
    mut transform: LayoutToPictureTransform,
    scale: Option<f32>,
    pre_scale: bool,
    metadata: TransformMetadata,
) -> usize {
    if let Some(scale) = scale {
        if pre_scale {
            transform = transform.pre_scale(scale, scale, 1.0);
        } else {
            transform = transform.then_scale(scale, scale, 1.0);
        }
    }
    // TODO: refactor the calling code to not even try
    // registering a non-invertible transform.
    let inv_transform = transform
        .inverse()
        .unwrap_or_else(PictureToLayoutTransform::identity);

    let data = TransformData {
        transform,
        inv_transform,
    };

    let index = transforms.len();
    metadatas.push(metadata);
    transforms.push(data);

    index
}
