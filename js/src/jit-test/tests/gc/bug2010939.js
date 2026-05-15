// |jit-test| skip-if: helperThreadCount()===0

evalInWorker("try { getAtomMarkIndex('') } catch {}");
