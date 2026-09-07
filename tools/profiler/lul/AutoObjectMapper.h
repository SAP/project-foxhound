/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef AutoObjectMapper_h
#define AutoObjectMapper_h

#include <cstdint>
#include <string>

#include "mozilla/Attributes.h"
#include "mozilla/ProfilerPlatformMacros.h"

// A (nearly-) RAII class that maps an object in and then unmaps it on
// destruction.  This base class version uses the "normal" POSIX
// functions: open, fstat, close, mmap, munmap.

class MOZ_STACK_CLASS AutoObjectMapperPOSIX {
 public:
  // The constructor does not attempt to map the file, because that
  // might fail.  Instead, once the object has been constructed,
  // call Map() to attempt the mapping.  There is no corresponding
  // Unmap() since the unmapping is done in the destructor.  Failure
  // messages are sent to |aLog|.
  explicit AutoObjectMapperPOSIX(void (*aLog)(const char*));

  // Unmap the file on destruction of this object.
  ~AutoObjectMapperPOSIX();

  // Map |fileName| into the address space and return the mapping
  // extents.  If the file is zero sized this will fail.  The file is
  // mapped read-only and private.  Returns true iff the mapping
  // succeeded, in which case *start and *length hold its extent.
  // Once a call to Map succeeds, all subsequent calls to it will
  // fail.
  //
  // |offset| is the offset within |fileName| at which to start the mapping;
  // it must be a multiple of the page size.  It is used to map an ELF object
  // (e.g. libxul.so) that is embedded uncompressed inside another file, such
  // as an APK on Android.  *start then points at the embedded object's ELF
  // header and *length covers the rest of the file.
  bool Map(/*OUT*/ void** start, /*OUT*/ size_t* length, std::string fileName,
           uint64_t offset = 0);

 protected:
  // If we are currently holding a mapped object, these record the
  // mapped address range.
  void* mImage;
  size_t mSize;

  // A logging sink, for complaining about mapping failures.
  void (*mLog)(const char*);

 private:
  // Are we currently holding a mapped object?  This is private to
  // the base class.  Derived classes need to have their own way to
  // track whether they are holding a mapped object.
  bool mIsMapped;

  // Disable copying and assignment.
  AutoObjectMapperPOSIX(const AutoObjectMapperPOSIX&);
  AutoObjectMapperPOSIX& operator=(const AutoObjectMapperPOSIX&);
  // Disable heap allocation of this class.
  void* operator new(size_t);
  void* operator new[](size_t);
  void operator delete(void*);
  void operator delete[](void*);
};

#endif  // AutoObjectMapper_h
