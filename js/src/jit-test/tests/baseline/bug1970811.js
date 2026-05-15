// |jit-test| --setpref=experimental.self_hosted_cache=true; --blinterp-eager; --baseline-warmup-threshold=1
gczeal(14);
a = new Set();
for (b of a) 30;