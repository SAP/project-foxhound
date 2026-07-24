/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use crate::{
    error::{error_to_string, ErrMsg, ErrorBuffer, ErrorBufferType, OwnedErrorBuffer},
    make_byte_buf,
    telemetry::build_telemetry_struct,
    wgpu_string, AdapterInformation, BufferMapResult, ByteBuf, CommandEncoderAction, DeviceAction,
    FfiSlice, Message, PipelineError, QueueWriteAction, QueueWriteDataSource, ServerMessage,
    ShaderModuleCompilationMessage, SwapChainId, TextureAction,
};

use nsstring::{nsACString, nsCString};

use wgc::id;
use wgc::{pipeline::CreateShaderModuleError, resource::BufferAccessError};
#[allow(unused_imports)]
use wgh::Instance;
use wgt::error::{ErrorType, WebGpuError};

use std::borrow::Cow;
#[allow(unused_imports)]
use std::mem;
#[cfg(target_os = "linux")]
use std::os::fd::{FromRawFd, IntoRawFd, OwnedFd, RawFd};
use std::os::raw::c_char;
use std::ptr;
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::Duration;

#[allow(unused_imports)]
use std::ffi::CString;

#[cfg(target_os = "windows")]
use windows::Win32::{Foundation, Graphics::Direct3D12};

#[cfg(target_os = "linux")]
use ash::{khr, vk};

// The seemingly redundant u64 suffixes help cbindgen with generating the right C++ code.
// See https://github.com/mozilla/cbindgen/issues/849.

/// We limit the size of buffer allocations for stability reason.
/// We can reconsider this limit in the future. Note that some drivers (mesa for example),
/// have issues when the size of a buffer, mapping or copy command does not fit into a
/// signed 32 bits integer, so beyond a certain size, large allocations will need some form
/// of driver allow/blocklist.
pub const MAX_BUFFER_SIZE: wgt::BufferAddress = 1u64 << 30u64;
const MAX_BUFFER_SIZE_U32: u32 = MAX_BUFFER_SIZE as u32;

// Mesa has issues with height/depth that don't fit in a 16 bits signed integers.
const MAX_TEXTURE_EXTENT: u32 = std::i16::MAX as u32;
// We have to restrict the number of bindings for any given resource type so that
// the sum of these limits multiplied by the number of shader stages fits
// maxBindingsPerBindGroup (1000). This restriction is arbitrary and is likely to
// change eventually. See github.com/gpuweb/gpuweb/pull/4484
// For now it's impractical for users to have very large numbers of bindings so this
// limit should not be too restrictive until we add support for a bindless API.
// Then we may have to ignore the spec or get it changed.
const MAX_BINDINGS_PER_RESOURCE_TYPE: u32 = 64;

#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
fn emit_critical_invalid_note(what: &'static str) {
    // SAFETY: We ensure that the pointer provided is not null.
    let msg = CString::new(format!("{what} is invalid")).unwrap();
    unsafe { gfx_critical_note(msg.as_ptr()) }
}

fn restrict_limits(limits: wgt::Limits) -> wgt::Limits {
    wgt::Limits {
        max_buffer_size: limits.max_buffer_size.min(MAX_BUFFER_SIZE),
        max_texture_dimension_1d: limits.max_texture_dimension_1d.min(MAX_TEXTURE_EXTENT),
        max_texture_dimension_2d: limits.max_texture_dimension_2d.min(MAX_TEXTURE_EXTENT),
        max_texture_dimension_3d: limits.max_texture_dimension_3d.min(MAX_TEXTURE_EXTENT),
        max_sampled_textures_per_shader_stage: limits
            .max_sampled_textures_per_shader_stage
            .min(MAX_BINDINGS_PER_RESOURCE_TYPE),
        max_samplers_per_shader_stage: limits
            .max_samplers_per_shader_stage
            .min(MAX_BINDINGS_PER_RESOURCE_TYPE),
        max_storage_textures_per_shader_stage: limits
            .max_storage_textures_per_shader_stage
            .min(MAX_BINDINGS_PER_RESOURCE_TYPE),
        max_uniform_buffers_per_shader_stage: limits
            .max_uniform_buffers_per_shader_stage
            .min(MAX_BINDINGS_PER_RESOURCE_TYPE),
        max_storage_buffers_per_shader_stage: limits
            .max_storage_buffers_per_shader_stage
            .min(MAX_BINDINGS_PER_RESOURCE_TYPE),
        max_uniform_buffer_binding_size: limits
            .max_uniform_buffer_binding_size
            .min(MAX_BUFFER_SIZE_U32),
        max_storage_buffer_binding_size: limits
            .max_storage_buffer_binding_size
            .min(MAX_BUFFER_SIZE_U32),
        max_non_sampler_bindings: 500_000,
        ..limits
    }
}

/// Opaque pointer to `mozilla::webgpu::WebGPUParent`.
#[derive(Debug, Clone, Copy)]
#[repr(transparent)]
pub struct WebGPUParentPtr(*mut core::ffi::c_void);

// hide wgc's global in private
pub struct Global {
    owner: WebGPUParentPtr,
    global: wgc::global::Global,
}

impl std::ops::Deref for Global {
    type Target = wgc::global::Global;
    fn deref(&self) -> &Self::Target {
        &self.global
    }
}

#[no_mangle]
pub extern "C" fn wgpu_server_new(owner: WebGPUParentPtr) -> *mut Global {
    log::info!("Initializing WGPU server");
    let backends_pref = static_prefs::pref!("dom.webgpu.wgpu-backend").to_string();
    let backends = if backends_pref.is_empty() {
        #[cfg(windows)]
        {
            wgt::Backends::DX12
        }
        #[cfg(not(windows))]
        {
            wgt::Backends::PRIMARY
        }
    } else {
        log::info!(
            "Selecting backends based on dom.webgpu.wgpu-backend pref: {:?}",
            backends_pref
        );
        wgt::Backends::from_comma_list(&backends_pref)
    };

    let mut instance_flags = wgt::InstanceFlags::from_build_config().with_env();
    if !static_prefs::pref!("dom.webgpu.hal-labels") {
        instance_flags.insert(wgt::InstanceFlags::DISCARD_HAL_LABELS);
    }

    let dx12_shader_compiler = wgt::Dx12Compiler::DynamicDxc {
        dxc_path: "dxcompiler.dll".into(),
        max_shader_model: wgt::DxcShaderModel::V6_6,
    };

    let global = wgc::global::Global::new(
        "wgpu",
        wgt::InstanceDescriptor {
            backends,
            flags: instance_flags,
            backend_options: wgt::BackendOptions {
                gl: wgt::GlBackendOptions {
                    gles_minor_version: wgt::Gles3MinorVersion::Automatic,
                    fence_behavior: wgt::GlFenceBehavior::Normal,
                },
                dx12: wgt::Dx12BackendOptions {
                    shader_compiler: dx12_shader_compiler,
                    ..Default::default()
                },
                noop: wgt::NoopBackendOptions { enable: false },
            },
            memory_budget_thresholds: wgt::MemoryBudgetThresholds {
                for_resource_creation: Some(95),
                for_device_loss: Some(99),
            },
            display: None,
        },
        Some(build_telemetry_struct()),
    );
    let global = Global { owner, global };
    Box::into_raw(Box::new(global))
}

/// # Safety
///
/// This function is unsafe because improper use may lead to memory
/// problems. For example, a double-free may occur if the function is called
/// twice on the same raw pointer.
#[no_mangle]
pub unsafe extern "C" fn wgpu_server_delete(global: *mut Global) {
    log::info!("Terminating WGPU server");
    let _ = Box::from_raw(global);
}

#[no_mangle]
pub extern "C" fn wgpu_server_poll_all_devices(global: &Global, force_wait: bool) {
    global.poll_all_devices(force_wait).unwrap();
}

#[no_mangle]
pub extern "C" fn wgpu_server_device_poll(
    global: &Global,
    device_id: id::DeviceId,
    force_wait: bool,
) {
    let maintain = if force_wait {
        wgt::PollType::Wait {
            submission_index: None,
            timeout: Some(Duration::from_secs(60)),
        }
    } else {
        wgt::PollType::Poll
    };
    global.device_poll(device_id, maintain).unwrap();
}

#[cfg(target_os = "macos")]
fn ns_os_version_at_least(
    lhs: &objc2_foundation::NSOperatingSystemVersion,
    rhs_mac_version: (isize, isize),
    rhs_ios_version: (isize, isize),
    is_mac: bool,
) -> bool {
    let rhs = if is_mac {
        rhs_mac_version
    } else {
        rhs_ios_version
    };

    lhs.majorVersion
        .cmp(&rhs.0)
        .then_with(|| lhs.minorVersion.cmp(&rhs.1))
        .is_ge()
}

#[allow(unreachable_code)]
#[allow(unused_variables)]
fn support_use_shared_texture_in_swap_chain(
    global: &Global,
    self_id: id::AdapterId,
    backend: wgt::Backend,
    is_hardware: bool,
) -> bool {
    #[cfg(target_os = "windows")]
    {
        if backend != wgt::Backend::Dx12 {
            log::info!(concat!(
                "WebGPU: disabling SharedTexture swapchain: \n",
                "wgpu backend is not Dx12"
            ));
            return false;
        }
        if !is_hardware {
            log::info!(concat!(
                "WebGPU: disabling SharedTexture swapchain: \n",
                "Dx12 backend is not hardware"
            ));
            return false;
        }
        return true;
    }

    #[cfg(target_os = "linux")]
    {
        if backend != wgt::Backend::Vulkan {
            log::info!(concat!(
                "WebGPU: disabling SharedTexture swapchain: \n",
                "wgpu backend is not Vulkan"
            ));
            return false;
        }

        let Some(hal_adapter) = (unsafe { global.adapter_as_hal::<wgc::api::Vulkan>(self_id) })
        else {
            unreachable!("given adapter ID was actually for a different backend");
        };

        let capabilities = hal_adapter.physical_device_capabilities();
        static REQUIRED: &[&'static std::ffi::CStr] = &[
            khr::external_memory_fd::NAME,
            ash::ext::external_memory_dma_buf::NAME,
            ash::ext::image_drm_format_modifier::NAME,
            khr::external_semaphore_fd::NAME,
        ];
        let all_extensions_supported = REQUIRED.iter().all(|&extension| {
            let supported = capabilities.supports_extension(extension);
            if !supported {
                log::info!(
                    concat!(
                        "WebGPU: disabling SharedTexture swapchain: \n",
                        "Vulkan extension not supported: {:?}",
                    ),
                    extension.to_string_lossy()
                );
            }
            supported
        });
        if !all_extensions_supported {
            return false;
        }

        // We need to be able to export the semaphore that gets signalled
        // when the GPU is done drawing on the ExternalTextureDMABuf.
        let semaphore_info = vk::PhysicalDeviceExternalSemaphoreInfo::default()
            .handle_type(vk::ExternalSemaphoreHandleTypeFlags::OPAQUE_FD);
        let mut semaphore_props = vk::ExternalSemaphoreProperties::default();
        unsafe {
            hal_adapter
                .shared_instance()
                .raw_instance()
                .get_physical_device_external_semaphore_properties(
                    hal_adapter.raw_physical_device(),
                    &semaphore_info,
                    &mut semaphore_props,
                );
        }
        if !semaphore_props
            .external_semaphore_features
            .contains(vk::ExternalSemaphoreFeatureFlags::EXPORTABLE)
        {
            log::info!(
                "WebGPU: disabling ExternalTexture swapchain: \n\
                        device can't export opaque file descriptor semaphores"
            );
            return false;
        }

        return true;
    }

    #[cfg(target_os = "macos")]
    {
        use objc2_foundation::NSProcessInfo;

        if backend != wgt::Backend::Metal {
            log::info!(concat!(
                "WebGPU: disabling SharedTexture swapchain: \n",
                "wgpu backend is not Metal"
            ));
            return false;
        }
        if !is_hardware {
            log::info!(concat!(
                "WebGPU: disabling SharedTexture swapchain: \n",
                "Metal backend is not hardware"
            ));
            return false;
        }

        let version = NSProcessInfo::processInfo().operatingSystemVersion();

        if !ns_os_version_at_least(&version, (10, 14), (12, 0), /* os_is_mac */ true) {
            log::info!(concat!(
                "WebGPU: disabling SharedTexture swapchain:\n",
                "operating system version is not at least 10.14 (macOS) or 12.0 (iOS)\n",
                "shared event not supported"
            ));
            return false;
        }

        return true;
    }

    false
}

static TRACE_IDX: AtomicU32 = AtomicU32::new(0);

unsafe fn adapter_request_device(
    global: &Global,
    self_id: id::AdapterId,
    mut desc: wgc::device::DeviceDescriptor,
    new_device_id: id::DeviceId,
    new_queue_id: id::QueueId,
) -> Option<String> {
    if let wgt::Trace::Directory(ref path) = desc.trace {
        log::warn!(
            concat!(
                "`DeviceDescriptor` from child process ",
                "should not request wgpu trace path, ",
                "but it did request `{}`"
            ),
            path.display()
        );
    }
    desc.trace = wgt::Trace::Off;
    if let Some(env_dir) = std::env::var_os("WGPU_TRACE") {
        let mut path = std::path::PathBuf::from(env_dir);
        let idx = TRACE_IDX.fetch_add(1, Ordering::Relaxed);
        path.push(idx.to_string());

        if std::fs::create_dir_all(&path).is_err() {
            log::warn!("Failed to create directory {:?} for wgpu recording.", path);
        } else {
            desc.trace = wgt::Trace::Directory(path);
        }
    }

    if desc.experimental_features.is_enabled() {
        log::warn!(
            concat!(
                "`DeviceDescriptor` from child process ",
                "should not enable experimental features, ",
                "but it did request {:?}"
            ),
            desc.experimental_features
        );
    }

    if wgpu_parent_is_external_texture_enabled() {
        // Enable features used for external texture support, if available. We
        // avoid adding unsupported features to required_features so that we
        // can still create a device in their absence, and will only fail when
        // performing an operation that actually requires the feature.
        for feature in [
            wgt::Features::EXTERNAL_TEXTURE,
            wgt::Features::TEXTURE_FORMAT_NV12,
            wgt::Features::TEXTURE_FORMAT_P010,
            wgt::Features::TEXTURE_FORMAT_16BIT_NORM,
        ] {
            if global.adapter_features(self_id).contains(feature) {
                desc.required_features.insert(feature);
            }
        }
    }

    // TODO: in https://github.com/gfx-rs/wgpu/pull/3626/files#diff-033343814319f5a6bd781494692ea626f06f6c3acc0753a12c867b53a646c34eR97
    // which introduced the queue id parameter, the queue id is also the device id. I don't know how applicable this is to
    // other situations (this one in particular).

    #[cfg(target_os = "linux")]
    {
        let hal_adapter = global.adapter_as_hal::<wgc::api::Vulkan>(self_id);

        let support_dma_buf = hal_adapter.as_ref().is_some_and(|hal_adapter| {
            let capabilities = hal_adapter.physical_device_capabilities();

            capabilities.supports_extension(khr::external_memory_fd::NAME)
                && capabilities.supports_extension(ash::ext::external_memory_dma_buf::NAME)
                && capabilities.supports_extension(ash::ext::image_drm_format_modifier::NAME)
                && capabilities.supports_extension(khr::external_semaphore_fd::NAME)
        });

        match (hal_adapter, support_dma_buf) {
            (None, _) => {
                emit_critical_invalid_note("Vulkan adapter");
            }
            (Some(_), false) => {}
            (Some(hal_adapter), true) => {
                let mut enabled_extensions =
                    hal_adapter.required_device_extensions(desc.required_features);
                enabled_extensions.push(khr::external_memory_fd::NAME);
                enabled_extensions.push(ash::ext::external_memory_dma_buf::NAME);
                enabled_extensions.push(ash::ext::image_drm_format_modifier::NAME);
                enabled_extensions.push(khr::external_semaphore_fd::NAME);

                let mut enabled_phd_features = hal_adapter
                    .physical_device_features(&enabled_extensions, desc.required_features);

                let raw_instance = hal_adapter.shared_instance().raw_instance();
                let raw_physical_device = hal_adapter.raw_physical_device();

                let queue_family_index = raw_instance
                    .get_physical_device_queue_family_properties(raw_physical_device)
                    .into_iter()
                    .enumerate()
                    .find_map(|(queue_family_index, info)| {
                        if info.queue_flags.contains(vk::QueueFlags::GRAPHICS) {
                            Some(queue_family_index as u32)
                        } else {
                            None
                        }
                    });

                let Some(queue_family_index) = queue_family_index else {
                    let msg = c"Vulkan device has no graphics queue";
                    gfx_critical_note(msg.as_ptr());
                    return Some(format!("Internal Error: Failed to create ash::Device"));
                };

                let family_info = vk::DeviceQueueCreateInfo::default()
                    .queue_family_index(queue_family_index)
                    .queue_priorities(&[1.0]);
                let family_infos = [family_info];

                let str_pointers = enabled_extensions
                    .iter()
                    .map(|&s| {
                        // Safe because `enabled_extensions` entries have static lifetime.
                        s.as_ptr()
                    })
                    .collect::<Vec<_>>();

                let pre_info = vk::DeviceCreateInfo::default()
                    .queue_create_infos(&family_infos)
                    .enabled_extension_names(&str_pointers);
                let info = enabled_phd_features.add_to_device_create(pre_info);

                let raw_device = match raw_instance.create_device(raw_physical_device, &info, None)
                {
                    Err(err) => {
                        let msg =
                            CString::new(format!("create_device() failed: {:?}", err)).unwrap();
                        gfx_critical_note(msg.as_ptr());
                        return Some(format!("Internal Error: Failed to create ash::Device"));
                    }
                    Ok(raw_device) => raw_device,
                };

                let hal_device = match hal_adapter.device_from_raw(
                    raw_device,
                    None,
                    &enabled_extensions,
                    desc.required_features,
                    &desc.memory_hints,
                    family_info.queue_family_index,
                    0,
                ) {
                    Err(err) => {
                        let msg =
                            CString::new(format!("device_from_raw() failed: {:?}", err)).unwrap();
                        gfx_critical_note(msg.as_ptr());
                        return Some(format!("Internal Error: Failed to create ash::Device"));
                    }
                    Ok(hal_device) => hal_device,
                };

                let res = global.create_device_from_hal(
                    self_id,
                    hal_device.into(),
                    &desc,
                    Some(new_device_id),
                    Some(new_queue_id),
                );
                if let Err(err) = res {
                    return Some(format!("{err}"));
                }
                return None;
            }
        }
    }

    let res =
        global.adapter_request_device(self_id, &desc, Some(new_device_id), Some(new_queue_id));
    if let Err(err) = res {
        return Some(format!("{err}"));
    } else {
        return None;
    }
}

#[repr(C)]
pub struct DeviceLostClosure {
    pub callback: unsafe extern "C" fn(user_data: *mut u8, reason: u8, message: *const c_char),
    pub cleanup_callback: unsafe extern "C" fn(user_data: *mut u8),
    pub user_data: *mut u8,
}
unsafe impl Send for DeviceLostClosure {}

impl DeviceLostClosure {
    fn call(self, reason: wgt::DeviceLostReason, message: String) {
        // Ensure message is structured as a null-terminated C string. It only
        // needs to live as long as the callback invocation.
        let message = std::ffi::CString::new(message).unwrap();
        unsafe {
            (self.callback)(self.user_data, reason as u8, message.as_ptr());
        }
        core::mem::forget(self);
    }
}

impl Drop for DeviceLostClosure {
    fn drop(&mut self) {
        unsafe {
            (self.cleanup_callback)(self.user_data);
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_set_device_lost_callback(
    global: &Global,
    self_id: id::DeviceId,
    closure: DeviceLostClosure,
) {
    let closure = Box::new(move |reason, message| closure.call(reason, message));
    global.device_set_device_lost_closure(self_id, closure);
}

impl ShaderModuleCompilationMessage {
    fn new(error: &CreateShaderModuleError, source: &str) -> Self {
        // The WebGPU spec says that if the message doesn't point to a particular position in
        // the source, the line number, position, offset and lengths should be zero.
        let line_number;
        let line_pos;
        let utf16_offset;
        let utf16_length;

        let location = match error {
            CreateShaderModuleError::Parsing(e) => e.inner.location(source),
            CreateShaderModuleError::Validation(e) => e.inner.location(source),
            _ => None,
        };

        if let Some(location) = location {
            let len_utf16 = |s: &str| s.chars().map(|c| c.len_utf16() as u64).sum();
            let start = location.offset as usize;
            let end = start + location.length as usize;
            utf16_offset = len_utf16(&source[0..start]);
            utf16_length = len_utf16(&source[start..end]);

            line_number = location.line_number as u64;
            // Naga reports a `line_pos` using UTF-8 bytes, so we cannot use it.
            let line_start = source[0..start].rfind('\n').map(|pos| pos + 1).unwrap_or(0);
            line_pos = len_utf16(&source[line_start..start]) + 1;
        } else {
            line_number = 0;
            line_pos = 0;
            utf16_offset = 0;
            utf16_length = 0;
        }

        let message = error.to_string();

        Self {
            line_number,
            line_pos,
            utf16_offset,
            utf16_length,
            message,
        }
    }
}

#[no_mangle]
pub extern "C" fn wgpu_server_device_create_buffer(
    global: &Global,
    device_id: id::DeviceId,
    buffer_id: id::BufferId,
    label: Option<&nsACString>,
    size: wgt::BufferAddress,
    usage: u32,
    mapped_at_creation: bool,
    mut error_buf: ErrorBuffer,
) {
    let utf8_label = label.map(|utf16| utf16.to_string());
    let label = utf8_label.as_ref().map(|s| Cow::from(&s[..]));
    let usage = wgt::BufferUsages::from_bits_retain(usage);

    let desc = wgc::resource::BufferDescriptor {
        label,
        size,
        usage,
        mapped_at_creation,
    };

    let (_, error) = global.device_create_buffer(device_id, &desc, Some(buffer_id));
    if let Some(err) = error {
        error_buf.init(err, device_id);
    }
}

/// The status code provided to the buffer mapping closure.
///
/// This is very similar to `BufferAccessResult`, except that this is FFI-friendly.
#[repr(C)]
pub enum BufferMapAsyncStatus {
    /// The Buffer is successfully mapped, `get_mapped_range` can be called.
    ///
    /// All other variants of this enum represent failures to map the buffer.
    Success,
    /// The buffer is already mapped.
    ///
    /// While this is treated as an error, it does not prevent mapped range from being accessed.
    AlreadyMapped,
    /// Mapping was already requested.
    MapAlreadyPending,
    /// An unknown error.
    Error,
    /// The context is Lost.
    ContextLost,
    /// The buffer is in an invalid state.
    Invalid,
    /// The range isn't fully contained in the buffer.
    InvalidRange,
    /// The range isn't properly aligned.
    InvalidAlignment,
    /// Incompatible usage flags.
    InvalidUsageFlags,
}

impl From<Result<(), BufferAccessError>> for BufferMapAsyncStatus {
    fn from(result: Result<(), BufferAccessError>) -> Self {
        match result {
            Ok(_) => BufferMapAsyncStatus::Success,
            Err(BufferAccessError::Device(_)) => BufferMapAsyncStatus::ContextLost,
            Err(BufferAccessError::InvalidResource(_))
            | Err(BufferAccessError::DestroyedResource(_)) => BufferMapAsyncStatus::Invalid,
            Err(BufferAccessError::AlreadyMapped) => BufferMapAsyncStatus::AlreadyMapped,
            Err(BufferAccessError::MapAlreadyPending) => BufferMapAsyncStatus::MapAlreadyPending,
            Err(BufferAccessError::MissingBufferUsage(_)) => {
                BufferMapAsyncStatus::InvalidUsageFlags
            }
            Err(BufferAccessError::UnalignedRange)
            | Err(BufferAccessError::UnalignedRangeSize { .. })
            | Err(BufferAccessError::UnalignedOffset { .. }) => {
                BufferMapAsyncStatus::InvalidAlignment
            }
            Err(BufferAccessError::OutOfBoundsUnderrun { .. })
            | Err(BufferAccessError::OutOfBoundsOverrun { .. })
            | Err(BufferAccessError::NegativeRange { .. }) => BufferMapAsyncStatus::InvalidRange,
            Err(BufferAccessError::Failed)
            | Err(BufferAccessError::NotMapped)
            | Err(BufferAccessError::MapAborted) => BufferMapAsyncStatus::Error,
            Err(_) => BufferMapAsyncStatus::Invalid,
        }
    }
}

#[repr(C)]
pub struct BufferMapClosure {
    pub callback: unsafe extern "C" fn(user_data: *mut u8, status: BufferMapAsyncStatus),
    pub user_data: *mut u8,
}
unsafe impl Send for BufferMapClosure {}

/// # Safety
///
/// Callers are responsible for ensuring `closure` is well-formed.
#[no_mangle]
pub unsafe extern "C" fn wgpu_server_buffer_map(
    global: &Global,
    device_id: id::DeviceId,
    buffer_id: id::BufferId,
    start: wgt::BufferAddress,
    size: wgt::BufferAddress,
    map_mode: wgc::device::HostMap,
    closure: BufferMapClosure,
    mut error_buf: ErrorBuffer,
) {
    let closure = Box::new(move |result| {
        let _ = &closure;
        (closure.callback)(closure.user_data, BufferMapAsyncStatus::from(result))
    });
    let operation = wgc::resource::BufferMapOperation {
        host: map_mode,
        callback: Some(closure),
    };
    let result = global.buffer_map_async(buffer_id, start, Some(size), operation);

    if let Err(error) = result {
        error_buf.init(error, device_id);
    }
}

#[repr(C)]
pub struct MappedBufferSlice {
    pub ptr: *mut u8,
    pub length: u64,
}

/// # Safety
///
/// This function is unsafe as there is no guarantee that the given pointer is
/// valid for `size` elements.
#[no_mangle]
pub unsafe extern "C" fn wgpu_server_buffer_get_mapped_range(
    global: &Global,
    device_id: id::DeviceId,
    buffer_id: id::BufferId,
    start: wgt::BufferAddress,
    size: wgt::BufferAddress,
    mut error_buf: ErrorBuffer,
) -> MappedBufferSlice {
    let result = global.buffer_get_mapped_range(buffer_id, start, Some(size));

    let (ptr, length) = result
        .map(|(ptr, len)| (ptr.as_ptr(), len))
        .unwrap_or_else(|error| {
            error_buf.init(error, device_id);
            (std::ptr::null_mut(), 0)
        });
    MappedBufferSlice { ptr, length }
}

#[no_mangle]
pub extern "C" fn wgpu_server_buffer_unmap(
    global: &Global,
    device_id: id::DeviceId,
    buffer_id: id::BufferId,
    mut error_buf: ErrorBuffer,
) {
    if let Err(e) = global.buffer_unmap(buffer_id) {
        match e {
            // NOTE: This is presumed by CTS test cases, and was even formally specified in the
            // WebGPU spec. previously, but this doesn't seem formally specified now. :confused:
            //
            // TODO: upstream this; see <https://bugzilla.mozilla.org/show_bug.cgi?id=1842297>.
            BufferAccessError::InvalidResource(_) => (),
            other => error_buf.init(other, device_id),
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_device_create_texture(
    global: &Global,
    device_id: id::DeviceId,
    id_in: id::TextureId,
    desc: &wgt::TextureDescriptor<Option<&nsACString>, crate::FfiSlice<wgt::TextureFormat>>,
    mut error_buf: ErrorBuffer,
) {
    let desc = desc.map_label_and_view_formats(|l| wgpu_string(*l), |v| v.as_slice().to_vec());
    let (_, err) = global.device_create_texture(device_id, &desc, Some(id_in));
    if let Some(err) = err {
        error_buf.init(err, device_id);
    }
}

#[no_mangle]
pub extern "C" fn wgpu_server_texture_destroy(global: &Global, id: id::TextureId) {
    global.texture_destroy(id);
}

#[no_mangle]
pub extern "C" fn wgpu_server_texture_drop(global: &Global, id: id::TextureId) {
    global.texture_drop(id);
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_texture_create_view(
    global: &Global,
    device_id: id::DeviceId,
    texture_id: id::TextureId,
    id_in: id::TextureViewId,
    desc: &crate::TextureViewDescriptor,
    mut error_buf: ErrorBuffer,
) {
    let desc = wgc::resource::TextureViewDescriptor {
        label: wgpu_string(desc.label),
        format: desc.format.cloned(),
        dimension: desc.dimension.cloned(),
        range: wgt::ImageSubresourceRange {
            aspect: desc.aspect,
            base_mip_level: desc.base_mip_level,
            mip_level_count: desc.mip_level_count.map(|ptr| *ptr),
            base_array_layer: desc.base_array_layer,
            array_layer_count: desc.array_layer_count.map(|ptr| *ptr),
        },
        usage: Some(desc.usage),
    };
    let (_, err) = global.texture_create_view(texture_id, &desc, Some(id_in));
    if let Some(err) = err {
        error_buf.init(err, device_id);
    }
}

#[no_mangle]
pub extern "C" fn wgpu_server_texture_view_drop(global: &Global, id: id::TextureViewId) {
    global.texture_view_drop(id).unwrap();
}

#[allow(unused_variables)]
#[no_mangle]
#[cfg(target_os = "windows")]
pub extern "C" fn wgpu_server_get_device_fence_handle(
    global: &Global,
    device_id: id::DeviceId,
) -> *mut core::ffi::c_void {
    unsafe {
        let Some(dx12_device) = global
            .device_as_hal::<wgc::api::Dx12>(device_id)
            .map(|device| device.raw_device().clone())
        else {
            return ptr::null_mut();
        };

        let Some(dx12_fence) = global
            .device_fence_as_hal::<wgc::api::Dx12>(device_id)
            .map(|fence| fence.raw_fence().clone())
        else {
            return ptr::null_mut();
        };

        match dx12_device.CreateSharedHandle(&dx12_fence, None, Foundation::GENERIC_ALL.0, None) {
            Ok(handle) => handle.0,
            Err(_) => ptr::null_mut(),
        }
    }
}

#[derive(Debug)]
#[repr(C)]
pub struct DMABufInfo {
    pub is_valid: bool,
    pub modifier: u64,
    pub plane_count: u32,
    pub offsets: [u64; 3],
    pub strides: [u64; 3],
}

#[derive(Debug)]
#[cfg(target_os = "linux")]
pub struct VkImageHandle {
    pub device: vk::Device,
    pub image: vk::Image,
    pub memory: vk::DeviceMemory,
    pub memory_size: u64,
    pub memory_type_index: u32,
    pub modifier: u64,
    pub layouts: Vec<vk::SubresourceLayout>,
}

#[cfg(target_os = "linux")]
impl VkImageHandle {
    fn destroy(&self, global: &Global, device_id: id::DeviceId) {
        unsafe {
            let Some(hal_device) = global.device_as_hal::<wgc::api::Vulkan>(device_id) else {
                return;
            };

            let device = hal_device.raw_device();

            (device.fp_v1_0().destroy_image)(self.device, self.image, ptr::null());
            (device.fp_v1_0().free_memory)(self.device, self.memory, ptr::null());
        };
    }
}

#[no_mangle]
#[cfg(target_os = "linux")]
pub extern "C" fn wgpu_vkimage_create_with_dma_buf(
    global: &Global,
    device_id: id::DeviceId,
    width: u32,
    height: u32,
    out_memory_size: *mut u64,
) -> *mut VkImageHandle {
    unsafe {
        let Some(hal_device) = global.device_as_hal::<wgc::api::Vulkan>(device_id) else {
            emit_critical_invalid_note("Vulkan device");
            return ptr::null_mut();
        };

        let device = hal_device.raw_device();
        let physical_device = hal_device.raw_physical_device();
        let instance = hal_device.shared_instance().raw_instance();

        let count = {
            let mut drm_format_modifier_props_list =
                vk::DrmFormatModifierPropertiesListEXT::default();
            let mut format_properties_2 =
                vk::FormatProperties2::default().push_next(&mut drm_format_modifier_props_list);

            instance.get_physical_device_format_properties2(
                physical_device,
                vk::Format::B8G8R8A8_UNORM,
                &mut format_properties_2,
            );
            drm_format_modifier_props_list.drm_format_modifier_count
        };

        if count == 0 {
            let msg = c"get_physical_device_format_properties2() failed";
            gfx_critical_note(msg.as_ptr());
            return ptr::null_mut();
        }

        let mut modifier_props =
            vec![vk::DrmFormatModifierPropertiesEXT::default(); count as usize];

        let mut drm_format_modifier_props_list = vk::DrmFormatModifierPropertiesListEXT::default()
            .drm_format_modifier_properties(&mut modifier_props);
        let mut format_properties_2 =
            vk::FormatProperties2::default().push_next(&mut drm_format_modifier_props_list);

        instance.get_physical_device_format_properties2(
            physical_device,
            vk::Format::B8G8R8A8_UNORM,
            &mut format_properties_2,
        );

        let mut usage_flags = vk::ImageUsageFlags::empty();
        usage_flags |= vk::ImageUsageFlags::COLOR_ATTACHMENT;

        modifier_props.retain(|modifier_prop| {
            let support = is_dmabuf_supported(
                instance,
                physical_device,
                vk::Format::B8G8R8A8_UNORM,
                modifier_prop.drm_format_modifier,
                usage_flags,
            );
            support
        });

        if modifier_props.is_empty() {
            let msg = c"format not supported for dmabuf import";
            gfx_critical_note(msg.as_ptr());
            return ptr::null_mut();
        }

        let modifiers: Vec<u64> = modifier_props
            .iter()
            .map(|modifier_prop| modifier_prop.drm_format_modifier)
            .collect();

        let mut modifier_list =
            vk::ImageDrmFormatModifierListCreateInfoEXT::default().drm_format_modifiers(&modifiers);

        let extent = vk::Extent3D {
            width,
            height,
            depth: 1,
        };

        let mut external_image_create_info = vk::ExternalMemoryImageCreateInfo::default()
            .handle_types(vk::ExternalMemoryHandleTypeFlags::DMA_BUF_EXT);

        let mut export_memory_alloc_info = vk::ExportMemoryAllocateInfo::default()
            .handle_types(vk::ExternalMemoryHandleTypeFlags::DMA_BUF_EXT);

        let flags = vk::ImageCreateFlags::empty();

        let vk_info = vk::ImageCreateInfo::default()
            .flags(flags)
            .image_type(vk::ImageType::TYPE_2D)
            // Bug 1971883: Rather than hard-coding this format, we should use
            // whatever format was negotiated between `GPUCanvasContext.configure`
            // and the GPU process.
            .format(vk::Format::B8G8R8A8_UNORM)
            .extent(extent)
            .mip_levels(1)
            .array_layers(1)
            .samples(vk::SampleCountFlags::TYPE_1)
            .tiling(vk::ImageTiling::DRM_FORMAT_MODIFIER_EXT)
            .usage(usage_flags)
            .sharing_mode(vk::SharingMode::EXCLUSIVE)
            .initial_layout(vk::ImageLayout::UNDEFINED)
            .push_next(&mut modifier_list)
            .push_next(&mut external_image_create_info);

        let image = match device.create_image(&vk_info, None) {
            Err(err) => {
                let msg = CString::new(format!("create_image() failed: {:?}", err)).unwrap();
                gfx_critical_note(msg.as_ptr());
                return ptr::null_mut();
            }
            Ok(image) => image,
        };

        let mut image_modifier_properties = vk::ImageDrmFormatModifierPropertiesEXT::default();
        let image_drm_format_modifier =
            ash::ext::image_drm_format_modifier::Device::new(instance, device);
        let ret = image_drm_format_modifier
            .get_image_drm_format_modifier_properties(image, &mut image_modifier_properties);
        if ret.is_err() {
            let msg = CString::new(format!(
                "get_image_drm_format_modifier_properties() failed: {:?}",
                ret
            ))
            .unwrap();
            gfx_critical_note(msg.as_ptr());
            return ptr::null_mut();
        }

        let memory_req = device.get_image_memory_requirements(image);

        let mem_properties = instance.get_physical_device_memory_properties(physical_device);

        let index = mem_properties
            .memory_types
            .iter()
            .enumerate()
            .position(|(i, t)| {
                ((1 << i) & memory_req.memory_type_bits) != 0
                    && t.property_flags
                        .contains(vk::MemoryPropertyFlags::DEVICE_LOCAL)
            });

        let Some(index) = index else {
            let msg = c"Failed to get DEVICE_LOCAL memory index";
            gfx_critical_note(msg.as_ptr());
            return ptr::null_mut();
        };

        let mut dedicated_memory_info = vk::MemoryDedicatedAllocateInfo::default().image(image);

        let memory_allocate_info = vk::MemoryAllocateInfo::default()
            .allocation_size(memory_req.size)
            .memory_type_index(index as u32)
            .push_next(&mut dedicated_memory_info)
            .push_next(&mut export_memory_alloc_info);

        let memory = match device.allocate_memory(&memory_allocate_info, None) {
            Err(err) => {
                let msg = CString::new(format!("allocate_memory() failed: {:?}", err)).unwrap();
                gfx_critical_note(msg.as_ptr());
                return ptr::null_mut();
            }
            Ok(memory) => memory,
        };

        let result = device.bind_image_memory(image, memory, /* offset */ 0);
        if result.is_err() {
            let msg = CString::new(format!("bind_image_memory() failed: {:?}", result)).unwrap();
            gfx_critical_note(msg.as_ptr());
            return ptr::null_mut();
        }

        *out_memory_size = memory_req.size;

        let modifier_prop = modifier_props
            .iter()
            .find(|prop| prop.drm_format_modifier == image_modifier_properties.drm_format_modifier);
        let Some(modifier_prop) = modifier_prop else {
            let msg = c"failed to find modifier_prop";
            gfx_critical_note(msg.as_ptr());
            return ptr::null_mut();
        };

        let plane_count = modifier_prop.drm_format_modifier_plane_count;

        let mut layouts = Vec::new();
        for i in 0..plane_count {
            // VUID-vkGetImageSubresourceLayout-tiling-09433: For
            // `DMA_BUF` images, the planes must be identified using the
            // `MEMORY_PLANE_i_EXT bits, not the `PLANE_i` bits.
            let flag = match i {
                0 => vk::ImageAspectFlags::MEMORY_PLANE_0_EXT,
                1 => vk::ImageAspectFlags::MEMORY_PLANE_1_EXT,
                2 => vk::ImageAspectFlags::MEMORY_PLANE_2_EXT,
                _ => unreachable!(),
            };
            let subresource = vk::ImageSubresource::default().aspect_mask(flag);
            let layout = device.get_image_subresource_layout(image, subresource);
            layouts.push(layout);
        }

        let image_handle = VkImageHandle {
            device: device.handle(),
            image,
            memory,
            memory_size: memory_req.size,
            memory_type_index: index as u32,
            modifier: image_modifier_properties.drm_format_modifier,
            layouts,
        };

        Box::into_raw(Box::new(image_handle))
    }
}

#[no_mangle]
#[cfg(target_os = "linux")]
pub unsafe extern "C" fn wgpu_vkimage_destroy(
    global: &Global,
    device_id: id::DeviceId,
    handle: &VkImageHandle,
) {
    handle.destroy(global, device_id);
}

#[no_mangle]
#[cfg(target_os = "linux")]
pub unsafe extern "C" fn wgpu_vkimage_delete(handle: *mut VkImageHandle) {
    let _ = Box::from_raw(handle);
}

#[no_mangle]
#[cfg(target_os = "linux")]
pub extern "C" fn wgpu_vkimage_get_file_descriptor(
    global: &Global,
    device_id: id::DeviceId,
    handle: &VkImageHandle,
) -> i32 {
    unsafe {
        let Some(hal_device) = global.device_as_hal::<wgc::api::Vulkan>(device_id) else {
            emit_critical_invalid_note("Vulkan device");
            return -1;
        };

        let device = hal_device.raw_device();
        let instance = hal_device.shared_instance().raw_instance();

        let get_fd_info = vk::MemoryGetFdInfoKHR::default()
            .memory(handle.memory)
            .handle_type(vk::ExternalMemoryHandleTypeFlags::DMA_BUF_EXT);

        let loader = khr::external_memory_fd::Device::new(instance, device);

        loader.get_memory_fd(&get_fd_info).unwrap_or(-1)
    }
}

#[no_mangle]
#[cfg(target_os = "linux")]
pub extern "C" fn wgpu_vkimage_get_dma_buf_info(handle: &VkImageHandle) -> DMABufInfo {
    let mut offsets: [u64; 3] = [0; 3];
    let mut strides: [u64; 3] = [0; 3];
    let plane_count = handle.layouts.len();
    for i in 0..plane_count {
        offsets[i] = handle.layouts[i].offset;
        strides[i] = handle.layouts[i].row_pitch;
    }

    DMABufInfo {
        is_valid: true,
        modifier: handle.modifier,
        plane_count: plane_count as u32,
        offsets,
        strides,
    }
}

#[cfg(target_os = "macos")]
pub struct MetalSharedEventHandle(
    objc2::rc::Retained<objc2::runtime::ProtocolObject<dyn objc2_metal::MTLSharedEvent>>,
);
#[cfg(not(target_os = "macos"))]
pub struct MetalSharedEventHandle;

#[no_mangle]
#[allow(unreachable_code)]
#[allow(unused_variables)]
pub extern "C" fn wgpu_server_get_device_fence_metal_shared_event(
    global: &Global,
    device_id: id::DeviceId,
) -> *mut MetalSharedEventHandle {
    #[cfg(target_os = "macos")]
    {
        use objc2::Message as _;

        let shared_event = unsafe {
            global
                .device_fence_as_hal::<wgc::api::Metal>(device_id)
                .map(|fence| fence.raw_shared_event().unwrap().retain())
        };
        let shared_event = match shared_event {
            Some(shared_event) => shared_event,
            None => {
                return ptr::null_mut();
            }
        };
        return Box::into_raw(Box::new(MetalSharedEventHandle(shared_event)));
    }

    ptr::null_mut()
}

#[no_mangle]
#[allow(unreachable_code)]
#[allow(unused_variables)]
pub extern "C" fn wgpu_server_metal_shared_event_signaled_value(
    shared_event: &mut MetalSharedEventHandle,
) -> u64 {
    #[cfg(target_os = "macos")]
    {
        use objc2_metal::MTLSharedEvent as _;
        return shared_event.0.signaledValue();
    }

    u64::MAX
}

#[no_mangle]
#[allow(unreachable_code)]
#[allow(unused_variables)]
pub extern "C" fn wgpu_server_delete_metal_shared_event(shared_event: *mut MetalSharedEventHandle) {
    #[cfg(target_os = "macos")]
    {
        let _ = unsafe { Box::from_raw(shared_event) };
    }
}

extern "C" {
    #[allow(dead_code)]
    fn gfx_critical_note(msg: *const c_char);
    fn wgpu_server_use_shared_texture_for_swap_chain(
        parent: WebGPUParentPtr,
        swap_chain_id: SwapChainId,
    ) -> bool;
    fn wgpu_server_disable_shared_texture_for_swap_chain(
        parent: WebGPUParentPtr,
        swap_chain_id: SwapChainId,
    );
    #[allow(dead_code)]
    fn wgpu_server_ensure_shared_texture_for_swap_chain(
        parent: WebGPUParentPtr,
        swap_chain_id: SwapChainId,
        device_id: id::DeviceId,
        texture_id: id::TextureId,
        width: u32,
        height: u32,
        format: wgt::TextureFormat,
        usage: wgt::TextureUsages,
    ) -> bool;
    fn wgpu_server_ensure_shared_texture_for_readback(
        parent: WebGPUParentPtr,
        swap_chain_id: SwapChainId,
        device_id: id::DeviceId,
        texture_id: id::TextureId,
        width: u32,
        height: u32,
        format: wgt::TextureFormat,
        usage: wgt::TextureUsages,
    );
    #[cfg(target_os = "windows")]
    fn wgpu_server_get_shared_texture_handle(
        parent: WebGPUParentPtr,
        id: id::TextureId,
    ) -> *mut core::ffi::c_void;
    #[cfg(target_os = "linux")]
    #[allow(improper_ctypes)] // VkImageHandle is behind a pointer but this still triggers
    fn wgpu_server_get_vk_image_handle(
        parent: WebGPUParentPtr,
        texture_id: id::TextureId,
    ) -> *const VkImageHandle;
    #[cfg(target_os = "linux")]
    fn wgpu_server_get_dma_buf_fd(parent: WebGPUParentPtr, id: id::TextureId) -> i32;
    #[cfg(target_os = "macos")]
    fn wgpu_server_get_external_io_surface_id(parent: WebGPUParentPtr, id: id::TextureId) -> u32;
    fn wgpu_server_remove_shared_texture(parent: WebGPUParentPtr, id: id::TextureId);
    fn wgpu_parent_is_external_texture_enabled() -> bool;
    fn wgpu_parent_external_texture_source_get_external_texture_descriptor<'a>(
        parent: WebGPUParentPtr,
        id: crate::ExternalTextureSourceId,
        dest_color_space: crate::PredefinedColorSpace,
    ) -> crate::ExternalTextureDescriptorFromSource<'a>;
    fn wgpu_parent_destroy_external_texture_source(
        parent: WebGPUParentPtr,
        id: crate::ExternalTextureSourceId,
    );
    fn wgpu_parent_drop_external_texture_source(
        parent: WebGPUParentPtr,
        id: crate::ExternalTextureSourceId,
    );
    fn wgpu_server_dealloc_buffer_shmem(parent: WebGPUParentPtr, id: id::BufferId);
    fn wgpu_server_pre_device_drop(parent: WebGPUParentPtr, id: id::DeviceId);
    fn wgpu_server_set_buffer_map_data(
        parent: WebGPUParentPtr,
        device_id: id::DeviceId,
        buffer_id: id::BufferId,
        has_map_flags: bool,
        mapped_offset: u64,
        mapped_size: u64,
        shmem_index: usize,
    );
    fn wgpu_server_device_push_error_scope(
        parent: WebGPUParentPtr,
        device_id: id::DeviceId,
        filter: u8,
    );
    fn wgpu_server_device_pop_error_scope(
        parent: WebGPUParentPtr,
        device_id: id::DeviceId,
        out_type: *mut u8,
        out_message: *mut nsCString,
    );
    fn wgpu_parent_buffer_unmap(
        parent: WebGPUParentPtr,
        device_id: id::DeviceId,
        buffer_id: id::BufferId,
        flush: bool,
    );
    fn wgpu_parent_queue_submit(
        parent: WebGPUParentPtr,
        device_id: id::DeviceId,
        queue_id: id::QueueId,
        command_buffer_ids: *const id::CommandBufferId,
        command_buffer_ids_length: usize,
        texture_ids: *const id::TextureId,
        texture_ids_length: usize,
        external_texture_source_ids: *const crate::ExternalTextureSourceId,
        external_texture_source_ids_length: usize,
    );
    fn wgpu_parent_create_swap_chain(
        parent: WebGPUParentPtr,
        device_id: id::DeviceId,
        queue_id: id::QueueId,
        width: i32,
        height: i32,
        format: crate::SurfaceFormat,
        buffer_ids: *const id::BufferId,
        buffer_ids_length: usize,
        remote_texture_owner_id: crate::RemoteTextureOwnerId,
        use_shared_texture_in_swap_chain: bool,
    );
    fn wgpu_parent_swap_chain_present(
        parent: WebGPUParentPtr,
        texture_id: id::TextureId,
        command_encoder_id: id::CommandEncoderId,
        command_buffer_id: id::CommandBufferId,
        remote_texture_id: crate::RemoteTextureId,
        remote_texture_owner_id: crate::RemoteTextureOwnerId,
    );
    fn wgpu_parent_swap_chain_drop(
        parent: WebGPUParentPtr,
        remote_texture_owner_id: crate::RemoteTextureOwnerId,
        txn_type: crate::RemoteTextureTxnType,
        txn_id: crate::RemoteTextureTxnId,
    );
    #[cfg(target_os = "windows")]
    fn wgpu_parent_get_compositor_device_luid(out_luid: *mut crate::FfiLUID);
    fn wgpu_parent_post_request_device(parent: WebGPUParentPtr, device_id: id::DeviceId);
    fn wgpu_parent_build_buffer_map_closure(
        parent: WebGPUParentPtr,
        device_id: id::DeviceId,
        buffer_id: id::BufferId,
        mode: wgc::device::HostMap,
        offset: u64,
        size: u64,
    ) -> BufferMapClosure;
    fn wgpu_parent_build_submitted_work_done_closure(
        parent: WebGPUParentPtr,
        queue_id: id::QueueId,
    ) -> SubmittedWorkDoneClosure;
    fn wgpu_parent_handle_error(
        parent: WebGPUParentPtr,
        device_id: id::DeviceId,
        ty: ErrorBufferType,
        message: &nsCString,
    );
    fn wgpu_parent_send_server_message(parent: WebGPUParentPtr, message: &mut ByteBuf);
}

#[cfg(target_os = "linux")]
pub unsafe fn is_dmabuf_supported(
    instance: &ash::Instance,
    physical_device: vk::PhysicalDevice,
    format: vk::Format,
    modifier: u64,
    usage: vk::ImageUsageFlags,
) -> bool {
    let mut drm_props = vk::ExternalImageFormatProperties::default();
    let mut props = vk::ImageFormatProperties2::default().push_next(&mut drm_props);

    let mut modifier_info =
        vk::PhysicalDeviceImageDrmFormatModifierInfoEXT::default().drm_format_modifier(modifier);

    let mut external_format_info = vk::PhysicalDeviceExternalImageFormatInfo::default()
        .handle_type(vk::ExternalMemoryHandleTypeFlags::DMA_BUF_EXT);

    let format_info = vk::PhysicalDeviceImageFormatInfo2::default()
        .format(format)
        .ty(vk::ImageType::TYPE_2D)
        .usage(usage)
        .tiling(vk::ImageTiling::DRM_FORMAT_MODIFIER_EXT)
        .push_next(&mut external_format_info)
        .push_next(&mut modifier_info);

    match instance.get_physical_device_image_format_properties2(
        physical_device,
        &format_info,
        &mut props,
    ) {
        Ok(_) => (),
        Err(_) => {
            //debug!(?format, ?modifier, "format not supported for dma import");
            return false;
        }
    }

    drm_props
        .external_memory_properties
        .compatible_handle_types
        .contains(vk::ExternalMemoryHandleTypeFlags::DMA_BUF_EXT)
}

#[cfg(target_os = "linux")]
pub fn select_memory_type(
    props: &vk::PhysicalDeviceMemoryProperties,
    flags: vk::MemoryPropertyFlags,
    memory_type_bits: Option<u32>,
) -> Option<u32> {
    for i in 0..props.memory_type_count {
        if let Some(mask) = memory_type_bits {
            if mask & (1 << i) == 0 {
                continue;
            }
        }

        if flags.is_empty()
            || props.memory_types[i as usize]
                .property_flags
                .contains(flags)
        {
            return Some(i);
        }
    }

    None
}

impl Global {
    #[cfg(target_os = "windows")]
    fn create_texture_with_shared_texture_d3d11(
        &self,
        device_id: id::DeviceId,
        texture_id: id::TextureId,
        desc: &wgc::resource::TextureDescriptor,
        swap_chain_id: Option<SwapChainId>,
    ) -> bool {
        let dx12_device = unsafe {
            match self
                .device_as_hal::<wgc::api::Dx12>(device_id)
                .map(|hal_device| hal_device.raw_device().clone())
            {
                None => {
                    emit_critical_invalid_note("dx12 device");
                    return false;
                }
                Some(dx12_device) => dx12_device,
            }
        };

        let ret = unsafe {
            wgpu_server_ensure_shared_texture_for_swap_chain(
                self.owner,
                swap_chain_id.unwrap(),
                device_id,
                texture_id,
                desc.size.width,
                desc.size.height,
                desc.format,
                desc.usage,
            )
        };
        if ret != true {
            let msg = c"Failed to create shared texture";
            unsafe {
                gfx_critical_note(msg.as_ptr());
            }
            return false;
        }

        let handle = unsafe { wgpu_server_get_shared_texture_handle(self.owner, texture_id) };
        if handle.is_null() {
            let msg = c"Failed to get shared texture handle";
            unsafe {
                gfx_critical_note(msg.as_ptr());
            }
            return false;
        }
        let mut resource: Option<Direct3D12::ID3D12Resource> = None;
        let res =
            unsafe { dx12_device.OpenSharedHandle(Foundation::HANDLE(handle), &mut resource) };
        if res.is_err() || resource.is_none() {
            let msg = c"Failed to open shared handle";
            unsafe {
                gfx_critical_note(msg.as_ptr());
            }
            return false;
        }

        let hal_texture = unsafe {
            <wgh::api::Dx12 as wgh::Api>::Device::texture_from_raw(
                resource.unwrap(),
                wgt::TextureFormat::Bgra8Unorm,
                wgt::TextureDimension::D2,
                desc.size,
                1,
                1,
            )
        };
        let (_, error) = unsafe {
            self.create_texture_from_hal(Box::new(hal_texture), device_id, &desc, Some(texture_id))
        };
        if let Some(err) = error {
            let msg = CString::new(format!("create_texture_from_hal() failed: {:?}", err)).unwrap();
            unsafe {
                gfx_critical_note(msg.as_ptr());
            }
            return false;
        }

        true
    }

    #[cfg(target_os = "linux")]
    fn create_texture_with_shared_texture_dmabuf(
        &self,
        device_id: id::DeviceId,
        texture_id: id::TextureId,
        desc: &wgc::resource::TextureDescriptor,
        swap_chain_id: Option<SwapChainId>,
    ) -> bool {
        unsafe {
            let ret = wgpu_server_ensure_shared_texture_for_swap_chain(
                self.owner,
                swap_chain_id.unwrap(),
                device_id,
                texture_id,
                desc.size.width,
                desc.size.height,
                desc.format,
                desc.usage,
            );
            if ret != true {
                let msg = c"Failed to create shared texture";
                gfx_critical_note(msg.as_ptr());
                return false;
            }

            let handle = wgpu_server_get_vk_image_handle(self.owner, texture_id);
            if handle.is_null() {
                let msg = c"Failed to get VkImageHandle";
                gfx_critical_note(msg.as_ptr());
                return false;
            }

            let vk_image_wrapper = &*handle;

            let fd = wgpu_server_get_dma_buf_fd(self.owner, texture_id);
            if fd < 0 {
                let msg = c"Failed to get DMABuf fd";
                gfx_critical_note(msg.as_ptr());
                return false;
            }

            // Ensure to close file descriptor
            let owned_fd = OwnedFd::from_raw_fd(fd as RawFd);

            let Some(hal_device) = self.device_as_hal::<wgc::api::Vulkan>(device_id) else {
                emit_critical_invalid_note("Vulkan device");
                return false;
            };

            let device = hal_device.raw_device();

            let extent = vk::Extent3D {
                width: desc.size.width,
                height: desc.size.height,
                depth: 1,
            };
            let mut usage_flags = vk::ImageUsageFlags::empty();
            usage_flags |= vk::ImageUsageFlags::COLOR_ATTACHMENT;

            let mut external_image_create_info = vk::ExternalMemoryImageCreateInfo::default()
                .handle_types(vk::ExternalMemoryHandleTypeFlags::DMA_BUF_EXT);

            // Surprising rule:
            //
            // > VUID-VkImageDrmFormatModifierExplicitCreateInfoEXT-size-02267:
            // > For each element of pPlaneLayouts, size must be 0
            //
            // Rationale:
            //
            // > In each element of pPlaneLayouts, the implementation must ignore
            // > size. The implementation calculates the size of each plane, which
            // > the application can query with vkGetImageSubresourceLayout.
            //
            // So, make a temporary copy of the plane layouts and zero
            // out their sizes.
            let memory_plane_layouts: Vec<_> = vk_image_wrapper
                .layouts
                .iter()
                .map(|layout| vk::SubresourceLayout { size: 0, ..*layout })
                .collect();

            // VUID-VkImageCreateInfo-pNext-00990
            //
            // Since `wgpu_vkimage_create_with_dma_buf` above succeeded in
            // creating the original DMABuf image, if we pass the same
            // parameters, including the DRM format modifier and plane layouts,
            // we can assume that this call will succeed too.
            //
            // The only thing we're adding is the `ALIAS` flag, because this
            // aliases the original image.
            let mut modifier_list = vk::ImageDrmFormatModifierExplicitCreateInfoEXT::default()
                .drm_format_modifier(vk_image_wrapper.modifier)
                .plane_layouts(&memory_plane_layouts);

            let vk_info = vk::ImageCreateInfo::default()
                .flags(vk::ImageCreateFlags::ALIAS)
                .image_type(vk::ImageType::TYPE_2D)
                // Bug 1971883: Rather than hard-coding this format, we should use
                // whatever format was negotiated between `GPUCanvasContext.configure`
                // and the GPU process.
                .format(vk::Format::B8G8R8A8_UNORM)
                .extent(extent)
                .mip_levels(1)
                .array_layers(1)
                .samples(vk::SampleCountFlags::TYPE_1)
                .tiling(vk::ImageTiling::DRM_FORMAT_MODIFIER_EXT)
                .usage(usage_flags)
                .sharing_mode(vk::SharingMode::EXCLUSIVE)
                .initial_layout(vk::ImageLayout::UNDEFINED)
                .push_next(&mut modifier_list)
                .push_next(&mut external_image_create_info);

            let image = match device.create_image(&vk_info, None) {
                Err(err) => {
                    let msg = CString::new(format!(
                        "Failed to get vk::Image: create_image() failed: {:?}",
                        err
                    ))
                    .unwrap();
                    gfx_critical_note(msg.as_ptr());
                    return false;
                }
                Ok(image) => image,
            };

            let memory_req = device.get_image_memory_requirements(image);
            if memory_req.size > vk_image_wrapper.memory_size {
                let msg = c"Invalid memory size";
                gfx_critical_note(msg.as_ptr());
                return false;
            }

            let mut dedicated_memory_info = vk::MemoryDedicatedAllocateInfo::default().image(image);

            let mut import_memory_fd_info = vk::ImportMemoryFdInfoKHR::default()
                .handle_type(vk::ExternalMemoryHandleTypeFlags::DMA_BUF_EXT)
                .fd(owned_fd.into_raw_fd());

            let memory_allocate_info = vk::MemoryAllocateInfo::default()
                .allocation_size(vk_image_wrapper.memory_size)
                .memory_type_index(vk_image_wrapper.memory_type_index)
                .push_next(&mut dedicated_memory_info)
                .push_next(&mut import_memory_fd_info);

            let memory = match device.allocate_memory(&memory_allocate_info, None) {
                Err(err) => {
                    let msg = CString::new(format!(
                        "Failed to get vk::Image: allocate_memory() failed: {:?}",
                        err
                    ))
                    .unwrap();
                    gfx_critical_note(msg.as_ptr());
                    return false;
                }
                Ok(memory) => memory,
            };

            match device.bind_image_memory(image, memory, /* offset */ 0) {
                Ok(()) => {}
                Err(err) => {
                    let msg = CString::new(format!(
                        "Failed to get vk::Image: bind_image_memory() failed: {:?}",
                        err
                    ))
                    .unwrap();
                    gfx_critical_note(msg.as_ptr());
                    return false;
                }
            }

            let hal_desc = wgh::TextureDescriptor {
                label: None,
                size: desc.size,
                mip_level_count: desc.mip_level_count,
                sample_count: desc.sample_count,
                dimension: desc.dimension,
                format: desc.format,
                usage: wgt::TextureUses::COPY_DST | wgt::TextureUses::COLOR_TARGET,
                memory_flags: wgh::MemoryFlags::empty(),
                view_formats: vec![],
            };

            let hal_texture = <wgh::api::Vulkan as wgh::Api>::Device::texture_from_raw(
                &hal_device,
                image,
                &hal_desc,
                None,
                wgh::vulkan::TextureMemory::Dedicated(memory),
            );

            let (_, error) = self.create_texture_from_hal(
                Box::new(hal_texture),
                device_id,
                &desc,
                Some(texture_id),
            );
            if let Some(err) = error {
                let msg =
                    CString::new(format!("create_texture_from_hal() failed: {:?}", err)).unwrap();
                gfx_critical_note(msg.as_ptr());
                return false;
            }

            true
        }
    }

    fn device_action(
        &self,
        device_id: id::DeviceId,
        action: DeviceAction,
        shmem_mappings: FfiSlice<'_, FfiSlice<'_, u8>>,
        response_byte_buf: &mut ByteBuf,
        error_buf: &mut OwnedErrorBuffer,
    ) {
        match action {
            DeviceAction::CreateBuffer {
                buffer_id,
                desc,
                shmem_handle_index,
            } => {
                let has_map_flags = desc
                    .usage
                    .intersects(wgt::BufferUsages::MAP_READ | wgt::BufferUsages::MAP_WRITE);
                let needs_shmem = has_map_flags || desc.mapped_at_creation;

                let shmem_data =
                    unsafe { shmem_mappings.as_slice()[shmem_handle_index].as_slice() };

                let shmem_size = shmem_data.len();

                // If we requested a non-zero mappable buffer and get a size of zero, it
                // indicates that the shmem allocation failed on the client side or
                // mapping failed in the parent process.
                let shmem_allocation_failed = needs_shmem && (shmem_size as u64) < desc.size;
                if shmem_allocation_failed {
                    assert_eq!(shmem_size, 0);
                }

                // Don't trust the graphics driver with buffer sizes larger than our conservative max buffer size.
                if shmem_allocation_failed || desc.size > MAX_BUFFER_SIZE {
                    error_buf.init(ErrMsg::oom(), device_id);
                    self.create_buffer_error(Some(buffer_id), &desc);
                    return;
                }

                if needs_shmem {
                    unsafe {
                        wgpu_server_set_buffer_map_data(
                            self.owner,
                            device_id,
                            buffer_id,
                            has_map_flags,
                            0,
                            if desc.mapped_at_creation {
                                desc.size
                            } else {
                                0
                            },
                            shmem_handle_index,
                        );
                    }
                }

                let (_, error) = self.device_create_buffer(device_id, &desc, Some(buffer_id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            #[allow(unused_variables)]
            DeviceAction::CreateTexture(id, desc, swap_chain_id) => {
                let max = MAX_TEXTURE_EXTENT;
                if desc.size.width > max
                    || desc.size.height > max
                    || desc.size.depth_or_array_layers > max
                {
                    self.create_texture_error(Some(id), &desc);
                    error_buf.init(ErrMsg::oom(), device_id);
                    return;
                }

                if [
                    desc.size.width,
                    desc.size.height,
                    desc.size.depth_or_array_layers,
                ]
                .contains(&0)
                {
                    self.create_texture_error(Some(id), &desc);
                    error_buf.init(
                        ErrMsg {
                            message: "size is zero".into(),
                            r#type: ErrorType::Validation,
                        },
                        device_id,
                    );
                    return;
                }

                let use_shared_texture = if let Some(id) = swap_chain_id {
                    unsafe { wgpu_server_use_shared_texture_for_swap_chain(self.owner, id) }
                } else {
                    false
                };

                if use_shared_texture {
                    let limits = self.device_limits(device_id);
                    if desc.size.width > limits.max_texture_dimension_2d
                        || desc.size.height > limits.max_texture_dimension_2d
                    {
                        self.create_texture_error(Some(id), &desc);
                        error_buf.init(
                            ErrMsg {
                                message: "size exceeds limits.max_texture_dimension_2d".into(),
                                r#type: ErrorType::Validation,
                            },
                            device_id,
                        );
                        return;
                    }

                    let features = self.device_features(device_id);
                    if desc.format == wgt::TextureFormat::Bgra8Unorm
                        && desc.usage.contains(wgt::TextureUsages::STORAGE_BINDING)
                        && !features.contains(wgt::Features::BGRA8UNORM_STORAGE)
                    {
                        self.create_texture_error(Some(id), &desc);
                        error_buf.init(
                            ErrMsg {
                                message: concat!(
                                    "Bgra8Unorm with GPUStorageBinding usage ",
                                    "with BGRA8UNORM_STORAGE disabled"
                                )
                                .into(),
                                r#type: ErrorType::Validation,
                            },
                            device_id,
                        );
                        return;
                    }

                    #[cfg(target_os = "windows")]
                    {
                        let is_created = self.create_texture_with_shared_texture_d3d11(
                            device_id,
                            id,
                            &desc,
                            swap_chain_id,
                        );
                        if is_created {
                            return;
                        }
                    }

                    #[cfg(target_os = "linux")]
                    {
                        let is_created = self.create_texture_with_shared_texture_dmabuf(
                            device_id,
                            id,
                            &desc,
                            swap_chain_id,
                        );
                        if is_created {
                            return;
                        }
                    }

                    #[cfg(target_os = "macos")]
                    {
                        let is_created = self.create_texture_with_shared_texture_iosurface(
                            device_id,
                            id,
                            &desc,
                            swap_chain_id,
                        );
                        if is_created {
                            return;
                        }
                    }

                    unsafe {
                        wgpu_server_disable_shared_texture_for_swap_chain(
                            self.owner,
                            swap_chain_id.unwrap(),
                        )
                    };
                }

                if let Some(swap_chain_id) = swap_chain_id {
                    unsafe {
                        wgpu_server_ensure_shared_texture_for_readback(
                            self.owner,
                            swap_chain_id,
                            device_id,
                            id,
                            desc.size.width,
                            desc.size.height,
                            desc.format,
                            desc.usage,
                        )
                    };
                }

                let (_, error) = self.device_create_texture(device_id, &desc, Some(id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::CreateExternalTexture(id, desc) => {
                // Obtain the descriptor from the source. A source ID of `None`
                // indicates the client-side encountered an error when
                // importing the source.
                let source_desc = desc.source.and_then(|source| {
                    let source_desc = unsafe {
                        wgpu_parent_external_texture_source_get_external_texture_descriptor(
                            self.owner,
                            source,
                            desc.color_space,
                        )
                    };
                    let planes = unsafe { source_desc.planes.as_slice() };
                    // The source having no planes indicates we encountered an
                    // error on the server side when importing the source
                    if planes.is_empty() {
                        None
                    } else {
                        Some(source_desc)
                    }
                });
                match source_desc {
                    Some(source_desc) => {
                        let planes = unsafe { source_desc.planes.as_slice() };
                        let desc = wgt::ExternalTextureDescriptor {
                            label: desc.label,
                            width: source_desc.width,
                            height: source_desc.height,
                            format: source_desc.format,
                            yuv_conversion_matrix: source_desc.yuv_conversion_matrix,
                            gamut_conversion_matrix: source_desc.gamut_conversion_matrix,
                            src_transfer_function: source_desc.src_transfer_function,
                            dst_transfer_function: source_desc.dst_transfer_function,
                            sample_transform: source_desc.sample_transform,
                            load_transform: source_desc.load_transform,
                        };
                        let (_, error) =
                            self.device_create_external_texture(device_id, &desc, planes, Some(id));
                        if let Some(err) = error {
                            error_buf.init(err, device_id);
                        }
                    }
                    None => {
                        // Create the external texture in an error state.
                        let desc = wgt::ExternalTextureDescriptor {
                            label: desc.label,
                            width: 0,
                            height: 0,
                            format: wgt::ExternalTextureFormat::Rgba,
                            yuv_conversion_matrix: Default::default(),
                            gamut_conversion_matrix: Default::default(),
                            src_transfer_function: Default::default(),
                            dst_transfer_function: Default::default(),
                            sample_transform: Default::default(),
                            load_transform: Default::default(),
                        };
                        self.create_external_texture_error(Some(id), &desc);
                    }
                }
            }
            DeviceAction::CreateSampler(id, desc) => {
                let (_, error) = self.device_create_sampler(device_id, &desc, Some(id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::CreateBindGroupLayout(id, desc) => {
                let (_, error) = self.device_create_bind_group_layout(device_id, &desc, Some(id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::CreateBindGroupLayoutError(id, label) => {
                self.create_bind_group_layout_error(Some(id), label);
            }
            DeviceAction::RenderPipelineGetBindGroupLayout(pipeline_id, index, bgl_id) => {
                let (_, error) =
                    self.render_pipeline_get_bind_group_layout(pipeline_id, index, Some(bgl_id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::ComputePipelineGetBindGroupLayout(pipeline_id, index, bgl_id) => {
                let (_, error) =
                    self.compute_pipeline_get_bind_group_layout(pipeline_id, index, Some(bgl_id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::CreatePipelineLayout(id, desc) => {
                let (_, error) = self.device_create_pipeline_layout(device_id, &desc, Some(id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::CreateBindGroup(id, desc) => {
                let (_, error) = self.device_create_bind_group(device_id, &desc, Some(id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::CreateShaderModule(id, label, code) => {
                let desc = wgc::pipeline::ShaderModuleDescriptor {
                    label,
                    runtime_checks: wgt::ShaderRuntimeChecks::checked(),
                };
                let source = wgc::pipeline::ShaderModuleSource::Wgsl(Cow::Borrowed(code.as_ref()));
                let (_, error) =
                    self.device_create_shader_module(device_id, &desc, source, Some(id));

                let compilation_messages = if let Some(err) = error {
                    // Per spec: "User agents should not include detailed compiler error messages or
                    // shader text in the message text of validation errors arising here: these details
                    // are accessible via getCompilationInfo()"
                    let message = match &err {
                        CreateShaderModuleError::Parsing(_) => "Parsing error".to_string(),
                        CreateShaderModuleError::Validation(_) => {
                            "Shader validation error".to_string()
                        }
                        CreateShaderModuleError::Device(device_err) => format!("{device_err:?}"),
                        _ => format!("{err:?}"),
                    };

                    error_buf.init(
                        ErrMsg {
                            message: format!("Shader module creation failed: {message}").into(),
                            r#type: err.webgpu_error_type(),
                        },
                        device_id,
                    );

                    vec![ShaderModuleCompilationMessage::new(&err, code.as_ref())]
                } else {
                    Vec::new()
                };

                *response_byte_buf = make_byte_buf(&ServerMessage::CreateShaderModuleResponse(
                    id,
                    compilation_messages,
                ));
            }
            DeviceAction::CreateComputePipeline(id, desc, is_async) => {
                let (_, error) = self.device_create_compute_pipeline(device_id, &desc, Some(id));

                if is_async {
                    let error = error
                        .filter(|e| !matches!(e.webgpu_error_type(), ErrorType::DeviceLost))
                        .map(|e| -> _ {
                            let is_validation_error =
                                matches!(e.webgpu_error_type(), ErrorType::Validation);
                            PipelineError {
                                is_validation_error,
                                error: error_to_string(e),
                            }
                        });
                    *response_byte_buf =
                        make_byte_buf(&ServerMessage::CreateComputePipelineResponse {
                            pipeline_id: id,
                            error,
                        });
                } else {
                    if let Some(err) = error {
                        error_buf.init(err, device_id);
                    }
                }
            }
            DeviceAction::CreateRenderPipeline(id, desc, is_async) => {
                let (_, error) = self.device_create_render_pipeline(device_id, &desc, Some(id));

                if is_async {
                    let error = error
                        .filter(|e| !matches!(e.webgpu_error_type(), ErrorType::DeviceLost))
                        .map(|e| -> _ {
                            let is_validation_error =
                                matches!(e.webgpu_error_type(), ErrorType::Validation);
                            PipelineError {
                                is_validation_error,
                                error: error_to_string(e),
                            }
                        });
                    *response_byte_buf =
                        make_byte_buf(&ServerMessage::CreateRenderPipelineResponse {
                            pipeline_id: id,
                            error,
                        });
                } else {
                    if let Some(err) = error {
                        error_buf.init(err, device_id);
                    }
                }
            }
            DeviceAction::CreateRenderBundle(id, encoder, desc) => {
                let (_, error) = self.render_bundle_encoder_finish(encoder, &desc, Some(id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::CreateRenderBundleError(buffer_id, label) => {
                self.create_render_bundle_error(
                    Some(buffer_id),
                    &wgt::RenderBundleDescriptor { label },
                );
            }
            DeviceAction::CreateQuerySet(id, desc) => {
                let (_, error) = self.device_create_query_set(device_id, &desc, Some(id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::CreateCommandEncoder(id, desc) => {
                let (_, error) = self.device_create_command_encoder(device_id, &desc, Some(id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
            DeviceAction::Error { message, r#type } => {
                error_buf.init(
                    ErrMsg {
                        message: message.into(),
                        r#type,
                    },
                    device_id,
                );
            }
            DeviceAction::PushErrorScope(filter) => {
                unsafe { wgpu_server_device_push_error_scope(self.owner, device_id, filter) };
            }
            DeviceAction::PopErrorScope => {
                let mut ty = 0;
                let mut message = nsCString::new();
                unsafe {
                    wgpu_server_device_pop_error_scope(self.owner, device_id, &mut ty, &mut message)
                };
                let message = message.to_utf8();

                *response_byte_buf = make_byte_buf(&ServerMessage::PopErrorScopeResponse(
                    device_id, ty, message,
                ));
            }
        }
    }

    fn texture_action(
        &self,
        device_id: id::DeviceId,
        self_id: id::TextureId,
        action: TextureAction,
        error_buf: &mut OwnedErrorBuffer,
    ) {
        match action {
            TextureAction::CreateView(id, desc) => {
                let (_, error) = self.texture_create_view(self_id, &desc, Some(id));
                if let Some(err) = error {
                    error_buf.init(err, device_id);
                }
            }
        }
    }

    fn command_encoder_action(
        &self,
        device_id: id::DeviceId,
        self_id: id::CommandEncoderId,
        action: CommandEncoderAction,
        error_buf: &mut OwnedErrorBuffer,
    ) {
        match action {
            CommandEncoderAction::CopyBufferToBuffer {
                src,
                src_offset,
                dst,
                dst_offset,
                size,
            } => {
                if let Err(err) = self.command_encoder_copy_buffer_to_buffer(
                    self_id, src, src_offset, dst, dst_offset, size,
                ) {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::CopyBufferToTexture { src, dst, size } => {
                if let Err(err) =
                    self.command_encoder_copy_buffer_to_texture(self_id, &src, &dst, &size)
                {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::CopyTextureToBuffer { src, dst, size } => {
                if let Err(err) =
                    self.command_encoder_copy_texture_to_buffer(self_id, &src, &dst, &size)
                {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::CopyTextureToTexture { src, dst, size } => {
                if let Err(err) =
                    self.command_encoder_copy_texture_to_texture(self_id, &src, &dst, &size)
                {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::RunComputePass { .. } => unimplemented!(),
            CommandEncoderAction::WriteTimestamp {
                query_set,
                query_index,
            } => {
                if let Err(err) =
                    self.command_encoder_write_timestamp(self_id, query_set, query_index)
                {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::ResolveQuerySet {
                query_set,
                start_query,
                query_count,
                destination,
                destination_offset,
            } => {
                if let Err(err) = self.command_encoder_resolve_query_set(
                    self_id,
                    query_set,
                    start_query,
                    query_count,
                    destination,
                    destination_offset,
                ) {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::RunRenderPass { .. } => unimplemented!(),
            CommandEncoderAction::ClearBuffer { dst, offset, size } => {
                if let Err(err) = self.command_encoder_clear_buffer(self_id, dst, offset, size) {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::ClearTexture {
                dst,
                ref subresource_range,
            } => {
                if let Err(err) =
                    self.command_encoder_clear_texture(self_id, dst, subresource_range)
                {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::PushDebugGroup(marker) => {
                if let Err(err) = self.command_encoder_push_debug_group(self_id, &marker) {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::PopDebugGroup => {
                if let Err(err) = self.command_encoder_pop_debug_group(self_id) {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::InsertDebugMarker(marker) => {
                if let Err(err) = self.command_encoder_insert_debug_marker(self_id, &marker) {
                    error_buf.init(err, device_id);
                }
            }
            CommandEncoderAction::BuildAccelerationStructures { .. } => {
                unreachable!("internal error: attempted to build acceleration structures")
            }
            CommandEncoderAction::TransitionResources { .. } => {
                unreachable!("internal error: attempted to transition resources")
            }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_pack_buffer_map_success(
    buffer_id: id::BufferId,
    is_writable: bool,
    offset: u64,
    size: u64,
    bb: &mut ByteBuf,
) {
    let result = BufferMapResult::Success {
        is_writable,
        offset,
        size,
    };
    *bb = make_byte_buf(&ServerMessage::BufferMapResponse(buffer_id, result));
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_pack_buffer_map_error(
    buffer_id: id::BufferId,
    error: &nsACString,
    bb: &mut ByteBuf,
) {
    let error = error.to_utf8();
    let result = BufferMapResult::Error(error);
    *bb = make_byte_buf(&ServerMessage::BufferMapResponse(buffer_id, result));
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_pack_work_done(bb: &mut ByteBuf, queue_id: id::QueueId) {
    *bb = make_byte_buf(&ServerMessage::QueueOnSubmittedWorkDoneResponse(queue_id));
}

/// # Panics
///
/// If the size of `buffer_ids` is not [`crate::MAX_SWAPCHAIN_BUFFER_COUNT`].
#[no_mangle]
pub unsafe extern "C" fn wgpu_server_pack_free_swap_chain_buffer_ids(
    bb: &mut ByteBuf,
    buffer_ids: FfiSlice<'_, id::BufferId>,
) {
    *bb = make_byte_buf(&ServerMessage::FreeSwapChainBufferIds(
        buffer_ids.as_slice().try_into().unwrap(),
    ));
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_messages(
    global: &Global,
    nr_of_messages: u32,
    serialized_messages: &ByteBuf,
    data_buffers: FfiSlice<'_, ByteBuf>,
    shmem_mappings: FfiSlice<'_, FfiSlice<'_, u8>>,
) {
    let serialized_messages = serialized_messages.as_slice();
    let data_buffers = data_buffers.as_slice();

    use bincode::Options;
    let options = bincode::DefaultOptions::new()
        .with_fixint_encoding()
        .allow_trailing_bytes();
    let mut deserializer = bincode::Deserializer::from_slice(serialized_messages, options);

    for _ in 0..nr_of_messages {
        let message: Message = serde::Deserialize::deserialize(&mut deserializer).unwrap();
        process_message(global, data_buffers, shmem_mappings, message);
    }
}

unsafe fn process_message(
    global: &Global,
    data_buffers: &[ByteBuf],
    shmem_mappings: FfiSlice<'_, FfiSlice<'_, u8>>,
    message: Message,
) {
    let response_byte_buf = &mut ByteBuf::new();
    let error_buf = &mut OwnedErrorBuffer::new();

    match message {
        Message::RequestAdapter {
            adapter_id,
            power_preference,
            force_fallback_adapter,
        } => {
            let mut result = None;

            // Prefer to use the dx12 backend, if one exists, and use the same DXGI adapter as WebRender.
            // If wgpu uses a different adapter than WebRender, textures created by
            // webgpu::SharedTexture do not work with wgpu.
            #[cfg(target_os = "windows")]
            {
                let mut adapter_luid = core::mem::MaybeUninit::<crate::FfiLUID>::uninit();
                wgpu_parent_get_compositor_device_luid(adapter_luid.as_mut_ptr());
                let adapter_luid = if adapter_luid.as_ptr().is_null() {
                    None
                } else {
                    Some(adapter_luid.assume_init())
                };

                if adapter_luid.is_some() && !force_fallback_adapter {
                    if let Some(instance) = global.global.instance_as_hal::<wgc::api::Dx12>() {
                        for adapter in instance.enumerate_adapters(None) {
                            let raw_adapter = adapter.adapter.raw_adapter();
                            let desc = unsafe { raw_adapter.GetDesc() };
                            if let Ok(desc) = desc {
                                if desc.AdapterLuid.LowPart == adapter_luid.unwrap().low_part
                                    && desc.AdapterLuid.HighPart == adapter_luid.unwrap().high_part
                                {
                                    global.create_adapter_from_hal(
                                        wgh::DynExposedAdapter::from(adapter),
                                        Some(adapter_id),
                                    );
                                    result = Some(true);
                                    break;
                                }
                            }
                        }
                        if result.is_none() {
                            log::error!(concat!(
                                "Failed to find D3D12 adapter with the same LUID ",
                                "that the compositor is using!"
                            ));
                            result = Some(false);
                        }
                    }
                }
            }

            let desc = wgt::RequestAdapterOptions {
                power_preference,
                force_fallback_adapter,
                compatible_surface: None,
            };
            if result.is_none() {
                let created =
                    match global.request_adapter(&desc, wgt::Backends::PRIMARY, Some(adapter_id)) {
                        Ok(_) => true,
                        Err(e) => {
                            log::warn!("{e}");
                            false
                        }
                    };
                result = Some(created);
            }

            let response = if result.unwrap() {
                let wgt::AdapterInfo {
                    name,
                    vendor,
                    device,
                    device_type,
                    driver,
                    driver_info,
                    backend,
                    transient_saves_memory,
                    device_pci_bus_id: _,
                    subgroup_min_size,
                    subgroup_max_size,
                } = global.adapter_get_info(adapter_id);

                let is_hardware = match device_type {
                    wgt::DeviceType::IntegratedGpu | wgt::DeviceType::DiscreteGpu => true,
                    _ => false,
                };

                if static_prefs::pref!("dom.webgpu.testing.assert-hardware-adapter")
                    && !desc.force_fallback_adapter
                {
                    assert!(
                        is_hardware,
                        "Expected a hardware gpu adapter, got {:?}",
                        device_type
                    );
                }

                let support_use_shared_texture_in_swap_chain =
                    support_use_shared_texture_in_swap_chain(
                        global,
                        adapter_id,
                        backend,
                        is_hardware,
                    );

                let info = AdapterInformation {
                    id: adapter_id,
                    limits: restrict_limits(global.adapter_limits(adapter_id)),
                    features: global.adapter_features(adapter_id).features_webgpu,
                    name: Cow::Owned(name),
                    vendor,
                    device,
                    device_type,
                    driver: Cow::Owned(driver),
                    driver_info: Cow::Owned(driver_info),
                    backend,
                    support_use_shared_texture_in_swap_chain,
                    transient_saves_memory,
                    subgroup_min_size,
                    subgroup_max_size,
                };
                Some(info)
            } else {
                None
            };

            *response_byte_buf =
                make_byte_buf(&ServerMessage::RequestAdapterResponse(adapter_id, response));
        }
        Message::RequestDevice {
            adapter_id,
            device_id,
            queue_id,
            desc,
        } => {
            let error = adapter_request_device(global, adapter_id, desc, device_id, queue_id);

            if error.is_none() {
                wgpu_parent_post_request_device(global.owner, device_id);
            }

            *response_byte_buf = make_byte_buf(&ServerMessage::RequestDeviceResponse(
                device_id, queue_id, error,
            ));
        }
        Message::Device(id, action) => {
            global.device_action(id, action, shmem_mappings, response_byte_buf, error_buf)
        }
        Message::Texture(device_id, id, action) => {
            global.texture_action(device_id, id, action, error_buf)
        }
        Message::CommandEncoder(device_id, id, action) => {
            global.command_encoder_action(device_id, id, action, error_buf)
        }
        Message::CommandEncoderFinish(device_id, command_encoder_id, command_buffer_id, desc) => {
            let (_, label_and_error) =
                global.command_encoder_finish(command_encoder_id, &desc, Some(command_buffer_id));
            if let Some((_label, err)) = label_and_error {
                error_buf.init(err, device_id);
            }
        }
        Message::ReplayRenderPass(device_id, id, pass) => {
            crate::command::replay_render_pass(global, device_id, id, &pass, error_buf);
        }
        Message::ReplayComputePass(device_id, id, pass) => {
            crate::command::replay_compute_pass(global, device_id, id, &pass, error_buf);
        }
        Message::QueueWrite {
            device_id,
            queue_id,
            data_source,
            action,
        } => {
            let data = match data_source {
                QueueWriteDataSource::DataBuffer(data_buffer_index) => {
                    data_buffers[data_buffer_index].as_slice()
                }
                QueueWriteDataSource::Shmem(shmem_handle_index) => {
                    shmem_mappings.as_slice()[shmem_handle_index].as_slice()
                }
            };
            let result = match action {
                QueueWriteAction::Buffer { dst, offset } => {
                    global.queue_write_buffer(queue_id, dst, offset, data)
                }
                QueueWriteAction::Texture { dst, layout, size } => {
                    global.queue_write_texture(queue_id, &dst, data, &layout, &size)
                }
            };
            if let Err(err) = result {
                error_buf.init(err, device_id);
            }
        }
        Message::BufferMap {
            device_id,
            buffer_id,
            mode,
            offset,
            size,
        } => {
            let mode = match mode {
                /* GPUMapMode.READ */ 1 => wgc::device::HostMap::Read,
                /* GPUMapMode.WRITE */ 2 => wgc::device::HostMap::Write,
                _ => {
                    let message = concat!(
                        "GPUBuffer.mapAsync 'mode' argument must be ",
                        "either GPUMapMode.READ or GPUMapMode.WRITE"
                    );
                    error_buf.init(
                        ErrMsg {
                            message: message.into(),
                            r#type: ErrorType::Validation,
                        },
                        device_id,
                    );
                    let response = BufferMapResult::Error(message.into());
                    *response_byte_buf =
                        make_byte_buf(&ServerMessage::BufferMapResponse(buffer_id, response));
                    return;
                }
            };

            let closure = wgpu_parent_build_buffer_map_closure(
                global.owner,
                device_id,
                buffer_id,
                mode,
                offset,
                size,
            );

            let closure = Box::new(move |result| {
                let _ = &closure;
                (closure.callback)(closure.user_data, BufferMapAsyncStatus::from(result))
            });
            let operation = wgc::resource::BufferMapOperation {
                host: mode,
                callback: Some(closure),
            };
            let result = global.buffer_map_async(buffer_id, offset, Some(size), operation);

            if let Err(error) = result {
                error_buf.init(error, device_id);
            }
        }
        Message::BufferUnmap(device_id, buffer_id, flush) => {
            wgpu_parent_buffer_unmap(global.owner, device_id, buffer_id, flush);
        }
        Message::QueueSubmit(
            device_id,
            queue_id,
            command_buffer_ids,
            texture_ids,
            external_texture_source_ids,
        ) => wgpu_parent_queue_submit(
            global.owner,
            device_id,
            queue_id,
            command_buffer_ids.as_ptr(),
            command_buffer_ids.len(),
            texture_ids.as_ptr(),
            texture_ids.len(),
            external_texture_source_ids.as_ptr(),
            external_texture_source_ids.len(),
        ),
        Message::QueueOnSubmittedWorkDone(queue_id) => {
            let closure = wgpu_parent_build_submitted_work_done_closure(global.owner, queue_id);
            let closure = Box::new(move || {
                let _ = &closure;
                (closure.callback)(closure.user_data)
            });
            global.queue_on_submitted_work_done(queue_id, closure);
        }

        Message::CreateSwapChain {
            device_id,
            queue_id,
            width,
            height,
            format,
            buffer_ids,
            remote_texture_owner_id,
            use_shared_texture_in_swap_chain,
        } => {
            wgpu_parent_create_swap_chain(
                global.owner,
                device_id,
                queue_id,
                width,
                height,
                format,
                buffer_ids.as_ptr(),
                buffer_ids.len(),
                remote_texture_owner_id,
                use_shared_texture_in_swap_chain,
            );
        }
        Message::SwapChainPresent {
            texture_id,
            command_encoder_id,
            command_buffer_id,
            remote_texture_id,
            remote_texture_owner_id,
        } => {
            wgpu_parent_swap_chain_present(
                global.owner,
                texture_id,
                command_encoder_id,
                command_buffer_id,
                remote_texture_id,
                remote_texture_owner_id,
            );
        }
        Message::SwapChainDrop {
            remote_texture_owner_id,
            txn_type,
            txn_id,
        } => {
            wgpu_parent_swap_chain_drop(global.owner, remote_texture_owner_id, txn_type, txn_id);
        }

        Message::DestroyBuffer(id) => {
            wgpu_server_dealloc_buffer_shmem(global.owner, id);
            global.buffer_destroy(id)
        }
        Message::DestroyTexture(id) => {
            wgpu_server_remove_shared_texture(global.owner, id);
            global.texture_destroy(id)
        }
        Message::DestroyExternalTexture(id) => global.external_texture_destroy(id),
        Message::DestroyExternalTextureSource(id) => {
            wgpu_parent_destroy_external_texture_source(global.owner, id)
        }
        Message::DestroyDevice(id) => global.device_destroy(id),

        Message::DropAdapter(id) => global.adapter_drop(id),
        Message::DropDevice(id) => {
            wgpu_server_pre_device_drop(global.owner, id);
            global.device_drop(id)
        }
        Message::DropQueue(id) => global.queue_drop(id),
        Message::DropBuffer(id) => {
            wgpu_server_dealloc_buffer_shmem(global.owner, id);
            global.buffer_drop(id)
        }
        Message::DropCommandEncoder(id) => global.command_encoder_drop(id),
        Message::DropRenderPassEncoder(_id) => {}
        Message::DropComputePassEncoder(_id) => {}
        Message::DropRenderBundleEncoder(_id) => {}
        Message::DropCommandBuffer(id) => global.command_buffer_drop(id),
        Message::DropRenderBundle(id) => global.render_bundle_drop(id),
        Message::DropBindGroupLayout(id) => global.bind_group_layout_drop(id),
        Message::DropPipelineLayout(id) => global.pipeline_layout_drop(id),
        Message::DropBindGroup(id) => global.bind_group_drop(id),
        Message::DropShaderModule(id) => global.shader_module_drop(id),
        Message::DropComputePipeline(id) => global.compute_pipeline_drop(id),
        Message::DropRenderPipeline(id) => global.render_pipeline_drop(id),
        Message::DropTexture(id) => {
            wgpu_server_remove_shared_texture(global.owner, id);
            global.texture_drop(id);
        }
        Message::DropTextureView(id) => global.texture_view_drop(id).unwrap(),
        Message::DropExternalTexture(id) => global.external_texture_drop(id),
        Message::DropExternalTextureSource(id) => {
            wgpu_parent_drop_external_texture_source(global.owner, id)
        }
        Message::DropSampler(id) => global.sampler_drop(id),
        Message::DropQuerySet(id) => global.query_set_drop(id),
    }

    if let Some((device_id, ty, message)) = error_buf.get_inner_data() {
        wgpu_parent_handle_error(global.owner, device_id, ty, message);
    }
    if !response_byte_buf.is_empty() {
        wgpu_parent_send_server_message(global.owner, response_byte_buf);
    }
}

#[no_mangle]
pub extern "C" fn wgpu_server_device_create_encoder(
    global: &Global,
    device_id: id::DeviceId,
    desc: &wgt::CommandEncoderDescriptor<Option<&nsACString>>,
    new_id: id::CommandEncoderId,
    mut error_buf: ErrorBuffer,
) {
    let utf8_label = desc.label.map(|utf16| utf16.to_string());
    let label = utf8_label.as_ref().map(|s| Cow::from(&s[..]));

    let desc = desc.map_label(|_| label);
    let (_, error) = global.device_create_command_encoder(device_id, &desc, Some(new_id));
    if let Some(err) = error {
        error_buf.init(err, device_id);
    }
}

#[no_mangle]
pub extern "C" fn wgpu_server_encoder_finish(
    global: &Global,
    device_id: id::DeviceId,
    command_encoder_id: id::CommandEncoderId,
    command_buffer_id: id::CommandBufferId,
    desc: &wgt::CommandBufferDescriptor<Option<&nsACString>>,
    mut error_buf: ErrorBuffer,
) {
    let label = wgpu_string(desc.label);
    let desc = desc.map_label(|_| label);
    let (_, label_and_error) =
        global.command_encoder_finish(command_encoder_id, &desc, Some(command_buffer_id));
    if let Some((_label, err)) = label_and_error {
        error_buf.init(err, device_id);
    }
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_encoder_copy_texture_to_buffer(
    global: &Global,
    device_id: id::DeviceId,
    self_id: id::CommandEncoderId,
    source: &wgc::command::TexelCopyTextureInfo,
    dst_buffer: wgc::id::BufferId,
    dst_layout: &crate::TexelCopyBufferLayout,
    size: &wgt::Extent3d,
    mut error_buf: ErrorBuffer,
) {
    let destination = wgc::command::TexelCopyBufferInfo {
        buffer: dst_buffer,
        layout: dst_layout.into_wgt(),
    };
    if let Err(err) =
        global.command_encoder_copy_texture_to_buffer(self_id, source, &destination, size)
    {
        error_buf.init(err, device_id);
    }
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_queue_write_texture(
    global: &Global,
    device_id: id::DeviceId,
    queue_id: id::QueueId,
    destination: &wgt::TexelCopyTextureInfo<id::TextureId>,
    data: FfiSlice<u8>,
    data_layout: &crate::TexelCopyBufferLayout,
    size: &wgt::Extent3d,
    mut error_buf: ErrorBuffer,
) {
    let data = data.as_slice();
    let data_layout = data_layout.into_wgt();
    if let Err(err) = global.queue_write_texture(queue_id, destination, data, &data_layout, size) {
        error_buf.init(err, device_id);
    }
}

#[no_mangle]
pub unsafe extern "C" fn wgpu_server_queue_submit(
    global: &Global,
    device_id: id::DeviceId,
    self_id: id::QueueId,
    command_buffers: FfiSlice<'_, id::CommandBufferId>,
    mut error_buf: ErrorBuffer,
) -> u64 {
    let result = global.queue_submit(self_id, command_buffers.as_slice());

    match result {
        Err((_index, err)) => {
            error_buf.init(err, device_id);
            return 0;
        }
        Ok(wrapped_index) => wrapped_index,
    }
}

#[repr(C)]
pub struct SubmittedWorkDoneClosure {
    pub callback: unsafe extern "C" fn(user_data: *mut u8),
    pub user_data: *mut u8,
}
unsafe impl Send for SubmittedWorkDoneClosure {}

#[derive(Debug)]
#[cfg(target_os = "linux")]
pub struct VkSemaphoreHandle {
    pub semaphore: vk::Semaphore,
}

#[no_mangle]
#[cfg(target_os = "linux")]
pub extern "C" fn wgpu_vksemaphore_create_signal_semaphore(
    global: &Global,
    queue_id: id::QueueId,
) -> *mut VkSemaphoreHandle {
    let semaphore_handle = unsafe {
        let Some(hal_queue) = global.queue_as_hal::<wgc::api::Vulkan>(queue_id) else {
            emit_critical_invalid_note("Vulkan queue");
            return ptr::null_mut();
        };
        let device = hal_queue.raw_device();

        let mut export_semaphore_create_info = vk::ExportSemaphoreCreateInfo::default()
            .handle_types(vk::ExternalSemaphoreHandleTypeFlags::OPAQUE_FD);
        let create_info =
            vk::SemaphoreCreateInfo::default().push_next(&mut export_semaphore_create_info);
        let semaphore = match device.create_semaphore(&create_info, None) {
            Err(err) => {
                let msg = CString::new(format!("create_semaphore() failed: {:?}", err)).unwrap();
                gfx_critical_note(msg.as_ptr());
                return ptr::null_mut();
            }
            Ok(semaphore) => semaphore,
        };

        hal_queue.add_signal_semaphore(semaphore, None);

        VkSemaphoreHandle { semaphore }
    };

    Box::into_raw(Box::new(semaphore_handle))
}

#[no_mangle]
#[cfg(target_os = "linux")]
pub unsafe extern "C" fn wgpu_vksemaphore_get_file_descriptor(
    global: &Global,
    device_id: id::DeviceId,
    handle: &VkSemaphoreHandle,
) -> i32 {
    let file_descriptor = unsafe {
        match global.device_as_hal::<wgc::api::Vulkan>(device_id) {
            None => {
                emit_critical_invalid_note("Vulkan device");
                None
            }
            Some(hal_device) => {
                let device = hal_device.raw_device();
                let instance = hal_device.shared_instance().raw_instance();

                let external_semaphore_fd =
                    khr::external_semaphore_fd::Device::new(instance, device);
                let get_fd_info = vk::SemaphoreGetFdInfoKHR::default()
                    .semaphore(handle.semaphore)
                    .handle_type(vk::ExternalSemaphoreHandleTypeFlags::OPAQUE_FD);

                external_semaphore_fd.get_semaphore_fd(&get_fd_info).ok()
            }
        }
    };

    // From [Wikipedia](https://en.wikipedia.org/wiki/File_descriptor):
    //
    // > File descriptors typically have non-negative integer values, with negative values
    // > being reserved to indicate "no value" or error conditions.
    file_descriptor.unwrap_or(-1)
}

#[no_mangle]
#[cfg(target_os = "linux")]
pub unsafe extern "C" fn wgpu_vksemaphore_destroy(
    global: &Global,
    device_id: id::DeviceId,
    handle: &VkSemaphoreHandle,
) {
    unsafe {
        let Some(hal_device) = global.device_as_hal::<wgc::api::Vulkan>(device_id) else {
            emit_critical_invalid_note("Vulkan device");
            return;
        };
        let device = hal_device.raw_device();
        device.destroy_semaphore(handle.semaphore, None);
    };
}

#[no_mangle]
#[cfg(target_os = "linux")]
pub unsafe extern "C" fn wgpu_vksemaphore_delete(handle: *mut VkSemaphoreHandle) {
    let _ = Box::from_raw(handle);
}

#[no_mangle]
pub extern "C" fn wgpu_server_buffer_drop(global: &Global, self_id: id::BufferId) {
    global.buffer_drop(self_id);
}

#[no_mangle]
pub extern "C" fn wgpu_server_command_encoder_drop(global: &Global, self_id: id::CommandEncoderId) {
    global.command_encoder_drop(self_id);
}

#[no_mangle]
pub extern "C" fn wgpu_server_command_buffer_drop(global: &Global, self_id: id::CommandBufferId) {
    global.command_buffer_drop(self_id);
}

/// Imports a Direct3D texture from a shared handle.
#[cfg(target_os = "windows")]
#[no_mangle]
pub unsafe extern "C" fn wgpu_server_device_import_texture_from_shared_handle(
    global: &Global,
    device_id: id::DeviceId,
    id_in: id::TextureId,
    desc: &wgt::TextureDescriptor<Option<&nsACString>, crate::FfiSlice<wgt::TextureFormat>>,
    handle: *mut core::ffi::c_void,
    mut error_buf: ErrorBuffer,
) {
    let desc = desc.map_label_and_view_formats(|l| wgpu_string(*l), |v| v.as_slice().to_vec());

    let Some(hal_device) = global.device_as_hal::<wgc::api::Dx12>(device_id) else {
        emit_critical_invalid_note("dx12 device");
        global.create_texture_error(Some(id_in), &desc);
        return;
    };
    let dx12_device = hal_device.raw_device();

    let mut resource: Option<Direct3D12::ID3D12Resource> = None;
    let res = dx12_device.OpenSharedHandle(Foundation::HANDLE(handle), &mut resource);
    if res.is_err() || resource.is_none() {
        error_buf.init(
            ErrMsg {
                message: "Failed to import texture from shared handle".into(),
                r#type: ErrorType::Internal,
            },
            device_id,
        );
        global.create_texture_error(Some(id_in), &desc);
        return;
    }

    let hal_texture = <wgh::api::Dx12 as wgh::Api>::Device::texture_from_raw(
        resource.unwrap(),
        desc.format,
        desc.dimension,
        desc.size,
        desc.mip_level_count,
        desc.sample_count,
    );

    let (_, error) =
        global.create_texture_from_hal(Box::new(hal_texture), device_id, &desc, Some(id_in));
    if let Some(err) = error {
        error_buf.init(err, device_id);
    }
}

/// Imports a fence from a shared handle and queues a GPU-side wait on the
/// specified queue for the fence to reach a specific value.
#[cfg(target_os = "windows")]
#[no_mangle]
pub unsafe extern "C" fn wgpu_server_device_wait_fence_from_shared_handle(
    global: &Global,
    device_id: id::DeviceId,
    queue_id: id::QueueId,
    fence_handle: *mut core::ffi::c_void,
    fence_value: wgh::FenceValue,
) -> bool {
    let Some(hal_device) = global.device_as_hal::<wgc::api::Dx12>(device_id) else {
        emit_critical_invalid_note("dx12 device");
        return false;
    };
    let Some(hal_queue) = global.queue_as_hal::<wgc::api::Dx12>(queue_id) else {
        emit_critical_invalid_note("dx12 queue");
        return false;
    };

    let mut fence: Option<Direct3D12::ID3D12Fence> = None;
    let res = hal_device
        .raw_device()
        .OpenSharedHandle(Foundation::HANDLE(fence_handle), &mut fence);
    let fence = match (res, fence) {
        (Ok(_), Some(fence)) => fence,
        _ => return false,
    };

    let res = hal_queue.as_raw().Wait(&fence, fence_value);
    res.is_ok()
}

#[cfg(target_os = "macos")]
mod macos {
    use std::ffi::CString;

    use super::{emit_critical_invalid_note, gfx_critical_note, Global};
    use crate::{
        error::ErrorBuffer,
        server::{
            wgpu_server_ensure_shared_texture_for_swap_chain,
            wgpu_server_get_external_io_surface_id,
        },
        wgpu_string, SwapChainId,
    };

    use nsstring::nsACString;
    use objc2::{
        rc::{autoreleasepool, Retained},
        runtime::ProtocolObject,
    };
    use objc2_foundation::NSString;
    use objc2_io_surface::IOSurfaceRef;
    use objc2_metal::{
        MTLDevice as _, MTLPixelFormat, MTLResource, MTLStorageMode, MTLTexture,
        MTLTextureDescriptor, MTLTextureType, MTLTextureUsage,
    };
    use wgc::id;

    /// Imports a Metal texture from the specified plane of an IOSurface.
    #[no_mangle]
    pub unsafe extern "C" fn wgpu_server_device_import_texture_from_iosurface(
        global: &Global,
        device_id: id::DeviceId,
        id_in: id::TextureId,
        desc: &wgt::TextureDescriptor<Option<&nsACString>, crate::FfiSlice<wgt::TextureFormat>>,
        io_surface_id: u32,
        plane: usize,
        mut error_buf: ErrorBuffer,
    ) {
        let desc = desc.map_label_and_view_formats(|l| wgpu_string(*l), |v| v.as_slice().to_vec());

        let Some(surface) = IOSurfaceRef::lookup(io_surface_id) else {
            emit_critical_invalid_note("IOSurface");
            global.create_texture_error(Some(id_in), &desc);
            return;
        };

        let Some(hal_device) = global.device_as_hal::<wgc::api::Metal>(device_id) else {
            emit_critical_invalid_note("metal device");
            global.create_texture_error(Some(id_in), &desc);
            return;
        };
        let metal_device = hal_device.raw_device();

        let metal_desc = MTLTextureDescriptor::new();
        let texture_type = match desc.dimension {
            wgt::TextureDimension::D1 => MTLTextureType::Type1D,
            wgt::TextureDimension::D2 => {
                if desc.sample_count > 1 {
                    metal_desc.setSampleCount(desc.sample_count as usize);
                    MTLTextureType::Type2DMultisample
                } else if desc.size.depth_or_array_layers > 1 {
                    metal_desc.setArrayLength(desc.size.depth_or_array_layers as usize);
                    MTLTextureType::Type2DArray
                } else {
                    MTLTextureType::Type2D
                }
            }
            wgt::TextureDimension::D3 => {
                metal_desc.setDepth(desc.size.depth_or_array_layers as usize);
                MTLTextureType::Type3D
            }
        };
        metal_desc.setTextureType(texture_type);
        let format = match desc.format {
            wgt::TextureFormat::Rgba8Unorm => MTLPixelFormat::RGBA8Unorm,
            wgt::TextureFormat::Bgra8Unorm => MTLPixelFormat::BGRA8Unorm,
            wgt::TextureFormat::R8Unorm => MTLPixelFormat::R8Unorm,
            wgt::TextureFormat::Rg8Unorm => MTLPixelFormat::RG8Unorm,
            wgt::TextureFormat::R16Unorm => MTLPixelFormat::R16Unorm,
            wgt::TextureFormat::Rg16Unorm => MTLPixelFormat::RG16Unorm,
            _ => unreachable!(),
        };
        metal_desc.setPixelFormat(format);
        metal_desc.setWidth(desc.size.width as usize);
        metal_desc.setHeight(desc.size.height as usize);
        metal_desc.setMipmapLevelCount(desc.mip_level_count as usize);
        metal_desc.setStorageMode(MTLStorageMode::Private);
        metal_desc.setUsage(MTLTextureUsage::ShaderRead);

        let Some(metal_texture) =
            metal_device.newTextureWithDescriptor_iosurface_plane(&metal_desc, &surface, plane)
        else {
            emit_critical_invalid_note("IOSurface");
            global.create_texture_error(Some(id_in), &desc);
            return;
        };

        let hal_texture = <wgh::api::Metal as wgh::Api>::Device::texture_from_raw(
            metal_texture,
            desc.format,
            texture_type,
            desc.array_layer_count(),
            desc.mip_level_count,
            wgh::CopyExtent::map_extent_to_copy_size(&desc.size, desc.dimension),
        );

        let (_, error) = unsafe {
            global.create_texture_from_hal(Box::new(hal_texture), device_id, &desc, Some(id_in))
        };
        if let Some(err) = error {
            error_buf.init(err, device_id);
        }
    }

    impl super::Global {
        pub(super) fn create_texture_with_shared_texture_iosurface(
            &self,
            device_id: id::DeviceId,
            texture_id: id::TextureId,
            desc: &wgc::resource::TextureDescriptor,
            swap_chain_id: Option<SwapChainId>,
        ) -> bool {
            let ret = unsafe {
                wgpu_server_ensure_shared_texture_for_swap_chain(
                    self.owner,
                    swap_chain_id.unwrap(),
                    device_id,
                    texture_id,
                    desc.size.width,
                    desc.size.height,
                    desc.format,
                    desc.usage,
                )
            };
            if ret != true {
                let msg = c"Failed to create shared texture";
                unsafe {
                    gfx_critical_note(msg.as_ptr());
                }
                return false;
            }

            let io_surface_id =
                unsafe { wgpu_server_get_external_io_surface_id(self.owner, texture_id) };
            if io_surface_id == 0 {
                let msg = c"Failed to get io surface id";
                unsafe {
                    gfx_critical_note(msg.as_ptr());
                }
                return false;
            }

            let Some(io_surface) = IOSurfaceRef::lookup(io_surface_id) else {
                emit_critical_invalid_note("metal device");
                return false;
            };

            let desc_ref = &desc;

            let raw_texture: Retained<ProtocolObject<dyn MTLTexture>> = unsafe {
                let Some(hal_device) = self.device_as_hal::<wgc::api::Metal>(device_id) else {
                    emit_critical_invalid_note("metal device");
                    return false;
                };

                let device = hal_device.raw_device();

                let maybe_texture = autoreleasepool(|_| {
                    let descriptor = MTLTextureDescriptor::new();
                    let usage = MTLTextureUsage::RenderTarget
                        | MTLTextureUsage::ShaderRead
                        | MTLTextureUsage::PixelFormatView;

                    descriptor.setTextureType(MTLTextureType::Type2D);
                    descriptor.setWidth(desc_ref.size.width as usize);
                    descriptor.setHeight(desc_ref.size.height as usize);
                    descriptor.setMipmapLevelCount(desc_ref.mip_level_count as usize);
                    descriptor.setPixelFormat(MTLPixelFormat::BGRA8Unorm);
                    descriptor.setUsage(usage);
                    descriptor.setStorageMode(MTLStorageMode::Private);

                    device.newTextureWithDescriptor_iosurface_plane(&descriptor, &io_surface, 0)
                });

                let Some(texture) = maybe_texture else {
                    let msg = c"Failed to create MTLTexture for swap chain";
                    gfx_critical_note(msg.as_ptr());
                    return false;
                };

                texture
            };

            if let Some(label) = &desc_ref.label {
                ProtocolObject::<dyn MTLResource>::from_ref(&*raw_texture)
                    .setLabel(Some(&NSString::from_str(label)));
            }

            let hal_texture = unsafe {
                <wgh::api::Metal as wgh::Api>::Device::texture_from_raw(
                    raw_texture,
                    wgt::TextureFormat::Bgra8Unorm,
                    MTLTextureType::Type2D,
                    1,
                    1,
                    wgh::CopyExtent {
                        width: desc.size.width,
                        height: desc.size.height,
                        depth: 1,
                    },
                )
            };

            let (_, error) = unsafe {
                self.create_texture_from_hal(
                    Box::new(hal_texture),
                    device_id,
                    &desc,
                    Some(texture_id),
                )
            };
            if let Some(err) = error {
                let msg =
                    CString::new(format!("create_texture_from_hal() failed: {:?}", err)).unwrap();
                unsafe {
                    gfx_critical_note(msg.as_ptr());
                }
                return false;
            }

            true
        }
    }
}
