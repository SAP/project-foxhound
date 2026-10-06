
# Firefox macOS Startup: Font Initialization Lock Contention

Profile: https://profiler.firefox.com/public/fx5sg9g8p9bp6bq36aggg74r8cmrbfcaxcm1rb0

## Load the profile

```
$ profiler-cli load https://profiler.firefox.com/public/fx5sg9g8p9bp6bq36aggg74r8cmrbfcaxcm1rb0
Loading profile from https://profiler.firefox.com/public/fx5sg9g8p9bp6bq36aggg74r8cmrbfcaxcm1rb0...
Session started: default
```

## Get an overview

```
$ profiler-cli profile info
[Thread: ... | View: Full profile | Full: 1.59s]

Name: Firefox 142 – macOS 15.5.0
Platform: macOS 15.5.0

This profile contains 19 threads across 11 processes.

Top processes and threads by CPU usage:
  p-0: Parent Process [pid 10860] [ts<0z → end] - 1236.908ms
    t-0: GeckoMain [tid 3590310] - 814.960ms
    t-2: Renderer [tid 3590371] - 190.684ms
    t-1: RegisterFonts [tid 3590316] - 120.713ms
    t-5: InitFontList [tid 3590386] - 87.176ms
    ...
```

Three threads in the parent process are interesting: the main thread, `RegisterFonts`, and `InitFontList`. The font threads are running during startup at the same time as the main thread.

## Confirm lock contention on the main thread

Select the main thread and search for `psynch`, the macOS kernel call that a thread lands in when blocked on a mutex:

```
$ profiler-cli thread select t-0
Selected thread: t-0 (GeckoMain)

$ profiler-cli zoom push 0,0.4
Pushed view range: ts-0 (0s) to ts-d (400ms) (duration: 400.00ms)

$ profiler-cli thread samples --search "psynch" --include-idle
[Thread: t-0 (GeckoMain) | View: ts-0→ts-d (400.0ms) | Full: 1.59s]

Top Functions (by total time):
  f-0. (root) - total: 112 (100.0%)
  ...
  f-691. libsystem_pthread.dylib!_pthread_mutex_firstfit_lock_slow - total: 97 (86.6%)
  f-692. libsystem_kernel.dylib!__psynch_mutexwait - total: 97 (86.6%)
  f-753. libFontRegistry.dylib!TLocalFontRegistry::TLocalFontRegistry() - total: 93 (83.0%)
  ...
```

The first 400ms has 394 total samples. 112 of them contain `psynch` in the stack, all landing in `__psynch_mutexwait` via `TLocalFontRegistry::TLocalFontRegistry()`. That is 28% of the window blocked on the font registry mutex.

All 112 of these samples are in the first 400ms (the count does not change when the zoom is removed), confirming the contention is early and concentrated.

## Trace the call chain

```
$ profiler-cli zoom clear
$ profiler-cli thread samples-top-down --search "mutex"
```

The heaviest path through the mutex wait traces back to LookAndFeel initialization:

```
NS_InitXPCOM
  nsComponentManagerImpl::Init
    nsLayoutModuleInitialize
      nsLayoutStatics::Initialize
        nsContentUtils::Init
          nsXPLookAndFeel::GetInstance
            nsLookAndFeel::EnsureInit
              [NSWindow initWithContentRect:...]
                [NSThemeFrame _updateTitleProperties:...]
                  [NSTextFieldCell initTextCell:]
                    UIFoundation!+[NSFont systemFontOfSize:width:]
                      CoreText!TDescriptor::CreateMatchingDescriptorInternal
                        CoreText!MakeSpliceDescriptor
                          libFontRegistry.dylib!XTCopyFontWithName
                            libFontRegistry.dylib!TLocalFontRegistry::TLocalFontRegistry()
                              _pthread_mutex_firstfit_lock_slow
                                __psynch_mutexwait
```

`nsLookAndFeel::EnsureInit()` creates a hidden AppKit window to probe the system theme. AppKit immediately resolves the system font for the title bar, which walks into `libFontRegistry.dylib` and tries to acquire the `TLocalFontRegistry` mutex. That mutex is held by one of the font threads.

## What the font threads are doing

```
$ profiler-cli thread select t-1
Selected thread: t-1 (RegisterFonts)

$ profiler-cli thread samples-top-down
```

The `RegisterFonts` thread is scanning font directories and calling `CoreTextFontList::ActivateFontsFromDir`, which holds the `TLocalFontRegistry` mutex while adding fonts to the index. It also competes for the same lock:

```
Top-Down Call Tree:
f-0. (root) [total: 100.0%, self: 0.0%]
└─ ...
   f-10357. XUL!gfxPlatformMac::FontRegistrationCallback(void*) [total: 100.0%, self: 0.0%]
   ├─ f-10358. XUL!CoreTextFontList::ActivateFontsFromDir(...) [total: 99.4%, self: 0.0%]
   │  ├─ f-10364. CoreText!_CTFontManagerRegisterActionFontURLs() [total: 98.8%, self: 0.0%]
   │  │  ├─ f-10412. libFontRegistry.dylib!CopyFaceURLsForFonts(...) [total: 47.9%, self: 0.0%]
   │  │  │  f-887. libFontRegistry.dylib!XTCopyFontsWithProperties [total: 47.9%, self: 0.0%]
   │  │  │  ├─ f-890. ...CopyPropertiesForFontsMatchingRequest()... [total: 27.0%, self: 0.0%]
   │  │  │  │  ...
   │  │  │  └─ f-753. libFontRegistry.dylib!TLocalFontRegistry::TLocalFontRegistry() [total: 20.9%, self: 0.0%]
   │  │  │     f-691. libsystem_pthread.dylib!_pthread_mutex_firstfit_lock_slow [total: 20.9%, self: 0.0%]
   │  │  │     f-692. libsystem_kernel.dylib!__psynch_mutexwait [total: 20.9%, self: 20.9%]
```

The `RegisterFonts` thread itself spends 20.9% of its samples blocked on `__psynch_mutexwait`. It is both the cause of the main thread's blocking and a contention victim itself.

```
$ profiler-cli thread select t-5
Selected thread: t-5 (InitFontList)

$ profiler-cli thread samples-top-down
```

The `InitFontList` thread calls `CTFontDescriptorCreateMatchingFontDescriptorsWithOptions` to enumerate font families, which also touches the font registry and makes synchronous XPC calls to the font daemon (10.3% of this thread's time in `__NSXPCCONNECTION_IS_WAITING_FOR_A_SYNCHRONOUS_REPLY__`).

## Summary

All three threads need the `TLocalFontRegistry` mutex at overlapping times:

- `RegisterFonts` holds it while registering fonts from disk
- `InitFontList` needs it to enumerate font families (and also waits on XPC)
- `GeckoMain` needs it because `nsLookAndFeel::EnsureInit()` creates an AppKit window that immediately asks CoreText for the system font

The result is that the main thread spends about 28% of the first 400ms blocked in the kernel waiting for this single mutex. The low-CPU appearance in the profiler timeline during startup reflects this: the thread is not idle, it is ready to work but stalled on a lock held by the font threads.
