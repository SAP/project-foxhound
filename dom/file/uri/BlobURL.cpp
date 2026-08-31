/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/BlobURL.h"

#include "mozilla/dom/BlobURLProtocolHandler.h"
#include "mozilla/ipc/BackgroundUtils.h"
#include "mozilla/ipc/URIUtils.h"
#include "nsIClassInfoImpl.h"
#include "nsIObjectInputStream.h"
#include "nsIObjectOutputStream.h"
#include "nsQueryObject.h"

using namespace mozilla::dom;

NS_IMPL_ADDREF_INHERITED(BlobURL, mozilla::net::nsSimpleURI)
NS_IMPL_RELEASE_INHERITED(BlobURL, mozilla::net::nsSimpleURI)

NS_IMPL_CLASSINFO(BlobURL, nullptr, nsIClassInfo::THREADSAFE,
                  NS_HOSTOBJECTURI_CID);
// Empty CI getter. We only need nsIClassInfo for Serialization
NS_IMPL_CI_INTERFACE_GETTER0(BlobURL)

NS_INTERFACE_MAP_BEGIN(BlobURL)
  if (aIID.Equals(NS_GET_IID(nsSimpleURI))) {
    // Need to return explicitly here, because if we just set foundInterface
    // to null the NS_INTERFACE_MAP_END_INHERITING will end up calling into
    // nsSimpleURI::QueryInterface and finding something for this CID.
    *aInstancePtr = nullptr;
    return NS_NOINTERFACE;
  }

  NS_IMPL_QUERY_CLASSINFO(BlobURL)
  NS_INTERFACE_MAP_ENTRY_CONCRETE(BlobURL)
NS_INTERFACE_MAP_END_INHERITING(mozilla::net::nsSimpleURI)

BlobURL::BlobURL() : mRevoked(false) {}

// nsISerializable methods:

NS_IMETHODIMP
BlobURL::Read(nsIObjectInputStream* aStream) {
  MOZ_ASSERT_UNREACHABLE("Use nsIURIMutator.read() instead");
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsresult BlobURL::ReadPrivate(nsIObjectInputStream* aStream) {
  nsresult rv = mozilla::net::nsSimpleURI::ReadPrivate(aStream);
  NS_ENSURE_SUCCESS(rv, rv);

  rv = aStream->ReadBoolean(&mRevoked);
  NS_ENSURE_SUCCESS(rv, rv);

  // NOTE: We intentionally do not persist nullPrincipal here.
  //
  // The null principal would be meaningless if this blob URL was persisted into
  // long-term storage (which is generally the use of `nsIObjectInputStream`).
  // While there are currently limited legacy uses of `nsIObjectInputStream` for
  // IPC, none which serialize a BlobURL should ever result in it being loaded.
  //
  // Not persisting any additional data here also avoids potential versioning
  // issues if a Blob URL was ever serialized using nsIObjectInputStream into
  // the user's profile.

  return NS_OK;
}

NS_IMETHODIMP
BlobURL::Write(nsIObjectOutputStream* aStream) {
  nsresult rv = mozilla::net::nsSimpleURI::Write(aStream);
  NS_ENSURE_SUCCESS(rv, rv);

  rv = aStream->WriteBoolean(mRevoked);
  NS_ENSURE_SUCCESS(rv, rv);

  // NOTE: We intentionally do not persist nullPrincipal here. (see above)

  return NS_OK;
}

void BlobURL::Serialize(mozilla::ipc::URIParams& aParams) {
  using namespace mozilla::ipc;

  HostObjectURIParams hostParams;
  URIParams simpleParams;

  mozilla::net::nsSimpleURI::Serialize(simpleParams);
  hostParams.simpleParams() = simpleParams;

  hostParams.revoked() = mRevoked;

  hostParams.nullPrincipal() = mNullPrincipal;

  aParams = std::move(hostParams);
}

bool BlobURL::Deserialize(const mozilla::ipc::URIParams& aParams) {
  using namespace mozilla::ipc;

  if (aParams.type() != URIParams::THostObjectURIParams) {
    NS_ERROR("Received unknown parameters from the other process!");
    return false;
  }

  const HostObjectURIParams& hostParams = aParams.get_HostObjectURIParams();

  if (!mozilla::net::nsSimpleURI::Deserialize(hostParams.simpleParams())) {
    return false;
  }

  if (OriginPart() != "null"_ns && hostParams.nullPrincipal()) {
    NS_ERROR("Received nullPrincipal for non-null BlobURL");
    return false;
  }

  mRevoked = hostParams.revoked();

  mNullPrincipal = hostParams.nullPrincipal();

  return true;
}

nsresult BlobURL::SetScheme(const nsACString& aScheme) {
  // Disallow setting the scheme, since that could cause us to be associated
  // with a different protocol handler.
  return NS_ERROR_FAILURE;
}

// nsIURI methods:
/* virtual */
nsresult BlobURL::EqualsInternal(
    nsIURI* aOther, mozilla::net::nsSimpleURI::RefHandlingEnum aRefHandlingMode,
    bool* aResult) {
  if (!aOther) {
    *aResult = false;
    return NS_OK;
  }

  RefPtr<BlobURL> otherUri = do_QueryObject(aOther);
  if (!otherUri) {
    *aResult = false;
    return NS_OK;
  }

  // Compare the member data that our base class knows about.
  *aResult =
      mozilla::net::nsSimpleURI::EqualsInternal(otherUri, aRefHandlingMode);

  // We don't want to compare the revoked flag.
  return NS_OK;
}

// Queries this list of interfaces. If none match, it queries mURI.
NS_IMPL_NSIURIMUTATOR_ISUPPORTS(BlobURL::Mutator, nsIURISetters, nsIURIMutator,
                                nsISerializable, nsIBlobURLMutator)

NS_IMETHODIMP
BlobURL::Mutate(nsIURIMutator** aMutator) {
  RefPtr<BlobURL::Mutator> mutator = new BlobURL::Mutator();
  nsresult rv = mutator->InitFromURI(this);
  if (NS_FAILED(rv)) {
    return rv;
  }
  mutator.forget(aMutator);
  return NS_OK;
}
