/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsIURIWithSizeOf_h
#define nsIURIWithSizeOf_h

#include "mozilla/MemoryReporting.h"
#include "nsISupports.h"
#include "nsCOMPtr.h"

#define NS_IURIWITHSIZEOF_IID \
  {0x4245123a, 0x9c04, 0x4e5c, {0xa7, 0x48, 0x32, 0x8b, 0xa5, 0x88, 0x3b, 0x00}}

class NS_NO_VTABLE nsIURIWithSizeOf : public nsISupports {
 public:
  NS_INLINE_DECL_STATIC_IID(NS_IURIWITHSIZEOF_IID)

  /**
   * Measures the size of the object and the things that it points to.
   *
   * WARNING: Don't call this more than once on a particular object or you
   * will end up with overcounting. Having an nsCOMPtr<nsIURI> is not
   * sufficient to know that you are the only one measuring this object.
   *
   * SizeOfExcludingThis does not make sense here because this is a
   * refcounted object, so it will never be embedded in something else.
   */
  virtual size_t SizeOfIncludingThis(mozilla::MallocSizeOf aMallocSizeOf) = 0;
};

#define NS_DECL_NSIURIWITHSIZEOF                                          \
  virtual size_t SizeOfIncludingThis(mozilla::MallocSizeOf aMallocSizeOf) \
      override;

class nsIURI;

inline size_t SizeOfIncludingThisIfURIWithSizeOf(
    nsIURI* aURI, mozilla::MallocSizeOf aMallocSizeOf) {
  nsCOMPtr<nsIURIWithSizeOf> uriWithSizeOf = do_QueryInterface(aURI);
  return uriWithSizeOf ? uriWithSizeOf->SizeOfIncludingThis(aMallocSizeOf) : 0;
}

#endif  // nsIURIWithSizeOf_h
