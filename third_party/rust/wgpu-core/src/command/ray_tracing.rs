use alloc::{boxed::Box, sync::Arc, vec::Vec};
use core::{
    cmp::max,
    num::NonZeroU64,
    ops::{Deref, Range},
    sync::atomic::Ordering,
};

use wgt::{math::align_to, BufferUsages, BufferUses, Features};

use crate::{
    command::CommandBufferMutable,
    device::queue::TempResource,
    global::Global,
    hub::Hub,
    id::CommandEncoderId,
    init_tracker::MemoryInitKind,
    ray_tracing::{
        BlasAction, BlasBuildEntry, BlasGeometries, BlasTriangleGeometry,
        BuildAccelerationStructureError, TlasAction, TlasBuildEntry, TlasInstance, TlasPackage,
        TraceBlasBuildEntry, TraceBlasGeometries, TraceBlasTriangleGeometry, TraceTlasInstance,
        TraceTlasPackage, ValidateBlasActionsError, ValidateTlasActionsError,
    },
    resource::{AccelerationStructure, Blas, Buffer, Labeled, StagingBuffer, Tlas, Trackable},
    scratch::ScratchBuffer,
    snatch::SnatchGuard,
    track::PendingTransition,
    FastHashSet,
};

struct TriangleBufferStore<'a> {
    vertex_buffer: Arc<Buffer>,
    vertex_transition: Option<PendingTransition<BufferUses>>,
    index_buffer_transition: Option<(Arc<Buffer>, Option<PendingTransition<BufferUses>>)>,
    transform_buffer_transition: Option<(Arc<Buffer>, Option<PendingTransition<BufferUses>>)>,
    geometry: BlasTriangleGeometry<'a>,
    ending_blas: Option<Arc<Blas>>,
}

struct BlasStore<'a> {
    blas: Arc<Blas>,
    entries: hal::AccelerationStructureEntries<'a, dyn hal::DynBuffer>,
    scratch_buffer_offset: u64,
}

struct UnsafeTlasStore<'a> {
    tlas: Arc<Tlas>,
    entries: hal::AccelerationStructureEntries<'a, dyn hal::DynBuffer>,
    scratch_buffer_offset: u64,
}

struct TlasStore<'a> {
    internal: UnsafeTlasStore<'a>,
    range: Range<usize>,
}

struct TlasBufferStore {
    buffer: Arc<Buffer>,
    transition: Option<PendingTransition<BufferUses>>,
    entry: TlasBuildEntry,
}

impl Global {
    // Currently this function is very similar to its safe counterpart, however certain parts of it are very different,
    // making for the two to be implemented differently, the main difference is this function has separate buffers for each
    // of the TLAS instances while the other has one large buffer
    // TODO: reconsider this function's usefulness once blas and tlas `as_hal` are added and some time has passed.
    pub fn command_encoder_build_acceleration_structures_unsafe_tlas<'a>(
        &self,
        command_encoder_id: CommandEncoderId,
        blas_iter: impl Iterator<Item = BlasBuildEntry<'a>>,
        tlas_iter: impl Iterator<Item = TlasBuildEntry>,
    ) -> Result<(), BuildAccelerationStructureError> {
        profiling::scope!("CommandEncoder::build_acceleration_structures_unsafe_tlas");

        let hub = &self.hub;

        let cmd_buf = hub
            .command_buffers
            .get(command_encoder_id.into_command_buffer_id());

        let device = &cmd_buf.device;

        device.require_features(Features::EXPERIMENTAL_RAY_TRACING_ACCELERATION_STRUCTURE)?;

        let build_command_index = NonZeroU64::new(
            device
                .last_acceleration_structure_build_command_index
                .fetch_add(1, Ordering::Relaxed),
        )
        .unwrap();

        #[cfg(feature = "trace")]
        let trace_blas: Vec<TraceBlasBuildEntry> = blas_iter
            .map(|blas_entry| {
                let geometries = match blas_entry.geometries {
                    BlasGeometries::TriangleGeometries(triangle_geometries) => {
                        TraceBlasGeometries::TriangleGeometries(
                            triangle_geometries
                                .map(|tg| TraceBlasTriangleGeometry {
                                    size: tg.size.clone(),
                                    vertex_buffer: tg.vertex_buffer,
                                    index_buffer: tg.index_buffer,
                                    transform_buffer: tg.transform_buffer,
                                    first_vertex: tg.first_vertex,
                                    vertex_stride: tg.vertex_stride,
                                    first_index: tg.first_index,
                                    transform_buffer_offset: tg.transform_buffer_offset,
                                })
                                .collect(),
                        )
                    }
                };
                TraceBlasBuildEntry {
                    blas_id: blas_entry.blas_id,
                    geometries,
                }
            })
            .collect();

        #[cfg(feature = "trace")]
        let trace_tlas: Vec<TlasBuildEntry> = tlas_iter.collect();
        #[cfg(feature = "trace")]
        if let Some(ref mut list) = cmd_buf.data.lock().get_inner()?.commands {
            list.push(
                crate::device::trace::Command::BuildAccelerationStructuresUnsafeTlas {
                    blas: trace_blas.clone(),
                    tlas: trace_tlas.clone(),
                },
            );
            if !trace_tlas.is_empty() {
                log::warn!("a trace of command_encoder_build_acceleration_structures_unsafe_tlas containing a tlas build is not replayable!");
            }
        }

        #[cfg(feature = "trace")]
        let blas_iter = trace_blas.iter().map(|blas_entry| {
            let geometries = match &blas_entry.geometries {
                TraceBlasGeometries::TriangleGeometries(triangle_geometries) => {
                    let iter = triangle_geometries.iter().map(|tg| BlasTriangleGeometry {
                        size: &tg.size,
                        vertex_buffer: tg.vertex_buffer,
                        index_buffer: tg.index_buffer,
                        transform_buffer: tg.transform_buffer,
                        first_vertex: tg.first_vertex,
                        vertex_stride: tg.vertex_stride,
                        first_index: tg.first_index,
                        transform_buffer_offset: tg.transform_buffer_offset,
                    });
                    BlasGeometries::TriangleGeometries(Box::new(iter))
                }
            };
            BlasBuildEntry {
                blas_id: blas_entry.blas_id,
                geometries,
            }
        });

        #[cfg(feature = "trace")]
        let tlas_iter = trace_tlas.iter();

        let mut input_barriers = Vec::<hal::BufferBarrier<dyn hal::DynBuffer>>::new();
        let mut buf_storage = Vec::new();

        let mut scratch_buffer_blas_size = 0;
        let mut blas_storage = Vec::new();
        let mut cmd_buf_data = cmd_buf.data.lock();
        let mut cmd_buf_data_guard = cmd_buf_data.record()?;
        let cmd_buf_data = &mut *cmd_buf_data_guard;

        iter_blas(
            blas_iter,
            cmd_buf_data,
            build_command_index,
            &mut buf_storage,
            hub,
        )?;

        let snatch_guard = device.snatchable_lock.read();
        iter_buffers(
            &mut buf_storage,
            &snatch_guard,
            &mut input_barriers,
            cmd_buf_data,
            &mut scratch_buffer_blas_size,
            &mut blas_storage,
            hub,
            device.alignments.ray_tracing_scratch_buffer_alignment,
        )?;

        let mut scratch_buffer_tlas_size = 0;
        let mut tlas_storage = Vec::<UnsafeTlasStore>::new();
        let mut tlas_buf_storage = Vec::new();

        for entry in tlas_iter {
            let instance_buffer = hub.buffers.get(entry.instance_buffer_id).get()?;
            let data = cmd_buf_data.trackers.buffers.set_single(
                &instance_buffer,
                BufferUses::BOTTOM_LEVEL_ACCELERATION_STRUCTURE_INPUT,
            );
            tlas_buf_storage.push(TlasBufferStore {
                buffer: instance_buffer,
                transition: data,
                entry: entry.clone(),
            });
        }

        for tlas_buf in &mut tlas_buf_storage {
            let entry = &tlas_buf.entry;
            let instance_buffer = {
                let (instance_buffer, instance_pending) =
                    (&mut tlas_buf.buffer, &mut tlas_buf.transition);
                let instance_raw = instance_buffer.try_raw(&snatch_guard)?;
                instance_buffer.check_usage(BufferUsages::TLAS_INPUT)?;

                if let Some(barrier) = instance_pending
                    .take()
                    .map(|pending| pending.into_hal(instance_buffer, &snatch_guard))
                {
                    input_barriers.push(barrier);
                }
                instance_raw
            };

            let tlas = hub.tlas_s.get(entry.tlas_id).get()?;
            cmd_buf_data.trackers.tlas_s.insert_single(tlas.clone());

            cmd_buf_data.tlas_actions.push(TlasAction {
                tlas: tlas.clone(),
                kind: crate::ray_tracing::TlasActionKind::Build {
                    build_index: build_command_index,
                    dependencies: Vec::new(),
                },
            });

            let scratch_buffer_offset = scratch_buffer_tlas_size;
            scratch_buffer_tlas_size += align_to(
                tlas.size_info.build_scratch_size as u32,
                device.alignments.ray_tracing_scratch_buffer_alignment,
            ) as u64;

            tlas_storage.push(UnsafeTlasStore {
                tlas,
                entries: hal::AccelerationStructureEntries::Instances(
                    hal::AccelerationStructureInstances {
                        buffer: Some(instance_buffer),
                        offset: 0,
                        count: entry.instance_count,
                    },
                ),
                scratch_buffer_offset,
            });
        }

        let scratch_size =
            match wgt::BufferSize::new(max(scratch_buffer_blas_size, scratch_buffer_tlas_size)) {
                None => {
                    cmd_buf_data_guard.mark_successful();
                    return Ok(());
                }
                Some(size) => size,
            };

        let scratch_buffer = ScratchBuffer::new(device, scratch_size)?;

        let scratch_buffer_barrier = hal::BufferBarrier::<dyn hal::DynBuffer> {
            buffer: scratch_buffer.raw(),
            usage: hal::StateTransition {
                from: BufferUses::ACCELERATION_STRUCTURE_SCRATCH,
                to: BufferUses::ACCELERATION_STRUCTURE_SCRATCH,
            },
        };

        let mut tlas_descriptors = Vec::new();

        for UnsafeTlasStore {
            tlas,
            entries,
            scratch_buffer_offset,
        } in &tlas_storage
        {
            if tlas.update_mode == wgt::AccelerationStructureUpdateMode::PreferUpdate {
                log::info!("only rebuild implemented")
            }
            tlas_descriptors.push(hal::BuildAccelerationStructureDescriptor {
                entries,
                mode: hal::AccelerationStructureBuildMode::Build,
                flags: tlas.flags,
                source_acceleration_structure: None,
                destination_acceleration_structure: tlas.try_raw(&snatch_guard)?,
                scratch_buffer: scratch_buffer.raw(),
                scratch_buffer_offset: *scratch_buffer_offset,
            })
        }

        let blas_present = !blas_storage.is_empty();
        let tlas_present = !tlas_storage.is_empty();

        let cmd_buf_raw = cmd_buf_data.encoder.open()?;

        let mut descriptors = Vec::new();

        for storage in &blas_storage {
            descriptors.push(map_blas(storage, scratch_buffer.raw(), &snatch_guard)?);
        }

        build_blas(
            cmd_buf_raw,
            blas_present,
            tlas_present,
            input_barriers,
            &descriptors,
            scratch_buffer_barrier,
        );

        if tlas_present {
            unsafe {
                cmd_buf_raw.build_acceleration_structures(&tlas_descriptors);

                cmd_buf_raw.place_acceleration_structure_barrier(
                    hal::AccelerationStructureBarrier {
                        usage: hal::StateTransition {
                            from: hal::AccelerationStructureUses::BUILD_OUTPUT,
                            to: hal::AccelerationStructureUses::SHADER_INPUT,
                        },
                    },
                );
            }
        }

        cmd_buf_data
            .temp_resources
            .push(TempResource::ScratchBuffer(scratch_buffer));

        cmd_buf_data_guard.mark_successful();
        Ok(())
    }

    pub fn command_encoder_build_acceleration_structures<'a>(
        &self,
        command_encoder_id: CommandEncoderId,
        blas_iter: impl Iterator<Item = BlasBuildEntry<'a>>,
        tlas_iter: impl Iterator<Item = TlasPackage<'a>>,
    ) -> Result<(), BuildAccelerationStructureError> {
        profiling::scope!("CommandEncoder::build_acceleration_structures");

        let hub = &self.hub;

        let cmd_buf = hub
            .command_buffers
            .get(command_encoder_id.into_command_buffer_id());

        let device = &cmd_buf.device;

        device.require_features(Features::EXPERIMENTAL_RAY_TRACING_ACCELERATION_STRUCTURE)?;

        let build_command_index = NonZeroU64::new(
            device
                .last_acceleration_structure_build_command_index
                .fetch_add(1, Ordering::Relaxed),
        )
        .unwrap();

        let trace_blas: Vec<TraceBlasBuildEntry> = blas_iter
            .map(|blas_entry| {
                let geometries = match blas_entry.geometries {
                    BlasGeometries::TriangleGeometries(triangle_geometries) => {
                        TraceBlasGeometries::TriangleGeometries(
                            triangle_geometries
                                .map(|tg| TraceBlasTriangleGeometry {
                                    size: tg.size.clone(),
                                    vertex_buffer: tg.vertex_buffer,
                                    index_buffer: tg.index_buffer,
                                    transform_buffer: tg.transform_buffer,
                                    first_vertex: tg.first_vertex,
                                    vertex_stride: tg.vertex_stride,
                                    first_index: tg.first_index,
                                    transform_buffer_offset: tg.transform_buffer_offset,
                                })
                                .collect(),
                        )
                    }
                };
                TraceBlasBuildEntry {
                    blas_id: blas_entry.blas_id,
                    geometries,
                }
            })
            .collect();

        let trace_tlas: Vec<TraceTlasPackage> = tlas_iter
            .map(|package: TlasPackage| {
                let instances = package
                    .instances
                    .map(|instance| {
                        instance.map(|instance| TraceTlasInstance {
                            blas_id: instance.blas_id,
                            transform: *instance.transform,
                            custom_data: instance.custom_data,
                            mask: instance.mask,
                        })
                    })
                    .collect();
                TraceTlasPackage {
                    tlas_id: package.tlas_id,
                    instances,
                    lowest_unmodified: package.lowest_unmodified,
                }
            })
            .collect();

        #[cfg(feature = "trace")]
        if let Some(ref mut list) = cmd_buf.data.lock().get_inner()?.commands {
            list.push(crate::device::trace::Command::BuildAccelerationStructures {
                blas: trace_blas.clone(),
                tlas: trace_tlas.clone(),
            });
        }

        let blas_iter = trace_blas.iter().map(|blas_entry| {
            let geometries = match &blas_entry.geometries {
                TraceBlasGeometries::TriangleGeometries(triangle_geometries) => {
                    let iter = triangle_geometries.iter().map(|tg| BlasTriangleGeometry {
                        size: &tg.size,
                        vertex_buffer: tg.vertex_buffer,
                        index_buffer: tg.index_buffer,
                        transform_buffer: tg.transform_buffer,
                        first_vertex: tg.first_vertex,
                        vertex_stride: tg.vertex_stride,
                        first_index: tg.first_index,
                        transform_buffer_offset: tg.transform_buffer_offset,
                    });
                    BlasGeometries::TriangleGeometries(Box::new(iter))
                }
            };
            BlasBuildEntry {
                blas_id: blas_entry.blas_id,
                geometries,
            }
        });

        let tlas_iter = trace_tlas.iter().map(|tlas_package| {
            let instances = tlas_package.instances.iter().map(|instance| {
                instance.as_ref().map(|instance| TlasInstance {
                    blas_id: instance.blas_id,
                    transform: &instance.transform,
                    custom_data: instance.custom_data,
                    mask: instance.mask,
                })
            });
            TlasPackage {
                tlas_id: tlas_package.tlas_id,
                instances: Box::new(instances),
                lowest_unmodified: tlas_package.lowest_unmodified,
            }
        });

        let mut input_barriers = Vec::<hal::BufferBarrier<dyn hal::DynBuffer>>::new();
        let mut buf_storage = Vec::new();

        let mut scratch_buffer_blas_size = 0;
        let mut blas_storage = Vec::new();
        let mut cmd_buf_data = cmd_buf.data.lock();
        let mut cmd_buf_data_guard = cmd_buf_data.record()?;
        let cmd_buf_data = &mut *cmd_buf_data_guard;

        iter_blas(
            blas_iter,
            cmd_buf_data,
            build_command_index,
            &mut buf_storage,
            hub,
        )?;

        let snatch_guard = device.snatchable_lock.read();
        iter_buffers(
            &mut buf_storage,
            &snatch_guard,
            &mut input_barriers,
            cmd_buf_data,
            &mut scratch_buffer_blas_size,
            &mut blas_storage,
            hub,
            device.alignments.ray_tracing_scratch_buffer_alignment,
        )?;
        let mut tlas_lock_store = Vec::<(Option<TlasPackage>, Arc<Tlas>)>::new();

        for package in tlas_iter {
            let tlas = hub.tlas_s.get(package.tlas_id).get()?;

            cmd_buf_data.trackers.tlas_s.insert_single(tlas.clone());

            tlas_lock_store.push((Some(package), tlas))
        }

        let mut scratch_buffer_tlas_size = 0;
        let mut tlas_storage = Vec::<TlasStore>::new();
        let mut instance_buffer_staging_source = Vec::<u8>::new();

        for (package, tlas) in &mut tlas_lock_store {
            let package = package.take().unwrap();

            let scratch_buffer_offset = scratch_buffer_tlas_size;
            scratch_buffer_tlas_size += align_to(
                tlas.size_info.build_scratch_size as u32,
                device.alignments.ray_tracing_scratch_buffer_alignment,
            ) as u64;

            let first_byte_index = instance_buffer_staging_source.len();

            let mut dependencies = Vec::new();

            let mut instance_count = 0;
            for instance in package.instances.flatten() {
                if instance.custom_data >= (1u32 << 24u32) {
                    return Err(BuildAccelerationStructureError::TlasInvalidCustomIndex(
                        tlas.error_ident(),
                    ));
                }
                let blas = hub.blas_s.get(instance.blas_id).get()?;

                cmd_buf_data.trackers.blas_s.insert_single(blas.clone());

                instance_buffer_staging_source.extend(device.raw().tlas_instance_to_bytes(
                    hal::TlasInstance {
                        transform: *instance.transform,
                        custom_data: instance.custom_data,
                        mask: instance.mask,
                        blas_address: blas.handle,
                    },
                ));

                instance_count += 1;

                dependencies.push(blas.clone());

                cmd_buf_data.blas_actions.push(BlasAction {
                    blas,
                    kind: crate::ray_tracing::BlasActionKind::Use,
                });
            }

            cmd_buf_data.tlas_actions.push(TlasAction {
                tlas: tlas.clone(),
                kind: crate::ray_tracing::TlasActionKind::Build {
                    build_index: build_command_index,
                    dependencies,
                },
            });

            if instance_count > tlas.max_instance_count {
                return Err(BuildAccelerationStructureError::TlasInstanceCountExceeded(
                    tlas.error_ident(),
                    instance_count,
                    tlas.max_instance_count,
                ));
            }

            tlas_storage.push(TlasStore {
                internal: UnsafeTlasStore {
                    tlas: tlas.clone(),
                    entries: hal::AccelerationStructureEntries::Instances(
                        hal::AccelerationStructureInstances {
                            buffer: Some(tlas.instance_buffer.as_ref()),
                            offset: 0,
                            count: instance_count,
                        },
                    ),
                    scratch_buffer_offset,
                },
                range: first_byte_index..instance_buffer_staging_source.len(),
            });
        }

        let scratch_size =
            match wgt::BufferSize::new(max(scratch_buffer_blas_size, scratch_buffer_tlas_size)) {
                // if the size is zero there is nothing to build
                None => {
                    cmd_buf_data_guard.mark_successful();
                    return Ok(());
                }
                Some(size) => size,
            };

        let scratch_buffer = ScratchBuffer::new(device, scratch_size)?;

        let scratch_buffer_barrier = hal::BufferBarrier::<dyn hal::DynBuffer> {
            buffer: scratch_buffer.raw(),
            usage: hal::StateTransition {
                from: BufferUses::ACCELERATION_STRUCTURE_SCRATCH,
                to: BufferUses::ACCELERATION_STRUCTURE_SCRATCH,
            },
        };

        let mut tlas_descriptors = Vec::with_capacity(tlas_storage.len());

        for &TlasStore {
            internal:
                UnsafeTlasStore {
                    ref tlas,
                    ref entries,
                    ref scratch_buffer_offset,
                },
            ..
        } in &tlas_storage
        {
            if tlas.update_mode == wgt::AccelerationStructureUpdateMode::PreferUpdate {
                log::info!("only rebuild implemented")
            }
            tlas_descriptors.push(hal::BuildAccelerationStructureDescriptor {
                entries,
                mode: hal::AccelerationStructureBuildMode::Build,
                flags: tlas.flags,
                source_acceleration_structure: None,
                destination_acceleration_structure: tlas.try_raw(&snatch_guard)?,
                scratch_buffer: scratch_buffer.raw(),
                scratch_buffer_offset: *scratch_buffer_offset,
            })
        }

        let blas_present = !blas_storage.is_empty();
        let tlas_present = !tlas_storage.is_empty();

        let cmd_buf_raw = cmd_buf_data.encoder.open()?;

        let mut descriptors = Vec::new();

        for storage in &blas_storage {
            descriptors.push(map_blas(storage, scratch_buffer.raw(), &snatch_guard)?);
        }

        build_blas(
            cmd_buf_raw,
            blas_present,
            tlas_present,
            input_barriers,
            &descriptors,
            scratch_buffer_barrier,
        );

        if tlas_present {
            let staging_buffer = if !instance_buffer_staging_source.is_empty() {
                let mut staging_buffer = StagingBuffer::new(
                    device,
                    wgt::BufferSize::new(instance_buffer_staging_source.len() as u64).unwrap(),
                )?;
                staging_buffer.write(&instance_buffer_staging_source);
                let flushed = staging_buffer.flush();
                Some(flushed)
            } else {
                None
            };

            unsafe {
                if let Some(ref staging_buffer) = staging_buffer {
                    cmd_buf_raw.transition_buffers(&[hal::BufferBarrier::<dyn hal::DynBuffer> {
                        buffer: staging_buffer.raw(),
                        usage: hal::StateTransition {
                            from: BufferUses::MAP_WRITE,
                            to: BufferUses::COPY_SRC,
                        },
                    }]);
                }
            }

            let mut instance_buffer_barriers = Vec::new();
            for &TlasStore {
                internal: UnsafeTlasStore { ref tlas, .. },
                ref range,
            } in &tlas_storage
            {
                let size = match wgt::BufferSize::new((range.end - range.start) as u64) {
                    None => continue,
                    Some(size) => size,
                };
                instance_buffer_barriers.push(hal::BufferBarrier::<dyn hal::DynBuffer> {
                    buffer: tlas.instance_buffer.as_ref(),
                    usage: hal::StateTransition {
                        from: BufferUses::COPY_DST,
                        to: BufferUses::TOP_LEVEL_ACCELERATION_STRUCTURE_INPUT,
                    },
                });
                unsafe {
                    cmd_buf_raw.transition_buffers(&[hal::BufferBarrier::<dyn hal::DynBuffer> {
                        buffer: tlas.instance_buffer.as_ref(),
                        usage: hal::StateTransition {
                            from: BufferUses::MAP_READ,
                            to: BufferUses::COPY_DST,
                        },
                    }]);
                    let temp = hal::BufferCopy {
                        src_offset: range.start as u64,
                        dst_offset: 0,
                        size,
                    };
                    cmd_buf_raw.copy_buffer_to_buffer(
                        // the range whose size we just checked end is at (at that point in time) instance_buffer_staging_source.len()
                        // and since instance_buffer_staging_source doesn't shrink we can un wrap this without a panic
                        staging_buffer.as_ref().unwrap().raw(),
                        tlas.instance_buffer.as_ref(),
                        &[temp],
                    );
                }
            }

            unsafe {
                cmd_buf_raw.transition_buffers(&instance_buffer_barriers);

                cmd_buf_raw.build_acceleration_structures(&tlas_descriptors);

                cmd_buf_raw.place_acceleration_structure_barrier(
                    hal::AccelerationStructureBarrier {
                        usage: hal::StateTransition {
                            from: hal::AccelerationStructureUses::BUILD_OUTPUT,
                            to: hal::AccelerationStructureUses::SHADER_INPUT,
                        },
                    },
                );
            }

            if let Some(staging_buffer) = staging_buffer {
                cmd_buf_data
                    .temp_resources
                    .push(TempResource::StagingBuffer(staging_buffer));
            }
        }

        cmd_buf_data
            .temp_resources
            .push(TempResource::ScratchBuffer(scratch_buffer));

        cmd_buf_data_guard.mark_successful();
        Ok(())
    }
}

impl CommandBufferMutable {
    // makes sure a blas is build before it is used
    pub(crate) fn validate_blas_actions(&self) -> Result<(), ValidateBlasActionsError> {
        profiling::scope!("CommandEncoder::[submission]::validate_blas_actions");
        let mut built = FastHashSet::default();
        for action in &self.blas_actions {
            match &action.kind {
                crate::ray_tracing::BlasActionKind::Build(id) => {
                    built.insert(action.blas.tracker_index());
                    *action.blas.built_index.write() = Some(*id);
                }
                crate::ray_tracing::BlasActionKind::Use => {
                    if !built.contains(&action.blas.tracker_index())
                        && (*action.blas.built_index.read()).is_none()
                    {
                        return Err(ValidateBlasActionsError::UsedUnbuilt(
                            action.blas.error_ident(),
                        ));
                    }
                }
            }
        }
        Ok(())
    }

    // makes sure a tlas is built before it is used
    pub(crate) fn validate_tlas_actions(
        &self,
        snatch_guard: &SnatchGuard,
    ) -> Result<(), ValidateTlasActionsError> {
        profiling::scope!("CommandEncoder::[submission]::validate_tlas_actions");
        for action in &self.tlas_actions {
            match &action.kind {
                crate::ray_tracing::TlasActionKind::Build {
                    build_index,
                    dependencies,
                } => {
                    *action.tlas.built_index.write() = Some(*build_index);
                    action.tlas.dependencies.write().clone_from(dependencies);
                }
                crate::ray_tracing::TlasActionKind::Use => {
                    let tlas_build_index = action.tlas.built_index.read();
                    let dependencies = action.tlas.dependencies.read();

                    if (*tlas_build_index).is_none() {
                        return Err(ValidateTlasActionsError::UsedUnbuilt(
                            action.tlas.error_ident(),
                        ));
                    }
                    for blas in dependencies.deref() {
                        let blas_build_index = *blas.built_index.read();
                        if blas_build_index.is_none() {
                            return Err(ValidateTlasActionsError::UsedUnbuiltBlas(
                                action.tlas.error_ident(),
                                blas.error_ident(),
                            ));
                        }
                        if blas_build_index.unwrap() > tlas_build_index.unwrap() {
                            return Err(ValidateTlasActionsError::BlasNewerThenTlas(
                                blas.error_ident(),
                                action.tlas.error_ident(),
                            ));
                        }
                        blas.try_raw(snatch_guard)?;
                    }
                }
            }
        }
        Ok(())
    }
}

///iterates over the blas iterator, and it's geometry, pushing the buffers into a storage vector (and also some validation).
fn iter_blas<'a>(
    blas_iter: impl Iterator<Item = BlasBuildEntry<'a>>,
    cmd_buf_data: &mut CommandBufferMutable,
    build_command_index: NonZeroU64,
    buf_storage: &mut Vec<TriangleBufferStore<'a>>,
    hub: &Hub,
) -> Result<(), BuildAccelerationStructureError> {
    let mut temp_buffer = Vec::new();
    for entry in blas_iter {
        let blas = hub.blas_s.get(entry.blas_id).get()?;
        cmd_buf_data.trackers.blas_s.insert_single(blas.clone());

        cmd_buf_data.blas_actions.push(BlasAction {
            blas: blas.clone(),
            kind: crate::ray_tracing::BlasActionKind::Build(build_command_index),
        });

        match entry.geometries {
            BlasGeometries::TriangleGeometries(triangle_geometries) => {
                for (i, mesh) in triangle_geometries.enumerate() {
                    let size_desc = match &blas.sizes {
                        wgt::BlasGeometrySizeDescriptors::Triangles { descriptors } => descriptors,
                    };
                    if i >= size_desc.len() {
                        return Err(BuildAccelerationStructureError::IncompatibleBlasBuildSizes(
                            blas.error_ident(),
                        ));
                    }
                    let size_desc = &size_desc[i];

                    if size_desc.flags != mesh.size.flags {
                        return Err(BuildAccelerationStructureError::IncompatibleBlasFlags(
                            blas.error_ident(),
                            size_desc.flags,
                            mesh.size.flags,
                        ));
                    }

                    if size_desc.vertex_count < mesh.size.vertex_count {
                        return Err(
                            BuildAccelerationStructureError::IncompatibleBlasVertexCount(
                                blas.error_ident(),
                                size_desc.vertex_count,
                                mesh.size.vertex_count,
                            ),
                        );
                    }

                    if size_desc.vertex_format != mesh.size.vertex_format {
                        return Err(BuildAccelerationStructureError::DifferentBlasVertexFormats(
                            blas.error_ident(),
                            size_desc.vertex_format,
                            mesh.size.vertex_format,
                        ));
                    }

                    match (size_desc.index_count, mesh.size.index_count) {
                        (Some(_), None) | (None, Some(_)) => {
                            return Err(
                                BuildAccelerationStructureError::BlasIndexCountProvidedMismatch(
                                    blas.error_ident(),
                                ),
                            )
                        }
                        (Some(create), Some(build)) if create < build => {
                            return Err(
                                BuildAccelerationStructureError::IncompatibleBlasIndexCount(
                                    blas.error_ident(),
                                    create,
                                    build,
                                ),
                            )
                        }
                        _ => {}
                    }

                    if size_desc.index_format != mesh.size.index_format {
                        return Err(BuildAccelerationStructureError::DifferentBlasIndexFormats(
                            blas.error_ident(),
                            size_desc.index_format,
                            mesh.size.index_format,
                        ));
                    }

                    if size_desc.index_count.is_some() && mesh.index_buffer.is_none() {
                        return Err(BuildAccelerationStructureError::MissingIndexBuffer(
                            blas.error_ident(),
                        ));
                    }
                    let vertex_buffer = hub.buffers.get(mesh.vertex_buffer).get()?;
                    let vertex_pending = cmd_buf_data.trackers.buffers.set_single(
                        &vertex_buffer,
                        BufferUses::BOTTOM_LEVEL_ACCELERATION_STRUCTURE_INPUT,
                    );
                    let index_data = if let Some(index_id) = mesh.index_buffer {
                        let index_buffer = hub.buffers.get(index_id).get()?;
                        if mesh.first_index.is_none()
                            || mesh.size.index_count.is_none()
                            || mesh.size.index_count.is_none()
                        {
                            return Err(BuildAccelerationStructureError::MissingAssociatedData(
                                index_buffer.error_ident(),
                            ));
                        }
                        let data = cmd_buf_data.trackers.buffers.set_single(
                            &index_buffer,
                            BufferUses::BOTTOM_LEVEL_ACCELERATION_STRUCTURE_INPUT,
                        );
                        Some((index_buffer, data))
                    } else {
                        None
                    };
                    let transform_data = if let Some(transform_id) = mesh.transform_buffer {
                        if !blas
                            .flags
                            .contains(wgt::AccelerationStructureFlags::USE_TRANSFORM)
                        {
                            return Err(BuildAccelerationStructureError::UseTransformMissing(
                                blas.error_ident(),
                            ));
                        }
                        let transform_buffer = hub.buffers.get(transform_id).get()?;
                        if mesh.transform_buffer_offset.is_none() {
                            return Err(BuildAccelerationStructureError::MissingAssociatedData(
                                transform_buffer.error_ident(),
                            ));
                        }
                        let data = cmd_buf_data.trackers.buffers.set_single(
                            &transform_buffer,
                            BufferUses::BOTTOM_LEVEL_ACCELERATION_STRUCTURE_INPUT,
                        );
                        Some((transform_buffer, data))
                    } else {
                        if blas
                            .flags
                            .contains(wgt::AccelerationStructureFlags::USE_TRANSFORM)
                        {
                            return Err(BuildAccelerationStructureError::TransformMissing(
                                blas.error_ident(),
                            ));
                        }
                        None
                    };
                    temp_buffer.push(TriangleBufferStore {
                        vertex_buffer,
                        vertex_transition: vertex_pending,
                        index_buffer_transition: index_data,
                        transform_buffer_transition: transform_data,
                        geometry: mesh,
                        ending_blas: None,
                    });
                }

                if let Some(last) = temp_buffer.last_mut() {
                    last.ending_blas = Some(blas);
                    buf_storage.append(&mut temp_buffer);
                }
            }
        }
    }
    Ok(())
}

/// Iterates over the buffers generated in [iter_blas], convert the barriers into hal barriers, and the triangles into [hal::AccelerationStructureEntries] (and also some validation).
fn iter_buffers<'a, 'b>(
    buf_storage: &'a mut Vec<TriangleBufferStore<'b>>,
    snatch_guard: &'a SnatchGuard,
    input_barriers: &mut Vec<hal::BufferBarrier<'a, dyn hal::DynBuffer>>,
    cmd_buf_data: &mut CommandBufferMutable,
    scratch_buffer_blas_size: &mut u64,
    blas_storage: &mut Vec<BlasStore<'a>>,
    hub: &Hub,
    ray_tracing_scratch_buffer_alignment: u32,
) -> Result<(), BuildAccelerationStructureError> {
    let mut triangle_entries =
        Vec::<hal::AccelerationStructureTriangles<dyn hal::DynBuffer>>::new();
    for buf in buf_storage {
        let mesh = &buf.geometry;
        let vertex_buffer = {
            let vertex_buffer = buf.vertex_buffer.as_ref();
            let vertex_raw = vertex_buffer.try_raw(snatch_guard)?;
            vertex_buffer.check_usage(BufferUsages::BLAS_INPUT)?;

            if let Some(barrier) = buf
                .vertex_transition
                .take()
                .map(|pending| pending.into_hal(vertex_buffer, snatch_guard))
            {
                input_barriers.push(barrier);
            }
            if vertex_buffer.size
                < (mesh.size.vertex_count + mesh.first_vertex) as u64 * mesh.vertex_stride
            {
                return Err(BuildAccelerationStructureError::InsufficientBufferSize(
                    vertex_buffer.error_ident(),
                    vertex_buffer.size,
                    (mesh.size.vertex_count + mesh.first_vertex) as u64 * mesh.vertex_stride,
                ));
            }
            let vertex_buffer_offset = mesh.first_vertex as u64 * mesh.vertex_stride;
            cmd_buf_data.buffer_memory_init_actions.extend(
                vertex_buffer.initialization_status.read().create_action(
                    &hub.buffers.get(mesh.vertex_buffer).get()?,
                    vertex_buffer_offset
                        ..(vertex_buffer_offset
                            + mesh.size.vertex_count as u64 * mesh.vertex_stride),
                    MemoryInitKind::NeedsInitializedMemory,
                ),
            );
            vertex_raw
        };
        let index_buffer = if let Some((ref mut index_buffer, ref mut index_pending)) =
            buf.index_buffer_transition
        {
            let index_raw = index_buffer.try_raw(snatch_guard)?;
            index_buffer.check_usage(BufferUsages::BLAS_INPUT)?;

            if let Some(barrier) = index_pending
                .take()
                .map(|pending| pending.into_hal(index_buffer, snatch_guard))
            {
                input_barriers.push(barrier);
            }
            let index_stride = mesh.size.index_format.unwrap().byte_size() as u64;
            let offset = mesh.first_index.unwrap() as u64 * index_stride;
            let index_buffer_size = mesh.size.index_count.unwrap() as u64 * index_stride;

            if mesh.size.index_count.unwrap() % 3 != 0 {
                return Err(BuildAccelerationStructureError::InvalidIndexCount(
                    index_buffer.error_ident(),
                    mesh.size.index_count.unwrap(),
                ));
            }
            if index_buffer.size < mesh.size.index_count.unwrap() as u64 * index_stride + offset {
                return Err(BuildAccelerationStructureError::InsufficientBufferSize(
                    index_buffer.error_ident(),
                    index_buffer.size,
                    mesh.size.index_count.unwrap() as u64 * index_stride + offset,
                ));
            }

            cmd_buf_data.buffer_memory_init_actions.extend(
                index_buffer.initialization_status.read().create_action(
                    index_buffer,
                    offset..(offset + index_buffer_size),
                    MemoryInitKind::NeedsInitializedMemory,
                ),
            );
            Some(index_raw)
        } else {
            None
        };
        let transform_buffer = if let Some((ref mut transform_buffer, ref mut transform_pending)) =
            buf.transform_buffer_transition
        {
            if mesh.transform_buffer_offset.is_none() {
                return Err(BuildAccelerationStructureError::MissingAssociatedData(
                    transform_buffer.error_ident(),
                ));
            }
            let transform_raw = transform_buffer.try_raw(snatch_guard)?;
            transform_buffer.check_usage(BufferUsages::BLAS_INPUT)?;

            if let Some(barrier) = transform_pending
                .take()
                .map(|pending| pending.into_hal(transform_buffer, snatch_guard))
            {
                input_barriers.push(barrier);
            }

            let offset = mesh.transform_buffer_offset.unwrap();

            if offset % wgt::TRANSFORM_BUFFER_ALIGNMENT != 0 {
                return Err(
                    BuildAccelerationStructureError::UnalignedTransformBufferOffset(
                        transform_buffer.error_ident(),
                    ),
                );
            }
            if transform_buffer.size < 48 + offset {
                return Err(BuildAccelerationStructureError::InsufficientBufferSize(
                    transform_buffer.error_ident(),
                    transform_buffer.size,
                    48 + offset,
                ));
            }
            cmd_buf_data.buffer_memory_init_actions.extend(
                transform_buffer.initialization_status.read().create_action(
                    transform_buffer,
                    offset..(offset + 48),
                    MemoryInitKind::NeedsInitializedMemory,
                ),
            );
            Some(transform_raw)
        } else {
            None
        };

        let triangles = hal::AccelerationStructureTriangles {
            vertex_buffer: Some(vertex_buffer),
            vertex_format: mesh.size.vertex_format,
            first_vertex: mesh.first_vertex,
            vertex_count: mesh.size.vertex_count,
            vertex_stride: mesh.vertex_stride,
            indices: index_buffer.map(|index_buffer| {
                let index_stride = mesh.size.index_format.unwrap().byte_size() as u32;
                hal::AccelerationStructureTriangleIndices::<dyn hal::DynBuffer> {
                    format: mesh.size.index_format.unwrap(),
                    buffer: Some(index_buffer),
                    offset: mesh.first_index.unwrap() * index_stride,
                    count: mesh.size.index_count.unwrap(),
                }
            }),
            transform: transform_buffer.map(|transform_buffer| {
                hal::AccelerationStructureTriangleTransform {
                    buffer: transform_buffer,
                    offset: mesh.transform_buffer_offset.unwrap() as u32,
                }
            }),
            flags: mesh.size.flags,
        };
        triangle_entries.push(triangles);
        if let Some(blas) = buf.ending_blas.take() {
            let scratch_buffer_offset = *scratch_buffer_blas_size;
            *scratch_buffer_blas_size += align_to(
                blas.size_info.build_scratch_size as u32,
                ray_tracing_scratch_buffer_alignment,
            ) as u64;

            blas_storage.push(BlasStore {
                blas,
                entries: hal::AccelerationStructureEntries::Triangles(triangle_entries),
                scratch_buffer_offset,
            });
            triangle_entries = Vec::new();
        }
    }
    Ok(())
}

fn map_blas<'a>(
    storage: &'a BlasStore<'_>,
    scratch_buffer: &'a dyn hal::DynBuffer,
    snatch_guard: &'a SnatchGuard,
) -> Result<
    hal::BuildAccelerationStructureDescriptor<
        'a,
        dyn hal::DynBuffer,
        dyn hal::DynAccelerationStructure,
    >,
    BuildAccelerationStructureError,
> {
    let BlasStore {
        blas,
        entries,
        scratch_buffer_offset,
    } = storage;
    if blas.update_mode == wgt::AccelerationStructureUpdateMode::PreferUpdate {
        log::info!("only rebuild implemented")
    }
    Ok(hal::BuildAccelerationStructureDescriptor {
        entries,
        mode: hal::AccelerationStructureBuildMode::Build,
        flags: blas.flags,
        source_acceleration_structure: None,
        destination_acceleration_structure: blas.try_raw(snatch_guard)?,
        scratch_buffer,
        scratch_buffer_offset: *scratch_buffer_offset,
    })
}

fn build_blas<'a>(
    cmd_buf_raw: &mut dyn hal::DynCommandEncoder,
    blas_present: bool,
    tlas_present: bool,
    input_barriers: Vec<hal::BufferBarrier<dyn hal::DynBuffer>>,
    blas_descriptors: &[hal::BuildAccelerationStructureDescriptor<
        'a,
        dyn hal::DynBuffer,
        dyn hal::DynAccelerationStructure,
    >],
    scratch_buffer_barrier: hal::BufferBarrier<dyn hal::DynBuffer>,
) {
    unsafe {
        cmd_buf_raw.transition_buffers(&input_barriers);
    }

    if blas_present {
        unsafe {
            cmd_buf_raw.place_acceleration_structure_barrier(hal::AccelerationStructureBarrier {
                usage: hal::StateTransition {
                    from: hal::AccelerationStructureUses::BUILD_INPUT,
                    to: hal::AccelerationStructureUses::BUILD_OUTPUT,
                },
            });

            cmd_buf_raw.build_acceleration_structures(blas_descriptors);
        }
    }

    if blas_present && tlas_present {
        unsafe {
            cmd_buf_raw.transition_buffers(&[scratch_buffer_barrier]);
        }
    }

    let mut source_usage = hal::AccelerationStructureUses::empty();
    let mut destination_usage = hal::AccelerationStructureUses::empty();
    if blas_present {
        source_usage |= hal::AccelerationStructureUses::BUILD_OUTPUT;
        destination_usage |= hal::AccelerationStructureUses::BUILD_INPUT
    }
    if tlas_present {
        source_usage |= hal::AccelerationStructureUses::SHADER_INPUT;
        destination_usage |= hal::AccelerationStructureUses::BUILD_OUTPUT;
    }
    unsafe {
        cmd_buf_raw.place_acceleration_structure_barrier(hal::AccelerationStructureBarrier {
            usage: hal::StateTransition {
                from: source_usage,
                to: destination_usage,
            },
        });
    }
}
