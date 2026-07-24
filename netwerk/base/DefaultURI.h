/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DefaultURI_h_
#define DefaultURI_h_

#include "nsIURI.h"
#include "nsISerializable.h"
#include "nsIURIMutator.h"
#include "mozilla/net/MozURL.h"

namespace mozilla {
namespace net {

class DefaultURI : public nsIURI, public nsISerializable {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIURI
  NS_DECL_NSISERIALIZABLE

  class Mutator final : public nsIURIMutator, public nsISerializable {
    NS_DECL_ISUPPORTS
    NS_DECL_NSIURISETSPEC
    NS_DECL_NSIURISETTERS
    NS_DECL_NSIURIMUTATOR

    NS_IMETHOD
    Write(nsIObjectOutputStream* aOutputStream) override {
      MOZ_ASSERT_UNREACHABLE("nsIURIMutator.write() should never be called");
      return NS_ERROR_NOT_IMPLEMENTED;
    }

    [[nodiscard]] NS_IMETHOD Read(nsIObjectInputStream* aStream) override;

    explicit Mutator() = default;

   private:
    virtual ~Mutator() = default;
    void Init(DefaultURI* aFrom) { mMutator = Some(aFrom->mURL->Mutate()); }

    Maybe<MozURL::Mutator> mMutator;

    friend class DefaultURI;
  };

 private:
  virtual ~DefaultURI() = default;
  RefPtr<MozURL> mURL;
};

}  // namespace net
}  // namespace mozilla

#endif  // DefaultURI_h_
