
Profile: https://profiler.firefox.com/public/fx5sg9g8p9bp6bq36aggg74r8cmrbfcaxcm1rb0

Firefox 142, macOS 15.5.0. The profile covers the first 1.59 seconds of startup.

## What I was looking at

Three threads immediately stand out in `profiler-cli profile info`:

- `GeckoMain` (t-0): 815ms active CPU
- `RegisterFonts` (t-1): 121ms active CPU
- `InitFontList` (t-5): 87ms active CPU

The two font threads are running concurrently with the main thread through much of the first 400ms. The question is whether they're just doing independent work in parallel, or whether they're in each other's way.

## Following the lock

I searched the main thread for `psynch` (the macOS kernel call for mutex waits) and found 112 samples containing it, all of them in the first 400ms. That window has 394 total samples, so the main thread is spending about 28% of the first 400ms blocked on a mutex.

The call chain is specific. The main thread is in `NS_InitXPCOM`, initializing the layout subsystem:

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
                  [NSFrameView titleCell]
                    [NSTextFieldCell initTextCell:]
                      [NSCell setStringValue:]
                        UIFoundation!+[NSFont systemFontOfSize:width:]
                          CoreText!TDescriptor::CreateMatchingDescriptorInternal
                            CoreText!MakeSpliceDescriptor
                              libFontRegistry.dylib!XTCopyFontWithName
                                libFontRegistry.dylib!TLocalFontRegistry::TLocalFontRegistry()
                                  _pthread_mutex_firstfit_lock_slow
                                    __psynch_mutexwait   <-- blocked here
```

`nsLookAndFeel::EnsureInit()` creates a hidden AppKit window to probe the system theme. AppKit immediately tries to resolve the system font to render the window's title bar, which goes through CoreText into `libFontRegistry.dylib`. The `TLocalFontRegistry` mutex is held by one of the font threads, so the main thread stalls.

## What the font threads are doing

On the `RegisterFonts` thread, `gfxPlatformMac::FontRegistrationCallback` is scanning font directories and registering them with the OS. It calls `CoreTextFontList::ActivateFontsFromDir`, which goes through `CTFontManagerRegisterActionFontURLs` and into `libFontRegistry.dylib`'s registration path. The registration path holds the `TLocalFontRegistry` mutex while adding fonts to the index.

The `RegisterFonts` thread is also contending: 20.9% of its samples are in `__psynch_mutexwait` via `TLocalFontRegistry::TLocalFontRegistry()`. It is both the cause of the main thread's blocking and a victim of contention itself (the two font threads compete with each other and with the main thread over the same lock).

On `InitFontList`, `gfxPlatformFontList::InitFontList()` calls `CTFontDescriptorCreateMatchingFontDescriptorsWithOptions` to enumerate the system font families. This also needs the font registry, and 10.3% of the thread's time is spent in synchronous XPC replies waiting for the font daemon to respond.

## The picture

All three threads need the `TLocalFontRegistry` mutex at overlapping times. The font threads need it to register and index fonts. The main thread needs it because `nsLookAndFeel::EnsureInit()` creates an AppKit window that immediately asks CoreText for the system font.

The lock contention is concentrated in the first 400ms because that is when both the XPCOM initialization path and the font registration threads are active simultaneously. After the font threads finish, the contention disappears and the main thread continues normally.

The "low-CPU gaps" visible in the profiler timeline on the main thread during startup are these 112 samples blocked in the kernel waiting for the font registry mutex. The main thread is not genuinely idle: it is ready to work but held up by a lock the font threads hold.
