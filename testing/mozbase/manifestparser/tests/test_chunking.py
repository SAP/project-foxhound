#!/usr/bin/env python

import os
import random
from collections import defaultdict
from itertools import chain
from unittest import TestCase

import mozunit
from manifestparser.filters import chunk_by_dir, chunk_by_runtime

here = os.path.dirname(os.path.abspath(__file__))


class ChunkByDir(TestCase):
    """Test chunking related filters"""

    def generate_tests(self, dirs):
        """
        :param dirs: dict of the form,
                        { <dir>: <num tests> }
        """
        i = 0
        for d, num in dirs.items():
            for _ in range(num):
                i += 1
                name = "test%i" % i
                test = {"name": name, "relpath": os.path.join(d, name)}
                yield test

    def run_all_combos(self, dirs):
        tests = list(self.generate_tests(dirs))

        deepest = max(len(t["relpath"].split(os.sep)) - 1 for t in tests)
        for depth in range(1, deepest + 1):

            def num_groups(tests):
                unique = set()
                for rp in [t["relpath"] for t in tests]:
                    p = rp.split(os.sep)
                    p = p[: min(depth, len(p) - 1)]
                    unique.add(os.sep.join(p))
                return len(unique)

            for total in range(1, num_groups(tests) + 1):
                res = []
                for this in range(1, total + 1):
                    f = chunk_by_dir(this, total, depth)
                    res.append(list(f(tests, {})))

                lengths = list(map(num_groups, res))
                # the chunk with the most dirs should have at most one more
                # dir than the chunk with the least dirs
                self.assertLessEqual(max(lengths) - min(lengths), 1)

                all_chunks = list(chain.from_iterable(res))
                # chunk_by_dir will mess up order, but chained chunks should
                # contain all of the original tests and be the same length
                self.assertEqual(len(all_chunks), len(tests))
                for t in tests:
                    self.assertIn(t, all_chunks)

    def test_chunk_by_dir(self):
        chunk = chunk_by_dir(1, 1, 1)
        self.assertEqual(list(chunk([], {})), [])

        dirs = {
            "a": 2,
        }
        self.run_all_combos(dirs)

        dirs = {
            "": 1,
            "foo": 1,
            "bar": 0,
            "/foobar": 1,
        }
        self.run_all_combos(dirs)

        dirs = {
            "a": 1,
            "b": 1,
            "a/b": 2,
            "a/c": 1,
        }
        self.run_all_combos(dirs)

        dirs = {
            "a": 5,
            "a/b": 4,
            "a/b/c": 7,
            "a/b/c/d": 1,
            "a/b/c/e": 3,
            "b/c": 2,
            "b/d": 5,
            "b/d/e": 6,
            "c": 8,
            "c/d/e/f/g/h/i/j/k/l": 5,
            "c/d/e/f/g/i/j/k/l/m/n": 2,
            "c/e": 1,
        }
        self.run_all_combos(dirs)


class ChunkByRuntime(TestCase):
    """Test chunking related filters"""

    def generate_tests(self, dirs):
        """
        :param dirs: dict of the form,
                     { <dir>: <num tests> }
        """
        i = 0
        for d, num in dirs.items():
            for _ in range(num):
                i += 1
                name = "test%i" % i
                manifest = os.path.join(d, "manifest.toml")
                test = {
                    "name": name,
                    "relpath": os.path.join(d, name),
                    "manifest": manifest,
                    "manifest_relpath": manifest,
                }
                yield test

    def get_runtimes(self, tests):
        runtimes = defaultdict(int)
        for test in tests:
            runtimes[test["manifest_relpath"]] += random.randint(0, 100)
        return runtimes

    def chunk_by_round_robin(self, tests, total, runtimes):
        tests_by_manifest = []
        for manifest, runtime in runtimes.items():
            mtests = [t for t in tests if t["manifest_relpath"] == manifest]
            tests_by_manifest.append((runtime, mtests))
        tests_by_manifest.sort(key=lambda x: x[0], reverse=False)

        chunks = [[] for i in range(total)]
        d = 1  # direction
        i = 0
        for runtime, batch in tests_by_manifest:
            chunks[i].extend(batch)

            # "draft" style (last pick goes first in the next round)
            if (i == 0 and d == -1) or (i == total - 1 and d == 1):
                d = -d
            else:
                i += d

        # make sure this test algorithm is valid
        all_chunks = list(chain.from_iterable(chunks))
        self.assertEqual(len(all_chunks), len(tests))
        for t in tests:
            self.assertIn(t, all_chunks)
        return chunks

    def run_all_combos(self, dirs):
        tests = list(self.generate_tests(dirs))
        runtimes = self.get_runtimes(tests)

        for total in range(1, len(dirs) + 1):
            chunks = []
            for this in range(1, total + 1):
                f = chunk_by_runtime(this, total, runtimes)
                ret = list(f(tests, {}))
                chunks.append(ret)

            # chunk_by_runtime will mess up order, but chained chunks should
            # contain all of the original tests and be the same length
            all_chunks = list(chain.from_iterable(chunks))
            self.assertEqual(len(all_chunks), len(tests))
            for t in tests:
                self.assertIn(t, all_chunks)

            # calculate delta between slowest and fastest chunks
            def runtime_delta(chunks):
                totals = []
                for chunk in chunks:
                    manifests = set([t["manifest_relpath"] for t in chunk])
                    total = sum(runtimes[m] for m in manifests)
                    totals.append(total)
                return max(totals) - min(totals)

            delta = runtime_delta(chunks)

            # redo the chunking a second time using a round robin style
            # algorithm
            chunks = self.chunk_by_round_robin(tests, total, runtimes)
            # sanity check the round robin algorithm
            all_chunks = list(chain.from_iterable(chunks))
            self.assertEqual(len(all_chunks), len(tests))
            for t in tests:
                self.assertIn(t, all_chunks)

            # since chunks will never have exactly equal runtimes, it's hard
            # to tell if they were chunked optimally. Make sure it at least
            # beats a naive round robin approach.
            self.assertLessEqual(delta, runtime_delta(chunks))

    def test_chunk_by_runtime(self):
        random.seed(42)

        chunk = chunk_by_runtime(1, 1, {})
        self.assertEqual(list(chunk([], {})), [])

        dirs = {
            "a": 2,
        }
        self.run_all_combos(dirs)

        dirs = {
            "": 1,
            "foo": 1,
            "bar": 0,
            "/foobar": 1,
        }
        self.run_all_combos(dirs)

        dirs = {
            "a": 1,
            "b": 1,
            "a/b": 2,
            "a/c": 1,
        }
        self.run_all_combos(dirs)

        dirs = {
            "a": 5,
            "a/b": 4,
            "a/b/c": 7,
            "a/b/c/d": 1,
            "a/b/c/e": 3,
            "b/c": 2,
            "b/d": 5,
            "b/d/e": 6,
            "c": 8,
            "c/d/e/f/g/h/i/j/k/l": 5,
            "c/d/e/f/g/i/j/k/l/m/n": 2,
            "c/e": 1,
        }
        self.run_all_combos(dirs)


if __name__ == "__main__":
    mozunit.main()
