/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZSTORAGESERVICE_H
#define MOZSTORAGESERVICE_H

#include "nsCOMPtr.h"
#include "nsIFile.h"
#include "nsIMemoryReporter.h"
#include "nsIObserver.h"
#include "nsTArray.h"
#include "mozilla/Mutex.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/intl/Collator.h"

#include "mozIStorageService.h"

class nsIMemoryReporter;
struct sqlite3_vfs;
namespace mozilla::intl {
class Collator;
}

namespace mozilla::storage {

class Connection;
class Service : public mozIStorageService,
                public nsIObserver,
                public nsIMemoryReporter {
 public:
  /**
   * Initializes the service.  This must be called before any other function!
   */
  nsresult initialize();

  static already_AddRefed<Service> getSingleton();

  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_MOZISTORAGESERVICE
  NS_DECL_NSIOBSERVER
  NS_DECL_NSIMEMORYREPORTER

  /**
   * Returns a boolean value indicating whether or not the given page size is
   * valid (currently understood as a power of 2 between 512 and 65536).
   */
  static bool pageSizeIsValid(int32_t aPageSize) {
    return aPageSize == 512 || aPageSize == 1024 || aPageSize == 2048 ||
           aPageSize == 4096 || aPageSize == 8192 || aPageSize == 16384 ||
           aPageSize == 32768 || aPageSize == 65536;
  }

  static const int32_t kDefaultPageSize = 32768;

  /**
   * Registers the connection with the storage service.  Connections are
   * registered so they can be iterated over.
   *
   * @pre mRegistrationMutex is not held
   *
   * @param  aConnection
   *         The connection to register.
   */
  void registerConnection(Connection* aConnection);

  /**
   * Unregisters the connection with the storage service.
   *
   * @pre mRegistrationMutex is not held
   *
   * @param  aConnection
   *         The connection to unregister.
   */
  void unregisterConnection(Connection* aConnection);

  /**
   * Gets the list of open connections.  Note that you must test each
   * connection with mozIStorageConnection::connectionReady before doing
   * anything with it, and skip it if it's not ready.
   *
   * @pre mRegistrationMutex is not held
   *
   * @param  aConnections
   *         An inout param;  it is cleared and the connections are appended to
   *         it.
   * @return The open connections.
   */
  void getConnections(nsTArray<RefPtr<Connection> >& aConnections);

 private:
  Service();
  virtual ~Service();

  struct AutoVFSRegistration {
    int Init(UniquePtr<sqlite3_vfs> aVFS, bool aMakeDefault = false);
    ~AutoVFSRegistration();

   private:
    UniquePtr<sqlite3_vfs> mVFS;
  };

  // The order of these members should match the order of Init calls in
  // initialize(), to ensure that the unregistration takes place in the reverse
  // order.
  AutoVFSRegistration mBaseSqliteVFS;
  AutoVFSRegistration mBaseExclSqliteVFS;
  AutoVFSRegistration mQuotaSqliteVFS;
  AutoVFSRegistration mObfuscatingSqliteVFS;
  AutoVFSRegistration mReadOnlyNoLockSqliteVFS;

  /**
   * Protects mConnections.
   */
  Mutex mRegistrationMutex MOZ_UNANNOTATED;

  /**
   * The list of connections we have created.  Modifications to it are
   * protected by |mRegistrationMutex|.
   */
  nsTArray<RefPtr<Connection> > mConnections;

  /**
   * Frees as much heap memory as possible from all of the known open
   * connections.
   */
  void minimizeMemory();

  nsCOMPtr<nsIFile> mProfileStorageFile;

  nsCOMPtr<nsIMemoryReporter> mStorageSQLiteReporter;

  static Service* gService;
};

}  // namespace mozilla::storage

#endif /* MOZSTORAGESERVICE_H */
