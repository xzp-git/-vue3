'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const isObject = (val) => val !== null && typeof val === 'object';
const extend = Object.assign;

const get = createGetter();
const readonlyGet = createGetter(true, false);
const shallowGet = createGetter(false, true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        const res = Reflect.get(target, key, receiver);
        if (!isReadonly) { //不是仅读的属性 才进行依赖收集
            console.log('取值');
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

exports.reactive = reactive;
exports.readonly = readonly;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
