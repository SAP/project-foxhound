// |jit-test| --ion-offthread-compile=off; --setpref=experimental.self_hosted_cache=true
gczeal(6, 1)
a = [].values().drop(1).next()

