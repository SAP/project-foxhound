/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_NodeList_h_
#define mozilla_dom_NodeList_h_

#include "nsIContent.h"
#include "nsISupports.h"
#include "nsWrapperCache.h"

class nsIContent;
class nsINode;

namespace mozilla::dom {

/**
 * An internal interface for a reasonably fast indexOf.
 */
class NodeList : public nsISupports, public nsWrapperCache {
 public:
  /**
   * Get the index of the given node in the list.  Will return -1 if the node
   * is not in the list.
   */
  virtual int32_t IndexOf(nsIContent* aContent) = 0;

  /**
   * Get the root node for this nodelist.
   */
  virtual nsINode* GetParentObject() = 0;

  virtual uint32_t Length() = 0;
  virtual nsIContent* Item(uint32_t aIndex) = 0;
  nsIContent* IndexedGetter(uint32_t aIndex, bool& aFound) {
    nsIContent* item = Item(aIndex);
    aFound = !!item;
    return item;
  }
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_NodeList_h_
