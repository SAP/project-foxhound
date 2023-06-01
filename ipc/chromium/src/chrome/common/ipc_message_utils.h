/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
// Copyright (c) 2006-2008 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_COMMON_IPC_MESSAGE_UTILS_H_
#define CHROME_COMMON_IPC_MESSAGE_UTILS_H_

#include <cstdint>
#include <map>
#include <unordered_map>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>
#include "ErrorList.h"
#include "base/basictypes.h"
#include "base/compiler_specific.h"
#include "base/logging.h"
#include "base/pickle.h"
#include "base/string_util.h"
#include "build/build_config.h"
#include "chrome/common/ipc_message.h"
#include "mozilla/CheckedInt.h"
#include "mozilla/IntegerRange.h"

#if defined(OS_WIN)
#  include <windows.h>
#endif

template <typename T>
class RefPtr;
template <typename T>
class nsCOMPtr;

namespace mozilla::ipc {
class IProtocol;
template <typename P>
struct IPDLParamTraits;
class SharedMemory;

// Implemented in ProtocolUtils.cpp
MOZ_NEVER_INLINE void PickleFatalError(const char* aMsg, IProtocol* aActor);
}  // namespace mozilla::ipc

namespace IPC {

/**
 * Context used to serialize into an IPC::Message. Provides relevant context
 * used when serializing.
 */
class MOZ_STACK_CLASS MessageWriter final {
 public:
  explicit MessageWriter(Message& message,
                         mozilla::ipc::IProtocol* actor = nullptr)
      : message_(message), actor_(actor) {}

  MessageWriter(const MessageWriter&) = delete;
  MessageWriter& operator=(const MessageWriter&) = delete;

  mozilla::ipc::IProtocol* GetActor() const { return actor_; }

#define FORWARD_WRITE(name, type) \
  bool Write##name(const type& result) { return message_.Write##name(result); }

  FORWARD_WRITE(Bool, bool)
  FORWARD_WRITE(Int16, int16_t)
  FORWARD_WRITE(UInt16, uint16_t)
  FORWARD_WRITE(Int, int)
  FORWARD_WRITE(Long, long)
  FORWARD_WRITE(ULong, unsigned long)
  FORWARD_WRITE(Int32, int32_t)
  FORWARD_WRITE(UInt32, uint32_t)
  FORWARD_WRITE(Int64, int64_t)
  FORWARD_WRITE(UInt64, uint64_t)
  FORWARD_WRITE(Double, double)
  FORWARD_WRITE(IntPtr, intptr_t)
  FORWARD_WRITE(UnsignedChar, unsigned char)
  FORWARD_WRITE(String, std::string)
  FORWARD_WRITE(WString, std::wstring)

#undef FORWARD_WRITE

  bool WriteData(const char* data, uint32_t length) {
    return message_.WriteData(data, length);
  }

  bool WriteBytes(const void* data, uint32_t data_len) {
    return message_.WriteBytes(data, data_len);
  }

  bool WriteBytesZeroCopy(void* data, uint32_t data_len, uint32_t capacity) {
    return message_.WriteBytesZeroCopy(data, data_len, capacity);
  }

  bool WriteSentinel(uint32_t sentinel) {
    return message_.WriteSentinel(sentinel);
  }

  bool WriteFileHandle(mozilla::UniqueFileHandle handle) {
    return message_.WriteFileHandle(std::move(handle));
  }

  void WritePort(mozilla::ipc::ScopedPort port) {
    message_.WritePort(std::move(port));
  }

#if defined(OS_MACOSX)
  bool WriteMachSendRight(mozilla::UniqueMachSendRight port) {
    return message_.WriteMachSendRight(std::move(port));
  }
#endif

  void FatalError(const char* aErrorMsg) const {
    mozilla::ipc::PickleFatalError(aErrorMsg, actor_);
  }

 private:
  Message& message_;
  mozilla::ipc::IProtocol* actor_;
};

/**
 * Context used to read data from an IPC::Message. Provides relevant context
 * used when deserializing and tracks iteration.
 */
class MOZ_STACK_CLASS MessageReader final {
 public:
  explicit MessageReader(const Message& message,
                         mozilla::ipc::IProtocol* actor = nullptr)
      : message_(message), iter_(message), actor_(actor) {}

  MessageReader(const MessageReader&) = delete;
  MessageReader& operator=(const MessageReader&) = delete;

  mozilla::ipc::IProtocol* GetActor() const { return actor_; }

#define FORWARD_READ(name, type)                \
  [[nodiscard]] bool Read##name(type* result) { \
    return message_.Read##name(&iter_, result); \
  }

  FORWARD_READ(Bool, bool)
  FORWARD_READ(Int16, int16_t)
  FORWARD_READ(UInt16, uint16_t)
  FORWARD_READ(Short, short)
  FORWARD_READ(Int, int)
  FORWARD_READ(Long, long)
  FORWARD_READ(ULong, unsigned long)
  FORWARD_READ(Int32, int32_t)
  FORWARD_READ(UInt32, uint32_t)
  FORWARD_READ(Int64, int64_t)
  FORWARD_READ(UInt64, uint64_t)
  FORWARD_READ(Double, double)
  FORWARD_READ(IntPtr, intptr_t)
  FORWARD_READ(UnsignedChar, unsigned char)
  FORWARD_READ(String, std::string)
  FORWARD_READ(WString, std::wstring)

  // Special version of ReadInt() which rejects negative values
  FORWARD_READ(Length, int);

#undef FORWARD_READ

  [[nodiscard]] bool ReadBytesInto(void* data, uint32_t length) {
    return message_.ReadBytesInto(&iter_, data, length);
  }

  [[nodiscard]] bool IgnoreBytes(uint32_t length) {
    return message_.IgnoreBytes(&iter_, length);
  }

  [[nodiscard]] bool ReadSentinel(uint32_t sentinel) {
    return message_.ReadSentinel(&iter_, sentinel);
  }

  bool IgnoreSentinel() { return message_.IgnoreSentinel(&iter_); }

  bool HasBytesAvailable(uint32_t len) {
    return message_.HasBytesAvailable(&iter_, len);
  }

  void EndRead() { message_.EndRead(iter_, message_.type()); }

  [[nodiscard]] bool ConsumeFileHandle(mozilla::UniqueFileHandle* handle) {
    return message_.ConsumeFileHandle(&iter_, handle);
  }

  [[nodiscard]] bool ConsumePort(mozilla::ipc::ScopedPort* port) {
    return message_.ConsumePort(&iter_, port);
  }

#if defined(OS_MACOSX)
  [[nodiscard]] bool ConsumeMachSendRight(mozilla::UniqueMachSendRight* port) {
    return message_.ConsumeMachSendRight(&iter_, port);
  }
#endif

  void FatalError(const char* aErrorMsg) const {
    mozilla::ipc::PickleFatalError(aErrorMsg, actor_);
  }

 private:
  const Message& message_;
  PickleIterator iter_;
  mozilla::ipc::IProtocol* actor_;
};

//-----------------------------------------------------------------------------
// An iterator class for reading the fields contained within a Message.

class MessageIterator {
 public:
  explicit MessageIterator(const Message& m) : msg_(m), iter_(m) {}
  int NextInt() const {
    int val;
    if (!msg_.ReadInt(&iter_, &val)) NOTREACHED();
    return val;
  }
  intptr_t NextIntPtr() const {
    intptr_t val;
    if (!msg_.ReadIntPtr(&iter_, &val)) NOTREACHED();
    return val;
  }
  const std::string NextString() const {
    std::string val;
    if (!msg_.ReadString(&iter_, &val)) NOTREACHED();
    return val;
  }
  const std::wstring NextWString() const {
    std::wstring val;
    if (!msg_.ReadWString(&iter_, &val)) NOTREACHED();
    return val;
  }

 private:
  const Message& msg_;
  mutable PickleIterator iter_;
};

//-----------------------------------------------------------------------------
// ParamTraits specializations, etc.
//
// The full set of types ParamTraits is specialized upon contains *possibly*
// repeated types: unsigned long may be uint32_t or size_t, unsigned long long
// may be uint64_t or size_t, nsresult may be uint32_t, and so on.  You can't
// have ParamTraits<unsigned int> *and* ParamTraits<uint32_t> if unsigned int
// is uint32_t -- that's multiple definitions, and you can only have one.
//
// You could use #ifs and macro conditions to avoid duplicates, but they'd be
// hairy: heavily dependent upon OS and compiler author choices, forced to
// address all conflicts by hand.  Happily there's a better way.  The basic
// idea looks like this, where T -> U represents T inheriting from U:
//
// class ParamTraits<P>
// |
// --> class ParamTraits1<P>
//     |
//     --> class ParamTraits2<P>
//         |
//         --> class ParamTraitsN<P> // or however many levels
//
// The default specialization of ParamTraits{M}<P> is an empty class that
// inherits from ParamTraits{M + 1}<P> (or nothing in the base case).
//
// Now partition the set of parameter types into sets without duplicates.
// Assign each set of types to a level M.  Then specialize ParamTraitsM for
// each of those types.  A reference to ParamTraits<P> will consist of some
// number of empty classes inheriting in sequence, ending in a non-empty
// ParamTraits{N}<P>.  It's okay for the parameter types to be duplicative:
// either name of a type will resolve to the same ParamTraits{N}<P>.
//
// The nice thing is that because templates are instantiated lazily, if we
// indeed have uint32_t == unsigned int, say, with the former in level N and
// the latter in M > N, ParamTraitsM<unsigned int> won't be created (as long as
// nobody uses ParamTraitsM<unsigned int>, but why would you), and no duplicate
// code will be compiled or extra symbols generated.  It's as efficient at
// runtime as manually figuring out and avoiding conflicts by #ifs.
//
// The scheme we follow below names the various classes according to the types
// in them, and the number of ParamTraits levels is larger, but otherwise it's
// exactly the above idea.
//

template <class P>
struct ParamTraits;

template <typename P>
inline void WriteParam(MessageWriter* writer, P&& p) {
  ParamTraits<std::decay_t<P>>::Write(writer, std::forward<P>(p));
}

namespace detail {

template <typename P>
inline constexpr auto ParamTraitsReadUsesOutParam()
    -> decltype(ParamTraits<P>::Read(std::declval<MessageReader*>(),
                                     std::declval<P*>())) {
  return true;
}

template <typename P>
inline constexpr auto ParamTraitsReadUsesOutParam()
    -> decltype(ParamTraits<P>::Read(std::declval<MessageReader*>()), bool{}) {
  return false;
}

}  // namespace detail

template <typename P>
inline bool WARN_UNUSED_RESULT ReadParam(MessageReader* reader, P* p) {
  if constexpr (!detail::ParamTraitsReadUsesOutParam<P>()) {
    auto maybe = ParamTraits<P>::Read(reader);
    if (maybe.isNothing()) {
      return false;
    }
    *p = maybe.extract();
    return true;
  } else {
    return ParamTraits<P>::Read(reader, p);
  }
}

template <typename P>
inline mozilla::Maybe<P> WARN_UNUSED_RESULT ReadParam(MessageReader* reader) {
  if constexpr (!detail::ParamTraitsReadUsesOutParam<P>()) {
    return ParamTraits<P>::Read(reader);
  } else if constexpr (std::is_default_constructible_v<P>) {
    mozilla::Maybe<P> p{std::in_place};
    if (!ParamTraits<P>::Read(reader, p.ptr())) {
      p.reset();
    }
    return p;
  } else {
    static_assert(P::kHasDeprecatedReadParamPrivateConstructor);
    P p{};
    if (!ParamTraits<P>::Read(reader, &p)) {
      return mozilla::Nothing();
    }
    return mozilla::Some(std::move(p));
  }
}

class MOZ_STACK_CLASS MessageBufferWriter {
 public:
  // Create a MessageBufferWriter to write `full_len` bytes into `writer`.
  // If the length exceeds a threshold, a shared memory region may be used
  // instead of including the data inline.
  //
  // NOTE: This does _NOT_ write out the length of the buffer.
  // NOTE: Data written this way _MUST_ be read using `MessageBufferReader`.
  MessageBufferWriter(MessageWriter* writer, uint32_t full_len);
  ~MessageBufferWriter();

  MessageBufferWriter(const MessageBufferWriter&) = delete;
  MessageBufferWriter& operator=(const MessageBufferWriter&) = delete;

  // Write `len` bytes from `data` into the message.
  //
  // Exactly `full_len` bytes should be written across multiple calls before the
  // `MessageBufferWriter` is destroyed.
  //
  // WARNING: all writes (other than the last write) must be multiples of 4
  // bytes in length. Not doing this will lead to padding being introduced into
  // the payload and break things. This can probably be improved in the future
  // with deeper integration between `MessageBufferWriter` and `Pickle`.
  bool WriteBytes(const void* data, uint32_t len);

 private:
  MessageWriter* writer_;
  RefPtr<mozilla::ipc::SharedMemory> shmem_;
  char* buffer_ = nullptr;
  uint32_t remaining_ = 0;
};

class MOZ_STACK_CLASS MessageBufferReader {
 public:
  // Create a MessageBufferReader to read `full_len` bytes from `reader` which
  // were written using `MessageBufferWriter`.
  //
  // NOTE: This may consume a shared memory region from the message, meaning
  // that the same data cannot be read multiple times.
  // NOTE: Data read this way _MUST_ be written using `MessageBufferWriter`.
  MessageBufferReader(MessageReader* reader, uint32_t full_len);
  ~MessageBufferReader();

  MessageBufferReader(const MessageBufferReader&) = delete;
  MessageBufferReader& operator=(const MessageBufferReader&) = delete;

  // Read `count` bytes from the message into `data`.
  //
  // Exactly `full_len` bytes should be read across multiple calls before the
  // `MessageBufferReader` is destroyed.
  //
  // WARNING: all reads (other than the last read) must be multiples of 4 bytes
  // in length. Not doing this will lead to bytes being skipped in the payload
  // and break things. This can probably be improved in the future with deeper
  // integration between `MessageBufferReader` and `Pickle`.
  [[nodiscard]] bool ReadBytesInto(void* data, uint32_t len);

 private:
  MessageReader* reader_;
  RefPtr<mozilla::ipc::SharedMemory> shmem_;
  const char* buffer_ = nullptr;
  uint32_t remaining_ = 0;
};

// Whether or not it is safe to serialize the given type using
// `WriteBytesOrShmem`.
template <typename P>
constexpr bool kUseWriteBytes =
    !std::is_same_v<std::remove_const_t<std::remove_reference_t<P>>, bool> &&
    (std::is_integral_v<std::remove_const_t<std::remove_reference_t<P>>> ||
     std::is_floating_point_v<std::remove_const_t<std::remove_reference_t<P>>>);

/**
 * Helper for writing a contiguous sequence (such as for a string or array) into
 * a message, with optimizations for basic integral and floating point types.
 *
 * Integral types will be copied into shared memory if the sequence exceeds 64k
 * bytes in size.
 *
 * Values written with this method must be read with `ReadSequenceParam`.
 *
 * The type parameter specifies the semantics to use, and should generally
 * either be `P&&` or `const P&`. The constness of the `data` argument should
 * match this parameter.
 */
template <typename P>
void WriteSequenceParam(MessageWriter* writer, std::remove_reference_t<P>* data,
                        size_t length) {
  mozilla::CheckedUint32 ipc_length(length);
  if (!ipc_length.isValid()) {
    writer->FatalError("invalid length passed to WriteSequenceParam");
    return;
  }
  writer->WriteUInt32(ipc_length.value());

  if constexpr (kUseWriteBytes<P>) {
    mozilla::CheckedUint32 byte_length =
        ipc_length * sizeof(std::remove_reference_t<P>);
    if (!byte_length.isValid()) {
      writer->FatalError("invalid byte length in WriteSequenceParam");
      return;
    }
    MessageBufferWriter buf_writer(writer, byte_length.value());
    buf_writer.WriteBytes(data, byte_length.value());
  } else {
    auto* end = data + length;
    for (auto* it = data; it != end; ++it) {
      WriteParam(writer, std::forward<P>(*it));
    }
  }
}

/**
 * Helper for reading a contiguous sequence (such as a string or array) into a
 * message which was previously written using `WriteSequenceParam`.
 *
 * The function argument `allocator` will be called with the length of the
 * sequence, and must return a pointer to the memory region which the sequence
 * should be read into.
 */
template <typename F,
          typename P = std::remove_reference_t<
              decltype(*std::declval<F>()(std::declval<uint32_t>()))>>
auto WARN_UNUSED_RESULT ReadSequenceParam(MessageReader* reader, F&& allocator)
    -> std::enable_if_t<
        std::is_same_v<P*, std::remove_reference_t<
                               decltype(allocator(std::declval<uint32_t>()))>>,
        bool> {
  uint32_t length = 0;
  if (!reader->ReadUInt32(&length)) {
    reader->FatalError("failed to read byte length in ReadSequenceParam");
    return false;
  }

  P* data = allocator(length);
  if (length == 0) {
    return true;
  }
  if (!data) {
    reader->FatalError("allocation failed in ReadSequenceParam");
    return false;
  }

  if constexpr (kUseWriteBytes<P>) {
    mozilla::CheckedUint32 byte_length(length);
    byte_length *= sizeof(P);
    if (!byte_length.isValid()) {
      reader->FatalError("invalid byte length in ReadSequenceParam");
      return false;
    }
    MessageBufferReader buf_reader(reader, byte_length.value());
    return buf_reader.ReadBytesInto(data, byte_length.value());
  } else {
    P* end = data + length;
    for (auto* it = data; it != end; ++it) {
      if (!ReadParam(reader, it)) {
        return false;
      }
    }
    return true;
  }
}

// Temporary fallback class to allow types to declare serialization using the
// IPDLParamTraits type class. Will be removed once all remaining
// IPDLParamTraits implementations are gone. (bug 1754009)

template <class P>
struct ParamTraitsIPDLFallback {
  template <class R>
  static auto Write(MessageWriter* writer, R&& p)
      -> decltype(mozilla::ipc::IPDLParamTraits<P>::Write(writer,
                                                          writer->GetActor(),
                                                          std::forward<R>(p))) {
    mozilla::ipc::IPDLParamTraits<P>::Write(writer, writer->GetActor(),
                                            std::forward<R>(p));
  }
  template <class R>
  static auto Read(MessageReader* reader, R* r)
      -> decltype(mozilla::ipc::IPDLParamTraits<P>::Read(reader,
                                                         reader->GetActor(),
                                                         r)) {
    return mozilla::ipc::IPDLParamTraits<P>::Read(reader, reader->GetActor(),
                                                  r);
  }
};

// Fundamental types.

template <class P>
struct ParamTraitsFundamental : ParamTraitsIPDLFallback<P> {};

template <>
struct ParamTraitsFundamental<bool> {
  typedef bool param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteBool(p);
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadBool(r);
  }
};

template <>
struct ParamTraitsFundamental<int> {
  typedef int param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteInt(p);
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadInt(r);
  }
};

template <>
struct ParamTraitsFundamental<long> {
  typedef long param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteLong(p);
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadLong(r);
  }
};

template <>
struct ParamTraitsFundamental<unsigned long> {
  typedef unsigned long param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteULong(p);
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadULong(r);
  }
};

template <>
struct ParamTraitsFundamental<long long> {
  typedef long long param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteBytes(&p, sizeof(param_type));
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadBytesInto(r, sizeof(*r));
  }
};

template <>
struct ParamTraitsFundamental<unsigned long long> {
  typedef unsigned long long param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteBytes(&p, sizeof(param_type));
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadBytesInto(r, sizeof(*r));
  }
};

template <>
struct ParamTraitsFundamental<double> {
  typedef double param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteDouble(p);
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadDouble(r);
  }
};

// Fixed-size <stdint.h> types.

template <class P>
struct ParamTraitsFixed : ParamTraitsFundamental<P> {};

template <>
struct ParamTraitsFixed<int16_t> {
  typedef int16_t param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteInt16(p);
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadInt16(r);
  }
};

template <>
struct ParamTraitsFixed<uint16_t> {
  typedef uint16_t param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteUInt16(p);
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadUInt16(r);
  }
};

template <>
struct ParamTraitsFixed<uint32_t> {
  typedef uint32_t param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteUInt32(p);
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadUInt32(r);
  }
};

template <>
struct ParamTraitsFixed<int64_t> {
  typedef int64_t param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteInt64(p);
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadInt64(r);
  }
};

template <>
struct ParamTraitsFixed<uint64_t> {
  typedef uint64_t param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteInt64(static_cast<int64_t>(p));
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadInt64(reinterpret_cast<int64_t*>(r));
  }
};

// std::* types.

template <class P>
struct ParamTraitsStd : ParamTraitsFixed<P> {};

template <class T>
struct ParamTraitsStd<std::basic_string<T>> {
  typedef std::basic_string<T> param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    WriteSequenceParam<const T&>(writer, p.data(), p.size());
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return ReadSequenceParam(reader, [&](uint32_t length) -> T* {
      r->resize(length);
      return r->data();
    });
  }
};

template <class K, class V>
struct ParamTraitsStd<std::map<K, V>> {
  typedef std::map<K, V> param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    WriteParam(writer, static_cast<int>(p.size()));
    typename param_type::const_iterator iter;
    for (iter = p.begin(); iter != p.end(); ++iter) {
      WriteParam(writer, iter->first);
      WriteParam(writer, iter->second);
    }
  }
  static bool Read(MessageReader* reader, param_type* r) {
    int size;
    if (!ReadParam(reader, &size) || size < 0) return false;
    for (int i = 0; i < size; ++i) {
      K k;
      if (!ReadParam(reader, &k)) return false;
      V& value = (*r)[k];
      if (!ReadParam(reader, &value)) return false;
    }
    return true;
  }
};

// Windows-specific types.

template <class P>
struct ParamTraitsWindows : ParamTraitsStd<P> {};

#if defined(OS_WIN)
template <>
struct ParamTraitsWindows<HANDLE> {
  static_assert(sizeof(HANDLE) == sizeof(intptr_t), "Wrong size for HANDLE?");

  static void Write(MessageWriter* writer, HANDLE p) {
    writer->WriteIntPtr(reinterpret_cast<intptr_t>(p));
  }
  static bool Read(MessageReader* reader, HANDLE* r) {
    return reader->ReadIntPtr(reinterpret_cast<intptr_t*>(r));
  }
};

template <>
struct ParamTraitsWindows<HWND> {
  static_assert(sizeof(HWND) == sizeof(intptr_t), "Wrong size for HWND?");

  static void Write(MessageWriter* writer, HWND p) {
    writer->WriteIntPtr(reinterpret_cast<intptr_t>(p));
  }
  static bool Read(MessageReader* reader, HWND* r) {
    return reader->ReadIntPtr(reinterpret_cast<intptr_t*>(r));
  }
};
#endif  // defined(OS_WIN)

// Various ipc/chromium types.

template <class P>
struct ParamTraitsIPC : ParamTraitsWindows<P> {};

// `UniqueFileHandle` may be serialized over IPC channels. On the receiving
// side, the UniqueFileHandle is a valid duplicate of the handle which was
// transmitted.
//
// When sending a UniqueFileHandle, the handle must be valid at the time of
// transmission. As transmission is asynchronous, this requires passing
// ownership of the handle to IPC.
//
// A UniqueFileHandle may only be read once. After it has been read once, it
// will be consumed, and future reads will return an invalid handle.
template <>
struct ParamTraitsIPC<mozilla::UniqueFileHandle> {
  typedef mozilla::UniqueFileHandle param_type;
  static void Write(MessageWriter* writer, param_type&& p) {
    const bool valid = p != nullptr;
    WriteParam(writer, valid);
    if (valid) {
      if (!writer->WriteFileHandle(std::move(p))) {
        writer->FatalError("Too many file handles for one message!");
        NOTREACHED() << "Too many file handles for one message!";
      }
    }
  }
  static bool Read(MessageReader* reader, param_type* r) {
    bool valid;
    if (!ReadParam(reader, &valid)) {
      reader->FatalError("Error reading file handle validity");
      return false;
    }

    if (!valid) {
      *r = nullptr;
      return true;
    }

    if (!reader->ConsumeFileHandle(r)) {
      reader->FatalError("File handle not found in message!");
      return false;
    }
    return true;
  }
};

#if defined(OS_MACOSX)
// `UniqueMachSendRight` may be serialized over IPC channels. On the receiving
// side, the UniqueMachSendRight is the local name of the right which was
// transmitted.
//
// When sending a UniqueMachSendRight, the right must be valid at the time of
// transmission. As transmission is asynchronous, this requires passing
// ownership of the handle to IPC.
//
// A UniqueMachSendRight may only be read once. After it has been read once, it
// will be consumed, and future reads will return an invalid right.
template <>
struct ParamTraitsIPC<mozilla::UniqueMachSendRight> {
  typedef mozilla::UniqueMachSendRight param_type;
  static void Write(MessageWriter* writer, param_type&& p) {
    const bool valid = p != nullptr;
    WriteParam(writer, valid);
    if (valid) {
      if (!writer->WriteMachSendRight(std::move(p))) {
        writer->FatalError("Too many mach send rights for one message!");
        NOTREACHED() << "Too many mach send rights for one message!";
      }
    }
  }
  static bool Read(MessageReader* reader, param_type* r) {
    bool valid;
    if (!ReadParam(reader, &valid)) {
      reader->FatalError("Error reading mach send right validity");
      return false;
    }

    if (!valid) {
      *r = nullptr;
      return true;
    }

    if (!reader->ConsumeMachSendRight(r)) {
      reader->FatalError("Mach send right not found in message!");
      return false;
    }
    return true;
  }
};
#endif

// Mozilla-specific types.

template <class P>
struct ParamTraitsMozilla : ParamTraitsIPC<P> {};

template <>
struct ParamTraitsMozilla<nsresult> {
  typedef nsresult param_type;
  static void Write(MessageWriter* writer, const param_type& p) {
    writer->WriteUInt32(static_cast<uint32_t>(p));
  }
  static bool Read(MessageReader* reader, param_type* r) {
    return reader->ReadUInt32(reinterpret_cast<uint32_t*>(r));
  }
};

// See comments for the IPDLParamTraits specializations for RefPtr<T> and
// nsCOMPtr<T> for more details.
template <class T>
struct ParamTraitsMozilla<RefPtr<T>> {
  static void Write(MessageWriter* writer, const RefPtr<T>& p) {
    ParamTraits<T*>::Write(writer, p.get());
  }

  static bool Read(MessageReader* reader, RefPtr<T>* r) {
    return ParamTraits<T*>::Read(reader, r);
  }
};

template <class T>
struct ParamTraitsMozilla<nsCOMPtr<T>> {
  static void Write(MessageWriter* writer, const nsCOMPtr<T>& p) {
    ParamTraits<T*>::Write(writer, p.get());
  }

  static bool Read(MessageReader* reader, nsCOMPtr<T>* r) {
    RefPtr<T> refptr;
    if (!ParamTraits<T*>::Read(reader, &refptr)) {
      return false;
    }
    *r = std::move(refptr);
    return true;
  }
};

// Finally, ParamTraits itself.

template <class P>
struct ParamTraits : ParamTraitsMozilla<P> {};

}  // namespace IPC

#endif  // CHROME_COMMON_IPC_MESSAGE_UTILS_H_
