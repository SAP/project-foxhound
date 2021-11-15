/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_IOUtils__
#define mozilla_dom_IOUtils__

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Attributes.h"
#include "mozilla/Buffer.h"
#include "mozilla/DataMutex.h"
#include "mozilla/MozPromise.h"
#include "mozilla/Result.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/IOUtilsBinding.h"
#include "mozilla/dom/TypedArray.h"
#include "nsIAsyncShutdown.h"
#include "nsISerialEventTarget.h"
#include "nsPrintfCString.h"
#include "nsString.h"
#include "nsStringFwd.h"
#include "nsTArray.h"
#include "prio.h"

namespace mozilla {

/**
 * Utility class to be used with |UniquePtr| to automatically close NSPR file
 * descriptors when they go out of scope.
 *
 * Example:
 *
 *   UniquePtr<PRFileDesc, PR_CloseDelete> fd = PR_Open(path, flags, mode);
 */
class PR_CloseDelete {
 public:
  constexpr PR_CloseDelete() = default;
  PR_CloseDelete(const PR_CloseDelete& aOther) = default;
  PR_CloseDelete(PR_CloseDelete&& aOther) = default;
  PR_CloseDelete& operator=(const PR_CloseDelete& aOther) = default;
  PR_CloseDelete& operator=(PR_CloseDelete&& aOther) = default;

  void operator()(PRFileDesc* aPtr) const { PR_Close(aPtr); }
};

namespace dom {

/**
 * Implementation for the Web IDL interface at dom/chrome-webidl/IOUtils.webidl.
 * Methods of this class must only be called from the parent process.
 */
class IOUtils final {
 public:
  class IOError;

  static already_AddRefed<Promise> Read(GlobalObject& aGlobal,
                                        const nsAString& aPath,
                                        const ReadOptions& aOptions);

  static already_AddRefed<Promise> ReadUTF8(GlobalObject& aGlobal,
                                            const nsAString& aPath,
                                            const ReadUTF8Options& aOptions);

  static already_AddRefed<Promise> WriteAtomic(
      GlobalObject& aGlobal, const nsAString& aPath, const Uint8Array& aData,
      const WriteAtomicOptions& aOptions);

  static already_AddRefed<Promise> WriteAtomicUTF8(
      GlobalObject& aGlobal, const nsAString& aPath, const nsAString& aString,
      const WriteAtomicOptions& aOptions);

  static already_AddRefed<Promise> Move(GlobalObject& aGlobal,
                                        const nsAString& aSourcePath,
                                        const nsAString& aDestPath,
                                        const MoveOptions& aOptions);

  static already_AddRefed<Promise> Remove(GlobalObject& aGlobal,
                                          const nsAString& aPath,
                                          const RemoveOptions& aOptions);

  static already_AddRefed<Promise> MakeDirectory(
      GlobalObject& aGlobal, const nsAString& aPath,
      const MakeDirectoryOptions& aOptions);

  static already_AddRefed<Promise> Stat(GlobalObject& aGlobal,
                                        const nsAString& aPath);

  static already_AddRefed<Promise> Copy(GlobalObject& aGlobal,
                                        const nsAString& aSourcePath,
                                        const nsAString& aDestPath,
                                        const CopyOptions& aOptions);

  static already_AddRefed<Promise> Touch(
      GlobalObject& aGlobal, const nsAString& aPath,
      const Optional<int64_t>& aModification);

  static already_AddRefed<Promise> GetChildren(GlobalObject& aGlobal,
                                               const nsAString& aPath);

  static bool IsAbsolutePath(const nsAString& aPath);

 private:
  ~IOUtils() = default;

  friend class IOUtilsShutdownBlocker;
  struct InternalFileInfo;
  struct InternalWriteAtomicOpts;
  class MozLZ4;

  static StaticDataMutex<StaticRefPtr<nsISerialEventTarget>>
      sBackgroundEventTarget;
  static StaticRefPtr<nsIAsyncShutdownClient> sBarrier;
  static Atomic<bool> sShutdownStarted;

  static already_AddRefed<nsIAsyncShutdownClient> GetShutdownBarrier();

  static already_AddRefed<nsISerialEventTarget> GetBackgroundEventTarget();

  static void SetShutdownHooks();

  template <typename OkT, typename Fn, typename... Args>
  static already_AddRefed<Promise> RunOnBackgroundThread(
      RefPtr<Promise>& aPromise, Fn aFunc, Args... aArgs);

  /**
   * Creates a new JS Promise.
   *
   * @return The new promise, or |nullptr| on failure.
   */
  static already_AddRefed<Promise> CreateJSPromise(GlobalObject& aGlobal);

  // Allow conversion of |InternalFileInfo| with |ToJSValue|.
  friend MOZ_MUST_USE bool ToJSValue(JSContext* aCx,
                                     const InternalFileInfo& aInternalFileInfo,
                                     JS::MutableHandle<JS::Value> aValue);

  /**
   * Rejects |aPromise| with an appropriate |DOMException| describing |aError|.
   */
  static void RejectJSPromise(const RefPtr<Promise>& aPromise,
                              const IOError& aError);

  /**
   * Attempts to read the entire file at |aPath| into a buffer.
   *
   * @param aFile       The location of the file.
   * @param aMaxBytes   If |Some|, then only read up this this number of bytes,
   *                    otherwise attempt to read the whole file.
   * @param aDecompress If true, decompress the bytes read from disk before
   *                    returning the result to the caller.
   *
   * @return A byte array of the entire (decompressed) file contents, or an
   *         error.
   */
  static Result<nsTArray<uint8_t>, IOError> ReadSync(
      already_AddRefed<nsIFile> aFile, const Maybe<uint32_t>& aMaxBytes,
      const bool aDecompress);

  /**
   * Attempts to read the entire file at |aPath| as a UTF-8 string.
   *
   * @param aFile       The location of the file.
   * @param aDecompress If true, decompress the bytes read from disk before
   *                    returning the result to the caller.
   *
   * @return The (decompressed) contents of the file re-encoded as a UTF-16
   *         string.
   */
  static Result<nsString, IOError> ReadUTF8Sync(already_AddRefed<nsIFile> aFile,
                                                const bool aDecompress);

  /**
   * Attempt to write the entirety of |aByteArray| to the file at |aPath|.
   * This may occur by writing to an intermediate destination and performing a
   * move, depending on |aOptions|.
   *
   * @param aFile  The location of the file.
   * @param aByteArray The data to write to the file.
   * @param aOptions   Options to modify the way the write is completed.
   *
   * @return The number of bytes written to the file, or an error if the write
   *         failed or was incomplete.
   */
  static Result<uint32_t, IOError> WriteAtomicSync(
      already_AddRefed<nsIFile> aFile, const Span<const uint8_t>& aByteArray,
      InternalWriteAtomicOpts aOptions);

  /**
   * Attempt to write the entirety of |aUTF8String| to the file at |aFile|.
   * This may occur by writing to an intermediate destination and performing a
   * move, depending on |aOptions|.
   *
   * @param aFile The location of the file.
   * @param aByteArray The data to write to the file.
   * @param aOptions Options to modify the way the write is completed.
   *
   * @return The number of bytes written to the file, or an error if the write
   *         failed or was incomplete.
   */
  static Result<uint32_t, IOError> WriteAtomicUTF8Sync(
      already_AddRefed<nsIFile> aFile, const nsCString& aUTF8String,
      InternalWriteAtomicOpts aOptions);

  /**
   * Attempts to write |aBytes| to the file pointed by |aFd|.
   *
   * @param aFd    An open PRFileDesc for the destination file to be
   *               overwritten.
   * @param aFile  The location of the file.
   * @param aBytes The data to write to the file.
   *
   * @return The number of bytes written to the file, or an error if the write
   *         failed or was incomplete.
   */
  static Result<uint32_t, IOError> WriteSync(PRFileDesc* aFd, nsIFile* aFile,
                                             const Span<const uint8_t>& aBytes);

  /**
   * Attempts to move the file located at |aSourceFile| to |aDestFile|.
   *
   * @param aSourceFile  The location of the file to move.
   * @param aDestFile    The destination for the file.
   * @param noOverWrite If true, abort with an error if a file already exists at
   *                    |aDestFile|. Otherwise, the file will be overwritten by
   *                    the move.
   *
   * @return Ok if the file was moved successfully, or an error.
   */
  static Result<Ok, IOError> MoveSync(already_AddRefed<nsIFile> aSourceFile,
                                      already_AddRefed<nsIFile> aDestFile,
                                      bool aNoOverwrite);

  /**
   * Attempts to copy the file at |aSourceFile| to |aDestFile|.
   *
   * @param aSourceFile The location of the file to copy.
   * @param aDestFile   The destination that the file will be copied to.
   *
   * @return Ok if the operation was successful, or an error.
   */
  static Result<Ok, IOError> CopySync(already_AddRefed<nsIFile> aSourceFile,
                                      already_AddRefed<nsIFile> aDestFile,
                                      bool aNoOverWrite, bool aRecursive);

  /**
   * Provides the implementation for |CopySync| and |MoveSync|.
   *
   * @param aMethod      A pointer to one of |nsIFile::MoveTo| or |CopyTo|
   *                     instance methods.
   * @param aMethodName  The name of the method to the performed. Either "move"
   *                     or "copy".
   * @param aSource      The source file to be copied or moved.
   * @param aDest        The destination file.
   * @param aNoOverwrite If true, allow overwriting |aDest| during the copy or
   *                     move. Otherwise, abort with an error if the file would
   *                     be overwritten.
   *
   * @return Ok if the operation was successful, or an error.
   */
  template <typename CopyOrMoveFn>
  static Result<Ok, IOError> CopyOrMoveSync(CopyOrMoveFn aMethod,
                                            const char* aMethodName,
                                            nsIFile* aSource, nsIFile* aDest,
                                            bool aNoOverwrite);

  /**
   * Attempts to remove the file located at |aFile|.
   *
   * @param aFile         The location of the file.
   * @param aIgnoreAbsent If true, suppress errors due to an absent target file.
   * @param aRecursive    If true, attempt to recursively remove descendant
   *                      files. This option is safe to use even if the target
   *                      is not a directory.
   *
   * @return Ok if the file was removed successfully, or an error.
   */
  static Result<Ok, IOError> RemoveSync(already_AddRefed<nsIFile> aFile,
                                        bool aIgnoreAbsent, bool aRecursive);

  /**
   * Attempts to create a new directory at |aFile|.
   *
   * @param aFile             The location of the directory to create.
   * @param aCreateAncestors  If true, create missing ancestor directories as
   *                          needed. Otherwise, report an error if the target
   *                          has non-existing ancestor directories.
   * @param aIgnoreExisting   If true, suppress errors that occur if the target
   *                          directory already exists. Otherwise, propagate the
   *                          error if it occurs.
   * @param aMode             Optional file mode. Defaults to 0777 to allow the
   *                          system umask to compute the best mode for the new
   *                          directory.
   *
   * @return Ok if the directory was created successfully, or an error.
   */
  static Result<Ok, IOError> MakeDirectorySync(already_AddRefed<nsIFile> aFile,
                                               bool aCreateAncestors,
                                               bool aIgnoreExisting,
                                               int32_t aMode = 0777);

  /**
   * Attempts to stat a file at |aFile|.
   *
   * @param aFile The location of the file.
   *
   * @return An |InternalFileInfo| struct if successful, or an error.
   */
  static Result<IOUtils::InternalFileInfo, IOError> StatSync(
      already_AddRefed<nsIFile> aFile);

  /**
   * Attempts to update the last modification time of the file at |aFile|.
   *
   * @param aFile       The location of the file.
   * @param aNewModTime Some value in milliseconds since Epoch. For the current
   *                    system time, use |Nothing|.
   *
   * @return Timestamp of the file if the operation was successful, or an error.
   */
  static Result<int64_t, IOError> TouchSync(already_AddRefed<nsIFile> aFile,
                                            const Maybe<int64_t>& aNewModTime);

  /**
   * Returns the immediate children of the directory at |aFile|, if any.
   *
   * @param aFile The location of the directory.
   *
   * @return An array of absolute paths identifying the children of |aFile|.
   *         If there are no children, an empty array. Otherwise, an error.
   */
  static Result<nsTArray<nsString>, IOError> GetChildrenSync(
      already_AddRefed<nsIFile> aFile);
};

/**
 * An error class used with the |Result| type returned by most private |IOUtils|
 * methods.
 */
class IOUtils::IOError {
 public:
  MOZ_IMPLICIT IOError(nsresult aCode) : mCode(aCode), mMessage(Nothing()) {}

  /**
   * Replaces the message associated with this error.
   */
  template <typename... Args>
  IOError WithMessage(const char* const aMessage, Args... aArgs) {
    mMessage.emplace(nsPrintfCString(aMessage, aArgs...));
    return *this;
  }
  IOError WithMessage(const char* const aMessage) {
    mMessage.emplace(nsCString(aMessage));
    return *this;
  }
  IOError WithMessage(const nsCString& aMessage) {
    mMessage.emplace(aMessage);
    return *this;
  }

  /**
   * Returns the |nsresult| associated with this error.
   */
  nsresult Code() const { return mCode; }

  /**
   * Maybe returns a message associated with this error.
   */
  const Maybe<nsCString>& Message() const { return mMessage; }

 private:
  nsresult mCode;
  Maybe<nsCString> mMessage;
};

/**
 * This is an easier to work with representation of a |mozilla::dom::FileInfo|
 * for private use in the IOUtils implementation.
 *
 * Because web IDL dictionaries are not easily copy/moveable, this class is
 * used instead, until converted to the proper |mozilla::dom::FileInfo| before
 * returning any results to JavaScript.
 */
struct IOUtils::InternalFileInfo {
  nsString mPath;
  FileType mType;
  uint64_t mSize;
  uint64_t mLastModified;
};

/**
 * This is an easier to work with representation of a
 * |mozilla::dom::WriteAtomicOptions| for private use in the |IOUtils|
 * implementation.
 *
 * Because web IDL dictionaries are not easily copy/moveable, this class is
 * used instead.
 */
struct IOUtils::InternalWriteAtomicOpts {
  RefPtr<nsIFile> mBackupFile;
  bool mFlush;
  bool mNoOverwrite;
  RefPtr<nsIFile> mTmpFile;
  bool mCompress;

  static Result<InternalWriteAtomicOpts, IOUtils::IOError> FromBinding(
      const WriteAtomicOptions& aOptions);
};

/**
 * Re-implements the file compression and decompression utilities found
 * in toolkit/components/lz4/lz4.js
 *
 * This implementation uses the non-standard data layout:
 *
 *  - MAGIC_NUMBER (8 bytes)
 *  - content size (uint32_t, little endian)
 *  - content, as obtained from mozilla::Compression::LZ4::compress
 *
 * See bug 1209390 for more info.
 */
class IOUtils::MozLZ4 {
 public:
  static constexpr std::array<uint8_t, 8> MAGIC_NUMBER{
      {'m', 'o', 'z', 'L', 'z', '4', '0', '\0'}};

  static const uint32_t HEADER_SIZE = 8 + sizeof(uint32_t);

  /**
   * Compresses |aUncompressed| byte array, and returns a byte array with the
   * correct format whose contents may be written to disk.
   */
  static Result<nsTArray<uint8_t>, IOError> Compress(
      Span<const uint8_t> aUncompressed);

  /**
   * Checks |aFileContents| for the correct file header, and returns the
   * decompressed content.
   */
  static Result<nsTArray<uint8_t>, IOError> Decompress(
      Span<const uint8_t> aFileContents);
};

class IOUtilsShutdownBlocker : public nsIAsyncShutdownBlocker {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIASYNCSHUTDOWNBLOCKER

 private:
  virtual ~IOUtilsShutdownBlocker() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif
