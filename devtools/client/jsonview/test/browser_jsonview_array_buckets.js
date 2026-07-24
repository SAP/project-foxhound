/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that large arrays in JSON view are bucketed into ranges
 * to prevent browser freezing when expanding them.
 */

/**
 * Load JSON data in the JSON viewer
 */
async function loadJsonData(data) {
  const json = JSON.stringify(data);
  return addJsonViewTab("data:application/json," + json);
}

/**
 * Get all bucket labels matching the pattern [n…m]
 */
async function getBucketLabels() {
  return SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    const labels = Array.from(
      content.document.querySelectorAll(".treeLabelCell")
    );
    return labels
      .filter(label => /\[\d+…\d+\]/.test(label.textContent))
      .map(label => label.textContent.trim());
  });
}

/**
 * Check if any bucket labels exist
 */
async function hasBuckets() {
  return SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    const labels = Array.from(
      content.document.querySelectorAll(".treeLabelCell")
    );
    return labels.some(label => /\[\d+…\d+\]/.test(label.textContent));
  });
}

add_task(async function test_small_array_no_buckets() {
  const smallArray = Array(100).fill("item");
  await loadJsonData({ data: smallArray });

  // Small JSON auto-expands, so check the already-expanded state
  // Count the rows - should have root, "data" label, and 100 array elements
  const rowCount = await getElementCount(".treeRow");
  is(rowCount, 101, "Small array shows all 100 elements without bucketing");

  // Verify no bucket nodes (no labels like "[0…99]")
  is(await hasBuckets(), false, "No bucket nodes in small array");
});

add_task(async function test_medium_array_has_buckets() {
  const mediumArray = Array(250)
    .fill(null)
    .map((_, i) => `item${i}`);
  await loadJsonData({ data: mediumArray });

  // Array auto-expands, showing buckets instead of individual elements
  // For 250 elements, bucket size = 100, so we expect 3 buckets:
  // [0…99], [100…199], [200…249]
  const bucketLabels = await getBucketLabels();
  is(bucketLabels.length, 3, "Medium array (250 elements) creates 3 buckets");

  // Verify bucket names
  Assert.deepEqual(
    bucketLabels,
    ["[0…99]", "[100…199]", "[200…249]"],
    "Bucket names are correct"
  );
});

add_task(async function test_expand_bucket() {
  const array = Array(150)
    .fill(null)
    .map((_, i) => `value${i}`);
  await loadJsonData(array);

  // Root array auto-expands and shows 2 buckets: [0…99] and [100…149]
  const bucketLabels = await getBucketLabels();
  is(bucketLabels.length, 2, "Root array shows 2 buckets");

  // Find and expand the first bucket [0…99]
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    const labels = Array.from(
      content.document.querySelectorAll(".treeLabelCell")
    );
    const firstBucket = labels.find(label =>
      label.textContent.includes("[0…99]")
    );
    if (firstBucket) {
      firstBucket.click();
    }
  });

  // Verify that elements 0-99 are now visible
  const hasElements = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => {
      const labels = Array.from(
        content.document.querySelectorAll(".treeLabelCell")
      );
      const hasZero = labels.some(label => label.textContent.trim() === "0");
      const has99 = labels.some(label => label.textContent.trim() === "99");
      return hasZero && has99;
    }
  );
  is(hasElements, true, "Expanding bucket shows individual elements");
});

add_task(async function test_large_array_bucket_size() {
  // For 10,000 elements, bucket size should be 100 (10^2)
  // This creates 100 buckets
  const largeArray = Array(10000).fill("x");
  await loadJsonData(largeArray);

  // Root array auto-expands showing buckets
  const bucketLabels = await getBucketLabels();

  is(bucketLabels.length, 100, "10,000 elements create 100 buckets");
  is(bucketLabels[0], "[0…99]", "First bucket starts at 0");
  is(bucketLabels[99], "[9900…9999]", "Last bucket ends at 9999");
});

add_task(async function test_very_large_array_bucket_size() {
  // For 100,000 elements, bucket size should be 1000 (10^3)
  // This creates 100 buckets
  const veryLargeArray = Array(100000).fill(1);
  await loadJsonData(veryLargeArray);

  // Root array auto-expands showing buckets
  const bucketLabels = await getBucketLabels();

  is(bucketLabels.length, 100, "100,000 elements create 100 buckets");
  is(bucketLabels[0], "[0…999]", "First bucket is [0…999]");
  is(bucketLabels[1], "[1000…1999]", "Second bucket is [1000…1999]");
});

add_task(async function test_nested_buckets() {
  // Create an array with 100,000 elements
  // Initial bucket size will be 1000, so first bucket is [0…999]
  // That bucket has 1000 elements, which needs 10 sub-buckets of 100 each
  const veryLargeArray = Array(100000)
    .fill(null)
    .map((_, i) => i);
  await loadJsonData(veryLargeArray);

  // Root array auto-expands showing top-level buckets
  // Find and expand the first bucket [0…999]
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    const labels = Array.from(
      content.document.querySelectorAll(".treeLabelCell")
    );
    const firstBucket = labels.find(label =>
      label.textContent.includes("[0…999]")
    );
    if (firstBucket) {
      firstBucket.click();
    }
  });

  // The [0…999] bucket should now show nested buckets, not individual elements
  // The 1000 elements need 10 sub-buckets of 100 each: [0…99], [100…199], ..., [900…999]
  const nestedBuckets = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => {
      const labels = Array.from(
        content.document.querySelectorAll(".treeLabelCell")
      );
      return labels
        .map(label => label.textContent)
        .filter(text => {
          // Look for nested buckets (exclude the parent [0…999] bucket)
          const match = text.match(/\[(\d+)…(\d+)\]/);
          if (!match) {
            return false;
          }
          const start = parseInt(match[1], 10);
          const end = parseInt(match[2], 10);
          // Nested buckets have size 100, parent has size 1000
          return end - start === 99;
        });
    }
  );

  is(nestedBuckets.length, 10, "1000-element bucket creates 10 nested buckets");
  is(nestedBuckets[0], "[0…99]", "First nested bucket is [0…99]");
  is(nestedBuckets[9], "[900…999]", "Last nested bucket is [900…999]");
});
