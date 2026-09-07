class Identity {
  constructor(target) {
    return target;
  }
}

class TargetHandler extends Identity {
  #proxy;

  constructor(target, proxy) {
    super(target);
    this.#proxy = proxy;
  }

  static getProxy(obj) {
    return obj.#proxy;
  }
}

class ReactiveHandler extends TargetHandler {
  #priv;

  constructor(target, proxy) {
    // Both the target and the proxy have the "#proxy" private field that stores the reference to the proxy
    new TargetHandler(target, proxy);
    super(proxy, proxy);
  }

  get(t, k, r) { throw "oops"; }

  defineProperty(t, k, desc) {
    ReactiveHandler.getProxy(t).#priv;
    return Reflect.defineProperty(t, k, desc);
  }
}

const target = {};
const proxy = new ReactiveHandler(target, new Proxy(target, ReactiveHandler.prototype));

for (var i = 0; i < 20; i++) {
  proxy[i] = i;
}
