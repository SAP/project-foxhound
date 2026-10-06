/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint no-shadow: ["error", { "allow": ["name"] }] */

import { JSON_NUMBER } from "resource://devtools/client/shared/components/reps/reps/constants.mjs";

const MAX_NUMERICAL_PROPERTIES = 100;

/**
 * Implementation of the default data provider. A provider is state less
 * object responsible for transformation data (usually a state) to
 * a structure that can be directly consumed by the tree-view component.
 */
const ObjectProvider = {
  getChildren(object, options = {}) {
    const { bucketLargeArrays = false } = options;
    const children = [];

    if (bucketLargeArrays && object instanceof BucketProperty) {
      // Expand a bucket by returning its range of properties
      const actualObject = object.object;
      const { startIndex, endIndex } = object;
      const bucketSize = endIndex - startIndex + 1;

      // If this bucket is still too large (>100 elements), create nested buckets
      if (bucketSize > MAX_NUMERICAL_PROPERTIES) {
        return this.makeBuckets(actualObject, startIndex, endIndex);
      }

      // Otherwise, return the actual array elements
      for (let i = startIndex; i <= endIndex; i++) {
        children.push(new ObjectProperty(String(i), actualObject[i]));
      }
      return children;
    }

    if (object instanceof ObjectProperty) {
      object = object.value;
    }

    if (!object) {
      return [];
    }

    if (object?.type === JSON_NUMBER) {
      return [];
    }

    if (typeof object == "string") {
      return [];
    }

    // Check if bucketing is enabled and this is an array with many elements
    if (
      bucketLargeArrays &&
      Array.isArray(object) &&
      object.length > MAX_NUMERICAL_PROPERTIES
    ) {
      return this.makeBuckets(object);
    }

    for (const prop in object) {
      try {
        children.push(new ObjectProperty(prop, object[prop]));
      } catch (e) {
        console.error(e);
      }
    }
    return children;
  },

  makeBuckets(array, startIndex = 0, endIndex = array.length - 1) {
    const numProperties = endIndex - startIndex + 1;
    // We want to have at most a hundred slices.
    // This matches the bucketing algorithm in
    // devtools/client/shared/components/object-inspector/utils/node.js
    const bucketSize =
      10 ** Math.max(2, Math.ceil(Math.log10(numProperties)) - 2);
    const numBuckets = Math.ceil(numProperties / bucketSize);

    const buckets = [];
    for (let i = 1; i <= numBuckets; i++) {
      const minKey = (i - 1) * bucketSize;
      const maxKey = Math.min(i * bucketSize - 1, numProperties - 1);
      const minIndex = startIndex + minKey;
      const maxIndex = startIndex + maxKey;
      const bucketName = `[${minIndex}…${maxIndex}]`;

      buckets.push(new BucketProperty(bucketName, array, minIndex, maxIndex));
    }
    return buckets;
  },

  hasChildren(object) {
    if (object instanceof BucketProperty) {
      // Buckets always have children (the range of properties they represent)
      return true;
    }

    if (object instanceof ObjectProperty) {
      object = object.value;
    }

    if (!object) {
      return false;
    }

    if (object.type === JSON_NUMBER) {
      return false;
    }

    if (typeof object == "string") {
      return false;
    }

    if (typeof object !== "object") {
      return false;
    }

    return !!Object.keys(object).length;
  },

  getLabel(object) {
    // Both BucketProperty and ObjectProperty have a .name property
    return object instanceof BucketProperty || object instanceof ObjectProperty
      ? object.name
      : null;
  },

  getValue(object) {
    return object instanceof ObjectProperty ? object.value : null;
  },

  getKey(object) {
    // Both BucketProperty and ObjectProperty use .name as their key
    return object instanceof BucketProperty || object instanceof ObjectProperty
      ? object.name
      : null;
  },

  getType(object) {
    if (object instanceof BucketProperty) {
      return "bucket";
    }
    return object instanceof ObjectProperty
      ? typeof object.value
      : typeof object;
  },
};

function ObjectProperty(name, value) {
  this.name = name;
  this.value = value;
}

function BucketProperty(name, object, startIndex, endIndex) {
  this.name = name;
  this.object = object;
  this.startIndex = startIndex;
  this.endIndex = endIndex;
}

// Exports from this module
export { BucketProperty, ObjectProperty, ObjectProvider };
