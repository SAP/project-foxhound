use super::minidump_writer::CrashingThreadContext;
use super::*;
use minidump_common::errors::ExceptionCodeLinux;

pub fn write(
    config: &mut MinidumpWriter,
    buffer: &mut DumpBuf,
) -> Result<MDRawDirectory, errors::SectionExceptionStreamError> {
    let exception = if let Some(context) = &config.crash_context {
        MDException {
            exception_code: context.inner.siginfo.ssi_signo as u32,
            exception_flags: context.inner.siginfo.ssi_code as u32,
            exception_address: context.inner.siginfo.ssi_addr as u64,
            ..Default::default()
        }
    } else {
        let addr = match &config.crashing_thread_context {
            CrashingThreadContext::CrashContextPlusAddress((_, addr)) => *addr,
            _ => 0,
        };
        MDException {
            exception_code: ExceptionCodeLinux::DUMP_REQUESTED as u32,
            exception_address: addr as u64,
            ..Default::default()
        }
    };

    let thread_context = match config.crashing_thread_context {
        CrashingThreadContext::CrashContextPlusAddress((ctx, _))
        | CrashingThreadContext::CrashContext(ctx) => ctx,
        CrashingThreadContext::None => MDLocationDescriptor {
            data_size: 0,
            rva: 0,
        },
    };

    let stream = MDRawExceptionStream {
        thread_id: config.blamed_thread as u32,
        exception_record: exception,
        __align: 0,
        thread_context,
    };
    let exc = MemoryWriter::alloc_with_val(buffer, stream)?;
    let dirent = MDRawDirectory {
        stream_type: MDStreamType::ExceptionStream as u32,
        location: exc.location(),
    };

    Ok(dirent)
}
