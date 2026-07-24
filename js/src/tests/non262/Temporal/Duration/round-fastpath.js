// |reftest| skip-if(!this.hasOwnProperty("Temporal")||!this.hasOwnProperty("Intl"))

assertEq(
    new Temporal.Duration(0).round({ smallestUnit: 'years', relativeTo: '-271821-04-19' }).blank,
    true,
    "Support fast path for invalid isodate");


if (typeof reportCompare === "function")
  reportCompare(true, true);

