package org.mozilla.fenix.ui.efficiency.navigation.planning

/**
 * Utilities for deterministically splitting generated test cases into manual shards.
 */
object ShardUtils {

    /**
     * Returns only the cases assigned to the requested 1-based shard index.
     *
     * Example:
     * - shardCount = 10
     * - shardIndex = 1 returns cases at indices 0, 10, 20, ...
     * - shardIndex = 2 returns cases at indices 1, 11, 21, ...
     */
    fun <T> filterForShard(
        items: List<T>,
        shardIndex: Int,
        shardCount: Int,
    ): List<T> {
        require(shardCount > 0) { "shardCount must be > 0" }
        require(shardIndex in 1..shardCount) {
            "shardIndex must be between 1 and shardCount inclusive. " +
                "Received shardIndex=$shardIndex shardCount=$shardCount"
        }

        val zeroBasedShard = shardIndex - 1

        return items.filterIndexed { index, _ ->
            index % shardCount == zeroBasedShard
        }
    }
}
