/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

interface nsIFile;

/**
 * IOUtils is a simple, efficient interface for performing file I/O from a
 * privileged chrome-only context. All asynchronous I/O tasks are run on
 * a background thread.
 *
 * Pending I/O tasks will block shutdown at the |profileBeforeChange| phase.
 * During this shutdown phase, no additional I/O tasks will be accepted --
 * method calls to this interface will reject once shutdown has entered this
 * phase.
 *
 * IOUtils methods may reject for any number of reasons. Reasonable attempts
 * have been made to map each common operating system error to a |DOMException|.
 * Most often, a caller only needs to check if a given file wasn't found by
 * catching the rejected error and checking if |ex.name === 'NotFoundError'|.
 * In other cases, it is likely sufficient to allow the error to be caught and
 * reported elsewhere.
 */
[ChromeOnly, Exposed=(Window, Worker)]
namespace IOUtils {
 /**
   * Reads up to |opts.maxBytes| of the file at |path| according to |opts|.
   *
   * NB: The maximum file size that can be read is UINT32_MAX.
   *
   * @param path An absolute file path.
   *
   * @return Resolves with an array of unsigned byte values read from disk,
   *         otherwise rejects with a DOMException.
   */
  [NewObject]
  Promise<Uint8Array> read(DOMString path, optional ReadOptions opts = {});
  /**
   * Reads the UTF-8 text file located at |path| and returns the decoded
   * contents as a |DOMString|.
   *
   * NB: The maximum file size that can be read is UINT32_MAX.
   *
   * @param path An absolute file path.
   *
   * @return Resolves with the file contents encoded as a string, otherwise
   *         rejects with a DOMException.
   */
  [NewObject]
  Promise<UTF8String> readUTF8(DOMString path, optional ReadUTF8Options opts = {});
  /**
   * Read the UTF-8 text file located at |path| and return the contents
   * parsed as JSON into a JS value.
   *
   * NB: The maximum file size that can be read is UINT32_MAX.
   *
   * @param path An absolute path.
   *
   * @return Resolves with the contents of the file parsed as JSON.
   */
  [NewObject]
  Promise<any> readJSON(DOMString path, optional ReadUTF8Options opts = {});
  /**
   * Attempts to safely write |data| to a file at |path|.
   *
   * This operation can be made atomic by specifying the |tmpPath| option. If
   * specified, then this method ensures that the destination file is not
   * modified until the data is entirely written to the temporary file, after
   * which point the |tmpPath| is moved to the specified |path|.
   *
   * The target file can also be backed up to a |backupFile| before any writes
   * are performed to prevent data loss in case of corruption.
   *
   * @param path    An absolute file path.
   * @param data    Data to write to the file at path.
   *
   * @return Resolves with the number of bytes successfully written to the file,
   *         otherwise rejects with a DOMException.
   */
  [NewObject]
  Promise<unsigned long long> write(DOMString path, Uint8Array data, optional WriteOptions options = {});
  /**
   * Attempts to encode |string| to UTF-8, then safely write the result to a
   * file at |path|. Works exactly like |write|.
   *
   * @param path      An absolute file path.
   * @param string    A string to write to the file at path.
   * @param options   Options for writing the file.
   *
   * @return Resolves with the number of bytes successfully written to the file,
   *         otherwise rejects with a DOMException.
   */
  [NewObject]
  Promise<unsigned long long> writeUTF8(DOMString path, UTF8String string, optional WriteOptions options = {});
  /**
   * Attempts to serialize |value| into a JSON string and encode it as into a
   * UTF-8 string, then safely write the result to a file at |path|. Works
   * exactly like |write|.
   *
   * @param path      An absolute file path
   * @param value     The value to be serialized.
   * @param options   Options for writing the file. The "append" mode is not supported.
   *
   * @return Resolves with the number of bytes successfully written to the file,
   *         otherwise rejects with a DOMException.
   */
  [NewObject]
  Promise<unsigned long long> writeJSON(DOMString path, any value, optional WriteOptions options = {});
  /**
   * Moves the file from |sourcePath| to |destPath|, creating necessary parents.
   * If |destPath| is a directory, then the source file will be moved into the
   * destination directory.
   *
   * @param sourcePath An absolute file path identifying the file or directory
   *                   to move.
   * @param destPath   An absolute file path identifying the destination
   *                   directory and/or file name.
   *
   * @return Resolves if the file is moved successfully, otherwise rejects with
   *         a DOMException.
   */
  [NewObject]
  Promise<undefined> move(DOMString sourcePath, DOMString destPath, optional MoveOptions options = {});
  /**
   * Removes a file or directory at |path| according to |options|.
   *
   * @param path An absolute file path identifying the file or directory to
   *             remove.
   *
   * @return Resolves if the file is removed successfully, otherwise rejects
   *         with a DOMException.
   */
  [NewObject]
  Promise<undefined> remove(DOMString path, optional RemoveOptions options = {});
  /**
   * Creates a new directory at |path| according to |options|.
   *
   * @param path An absolute file path identifying the directory to create.
   *
   * @return Resolves if the directory is created successfully, otherwise
   *         rejects with a DOMException.
   */
  [NewObject]
  Promise<undefined> makeDirectory(DOMString path, optional MakeDirectoryOptions options = {});
  /**
   * Obtains information about a file, such as size, modification dates, etc.
   *
   * @param path An absolute file path identifying the file or directory to
   *             inspect.
   *
   * @return Resolves with a |FileInfo| object for the file at path, otherwise
   *         rejects with a DOMException.
   *
   * @see FileInfo
   */
  [NewObject]
  Promise<FileInfo> stat(DOMString path);
  /**
   * Copies a file or directory from |sourcePath| to |destPath| according to
   * |options|.
   *
   * @param sourcePath An absolute file path identifying the source file to be
   *                   copied.
   * @param destPath   An absolute file path identifying the location for the
   *                   copy.
   *
   * @return Resolves if the file was copied successfully, otherwise rejects
   *         with a DOMException.
   */
  [NewObject]
  Promise<undefined> copy(DOMString sourcePath, DOMString destPath, optional CopyOptions options = {});
  /**
   * Updates the access time for the file at |path|.
   *
   * @param path         An absolute file path identifying the file whose
   *                     modification time is to be set. This file must exist
   *                     and will not be created.
   * @param modification An optional access time for the file expressed in
   *                     milliseconds since the Unix epoch
   *                     (1970-01-01T00:00:00Z). The current system time is used
   *                     if this parameter is not provided.
   *
   * @return Resolves with the updated access time time expressed in
   *         milliseconds since the Unix epoch, otherwise rejects with a
   *         DOMException.
   */
  [NewObject]
  Promise<long long> setAccessTime(DOMString path, optional long long access);
  /**
   * Updates the modification time for the file at |path|.
   *
   * @param path         An absolute file path identifying the file whose
   *                     modification time is to be set. This file must exist
   *                     and will not be created.
   * @param modification An optional modification time for the file expressed in
   *                     milliseconds since the Unix epoch
   *                     (1970-01-01T00:00:00Z). The current system time is used
   *                     if this parameter is not provided.
   *
   * @return Resolves with the updated modification time expressed in
   *         milliseconds since the Unix epoch, otherwise rejects with a
   *         DOMException.
   */
  [NewObject]
  Promise<long long> setModificationTime(DOMString path, optional long long modification);
  /**
   * Retrieves a (possibly empty) list of immediate children of the directory at
   * |path|.
   *
   * @param path An absolute file path.
   *
   * @return Resolves with a sequence of absolute file paths representing the
   *         children of the directory at |path|, otherwise rejects with a
   *         DOMException.
   */
  [NewObject]
  Promise<sequence<DOMString>> getChildren(DOMString path, optional GetChildrenOptions options = {});
  /**
   * Set the permissions of the file at |path|.
   *
   * Windows does not make a distinction between user, group, and other
   * permissions like UNICES do. If a permission flag is set for any of user,
   * group, or other has a permission, then all users will have that
   * permission. Additionally, Windows does not support setting the
   * "executable" permission.
   *
   * @param path        An absolute file path
   * @param permissions The UNIX file mode representing the permissions.
   * @param honorUmask  If omitted or true, any UNIX file mode value is
   *                    modified by the process umask. If false, the exact value
   *                    of UNIX file mode will be applied. This value has no effect
   *                    on Windows.
   *
   * @return Resolves if the permissions were set successfully, otherwise
   *         rejects with a DOMException.
   */
  [NewObject]
  Promise<undefined> setPermissions(DOMString path, unsigned long permissions, optional boolean honorUmask = true);
  /**
   * Return whether or not the file exists at the given path.
   *
   * @param path An absolute file path.
   *
   * @return A promise that resolves to whether or not the given file exists.
   */
  [NewObject]
  Promise<boolean> exists(DOMString path);

  /**
   * Create a file with a unique name and return its path.
   *
   * @param parent An absolute path to the directory where the file is to be
   *               created.
   * @param prefix A prefix for the filename.
   *
   * @return A promise that resolves to a unique filename.
   */
  [NewObject]
  Promise<DOMString> createUniqueFile(DOMString parent, DOMString prefix, optional unsigned long permissions = 0644);

  /**
   * Create a directory with a unique name and return its path.
   *
   * @param parent An absolute path to the directory where the file is to be
   *               created.
   * @param prefix A prefix for the directory name.
   *
   * @return A promise that resolves to a unique directory name.
   */
  [NewObject]
  Promise<DOMString> createUniqueDirectory(DOMString parent, DOMString prefix, optional unsigned long permissions = 0755);

  /**
   * Compute the hash of a file as a hex digest.
   *
   * @param path   The absolute path of the file to hash.
   * @param method The hashing method to use.
   *
   * @return A promise that resolves to the hex digest of the file's hash in lowercase.
   */
  [NewObject]
  Promise<UTF8String> computeHexDigest(DOMString path, HashAlgorithm method);

#if defined(XP_WIN)
  /**
   * Return the Windows-specific file attributes of the file at the given path.
   *
   * @param path An absolute file path.
   *
   * @return A promise that resolves to the Windows-specific file attributes.
   */
  [NewObject]
  Promise<WindowsFileAttributes> getWindowsAttributes(DOMString path);

  /**
   * Set the Windows-specific file attributes of the file at the given path.
   *
   * @param path An absolute file path.
   * @param attrs The attributes to set. Attributes will only be set if they are
   *              |true| or |false| (i.e., |undefined| attributes are not
   *              changed).
   *
   * @return A promise that resolves is the attributes were set successfully.
   */
  [NewObject]
  Promise<undefined> setWindowsAttributes(DOMString path, optional WindowsFileAttributes attrs = {});
#elif defined(XP_MACOSX)
  /**
   * Return whether or not the file has a specific extended attribute.
   *
   * @param path An absolute path.
   * @param attr The attribute to check for.
   *
   * @return A promise that resolves to whether or not the file has an extended
   *         attribute, or rejects with an error.
   */
  [NewObject]
  Promise<boolean> hasMacXAttr(DOMString path, UTF8String attr);
  /**
   * Return the value of an extended attribute for a file.
   *
   * @param path An absolute path.
   * @param attr The attribute to get the value of.
   *
   * @return A promise that resolves to the value of the extended attribute, or
   *         rejects with an error.
   */
  [NewObject]
  Promise<Uint8Array> getMacXAttr(DOMString path, UTF8String attr);
  /**
   * Set the extended attribute on a file.
   *
   * @param path  An absolute path.
   * @param attr  The attribute to set.
   * @param value The value of the attribute to set.
   *
   * @return A promise that resolves to whether or not the file has an extended
   *         attribute, or rejects with an error.
   */
  [NewObject]
  Promise<undefined> setMacXAttr(DOMString path, UTF8String attr, Uint8Array value);
  /**
   * Delete the extended attribute on a file.
   *
   * @param path An absolute path.
   * @param attr The attribute to delete.
   *
   * @return A promise that resolves if the attribute was deleted, or rejects
   *         with an error.
   */
  [NewObject]
  Promise<undefined> delMacXAttr(DOMString path, UTF8String attr);
#endif

  /**
   * Return a nsIFile whose parent directory exists. The parent directory of the
   * file will be created off main thread if it does not already exist.
   *
   * @param components The path components. The first component must be an
   *                   absolute path.
   *
   * @return A promise that resolves to an nsIFile for the requested file.
   */
  [NewObject]
  Promise<nsIFile> getFile(DOMString... components);

  /**
   * Return an nsIFile corresponding to a directory. It will be created
   * off-main-thread if it does not already exist.
   *
   * @param components The path components. The first component must be an
   *                   absolute path.
   *
   * @return A promise that resolves to an nsIFile for the requested directory.
   */
  [NewObject]
  Promise<nsIFile> getDirectory(DOMString... components);
};

[Exposed=Window]
partial namespace IOUtils {
  /**
   * The async shutdown client for the profile-before-change shutdown phase.
   */
  [Throws]
  readonly attribute any profileBeforeChange;

  /**
   * The async shutdown client for the profile-before-change-telemetry shutdown
   * phase.
   *
   * ONLY telemetry should register blockers on this client.
   */
  [Throws]
  readonly attribute any sendTelemetry;
};

[Exposed=Worker]
partial namespace IOUtils {
  /**
   * Synchronously opens the file at |path|. This API is only available in workers.
   *
   * @param path An absolute file path.
   *
   * @return A |SyncReadFile| object for the file.
   */
  [Throws]
  SyncReadFile openFileForSyncReading(DOMString path);

#ifdef XP_UNIX
  /**
   * Launch a child process; uses `base::LaunchApp` from IPC.  (This WebIDL
   * binding is currently Unix-only; it could also be supported on Windows
   * but it would use u16-based strings, so it would basically be a separate
   * copy of the bindings.)
   *
   * This interface was added for use by `Subprocess.sys.jsm`; other would-be
   * callers may want to just use Subprocess instead of calling this directly.
   *
   * @param argv The command to run and its arguments.
   * @param options Various parameters about how the child process is launched
   *                and its initial environment.
   *
   * @return The process ID.  Note that various errors (e.g., the
   *         executable to be launched doesn't exist) may not be
   *         encountered until after the process is created, so a
   *         successful return doesn't necessarily imply a successful
   *         launch.
   */
  [Throws]
  unsigned long launchProcess(sequence<UnixString> argv, LaunchOptions options);
#endif
};

/**
 * An object representing an open file, allowing parts of the file contents to be
 * read synchronously. Only available in workers.
 */
[ChromeOnly, Exposed=Worker]
interface SyncReadFile {
  /**
   * The file size, in bytes.
   */
  readonly attribute long long size;

  /**
   * Synchronously read |dest.length| bytes at offset |offset| into |dest|.
   * Throws if the file has been closed already or if the read would be out-of-bounds.
   *
   * @param dest   A Uint8Array whose entire contents will be overwritten with
   *               bytes read from the file.
   * @param offset The file offset at which the read range begins. (The length of the
   *               range is given by |dest.length|.)
   */
  [Throws]
  undefined readBytesInto(Uint8Array dest, long long offset);

  /**
   * Close the file. Subsequent calls to readBytesInto will throw.
   * If the file is not closed manually, it will be closed once this object is GC'ed.
   */
  undefined close();
};

/**
 * Options to be passed to the |IOUtils.readUTF8| method.
 */
dictionary ReadUTF8Options {
  /**
   * If true, this option indicates that the file to be read is compressed with
   * LZ4-encoding, and should be decompressed before the data is returned to
   * the caller.
   */
  boolean decompress = false;
};

/**
 * Options to be passed to the |IOUtils.read| method.
 */
dictionary ReadOptions : ReadUTF8Options {
  /**
   * The offset into the file to read from. If unspecified, the file will be read
   * from the start.
   */
  unsigned long long offset = 0;

  /**
   * The max bytes to read from the file at path. If unspecified, the entire
   * file will be read. This option is incompatible with |decompress|.
   */
  unsigned long? maxBytes = null;
};

/**
 * Modes for writing to a file.
 */
enum WriteMode {
  /**
   * Overwrite the contents of the file.
   *
   * The file will be created if it does not exist.
   */
  "overwrite",
  /**
   * Append to the end of the file.
   *
   * This mode will refuse to create the file if it does not exist.
   */
  "append",
  /**
   * Append to the end of the file, or create it if it does not exist.
   */
  "appendOrCreate",
  /**
   * Create a new file.
   *
   * This mode will refuse to overwrite an existing file.
   */
  "create",
};

/**
 * Options to be passed to the |IOUtils.write| and |writeUTF8|
 * methods.
 */
dictionary WriteOptions {
  /**
   * If specified, backup the destination file to this path before writing.
   */
  DOMString backupFile;
  /**
   * If specified, write the data to a file at |tmpPath| instead of directly to
   * the destination. Once the write is complete, the destination will be
   * overwritten by a move. Specifying this option will make the write a little
   * slower, but also safer.
   */
  DOMString tmpPath;
  /**
   * The mode used to write to the file.
   */
  WriteMode mode = "overwrite";
  /**
   * If true, force the OS to write its internal buffers to the disk.
   * This is considerably slower for the whole system, but safer in case of
   * an improper system shutdown (e.g. due to a kernel panic) or device
   * disconnection before the buffers are flushed.
   */
  boolean flush = false;
  /**
   * If true, compress the data with LZ4-encoding before writing to the file.
   */
  boolean compress = false;
};

/**
 * Options to be passed to the |IOUtils.move| method.
 */
dictionary MoveOptions {
  /**
   * If true, fail if the destination already exists.
   */
  boolean noOverwrite = false;
};

/**
 * Options to be passed to the |IOUtils.remove| method.
 */
dictionary RemoveOptions {
  /**
   * If true, no error will be reported if the target file is missing.
   */
  boolean ignoreAbsent = true;
  /**
   * If true, and the target is a directory, recursively remove files.
   */
  boolean recursive = false;
};

/**
 * Options to be passed to the |IOUtils.makeDirectory| method.
 */
dictionary MakeDirectoryOptions {
  /**
   * If true, create the directory and all necessary ancestors if they do not
   * already exist. If false and any ancestor directories do not exist,
   * |makeDirectory| will reject with an error.
   */
  boolean createAncestors = true;
  /**
   * If true, succeed even if the directory already exists (default behavior).
   * Otherwise, fail if the directory already exists.
   */
  boolean ignoreExisting = true;
  /**
   * The file mode to create the directory with.
   *
   * This is ignored on Windows.
   */
  unsigned long permissions = 0755;

};

/**
 * Options to be passed to the |IOUtils.copy| method.
 */
dictionary CopyOptions {
  /**
   * If true, fail if the destination already exists.
   */
  boolean noOverwrite = false;
  /**
   * If true, copy the source recursively.
   */
  boolean recursive = false;
};

/**
 * Options to be passed to the |IOUtils.getChildren| method.
 */
dictionary GetChildrenOptions {
  /**
   * If true, no error will be reported if the target file is missing.
   */
  boolean ignoreAbsent = false;
};

/**
 * Types of files that are recognized by the |IOUtils.stat| method.
 */
enum FileType { "regular", "directory", "other" };

/**
 * Basic metadata about a file.
 */
dictionary FileInfo {
  /**
   * The absolute path to the file on disk, as known when this file info was
   * obtained.
   */
  DOMString path;

  /**
   * Identifies if the file at |path| is a regular file, directory, or something
   * something else.
   */
  FileType type;

  /**
   * If this represents a regular file, the size of the file in bytes.
   * Otherwise, -1.
   */
  long long size;

  /**
   * The timestamp of file creation, represented in milliseconds since Epoch
   * (1970-01-01T00:00:00.000Z).
   *
   * This is only available on MacOS and Windows.
   */
  long long creationTime;

  /**
   * The timestmp of last file accesss, represented in milliseconds since Epoch
   * (1970-01-01T00:00:00.000Z).
   */
  long long lastAccessed;

  /**
   * The timestamp of the last file modification, represented in milliseconds
   * since Epoch (1970-01-01T00:00:00.000Z).
   */
  long long lastModified;

  /**
   * The permissions of the file, expressed as a UNIX file mode.
   *
   * NB: Windows does not make a distinction between user, group, and other
   * permissions like UNICES do. The user, group, and other parts will always
   * be identical on Windows.
   */
  unsigned long permissions;
};

/**
 * The supported hash algorithms for |IOUtils.hashFile|.
 */
enum HashAlgorithm { "sha1", "sha256", "sha384", "sha512" };

#ifdef XP_WIN
/**
 * Windows-specific file attributes.
 */
dictionary WindowsFileAttributes {
  /**
   * Whether or not the file is read-only.
   */
  boolean readOnly;
  /**
   * Whether or not the file is hidden.
   */
  boolean hidden;
  /**
   * Whether or not the file is classified as a system file.
   */
  boolean system;
};
#endif

#ifdef XP_UNIX
/**
 * Used where the POSIX API allows an arbitrary byte string but in
 * practice it's usually UTF-8, so JS strings are accepted for
 * convenience.
 */
typedef (UTF8String or Uint8Array) UnixString;

/**
 * Options for the `launchApp` method.  See also `base::LaunchOptions`
 * in C++.
 */
dictionary LaunchOptions {
  /**
   * The environment variables, as a sequence of `NAME=value` strings.
   * (The underlying C++ code can also inherit the current environment
   * with optional changes; that feature could be added here if needed.)
   */
  required sequence<UnixString> environment;

  /**
   * The initial current working directory.
   */
  UnixString workdir;

  /**
   * File descriptors to pass to the child process.  Any fds not
   * mentioned here, other than stdin/out/err, will not be inherited
   * even if they aren't marked close-on-exec.
   */
  sequence<FdMapping> fdMap;

  /**
   * On macOS 10.14+, disclaims responsibility for the child process
   * with respect to privacy/security permission prompts and
   * decisions.  Ignored if not supported by the OS.
   */
  boolean disclaim = false;
};

/**
 * Describes a file descriptor to give to the child process.
 */
dictionary FdMapping {
  /**
   * The fd in the parent process to pass.  This must remain open during
   * the call to `launchApp` but can be closed after it returns (or throws).
   */
  required unsigned long src;

  /**
   * The fd number to map it to in the child process.
   */
  required unsigned long dst;
};
#endif
