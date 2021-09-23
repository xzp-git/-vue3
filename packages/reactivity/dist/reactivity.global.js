var VueReactivity = (function (exports) {
  'use strict';

  const isObject = (val) => val !== null && typeof val === 'object';
  const extend = Object.assign;
  const isArray = Array.isArray;
  const hasChanged = (oldVal, val) => oldVal !== val;
  const isInteger = (key) => parseInt(key) + '' === key;
  const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);

  function effect(fn, options = {}) {
      const effect = createReactiveEffect(fn, options); //把fn包装成一个响应式的函数
      if (!options.lazy) {
          effect();
      }
      return effect;
  }
  let uid = 0;
  let activeEffect; //此模块内的唯一一个变量
  const effectStack = [];
  /*
  为了防止 effect的嵌套
  effect(()=>{
    ...
    effect()
  })
  */
  function createReactiveEffect(fn, options) {
      const effect = function () {
          if (!effectStack.includes(effect)) { //保证effect没有加入到 effectStack
              try {
                  // 我需要将effec暴露到外层
                  effectStack.push(effect);
                  activeEffect = effect;
                  return fn(); //函数执行时会取值 执行get方法
              }
              finally {
                  effectStack.pop();
                  activeEffect = effectStack[effectStack.length - 1];
              }
          }
      };
      effect.id = uid++; //每个effect都有一个唯一的标识
      effect._isEffect = true; //用于标识这个函数是一个effect函数
      effect.raw = fn; //把用户传入的函数保存到当前的effect
      effect.deps = []; //后来用来存放efect对于哪写属性
      effect.options = options;
      return effect;
  }
  //依赖收集  让某个对象中的属性 收集当前对应的effect函数
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
  }
  function trigger(target, type, key, newValue, oldValue) {
      // activeEffect()-+p  
      const depsMap = targetMap.get(target);
      if (!depsMap)
          return; //如果没收集过 直接跳过
      const effects = new Set();
      // 我要将所有 要执行的effect 全部存到一个新的集合中， 最终一起执行
      const add = (effectsToAdd) => {
          if (effectsToAdd) {
              effectsToAdd.forEach(effect => effects.add(effect));
          }
      };
      // 1. 看修改是不是数组的长度 因为改长度影响比较大
      if (key === 'length' && isArray(target)) {
          //如果对应的长度 有依赖收集需要更新
          depsMap.forEach((dep, key) => {
              if (key === 'length' || key > newValue) {
                  add(dep);
              }
          });
      }
      else {
          //可能是对象
          if (key !== undefined) {
              add(depsMap.get(key));
          }
          //如果修改数组中的某一个索引 怎么办？
          switch (type) {
              case 0 /* ADD */:
                  if (isArray(target) && isInteger(key)) {
                      add(depsMap.get('length'));
                  }
          }
      }
      effects.forEach((effect) => effect());
  }

  const get = createGetter();
  const readonlyGet = createGetter(true, false);
  const shallowGet = createGetter(false, true);
  const shallowReadonlyGet = createGetter(true, true);
  function createGetter(isReadonly = false, shallow = false) {
      return function get(target, key, receiver) {
          const res = Reflect.get(target, key, receiver);
          if (!isReadonly) { //不是仅读的属性 才进行依赖收集
              track(target, 0 /* GET */, key);
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
          const oldValue = target[key];
          const hadKey = isArray(target) && isInteger(key) ? Number(key) < target.length : hasOwn(target, key);
          const res = Reflect.set(target, key, value, receiver);
          //触发视图更新 做相应的处理
          if (!hadKey) { //新增
              trigger(target, 0 /* ADD */, key, value);
          }
          else if (hasChanged(oldValue, value)) { //修改 
              trigger(target, 1 /* SET */, key, value);
          }
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

  function ref(value) {
      //普通类型 变成一个对象
      return createRef(value);
  }
  //ref 和 reactive的区别 reactive内部采用proxy  ref内部使用的时defineProperty
  function shallowRef(value) {
      return createRef(value, true);
  }
  const convert = (val) => isObject(val) ? reactive(val) : val;
  class RefImpl {
      rawValue;
      shallow;
      _value;
      __v_isRef = true; //产生的实例会被添加 __v_isRef表示ref属性
      constructor(rawValue, shallow) {
          this.rawValue = rawValue;
          this.shallow = shallow;
          this._value = shallow ? rawValue : convert(rawValue); //如果是深度的我们需要把里面的每一项都转化
      }
      //类的属性访问器
      get value() {
          track(this, 0 /* GET */, 'value');
          return this._value;
      }
      set value(newValue) {
          if (hasChanged(this.rawValue, newValue)) { //判断老值和新值是否有变化
              this.rawValue = newValue; //新值会作为老值
              this._value = this.shallow ? newValue : convert(newValue);
              trigger(this, 1 /* SET */, 'value', newValue);
          }
      }
  }
  function createRef(rawValue, shallow = false) {
      return new RefImpl(rawValue, shallow);
  }
  class ObjectRefImpl {
      target;
      key;
      __v_isRef = true;
      constructor(target, key) {
          this.target = target;
          this.key = key;
      }
      get value() {
          return this.target[this.key];
      }
      set value(newValue) {
          this.target[this.key] = newValue;
      }
  }
  function toRef(target, key) {
      return new ObjectRefImpl(target, key);
  }
  function toRefs(object) {
      const ret = isArray(object) ? new Array(object.length) : {};
      for (const key in object) {
          ret[key] = toRef(object, key);
      }
      return ret;
  }

  exports.effect = effect;
  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.ref = ref;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;
  exports.shallowRef = shallowRef;
  exports.toRef = toRef;
  exports.toRefs = toRefs;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
