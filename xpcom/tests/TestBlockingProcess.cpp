#include <stdio.h>

int main() {
  char tmp;
  [[maybe_unused]] size_t _ = fread(&tmp, sizeof(tmp), 1, stdin);
  return 0;
}
