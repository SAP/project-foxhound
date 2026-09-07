// Continuation after yield shouldn't consume extra stack space.
async function* asyncGen() {
  while (true) {
    yield;
  }
}

const iter = asyncGen();
for (let i = 0; i < 3000; i++) {
  iter.next();
}
