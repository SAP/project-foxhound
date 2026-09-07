/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use api::{ExternalImageHandler, ExternalImageSource, ExternalImageType};
use crate::device::{Device, ExternalTexture};
use crate::internal_types::{DeferredResolveIndex, FastHashMap};
use crate::prim_store::DeferredResolve;
use crate::device::query::GpuProfiler;
use super::gpu_buffer::GpuBufferF;

#[inline]
pub(super) fn update_deferred_resolves(
    external_image_handler: Option<&mut Box<dyn ExternalImageHandler>>,
    external_images: &mut FastHashMap<DeferredResolveIndex, ExternalTexture>,
    gpu_profiler: &mut GpuProfiler,
    device: &mut Device,
    deferred_resolves: &[DeferredResolve],
    gpu_buffer: &mut GpuBufferF,
) {
    if deferred_resolves.is_empty() {
        return;
    }

    let handler = external_image_handler.expect("Found external image, but no handler set!");

    for (i, deferred_resolve) in deferred_resolves.iter().enumerate() {
        gpu_profiler.place_marker("deferred resolve");
        let props = &deferred_resolve.image_properties;
        let ext_image = props
            .external_image
            .expect("BUG: Deferred resolves must be external images!");

        let image = handler.lock(ext_image.id, ext_image.channel_index, deferred_resolve.is_composited);
        let texture_target = match ext_image.image_type {
            ExternalImageType::TextureHandle(target) => target,
            ExternalImageType::Buffer => {
                panic!("not a suitable image type in update_deferred_resolves()");
            }
        };

        device.reset_state();

        let texture = match image.source {
            ExternalImageSource::NativeTexture(texture_id) => {
                ExternalTexture::new(
                    texture_id,
                    texture_target,
                    image.uv,
                    deferred_resolve.rendering,
                )
            }
            ExternalImageSource::Invalid => {
                warn!("Invalid ext-image");
                debug!(
                    "For ext_id:{:?}, channel:{}.",
                    ext_image.id,
                    ext_image.channel_index
                );
                ExternalTexture::new(
                    0,
                    texture_target,
                    image.uv,
                    deferred_resolve.rendering,
                )
            }
            ExternalImageSource::RawData(_) => {
                panic!("Raw external data is not expected for deferred resolves!");
            }
        };

        external_images.insert(DeferredResolveIndex(i as u32), texture);

        let addr = gpu_buffer.resolve_handle(deferred_resolve.handle);
        let index = addr.as_u32() as usize;
        gpu_buffer.data[index] = image.uv.to_array().into();
        gpu_buffer.data[index + 1] = [0f32; 4].into();
    }
}

#[inline]
pub(super) fn unlock_external_images(
    external_image_handler: Option<&mut Box<dyn ExternalImageHandler>>,
    external_images: &mut FastHashMap<DeferredResolveIndex, ExternalTexture>,
    deferred_resolves: &[DeferredResolve],
) {
    if !external_images.is_empty() {
        let handler = external_image_handler.expect("Found external image, but no handler set!");
        for (index, _) in external_images.drain() {
            let props = &deferred_resolves[index.0 as usize].image_properties;
            let ext_image = props
                .external_image
                .expect("BUG: Deferred resolves must be external images!");
            handler.unlock(ext_image.id, ext_image.channel_index);
        }
    }
}
