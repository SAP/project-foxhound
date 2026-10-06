/*
** 2020-04-20
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
**
** This file implements a VFS shim that obfuscates database content
** written to disk by applying a CipherStrategy.
**
** COMPILING
**
** This extension requires SQLite 3.32.0 or later.
**
**
** LOADING
**
** Initialize it using a single API call as follows:
**
**     sqlite3_obfsvfs_init();
**
** Obfsvfs is a VFS Shim. When loaded, "obfsvfs" becomes the new
** default VFS and it uses the prior default VFS as the next VFS
** down in the stack.  This is normally what you want.  However, it
** complex situations where multiple VFS shims are being loaded,
** it might be important to ensure that obfsvfs is loaded in the
** correct order so that it sequences itself into the default VFS
** Shim stack in the right order.
**
** USING
**
** Open database connections using the sqlite3_open_v2() with
** the SQLITE_OPEN_URI flag and using a URI filename that includes
** the query parameter "key=XXXXXXXXXXX..." where the XXXX... consists
** of 64 hexadecimal digits (32 bytes of content).
**
** Create a new encrypted database by opening a file that does not
** yet exist using the key= query parameter.
**
** LIMITATIONS:
**
**    *   An obfuscated database must be created as such.  There is
**        no way to convert an existing database file into an
**        obfuscated database file other than to run ".dump" on the
**        older database and reimport the SQL text into a new
**        obfuscated database.
**
**    *   There is no way to change the key value, other than to
**        ".dump" and restore the database
**
**    *   The database page size must be exactly 8192 bytes.  No other
**        database page sizes are currently supported.
**
**    *   Memory-mapped I/O does not work for obfuscated databases.
**        If you think about it, memory-mapped I/O doesn't make any
**        sense for obfuscated databases since you have to make a
**        copy of the content to deobfuscate anyhow - you might as
**        well use normal read()/write().
**
**    *   Only the main database, the rollback journal, and WAL file
**        are obfuscated.  Other temporary files used for things like
**        SAVEPOINTs or as part of a large external sort remain
**        unobfuscated.
**
**    *   Requires SQLite 3.32.0 or later.
*/
#include "ObfuscatingVFS.h"

#include <string.h>
#include <ctype.h>
#include <cerrno>
#include <cstdio>
#include <cstring>

#include "mozilla/dom/quota/IPCStreamCipherStrategy.h"
#include "mozilla/Logging.h"
#include "mozilla/ScopeExit.h"
#include "mozilla/storage/SQLiteEncryption.h"
#include "nsPrintfCString.h"
#include "nsString.h"
#include "QuotaVFS.h"
#include "sqlite3.h"

/*
** Forward declaration of objects used by this utility
*/
using ObfsVfs = sqlite3_vfs;

/*
** Useful datatype abbreviations
*/
#if !defined(SQLITE_CORE)
using u8 = unsigned char;
#endif

/* Access to a lower-level VFS that (might) implement dynamic loading,
** access to randomness, etc.
*/
#define ORIGVFS(p) ((sqlite3_vfs*)((p)->pAppData))
#define ORIGFILE(p) ((sqlite3_file*)(((ObfsFile*)(p)) + 1))

/*
** Database page size for obfuscated databases (defined in ObfuscatingVFS.h).
*/
#define OBFS_PGSZ (::mozilla::storage::obfsvfs::kObfsPageSize)

#define WAL_FRAMEHDRSIZE 24

using namespace mozilla;
using namespace mozilla::dom::quota;

// Derived from the cipher's own KeyType so this file stays correct if the
// cipher ever switches to a different key length. Matches the canonical
// `static_assert(sizeof(NSSCipherStrategy::KeyType) == 32)` in
// dom/quota/NSSCipherStrategy.cpp.
static constexpr int kKeyBytes = sizeof(IPCStreamCipherStrategy::KeyType);

/* An open file */
struct ObfsFile {
  sqlite3_file base;  /* IO methods */
  const char* zFName; /* Original name of the file */
  bool inCkpt;        /* Currently doing a checkpoint */
  ObfsFile* pPartner; /* Ptr from WAL to main-db, or from main-db to WAL */
  void* pTemp;        /* Temporary storage for encoded pages */
  IPCStreamCipherStrategy*
      encryptCipherStrategy; /* CipherStrategy for encryption */
  IPCStreamCipherStrategy*
      decryptCipherStrategy; /* CipherStrategy for decryption */
  /* For a main DB opened with an explicit URI ?key= whose key is NOT in
  ** lockstore (private-browsing IDB/Cache pass an ephemeral &key=), retain the
  ** raw key so the keyless WAL/journal opened later can inherit it via
  ** sqlite3_database_file_object(). The policy branch cannot re-derive a key
  ** lockstore never stored. Lockstore-keyed DBs leave aHasUriKey false and
  ** re-fetch on demand (nothing cached). Zeroized in obfsClose. */
  bool aHasUriKey;
  u8 aKey[kKeyBytes];
};

/*
** Methods for ObfsFile
*/
static int obfsClose(sqlite3_file*);
static int obfsRead(sqlite3_file*, void*, int iAmt, sqlite3_int64 iOfst);
static int obfsWrite(sqlite3_file*, const void*, int iAmt, sqlite3_int64 iOfst);
static int obfsTruncate(sqlite3_file*, sqlite3_int64 size);
static int obfsSync(sqlite3_file*, int flags);
static int obfsFileSize(sqlite3_file*, sqlite3_int64* pSize);
static int obfsLock(sqlite3_file*, int);
static int obfsUnlock(sqlite3_file*, int);
static int obfsCheckReservedLock(sqlite3_file*, int* pResOut);
static int obfsFileControl(sqlite3_file*, int op, void* pArg);
static int obfsSectorSize(sqlite3_file*);
static int obfsDeviceCharacteristics(sqlite3_file*);
static int obfsShmMap(sqlite3_file*, int iPg, int pgsz, int, void volatile**);
static int obfsShmLock(sqlite3_file*, int offset, int n, int flags);
static void obfsShmBarrier(sqlite3_file*);
static int obfsShmUnmap(sqlite3_file*, int deleteFlag);
static int obfsFetch(sqlite3_file*, sqlite3_int64 iOfst, int iAmt, void** pp);
static int obfsUnfetch(sqlite3_file*, sqlite3_int64 iOfst, void* p);

/*
** Methods for ObfsVfs
*/
static int obfsOpen(sqlite3_vfs*, const char*, sqlite3_file*, int, int*);
static int obfsDelete(sqlite3_vfs*, const char* zPath, int syncDir);
static int obfsAccess(sqlite3_vfs*, const char* zPath, int flags, int*);
static int obfsFullPathname(sqlite3_vfs*, const char* zPath, int, char* zOut);
static void* obfsDlOpen(sqlite3_vfs*, const char* zPath);
static void obfsDlError(sqlite3_vfs*, int nByte, char* zErrMsg);
static void (*obfsDlSym(sqlite3_vfs* pVfs, void* p, const char* zSym))(void);
static void obfsDlClose(sqlite3_vfs*, void*);
static int obfsRandomness(sqlite3_vfs*, int nByte, char* zBufOut);
static int obfsSleep(sqlite3_vfs*, int nMicroseconds);
static int obfsCurrentTime(sqlite3_vfs*, double*);
static int obfsGetLastError(sqlite3_vfs*, int, char*);
static int obfsCurrentTimeInt64(sqlite3_vfs*, sqlite3_int64*);
static int obfsSetSystemCall(sqlite3_vfs*, const char*, sqlite3_syscall_ptr);
static sqlite3_syscall_ptr obfsGetSystemCall(sqlite3_vfs*, const char* z);
static const char* obfsNextSystemCall(sqlite3_vfs*, const char* zName);

static const sqlite3_io_methods obfs_io_methods = {
    3,                         /* iVersion */
    obfsClose,                 /* xClose */
    obfsRead,                  /* xRead */
    obfsWrite,                 /* xWrite */
    obfsTruncate,              /* xTruncate */
    obfsSync,                  /* xSync */
    obfsFileSize,              /* xFileSize */
    obfsLock,                  /* xLock */
    obfsUnlock,                /* xUnlock */
    obfsCheckReservedLock,     /* xCheckReservedLock */
    obfsFileControl,           /* xFileControl */
    obfsSectorSize,            /* xSectorSize */
    obfsDeviceCharacteristics, /* xDeviceCharacteristics */
    obfsShmMap,                /* xShmMap */
    obfsShmLock,               /* xShmLock */
    obfsShmBarrier,            /* xShmBarrier */
    obfsShmUnmap,              /* xShmUnmap */
    obfsFetch,                 /* xFetch */
    obfsUnfetch                /* xUnfetch */
};

static constexpr int kIvBytes = IPCStreamCipherStrategy::BlockPrefixLength;
static constexpr int kClearTextPrefixBytesOnFirstPage = 32;
static constexpr int kReservedBytes = 32;
static constexpr int kBasicBlockSize = IPCStreamCipherStrategy::BasicBlockSize;
static_assert(kClearTextPrefixBytesOnFirstPage % kBasicBlockSize == 0);
static_assert(kReservedBytes % kBasicBlockSize == 0);

// The pager validates that no other connection has modified the database by
// reading the 16-byte "file change counter" region at offset 24 of page 1
// directly from the file on every shared-lock acquisition (pager.c, the
// "CKVERS" read). It compares those bytes against the value it cached from
// page 1 the last time it was read.
static constexpr int kChangeCounterOffset = 24;
static constexpr int kChangeCounterBytes = 16;

/* Obfuscate a page using p->encryptCipherStrategy.
**
** A new random nonce is created and stored in the last 32 bytes
** of the page.  All other bytes of the page are obfuscasted using the
** CipherStrategy.  Except, for page-1 (including the SQLite
** database header) the first 32 bytes are not obfuscated
**
** Return a pointer to the obfuscated content, which is held in the
** p->pTemp buffer.  Or return a NULL pointer if something goes wrong.
** Errors are reported using NS_WARNING().
*/
static void* obfsEncode(ObfsFile* p, /* File containing page to be obfuscated */
                        u8* a,       /* database page to be obfuscated */
                        int nByte /* Bytes of content in a[]. Must be a multiple
                                     of kBasicBlockSize. */
) {
  u8 aIv[kIvBytes];
  u8* pOut;
  int i;

  static_assert((kIvBytes & (kIvBytes - 1)) == 0);
  sqlite3_randomness(kIvBytes, aIv);
  pOut = (u8*)p->pTemp;
  if (pOut == nullptr) {
    pOut = static_cast<u8*>(sqlite3_malloc64(nByte));
    if (pOut == nullptr) {
      NS_WARNING(nsPrintfCString("unable to allocate a buffer in which to"
                                 " write obfuscated database content for %s",
                                 p->zFName)
                     .get());
      return nullptr;
    }
    p->pTemp = pOut;
  }
  if (memcmp(a, "SQLite format 3", 16) == 0) {
    i = kClearTextPrefixBytesOnFirstPage;
    if (a[20] != kReservedBytes) {
      NS_WARNING(nsPrintfCString("obfuscated database must have reserved-bytes"
                                 " set to %d",
                                 kReservedBytes)
                     .get());
      return nullptr;
    }
    memcpy(pOut, a, kClearTextPrefixBytesOnFirstPage);
  } else {
    i = 0;
  }
  const int payloadLength = nByte - kReservedBytes - i;
  MOZ_ASSERT(payloadLength > 0);
  // XXX I guess this can be done in-place as well, then we don't need the
  // temporary page at all, I guess?
  p->encryptCipherStrategy->Cipher(
      Span{aIv}, Span{a + i, static_cast<unsigned>(payloadLength)},
      Span{pOut + i, static_cast<unsigned>(payloadLength)});
  memcpy(pOut + nByte - kReservedBytes, aIv, kIvBytes);

  return pOut;
}

/* De-obfuscate a page using p->decryptCipherStrategy.
**
** The deobfuscation is done in-place.
**
** For pages that begin with the SQLite header text, the first
** 32 bytes are not deobfuscated.
*/
static void obfsDecode(ObfsFile* p, /* File containing page to be obfuscated */
                       u8* a,       /* database page to be obfuscated */
                       int nByte /* Bytes of content in a[]. Must be a multiple
                                    of kBasicBlockSize. */
) {
  int i;

  if (memcmp(a, "SQLite format 3", 16) == 0) {
    i = kClearTextPrefixBytesOnFirstPage;
  } else {
    i = 0;
  }
  const int payloadLength = nByte - kReservedBytes - i;
  MOZ_ASSERT(payloadLength > 0);
  p->decryptCipherStrategy->Cipher(
      Span{a + nByte - kReservedBytes, kIvBytes},
      Span{a + i, static_cast<unsigned>(payloadLength)},
      Span{a + i, static_cast<unsigned>(payloadLength)});
  memset(a + nByte - kReservedBytes, 0, kIvBytes);
}

/*
** Close an obfsucated file.
*/
static int obfsClose(sqlite3_file* pFile) {
  ObfsFile* p = (ObfsFile*)pFile;
  if (p->pPartner) {
    MOZ_ASSERT(p->pPartner->pPartner == p);
    p->pPartner->pPartner = nullptr;
    p->pPartner = nullptr;
  }
  sqlite3_free(p->pTemp);

  delete p->decryptCipherStrategy;
  delete p->encryptCipherStrategy;

  // Wipe any retained URI key so a closed slot can't leak to a later reader of
  // freed pager memory (a no-op for lockstore-keyed files, which never set it).
  ::memset(p->aKey, 0, sizeof(p->aKey));

  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xClose(pFile);
}

/*
** Read data from an obfuscated file.
**
** If the file is less than one full page in length, then return
** a substitute "prototype" page-1.  This prototype page one
** specifies a database in WAL mode with an 8192-byte page size
** and a 32-byte reserved-bytes value.  Those settings are necessary
** for obfuscation to function correctly.
*/
static int obfsRead(sqlite3_file* pFile, void* zBuf, int iAmt,
                    sqlite_int64 iOfst) {
  int rc;
  ObfsFile* p = (ObfsFile*)pFile;
  pFile = ORIGFILE(pFile);

  // Serve the pager's change-counter validation read (page 1, offset 24, 16
  // bytes) from a decoded copy of page 1. The pager caches the decoded value
  // (pager.c readDbPage), but bytes 32..39 of this region are encrypted on
  // disk, so a raw read never matches the cache: the pager concludes the file
  // changed, resets its cache, and -- fatally for an in-progress online
  // backup -- restarts the copy on every step, so a multi-step backup never
  // completes. Decoding page 1 here makes both sides of the comparison
  // plaintext while still reflecting a genuine change (the change counter at
  // bytes 24..27 lives in the cleartext prefix). Fall through to the raw read
  // when page 1 is not yet a valid SQLite header (e.g. an empty file), which
  // is the behaviour the pager already expects.
  if (!p->inCkpt && iOfst == kChangeCounterOffset &&
      iAmt == kChangeCounterBytes) {
    u8 aPage1[OBFS_PGSZ];
    rc = pFile->pMethods->xRead(pFile, aPage1, OBFS_PGSZ, 0);
    if (rc == SQLITE_OK && memcmp(aPage1, "SQLite format 3", 16) == 0) {
      obfsDecode(p, aPage1, OBFS_PGSZ);
      memcpy(zBuf, aPage1 + kChangeCounterOffset, kChangeCounterBytes);
      return SQLITE_OK;
    }
  }

  rc = pFile->pMethods->xRead(pFile, zBuf, iAmt, iOfst);
  if (rc == SQLITE_OK) {
    if ((iAmt == OBFS_PGSZ || iAmt == OBFS_PGSZ + WAL_FRAMEHDRSIZE) &&
        !p->inCkpt) {
      obfsDecode(p, ((u8*)zBuf) + iAmt - OBFS_PGSZ, OBFS_PGSZ);
    }
  } else if (rc == SQLITE_IOERR_SHORT_READ && iOfst == 0 && iAmt >= 100) {
    static const unsigned char aEmptyDb[] = {
        // Offset 0, Size 16, The header string: "SQLite format 3\000"
        0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61,
        0x74, 0x20, 0x33, 0x00,
        // XXX Add description for other fields
        0x20, 0x00, 0x02, 0x02, kReservedBytes, 0x40, 0x20, 0x20, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00,
        // Offset 52, Size 4, The page number of the largest root b-tree page
        // when in auto-vacuum or incremental-vacuum modes, or zero otherwise.
        0x00, 0x00, 0x00, 0x01};

    memcpy(zBuf, aEmptyDb, sizeof(aEmptyDb));
    memset(((u8*)zBuf) + sizeof(aEmptyDb), 0, iAmt - sizeof(aEmptyDb));
    rc = SQLITE_OK;
  }
  return rc;
}

/*
** Write data to an obfuscated file or journal.
*/
static int obfsWrite(sqlite3_file* pFile, const void* zBuf, int iAmt,
                     sqlite_int64 iOfst) {
  ObfsFile* p = (ObfsFile*)pFile;
  pFile = ORIGFILE(pFile);
  if (iAmt == OBFS_PGSZ && !p->inCkpt) {
    zBuf = obfsEncode(p, (u8*)zBuf, iAmt);
    if (zBuf == nullptr) {
      return SQLITE_IOERR;
    }
  }
  return pFile->pMethods->xWrite(pFile, zBuf, iAmt, iOfst);
}

/*
** Truncate an obfuscated file.
*/
static int obfsTruncate(sqlite3_file* pFile, sqlite_int64 size) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xTruncate(pFile, size);
}

/*
** Sync an obfuscated file.
*/
static int obfsSync(sqlite3_file* pFile, int flags) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xSync(pFile, flags);
}

/*
** Return the current file-size of an obfuscated file.
*/
static int obfsFileSize(sqlite3_file* pFile, sqlite_int64* pSize) {
  ObfsFile* p = (ObfsFile*)pFile;
  pFile = ORIGFILE(p);
  return pFile->pMethods->xFileSize(pFile, pSize);
}

/*
** Lock an obfuscated file.
*/
static int obfsLock(sqlite3_file* pFile, int eLock) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xLock(pFile, eLock);
}

/*
** Unlock an obfuscated file.
*/
static int obfsUnlock(sqlite3_file* pFile, int eLock) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xUnlock(pFile, eLock);
}

/*
** Check if another file-handle holds a RESERVED lock on an obfuscated file.
*/
static int obfsCheckReservedLock(sqlite3_file* pFile, int* pResOut) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xCheckReservedLock(pFile, pResOut);
}

/*
** File control method. For custom operations on an obfuscated file.
*/
static int obfsFileControl(sqlite3_file* pFile, int op, void* pArg) {
  int rc;
  ObfsFile* p = (ObfsFile*)pFile;
  pFile = ORIGFILE(pFile);
  if (op == SQLITE_FCNTL_PRAGMA) {
    char** azArg = (char**)pArg;
    MOZ_ASSERT(azArg[1] != nullptr);
    if (azArg[2] != nullptr && sqlite3_stricmp(azArg[1], "page_size") == 0) {
      /* Do not allow page size changes on an obfuscated database */
      return SQLITE_OK;
    }
  } else if (op == SQLITE_FCNTL_CKPT_START || op == SQLITE_FCNTL_CKPT_DONE) {
    p->inCkpt = op == SQLITE_FCNTL_CKPT_START;
    if (p->pPartner) {
      p->pPartner->inCkpt = p->inCkpt;
    }
  }
  rc = pFile->pMethods->xFileControl(pFile, op, pArg);
  if (rc == SQLITE_OK && op == SQLITE_FCNTL_VFSNAME) {
    *(char**)pArg = sqlite3_mprintf("obfs/%z", *(char**)pArg);
  }
  return rc;
}

/*
** Return the sector-size in bytes for an obfuscated file.
*/
static int obfsSectorSize(sqlite3_file* pFile) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xSectorSize(pFile);
}

/*
** Return the device characteristic flags supported by an obfuscated file.
*/
static int obfsDeviceCharacteristics(sqlite3_file* pFile) {
  int dc;
  pFile = ORIGFILE(pFile);
  dc = pFile->pMethods->xDeviceCharacteristics(pFile);
  return dc & ~SQLITE_IOCAP_SUBPAGE_READ; /* All except the
                                            SQLITE_IOCAP_SUBPAGE_READ bit */
}

/* Create a shared memory file mapping */
static int obfsShmMap(sqlite3_file* pFile, int iPg, int pgsz, int bExtend,
                      void volatile** pp) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xShmMap(pFile, iPg, pgsz, bExtend, pp);
}

/* Perform locking on a shared-memory segment */
static int obfsShmLock(sqlite3_file* pFile, int offset, int n, int flags) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xShmLock(pFile, offset, n, flags);
}

/* Memory barrier operation on shared memory */
static void obfsShmBarrier(sqlite3_file* pFile) {
  pFile = ORIGFILE(pFile);
  pFile->pMethods->xShmBarrier(pFile);
}

/* Unmap a shared memory segment */
static int obfsShmUnmap(sqlite3_file* pFile, int deleteFlag) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xShmUnmap(pFile, deleteFlag);
}

/* Fetch a page of a memory-mapped file */
static int obfsFetch(sqlite3_file* pFile, sqlite3_int64 iOfst, int iAmt,
                     void** pp) {
  *pp = nullptr;
  return SQLITE_OK;
}

/* Release a memory-mapped page */
static int obfsUnfetch(sqlite3_file* pFile, sqlite3_int64 iOfst, void* pPage) {
  pFile = ORIGFILE(pFile);
  return pFile->pMethods->xUnfetch(pFile, iOfst, pPage);
}

/*
** Translate a single byte of Hex into an integer.
** This routine only works if h really is a valid hexadecimal
** character:  0..9a..fA..F
*/
static u8 obfsHexToInt(int h) {
  MOZ_ASSERT((h >= '0' && h <= '9') || (h >= 'a' && h <= 'f') ||
             (h >= 'A' && h <= 'F'));
#if 1 /* ASCII */
  h += 9 * (1 & (h >> 6));
#else /* EBCDIC */
  h += 9 * (1 & ~(h >> 4));
#endif
  return (u8)(h & 0xf);
}

/*
** Open a new file.
**
** If the file is an ordinary database file, or a rollback or WAL journal
** file, and if the key=XXXX parameter exists, then try to open the file
** as an obfuscated database.  All other open attempts fall through into
** the lower-level VFS shim.
**
** If the key=XXXX parameter exists but is not 64-bytes of hex key, then
** put an error message in NS_WARNING() and return SQLITE_CANTOPEN.
*/
/* Inspection of the on-disk file used to detect on-disk-vs-policy mismatches
** before any encrypted/plaintext write touches the file.
**
** The discriminator is NOT the SQLite magic. obfsvfs deliberately leaves
** "SQLite format 3\0" (offsets 0-15) and the page-size / file-format /
** reserved-bytes fields (offsets 16-23) plaintext on disk so SQLite can
** validate the file, and encrypts only the page payload from page 2 on.
** That means an obfsvfs-encrypted file and a plain SQLite file both start
** with the same magic; only the page-size (16-bit BE @ offset 16, with
** 1 representing 65536) and reserved-bytes (uint8 @ offset 20) tell them
** apart. obfsvfs always writes page_size=8192 and reserved=32.
*/
enum class OnDiskHeader { Missing, Error, TooShort, Plaintext, Encrypted };

// The probe reads the leading header bytes that carry the magic (offsets
// 0-15) plus the page-size, file-format, and reserved-bytes fields (16-23)
// that distinguish an obfsvfs-encrypted file from a plain SQLite database.
static constexpr size_t kOnDiskHeaderProbeBytes = 24;

static OnDiskHeader PeekOnDiskHeader(const char* zPath) {
  FILE* f = fopen(zPath, "rb");
  if (!f) {
    // Distinguish a genuinely absent file (Missing -- the no-CREATE probe
    // below forwards it to the lower VFS) from any other open failure
    // (permissions, too many open files, ...). Collapsing the latter to
    // Missing could forward a plaintext open of a database we merely failed to
    // inspect, so report Error and let obfsOpen refuse.
    return errno == ENOENT ? OnDiskHeader::Missing : OnDiskHeader::Error;
  }
  unsigned char hdr[kOnDiskHeaderProbeBytes] = {0};
  size_t n = fread(hdr, 1, sizeof(hdr), f);
  fclose(f);
  if (n != sizeof(hdr)) {
    return OnDiskHeader::TooShort;
  }
  static const unsigned char kSQLiteMagic[16] = {'S', 'Q', 'L', 'i', 't', 'e',
                                                 ' ', 'f', 'o', 'r', 'm', 'a',
                                                 't', ' ', '3', '\0'};
  if (::memcmp(hdr, kSQLiteMagic, sizeof(kSQLiteMagic)) != 0) {
    // Not a SQLite-shaped file (corrupt, or some other format). No useful
    // signal for the policy/disk mismatch check; treat as TooShort.
    return OnDiskHeader::TooShort;
  }
  uint32_t pageSize = (static_cast<uint32_t>(hdr[16]) << 8) | hdr[17];
  if (pageSize == 1) {
    pageSize = 65536;
  }
  uint32_t reservedBytes = hdr[20];
  // obfsvfs signature: page_size == OBFS_PGSZ (8192) AND reserved == 32.
  if (pageSize == OBFS_PGSZ && reservedBytes == 32) {
    return OnDiskHeader::Encrypted;
  }
  // Any other SQLite-shaped file (a different page size or reserved-bytes
  // value, i.e. not the obfsvfs signature) is treated as a plain SQLite
  // database.
  return OnDiskHeader::Plaintext;
}

/* For a journal/WAL open, strip the SQLite-internal suffix so the policy
** lookup is keyed on the main DB's path. SQLite-internal suffixes:
**   SQLITE_OPEN_MAIN_JOURNAL -- "-journal"
**   SQLITE_OPEN_WAL          -- "-wal"
** For SQLITE_OPEN_MAIN_DB the original zName is the policy key.
*/
static nsAutoCString DeriveMainDbPath(const char* zName, int flags) {
  nsAutoCString p(zName);
  if (flags & SQLITE_OPEN_MAIN_JOURNAL) {
    constexpr auto kJournal = "-journal"_ns;
    if (StringEndsWith(p, kJournal)) {
      p.Truncate(p.Length() - kJournal.Length());
    }
  } else if (flags & SQLITE_OPEN_WAL) {
    constexpr auto kWal = "-wal"_ns;
    if (StringEndsWith(p, kWal)) {
      p.Truncate(p.Length() - kWal.Length());
    }
  }
  return p;
}

/* Pure-string fast bypass for the bootstrap files. Must run BEFORE any
** storage-side call -- in particular before GetDatabaseEncryptionStatus,
** which acquires sStateMutex via GetCachedProfilePath. The bypass path is
** triggered when GetEncryptionKey (already holding sStateMutex) opens
** lockstore.keys.sqlite via skv -> rusqlite -> our obfsvfs xOpen; without
** this fast bypass the same thread would recurse into sStateMutex and
** MOZ_CRASH on resource-deadlock-avoided.
**
** Same reasoning for NSS's own databases: libnss3's bundled SQLite shares
** the global VFS namespace with ours, so its key4.db / cert9.db opens
** during NSS_Initialize land in obfsOpen too -- and the storage-side
** policy lookup would re-enter NSS via lockstore, deadlocking the still-
** running NSS init. Bypassing these names keeps NSS's bootstrap fully
** insulated from our at-rest layer.
**
** Operates on the post-suffix-stripped path, so journal/WAL opens (e.g.
** "lockstore.keys.sqlite-wal") match too.
*/
static bool IsBootstrapBypassPath(const nsACString& aMainDbPath) {
  return mozilla::storage::IsBootstrapDatabasePath(aMainDbPath);
}

static int obfsOpen(sqlite3_vfs* pVfs, const char* zName, sqlite3_file* pFile,
                    int flags, int* pOutFlags) {
  ObfsFile* p;
  sqlite3_file* pSubFile;
  sqlite3_vfs* pSubVfs;
  int rc, i;
  const char* zKey;
  u8 aKey[kKeyBytes];
  pSubVfs = ORIGVFS(pVfs);
  if (flags &
      (SQLITE_OPEN_MAIN_DB | SQLITE_OPEN_WAL | SQLITE_OPEN_MAIN_JOURNAL)) {
    zKey = sqlite3_uri_parameter(zName, "key");
  } else {
    zKey = nullptr;
  }
  const bool keyFromUri = (zKey != nullptr);

  // SQLite opens a connection's rollback journal / WAL without the main DB's
  // URI query params, so they arrive keyless. Two key sources, in order:
  //  1. Partner inheritance (below): a main DB opened with an explicit &key=
  //     whose key is NOT in lockstore (private-browsing IDB/Cache) retains it
  //     on its ObfsFile so its keyless WAL/journal can reuse it.
  //  2. The policy branch: lockstore-keyed in-profile DBs re-derive the same
  //     per-DB key from lockstore on demand (DeriveMainDbPath strips the
  //     -wal/-journal suffix). lockstore stays alive until XPCOMWillShutdown,
  //     so this works even for the final checkpoint at shutdown -- nothing is
  //     cached for these.
  bool keyReady = false;
  if (zKey == nullptr &&
      (flags & (SQLITE_OPEN_WAL | SQLITE_OPEN_MAIN_JOURNAL))) {
    sqlite3_file* pDbFile = sqlite3_database_file_object(zName);
    if (pDbFile && pDbFile->pMethods == &obfs_io_methods) {
      ObfsFile* pPartner = reinterpret_cast<ObfsFile*>(pDbFile);
      if (pPartner->aHasUriKey) {
        // Main DB carries an explicit URI key absent from lockstore; inherit
        // it rather than fall through to a policy lookup that would mint a
        // different key and corrupt the journal.
        ::memcpy(aKey, pPartner->aKey, sizeof(aKey));
        keyReady = true;
      }
    }
  }

  // Owns the lifetime of a policy-derived hex key, when we take that branch.
  // Declared here so the c_str() returned through zKey stays valid until
  // the existing hex-validation loop below has finished consuming it.
  nsAutoCString policyKey;

  if (!keyReady && zKey == nullptr &&
      (flags &
       (SQLITE_OPEN_MAIN_DB | SQLITE_OPEN_WAL | SQLITE_OPEN_MAIN_JOURNAL))) {
    // No URI key. With obfsvfs registered as SQLite's default VFS, this is
    // the path every keyless main/WAL/journal open lands in. Apply the
    // at-rest encryption *policy*; never silently fall back to plaintext
    // for an in-profile DB whose policy says it must be encrypted.
    mozilla::LogModule* log = mozilla::storage::GetSQLiteEncryptionLog();
    nsAutoCString dbPath = DeriveMainDbPath(zName, flags);

    // Fast bootstrap bypass -- runs BEFORE any storage-side call so it
    // never touches sStateMutex. See IsBootstrapBypassPath for why this
    // matters (would otherwise deadlock when GetEncryptionKey re-enters
    // through skv, or recurse into NSS_Initialize via lockstore).
    if (IsBootstrapBypassPath(dbPath)) {
      return pSubVfs->xOpen(pSubVfs, zName, pFile, flags, pOutFlags);
    }

    mozilla::storage::EncryptionStatus status =
        mozilla::storage::EncryptionStatus::Unset;
    nsresult rv = mozilla::storage::GetDatabaseEncryptionStatus(dbPath, status);
    if (NS_FAILED(rv)) {
      MOZ_LOG(log, mozilla::LogLevel::Error,
              ("obfsOpen: policy lookup failed (0x%" PRIx32 ") for %s; "
               "refusing open rather than risking plaintext fallback",
               static_cast<uint32_t>(rv), zName));
      return SQLITE_CANTOPEN;
    }
    if (status == mozilla::storage::EncryptionStatus::Unset) {
      // Defensive: GetDatabaseEncryptionStatus sets a real value on every
      // NS_OK path today, so this only fires if a future edit returns success
      // without deciding. Refuse rather than fall through to a key lookup or a
      // plaintext forward on an undecided policy.
      MOZ_LOG(log, mozilla::LogLevel::Error,
              ("obfsOpen: policy lookup left status unset for %s; refusing",
               zName));
      return SQLITE_CANTOPEN;
    }

    const bool isMainDb = flags & SQLITE_OPEN_MAIN_DB;
    OnDiskHeader disk =
        isMainDb ? PeekOnDiskHeader(dbPath.get()) : OnDiskHeader::Missing;

    if (disk == OnDiskHeader::Error) {
      // The file exists but its header could not be read (a non-ENOENT fopen
      // failure). Never guess encrypted vs plaintext on an ambiguous open
      // failure -- refuse rather than risk a plaintext write over ciphertext.
      MOZ_LOG(log, mozilla::LogLevel::Error,
              ("obfsOpen: could not inspect on-disk header for %s; refusing",
               zName));
      return SQLITE_CANTOPEN;
    }

    // No-CREATE open of a non-existent file (typical of app-services
    // read-only probes that expect to retry with CREATE on failure):
    // forward to the lower VFS so SQLite returns its natural
    // file-not-found error rather than our keystore-derived
    // SQLITE_CANTOPEN. Without this, the read-only probe would
    // unnecessarily fire the re-unlock path and hard-error before the
    // caller's retry-with-CREATE could re-enter and mint the DEK.
    if (isMainDb && disk == OnDiskHeader::Missing &&
        !(flags & SQLITE_OPEN_CREATE)) {
      return pSubVfs->xOpen(pSubVfs, zName, pFile, flags, pOutFlags);
    }

    if (status == mozilla::storage::EncryptionStatus::Plaintext) {
      // Out-of-profile, or the explicit bootstrap bypass for
      // lockstore.keys.sqlite. Defense in depth: refuse to forward to the
      // lower VFS plaintext when the file is already encrypted-shaped on
      // disk, because that means policy regressed and a plaintext write
      // would silently corrupt the existing ciphertext.
      if (disk == OnDiskHeader::Encrypted) {
        MOZ_LOG(log, mozilla::LogLevel::Error,
                ("obfsOpen: policy says plaintext but on-disk header is "
                 "encrypted for %s; refusing",
                 zName));
        return SQLITE_CANTOPEN_FULLPATH;
      }
      return pSubVfs->xOpen(pSubVfs, zName, pFile, flags, pOutFlags);
    }

    // status == Encrypted: derive the DEK from the keystore.
    mozilla::storage::OpenIntent intent =
        (flags & SQLITE_OPEN_CREATE)
            ? mozilla::storage::OpenIntent::CreateIfNew
            : mozilla::storage::OpenIntent::LoadExisting;
    rv = mozilla::storage::GetEncryptionKey(dbPath, intent, policyKey);
    if (NS_FAILED(rv)) {
      MOZ_LOG(log, mozilla::LogLevel::Error,
              ("obfsOpen: GetEncryptionKey 0x%" PRIx32
               " for %s; refusing open (no plaintext fallback)",
               static_cast<uint32_t>(rv), zName));
      return SQLITE_CANTOPEN;
    }
    if (disk == OnDiskHeader::Plaintext) {
      MOZ_LOG(log, mozilla::LogLevel::Error,
              ("obfsOpen: policy says encrypted but on-disk header is "
               "plaintext SQLite for %s; refusing rather than write "
               "ciphertext over an existing plaintext DB",
               zName));
      return SQLITE_CANTOPEN_FULLPATH;
    }
    zKey = policyKey.get();
  }

  if (!keyReady && zKey == nullptr) {
    return pSubVfs->xOpen(pSubVfs, zName, pFile, flags, pOutFlags);
  }
  if (!keyReady) {
    for (i = 0;
         i < kKeyBytes && isxdigit(zKey[i * 2]) && isxdigit(zKey[i * 2 + 1]);
         i++) {
      aKey[i] =
          (obfsHexToInt(zKey[i * 2]) << 4) | obfsHexToInt(zKey[i * 2 + 1]);
    }
    if (i != kKeyBytes) {
      NS_WARNING(
          nsPrintfCString("invalid query parameter on %s: key=%s", zName, zKey)
              .get());
      return SQLITE_CANTOPEN;
    }
  }
  p = (ObfsFile*)pFile;
  memset(p, 0, sizeof(*p));

  auto encryptCipherStrategy = MakeUnique<IPCStreamCipherStrategy>();
  auto decryptCipherStrategy = MakeUnique<IPCStreamCipherStrategy>();

  auto resetMethods = MakeScopeExit([pFile] { pFile->pMethods = nullptr; });

  if (NS_WARN_IF(NS_FAILED(encryptCipherStrategy->Init(
          CipherMode::Encrypt, Span{aKey, sizeof(aKey)},
          IPCStreamCipherStrategy::MakeBlockPrefix())))) {
    return SQLITE_ERROR;
  }

  if (NS_WARN_IF(NS_FAILED(decryptCipherStrategy->Init(
          CipherMode::Decrypt, Span{aKey, sizeof(aKey)})))) {
    return SQLITE_ERROR;
  }

  pSubFile = ORIGFILE(pFile);
  p->base.pMethods = &obfs_io_methods;
  rc = pSubVfs->xOpen(pSubVfs, zName, pSubFile, flags, pOutFlags);
  if (rc) {
    return rc;
  }

  resetMethods.release();

  if (flags & (SQLITE_OPEN_WAL | SQLITE_OPEN_MAIN_JOURNAL)) {
    sqlite3_file* pDb = sqlite3_database_file_object(zName);
    p->pPartner = (ObfsFile*)pDb;
    MOZ_ASSERT(p->pPartner->pPartner == nullptr);
    p->pPartner->pPartner = p;
  }
  p->zFName = zName;

  p->encryptCipherStrategy = encryptCipherStrategy.release();
  p->decryptCipherStrategy = decryptCipherStrategy.release();

  if (keyFromUri) {
    // Retain the explicit URI key so this main DB's keyless WAL/journal can
    // inherit it; the policy branch cannot re-derive a non-lockstore key.
    // Success path only: the SQLITE_ERROR bailouts above leave pFile with null
    // methods (obfsClose never runs), so a key copied earlier would linger
    // uncleaned in the pager's ObfsFile memory.
    p->aHasUriKey = true;
    ::memcpy(p->aKey, aKey, sizeof(aKey));
  }

  return SQLITE_OK;
}

/*
** All other VFS methods are pass-thrus.
*/
static int obfsDelete(sqlite3_vfs* pVfs, const char* zPath, int syncDir) {
  return ORIGVFS(pVfs)->xDelete(ORIGVFS(pVfs), zPath, syncDir);
}
static int obfsAccess(sqlite3_vfs* pVfs, const char* zPath, int flags,
                      int* pResOut) {
  return ORIGVFS(pVfs)->xAccess(ORIGVFS(pVfs), zPath, flags, pResOut);
}
static int obfsFullPathname(sqlite3_vfs* pVfs, const char* zPath, int nOut,
                            char* zOut) {
  return ORIGVFS(pVfs)->xFullPathname(ORIGVFS(pVfs), zPath, nOut, zOut);
}
static void* obfsDlOpen(sqlite3_vfs* pVfs, const char* zPath) {
  return ORIGVFS(pVfs)->xDlOpen(ORIGVFS(pVfs), zPath);
}
static void obfsDlError(sqlite3_vfs* pVfs, int nByte, char* zErrMsg) {
  ORIGVFS(pVfs)->xDlError(ORIGVFS(pVfs), nByte, zErrMsg);
}
static void (*obfsDlSym(sqlite3_vfs* pVfs, void* p, const char* zSym))(void) {
  return ORIGVFS(pVfs)->xDlSym(ORIGVFS(pVfs), p, zSym);
}
static void obfsDlClose(sqlite3_vfs* pVfs, void* pHandle) {
  ORIGVFS(pVfs)->xDlClose(ORIGVFS(pVfs), pHandle);
}
static int obfsRandomness(sqlite3_vfs* pVfs, int nByte, char* zBufOut) {
  return ORIGVFS(pVfs)->xRandomness(ORIGVFS(pVfs), nByte, zBufOut);
}
static int obfsSleep(sqlite3_vfs* pVfs, int nMicroseconds) {
  return ORIGVFS(pVfs)->xSleep(ORIGVFS(pVfs), nMicroseconds);
}
static int obfsCurrentTime(sqlite3_vfs* pVfs, double* pTimeOut) {
  return ORIGVFS(pVfs)->xCurrentTime(ORIGVFS(pVfs), pTimeOut);
}
static int obfsGetLastError(sqlite3_vfs* pVfs, int a, char* b) {
  return ORIGVFS(pVfs)->xGetLastError(ORIGVFS(pVfs), a, b);
}
static int obfsCurrentTimeInt64(sqlite3_vfs* pVfs, sqlite3_int64* p) {
  return ORIGVFS(pVfs)->xCurrentTimeInt64(ORIGVFS(pVfs), p);
}
static int obfsSetSystemCall(sqlite3_vfs* pVfs, const char* zName,
                             sqlite3_syscall_ptr pCall) {
  return ORIGVFS(pVfs)->xSetSystemCall(ORIGVFS(pVfs), zName, pCall);
}
static sqlite3_syscall_ptr obfsGetSystemCall(sqlite3_vfs* pVfs,
                                             const char* zName) {
  return ORIGVFS(pVfs)->xGetSystemCall(ORIGVFS(pVfs), zName);
}
static const char* obfsNextSystemCall(sqlite3_vfs* pVfs, const char* zName) {
  return ORIGVFS(pVfs)->xNextSystemCall(ORIGVFS(pVfs), zName);
}

namespace mozilla::storage::obfsvfs {

const char* GetVFSName() { return "obfsvfs"; }

UniquePtr<sqlite3_vfs> ConstructVFS(const char* aBaseVFSName) {
  MOZ_ASSERT(aBaseVFSName);

  if (sqlite3_vfs_find(GetVFSName()) != nullptr) {
    return nullptr;
  }
  sqlite3_vfs* const pOrig = sqlite3_vfs_find(aBaseVFSName);
  if (pOrig == nullptr) {
    return nullptr;
  }

#ifdef DEBUG
  // If the VFS version is higher than the last known one, you should update
  // this VFS adding appropriate methods for any methods added in the version
  // change.
  static constexpr int kLastKnownVfsVersion = 3;
  MOZ_ASSERT(pOrig->iVersion <= kLastKnownVfsVersion);
#endif

  const sqlite3_vfs obfs_vfs = {
      pOrig->iVersion,                                      /* iVersion  */
      static_cast<int>(pOrig->szOsFile + sizeof(ObfsFile)), /* szOsFile */
      pOrig->mxPathname,                                    /* mxPathname */
      nullptr,                                              /* pNext */
      GetVFSName(),                                         /* zName */
      pOrig,                                                /* pAppData */
      obfsOpen,                                             /* xOpen */
      obfsDelete,                                           /* xDelete */
      obfsAccess,                                           /* xAccess */
      obfsFullPathname,                                     /* xFullPathname */
      obfsDlOpen,                                           /* xDlOpen */
      obfsDlError,                                          /* xDlError */
      obfsDlSym,                                            /* xDlSym */
      obfsDlClose,                                          /* xDlClose */
      obfsRandomness,                                       /* xRandomness */
      obfsSleep,                                            /* xSleep */
      obfsCurrentTime,                                      /* xCurrentTime */
      obfsGetLastError,                                     /* xGetLastError */
      obfsCurrentTimeInt64, /* xCurrentTimeInt64 */
      obfsSetSystemCall,    /* xSetSystemCall */
      obfsGetSystemCall,    /* xGetSystemCall */
      obfsNextSystemCall    /* xNextSystemCall */
  };

  return MakeUnique<sqlite3_vfs>(obfs_vfs);
}

already_AddRefed<QuotaObject> GetQuotaObjectForFile(sqlite3_file* pFile) {
  return quotavfs::GetQuotaObjectForFile(ORIGFILE(pFile));
}

}  // namespace mozilla::storage::obfsvfs
