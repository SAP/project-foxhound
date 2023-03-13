class Testing {
    static #taintRangeEqual(actual, expected) {
        if(actual.begin != expected.begin ||
           actual.end != expected.end     ||
           actual.flow.length != expected.flow.length)
            return false;
        return actual.flow.every((flow, idx) => {
            let other = expected.flow[idx];
            return flow.operation === other.operation;
        });
    }

    static taintEqual(actual, expected) {
        if(actual.length != expected.length)
            return false;
        return actual.every((range, idx) => {
            let other = expected[idx];
            return Testing.#taintRangeEqual(range, other);
        });
    }

    static taintFromList(ranges) {
        return ranges.map(range => {
            return {
                begin: range.begin,
                end: range.end,
                flow: range.flow.map(str => {
                    return {operation: str};
                })
            };
        });

    }

}

module.exports = Testing;
