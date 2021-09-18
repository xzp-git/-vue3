var VueReactivity = (function (exports) {
  'use strict';

  const isObject = (val) => val !== null && typeof val === 'object';
  const extend = Object.assign;

  function effect(fn, options = {}) {
      const effect = createReactiveEffect(fn, options); //把fn包装成一个响应式的函数
      if (!options.lazy) {
          effect();
      }
      return effect;
  }
  let uid = 0;
  let activeEffect; //此模块内的唯一一个变量
  function createReactiveEffect(fn, options) {
      const effect = function () {
          // 我需要将effec暴露到外层
          activeEffect = effect;
          fn();
          activeEffect = null;
      };
      effect.id = uid++; //每个effect都有一个唯一的标识
      effect._isEffect = true; //用于标识这个函数是一个effect函数
      effect.raw = fn; //把用户传入的函数保存到当前的effect
      effect.deps = []; //后来用来存放efect对于哪写属性
      effect.options = options;
      return effect;
  }
  const targetMap = new WeakMap();
  function track(target, type, key) {
      if (!activeEffect)
          return; // 说明取值操作是在effec之外操作的
      let depsMap = targetMap.get(target); //先尝试看一下这个对象中是否存过属性 
      if (!depsMap)
          targetMap.set(target, (depsMap = new Map));
      let dep = depsMap.get(key);
      if (!dep)
          depsMap.set(key, (dep = new Set));
      if (!dep.has(activeEffect)) {
          dep.add(activeEffect);
      }
      console.log(targetMap);
  }
  function trigger(target, key, value) {
      // activeEffect()
      const depsMap = targetMap.get(target);
      if (!depsMap)
          return; //如果没收集过 直接跳过
      const effects = depsMap.get(key);
      effects && effects.forEach(effect => effect());
  }

  const get = createGetter();
  const readonlyGet = createGetter(true, false);
  const shallowGet = createGetter(false, true);
  const shallowReadonlyGet = createGetter(true, true);
  function createGetter(isReadonly = false, shallow = false) {
      return function get(target, key, receiver) {
          const res = Reflect.get(target, key, receiver);
          if (!isReadonly) { //不是仅读的属性 才进行依赖收集
              track(target, 'get', key);
          }
          if (shallow) {
              return res; //如果是浅的不需要进行递归代理
          }
          if (isObject(res)) {
              return isReadonly ? readonly(res) : reactive(res);
          }
          return res;
      };
  }
  const set = createSetter();
  const readonlySet = {
      set(target, key) {
          console.warn(`connot set on ${key}, ${target} is readonly!!!`);
      }
  };
  function createSetter() {
      return function set(target, key, value, receiver) {
          const res = Reflect.set(target, key, value, receiver);
          //触发视图更新 做相应的处理
          trigger(target, key);
          console.log('设置值', key, value);
          return res;
      };
  }
  const mutableHandlers = {
      get,
      set
  };
  const readonlyHandlers = extend({
      get: readonlyGet
  }, readonlySet);
  const shallowReactiveHandlers = {
      get: shallowGet,
      set
  };
  const shallowReadonlyHandlers = extend({
      get: shallowReadonlyGet
  }, readonlySet);

  const reactiveMap = new WeakMap();
  const readonlyMap = new WeakMap();
  const shallowReactiveMap = new WeakMap();
  const shallowReadonlyMap = new WeakMap();
  function reactive(target) {
      return createReactiveObject(target, false, mutableHandlers, reactiveMap);
  }
  function shallowReactive(target) {
      return createReactiveObject(target, false, shallowReactiveHandlers, shallowReactiveMap);
  }
  function readonly(target) {
      return createReactiveObject(target, true, readonlyHandlers, readonlyMap);
  }
  function shallowReadonly(target) {
      return createReactiveObject(target, true, shallowReadonlyHandlers, shallowReadonlyMap);
  }
  function createReactiveObject(target, isReadonly, baseHandlers, proxyMap) {
      if (!isObject(target))
          return target;
      const existingProxy = proxyMap.get(target);
      if (existingProxy)
          return existingProxy;
      const proxy = new Proxy(target, baseHandlers);
      proxyMap.set(target, proxy);
      return proxy;
  }

  exports.effect = effect;
  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
