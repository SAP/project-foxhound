#include <assert.h>
#include <stdatomic.h>

/* We require lock free atomics for int and pointers as cairo assumes
 * an int* can be cast to cairo_atomic_int_t*
 */
_Static_assert (ATOMIC_INT_LOCK_FREE == 2, "Lock free atomics not supported");
_Static_assert (ATOMIC_POINTER_LOCK_FREE == 2, "Lock free atomics not supported");

int atomic_add(atomic_int *i) { return atomic_fetch_add_explicit(i, 1, memory_order_seq_cst); }
int atomic_cmpxchg(atomic_int *i, int j, int k) { return atomic_compare_exchange_strong_explicit (i, &j, k, memory_order_seq_cst, memory_order_seq_cst); }
int main(void) { return 0; }
