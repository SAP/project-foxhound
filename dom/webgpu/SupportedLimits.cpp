/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SupportedLimits.h"

#include "Adapter.h"
#include "mozilla/dom/WebGPUBinding.h"

namespace mozilla::webgpu {

GPU_IMPL_CYCLE_COLLECTION(SupportedLimits, mParent)
GPU_IMPL_JS_WRAP(SupportedLimits)

SupportedLimits::SupportedLimits(Adapter* const aParent,
                                 const ffi::WGPULimits& aLimits)
    : ChildOf(aParent), mFfi(std::make_unique<ffi::WGPULimits>(aLimits)) {}

SupportedLimits::~SupportedLimits() = default;

uint64_t GetLimit(const ffi::WGPULimits& limits, const Limit limit) {
  switch (limit) {
    case Limit::MaxTextureDimension1D:
      return limits.max_texture_dimension_1d;
    case Limit::MaxTextureDimension2D:
      return limits.max_texture_dimension_2d;
    case Limit::MaxTextureDimension3D:
      return limits.max_texture_dimension_3d;
    case Limit::MaxTextureArrayLayers:
      return limits.max_texture_array_layers;
    case Limit::MaxBindGroups:
      return limits.max_bind_groups;
    case Limit::MaxBindGroupsPlusVertexBuffers:
      return limits.max_bind_groups_plus_vertex_buffers;
    case Limit::MaxBindingsPerBindGroup:
      return limits.max_bindings_per_bind_group;
    case Limit::MaxDynamicUniformBuffersPerPipelineLayout:
      return limits.max_dynamic_uniform_buffers_per_pipeline_layout;
    case Limit::MaxDynamicStorageBuffersPerPipelineLayout:
      return limits.max_dynamic_storage_buffers_per_pipeline_layout;
    case Limit::MaxSampledTexturesPerShaderStage:
      return limits.max_sampled_textures_per_shader_stage;
    case Limit::MaxSamplersPerShaderStage:
      return limits.max_samplers_per_shader_stage;
    // TODO(bug 2006720): `In*Stage` limits are not in ffi::WGPULimits; report
    // the per-stage limit instead.
    case Limit::MaxStorageBuffersInVertexStage:
    case Limit::MaxStorageBuffersInFragmentStage:
    case Limit::MaxStorageBuffersPerShaderStage:
      return limits.max_storage_buffers_per_shader_stage;
    // TODO(bug 2006720): `In*Stage` limits are not in ffi::WGPULimits; report
    // the per-stage limit instead.
    case Limit::MaxStorageTexturesInVertexStage:
    case Limit::MaxStorageTexturesInFragmentStage:
    case Limit::MaxStorageTexturesPerShaderStage:
      return limits.max_storage_textures_per_shader_stage;
    case Limit::MaxUniformBuffersPerShaderStage:
      return limits.max_uniform_buffers_per_shader_stage;
    case Limit::MaxUniformBufferBindingSize:
      return limits.max_uniform_buffer_binding_size;
    case Limit::MaxStorageBufferBindingSize:
      return limits.max_storage_buffer_binding_size;
    case Limit::MinUniformBufferOffsetAlignment:
      return limits.min_uniform_buffer_offset_alignment;
    case Limit::MinStorageBufferOffsetAlignment:
      return limits.min_storage_buffer_offset_alignment;
    case Limit::MaxVertexBuffers:
      return limits.max_vertex_buffers;
    case Limit::MaxBufferSize:
      return limits.max_buffer_size;
    case Limit::MaxVertexAttributes:
      return limits.max_vertex_attributes;
    case Limit::MaxVertexBufferArrayStride:
      return limits.max_vertex_buffer_array_stride;
    case Limit::MaxInterStageShaderVariables:
      return limits.max_inter_stage_shader_variables;
    case Limit::MaxColorAttachments:
      return limits.max_color_attachments;
    case Limit::MaxColorAttachmentBytesPerSample:
      return limits.max_color_attachment_bytes_per_sample;
    case Limit::MaxComputeWorkgroupStorageSize:
      return limits.max_compute_workgroup_storage_size;
    case Limit::MaxComputeInvocationsPerWorkgroup:
      return limits.max_compute_invocations_per_workgroup;
    case Limit::MaxComputeWorkgroupSizeX:
      return limits.max_compute_workgroup_size_x;
    case Limit::MaxComputeWorkgroupSizeY:
      return limits.max_compute_workgroup_size_y;
    case Limit::MaxComputeWorkgroupSizeZ:
      return limits.max_compute_workgroup_size_z;
    case Limit::MaxComputeWorkgroupsPerDimension:
      return limits.max_compute_workgroups_per_dimension;
  }
  MOZ_CRASH("Bad Limit");
}

void SetLimit(ffi::WGPULimits* const limits, const Limit limit,
              const uint64_t val) {
  switch (limit) {
    case Limit::MaxTextureDimension1D:
      limits->max_texture_dimension_1d = val;
      return;
    case Limit::MaxTextureDimension2D:
      limits->max_texture_dimension_2d = val;
      return;
    case Limit::MaxTextureDimension3D:
      limits->max_texture_dimension_3d = val;
      return;
    case Limit::MaxTextureArrayLayers:
      limits->max_texture_array_layers = val;
      return;
    case Limit::MaxBindGroups:
      limits->max_bind_groups = val;
      return;
    case Limit::MaxBindGroupsPlusVertexBuffers:
      limits->max_bind_groups_plus_vertex_buffers = val;
      return;
    case Limit::MaxBindingsPerBindGroup:
      limits->max_bindings_per_bind_group = val;
      return;
    case Limit::MaxDynamicUniformBuffersPerPipelineLayout:
      limits->max_dynamic_uniform_buffers_per_pipeline_layout = val;
      return;
    case Limit::MaxDynamicStorageBuffersPerPipelineLayout:
      limits->max_dynamic_storage_buffers_per_pipeline_layout = val;
      return;
    case Limit::MaxSampledTexturesPerShaderStage:
      limits->max_sampled_textures_per_shader_stage = val;
      return;
    case Limit::MaxSamplersPerShaderStage:
      limits->max_samplers_per_shader_stage = val;
      return;
    case Limit::MaxStorageBuffersInVertexStage:
    case Limit::MaxStorageBuffersInFragmentStage:
      // TODO(bug 2006720): Not in ffi::WGPULimits.
      return;
    case Limit::MaxStorageBuffersPerShaderStage:
      limits->max_storage_buffers_per_shader_stage = val;
      return;
    case Limit::MaxStorageTexturesInVertexStage:
    case Limit::MaxStorageTexturesInFragmentStage:
      // TODO(bug 2006720): Not in ffi::WGPULimits.
      return;
    case Limit::MaxStorageTexturesPerShaderStage:
      limits->max_storage_textures_per_shader_stage = val;
      return;
    case Limit::MaxUniformBuffersPerShaderStage:
      limits->max_uniform_buffers_per_shader_stage = val;
      return;
    case Limit::MaxUniformBufferBindingSize:
      limits->max_uniform_buffer_binding_size = val;
      return;
    case Limit::MaxStorageBufferBindingSize:
      limits->max_storage_buffer_binding_size = val;
      return;
    case Limit::MinUniformBufferOffsetAlignment:
      limits->min_uniform_buffer_offset_alignment = val;
      return;
    case Limit::MinStorageBufferOffsetAlignment:
      limits->min_storage_buffer_offset_alignment = val;
      return;
    case Limit::MaxVertexBuffers:
      limits->max_vertex_buffers = val;
      return;
    case Limit::MaxBufferSize:
      limits->max_buffer_size = val;
      return;
    case Limit::MaxVertexAttributes:
      limits->max_vertex_attributes = val;
      return;
    case Limit::MaxVertexBufferArrayStride:
      limits->max_vertex_buffer_array_stride = val;
      return;
    case Limit::MaxInterStageShaderVariables:
      limits->max_inter_stage_shader_variables = val;
      return;
    case Limit::MaxColorAttachments:
      limits->max_color_attachments = val;
      return;
    case Limit::MaxColorAttachmentBytesPerSample:
      limits->max_color_attachment_bytes_per_sample = val;
      return;
    case Limit::MaxComputeWorkgroupStorageSize:
      limits->max_compute_workgroup_storage_size = val;
      return;
    case Limit::MaxComputeInvocationsPerWorkgroup:
      limits->max_compute_invocations_per_workgroup = val;
      return;
    case Limit::MaxComputeWorkgroupSizeX:
      limits->max_compute_workgroup_size_x = val;
      return;
    case Limit::MaxComputeWorkgroupSizeY:
      limits->max_compute_workgroup_size_y = val;
      return;
    case Limit::MaxComputeWorkgroupSizeZ:
      limits->max_compute_workgroup_size_z = val;
      return;
    case Limit::MaxComputeWorkgroupsPerDimension:
      limits->max_compute_workgroups_per_dimension = val;
      return;
  }
  MOZ_CRASH("Bad Limit");
}

}  // namespace mozilla::webgpu
