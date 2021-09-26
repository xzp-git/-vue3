var VueRuntimeDom = (function (exports) {
  'use strict';

  const isObject = (val) => val !== null && typeof val === 'object';
  const extend = Object.assign;
  const isArray = Array.isArray;
  const hasChanged = (oldVal, val) => oldVal !== val;
  const isFunction = (val) => typeof val === 'function';
  const isInteger = (key) => parseInt(key) + '' === key;
  const isString = (val) => typeof val === 'string';
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
      effects.forEach((effect) => {
          if (effect.options.scheduler) {
              effect.options.scheduler(effect);
          }
          else {
              effect();
          }
      });
  }

  const get = createGetter();
  const readonlyGet = createGetter(true, false);
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
  extend({
      get: shallowReadonlyGet
  }, readonlySet);

  const reactiveMap = new WeakMap();
  const readonlyMap = new WeakMap();
  function reactive(target) {
      return createReactiveObject(target, false, mutableHandlers, reactiveMap);
  }
  function readonly(target) {
      return createReactiveObject(target, true, readonlyHandlers, readonlyMap);
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

  //createVNode 创建虚拟节点
  function isVnode(vnode) {
      return vnode.__v_isVnode;
  }
  // h('div', {style:{color:red},'children'})  //h方法和createApp类似
  const createVNode = (type, props, children = null) => {
      //可以根据type 来区分 是组件 还是普通的元素
      //根据type来区分 是元素还是组件
      //给虚拟节点加一个类型
      const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : 0;
      const vnode = {
          __v_isVnode: true,
          type,
          props,
          children,
          component: null,
          el: null,
          key: props && props.key,
          shapeFlag //判读出当前自己的类型 和 儿子的类型
      };
      normalizeChildren(vnode, children);
      return vnode;
  };
  function normalizeChildren(vnode, children) {
      let type = 0;
      if (children == null) ;
      else if (isArray(children)) {
          type = 16 /* ARRAY_CHILDREN */;
      }
      else {
          type = 8 /* TEXT_CHILDREN */;
      }
      vnode.shapeFlag |= type;
  }

  function createAppAPI(render) {
      return function createApp(rootComponent, rootProps) {
          const app = {
              _props: rootProps,
              _component: rootComponent,
              _container: null,
              mount(container) {
                  // const vnode = {}
                  // render(vnode, container)
                  //1.根据组件创建虚拟节点
                  //2.将虚拟节点和容器获取到后调用render方法进行渲染
                  //创建虚拟节点
                  const vnode = createVNode(rootComponent, rootProps);
                  // 调用render
                  render(vnode, container);
                  app._container = container;
              }
          };
          return app;
      };
  }

  const PublicInstanceProxyHandlers = {
      get({ _: instance }, key) {
          //取值时 要访问setUpState, props, data
          const { setupState, props, data } = instance;
          if (key[0] == '$') {
              return; //不能访问 $ 开头的变量
          }
          if (hasOwn(setupState, key)) {
              return setupState[key];
          }
          else if (hasOwn(props, key)) {
              return props[key];
          }
          else if (hasOwn(data, key)) {
              return data[key];
          }
      },
      set({ _: instance }, key, value) {
          const { setupState, props, data } = instance;
          if (hasOwn(setupState, key)) {
              setupState[key] = value;
          }
          else if (hasOwn(props, key)) {
              props[key] = value;
          }
          else if (hasOwn(data, key)) {
              data[key] = value;
          }
          return true;
      }
  };

  //组件中所有的方法
  function createComponentInstance(vnode) {
      const instance = {
          vnode,
          type: vnode.type,
          props: {},
          attrs: {},
          slots: {},
          ctx: {},
          setupState: {},
          render: null,
          isMounted: false //表示这个组件是否挂载过
      };
      instance.ctx = { _: instance };
      return instance;
  }
  function setupComponent(instance) {
      const { props, children } = instance.vnode; // {type, props, children}
      //根据props 解析出 props和 attrs 将其放到instance上
      instance.props = props; //initProps
      instance.children = children; //插槽的解析 initSlot()
      //需要先看一下 当前组件是不是有状态的组件， 函数组件
      const isStateful = instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
      if (isStateful) { //表示现在是一个带状态的组件
          //调用 当前实例的setup方法， 用setup的返回值 填充setupState和对应的render方法 
          setupStatefulComponent(instance);
      }
  }
  function setupStatefulComponent(instance) {
      //1.代理 传递给 render函数的参数
      instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
      //2.获取组件的类型拿到组件的setup方法
      const Component = instance.type;
      const { setup } = Component;
      if (setup) {
          const setupContext = createContext(instance);
          const setupResult = setup(instance.props, setupContext);
          handleSetupResult(instance, setupResult);
      }
      else {
          finishComponentSetup(instance); //完成组件的启动
      }
  }
  function handleSetupResult(instance, setupResult) {
      if (isFunction(setupResult)) {
          instance.render = setupResult;
      }
      else if (isObject(setupResult)) {
          instance.setupState = setupResult;
      }
      finishComponentSetup(instance);
  }
  function finishComponentSetup(instance) {
      const Component = instance.type;
      if (!instance.render) {
          // 对template模板进行编译 产生render函数
          if (!Component.render && Component.template) ;
          instance.render = Component.render; // 需要将生成的render函数放在实例上
      }
      // 对vue2的 API 做了兼容处理
      // applyOptions
  }
  function createContext(instance) {
      return {
          attrs: instance.attrs,
          slots: instance.slots,
          emit: () => {
              'sss';
          },
          expose: () => {
              'sss';
          },
          props: instance.props
      };
  }

  function createRenderer(renderOptions) {
      const setupRenderEffect = (instance, container) => {
          //需要创建一个effect 在effect中调用render方法 这样 render方法中拿到的数据会收集这个effect   属性更新时effect会重新执行
          effect(function componentEffect() {
              if (!instance.isMounted) {
                  //初次渲染
                  const proxyToUse = instance.proxy;
                  // $vnode _vnode
                  // vnode subTree
                  const subTree = instance.subTree = instance.render.call(proxyToUse, proxyToUse);
                  patch(null, subTree, container);
                  instance.isMounted = true;
              }
          });
      };
      const mountComponent = (initialVNode, container) => {
          // 组件的渲染流程 最核心的就是 调用 setup 拿到返回值 获取到返回结果来进行渲染
          //1. 先有实例
          const instance = initialVNode.component = createComponentInstance(initialVNode);
          //2. 需要的数据解析到实例上
          setupComponent(instance); // 给实例赋值
          //3. 创建一个effect 让render函数执行
          setupRenderEffect(instance, container);
      };
      const processComponent = (n1, n2, container) => {
          if (n1 == null) { //组件没有上一次的虚拟节点
              mountComponent(n2, container);
          }
      };
      const patch = (n1, n2, container) => {
          //针对不同类型，做初始化操作
          const { shapeFlag } = n2;
          if (shapeFlag & 1 /* ELEMENT */) {
              console.log('元素', n1, n2, container);
          }
          else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
              processComponent(n1, n2, container);
          }
      };
      const render = (vnode, container) => {
          //core 的核心,根据不同的节点 创建对应的真实元素
          //默认调用render 可能是初始化流程
          patch(null, vnode, container);
      };
      return {
          createApp: createAppAPI(render)
      };
  }
  //createRenderer 目的是创建一个渲染器
  // 框架 都是将组价 转化成虚拟DOM ->  虚拟DOM生成真实DOM挂载到真实页面上

  function h(type, propsOrChildren, children) {
      const i = arguments.length; //儿子节点要么是字符串 要么是字符串
      if (i == 2) { //类型+ 属性   类型 + 孩子
          //如果propsOrChildren 是数组 直接作为第三个参数  
          if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
              if (isVnode(propsOrChildren)) {
                  return createVNode(type, null, [propsOrChildren]);
              }
              return createVNode(type, propsOrChildren);
          }
          else {
              //如果第二个参数 不是对象 一定是孩子
              return createVNode(type, null, propsOrChildren);
          }
      }
      else {
          if (i > 3) {
              children = Array.prototype.slice.call(arguments, 2);
          }
          else if (i === 3 && isVnode(children)) {
              children = [children];
          }
          return createVNode(type, propsOrChildren, children);
      }
  }

  const nodeOps = {
      // createElement 不同的平台创建元素方式不同
      createElement: tagName => document.createElement(tagName),
      remove: child => {
          const parent = child.parentNode;
          if (parent) {
              parent.removeChild(child);
          }
      },
      insert: (child, paraent, anchor = null) => {
          paraent.insertBefore(child, anchor); //如果参照物为空 则相当于appendChild
      },
      querySelector: selector => document.querySelector(selector),
      setElementText: (el, text) => el.textContent = text,
      createText: text => document.createTextNode(text)
  };

  const patchAttr = (el, key, value) => {
      if (value == null) {
          el.removeAttribute(key);
      }
      else {
          el.setAttribute(key, value);
      }
  };

  const patchClass = (el, value) => {
      if (value == null) {
          value = '';
      }
      el.className = value;
  };

  const patchEvent = (el, key, value) => {
      //对函数的缓存
      const invokers = el._vei || (el._vei = {});
      const exists = invokers[key];
      if (value && exists) { //需要绑定事件 而且还存在的情况下
          exists.value = value;
      }
      else {
          const eventName = key.slice(2).toLowerCase();
          if (value) { //要绑定的事件 以前没有绑定过
              const invoker = invokers[key] = createInvoker(value);
              el.addEventListener(eventName, invoker);
          }
          else { //以前绑定了 当时没有value
              el.removeEventListener(eventName, exists);
              invokers[key] = undefined;
          }
      }
  };
  function createInvoker(value) {
      const invoker = (e) => {
          invoker.value(e);
      };
      invoker.value = value; //为了能随时更改value
      return invoker;
  }
  //一个元素绑定事件 addEventListener

  const patchStyle = (el, prev, next) => {
      const style = el.style; //获取样式
      if (next == null) {
          el.removeAttribute('style');
      }
      else {
          //老的有 新的没有
          if (prev) {
              for (const key in prev) {
                  if (next[key] == null) {
                      style[key] = '';
                  }
              }
          }
          //新的里面需要赋值到style
          for (const key in next) {
              style[key] = next[key];
          }
      }
  };

  //这里面是针对属性操作，一系列的属性操作
  const patchProp = (el, key, prevValue, nextValue) => {
      switch (key) {
          case 'class':
              patchClass(el, nextValue);
              break;
          case 'style':
              patchStyle(el, prevValue, nextValue);
              break;
          default:
              // 如果不是事件才是属性
              if (/^on[^a-z]/.test(key)) {
                  patchEvent(el, key, nextValue); //事件就是添加 删除 修改
              }
              else {
                  patchAttr(el, key, nextValue);
              }
              break;
      }
  };

  // runtime-dom 核心就是 提供domAPI方法
  //节点操作就是增删改查
  //属性操作 添加 删除 更新 （样式 类 事件 其他属性）
  //渲染时用到的所有方法
  extend({ patchProp }, nodeOps);
  //用户调用的是runtime-dom -> runtime-core
  //runtime-dom 是为了解决平台差异（浏览器的）
  //vue中 runtime-core 提供了核心的用法 用来处理渲染的， 他会使用 runtime-dom中的api进行渲染
  function createApp(rootComponent, rootProps = null) {
      const app = createRenderer().createApp(rootComponent, rootProps);
      const { mount } = app;
      app.mount = function (container) {
          //清空容器的操作
          container = nodeOps.querySelector(container);
          container.innerHTML = '';
          mount(container);
          //将组价 渲染成dom元素 进行挂载
      };
      return app;
  }

  exports.createApp = createApp;
  exports.createRenderer = createRenderer;
  exports.h = h;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
