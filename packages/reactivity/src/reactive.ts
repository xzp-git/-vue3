import { isObject } from '@vue/shared'
import { mutableHandlers,  readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers} from './baseHandlers'

const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()
const shallowReactiveMap = new WeakMap()
const shallowReadonlyMap = new WeakMap()

export function reactive(target) {
  return createReactiveObject(target, false, mutableHandlers, reactiveMap)
}

export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers, shallowReactiveMap)
  
}

export function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyMap)
  
}

export function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyHandlers, shallowReadonlyMap)
  
}



function createReactiveObject(target, isReadonly, baseHandlers, proxyMap) {
  if(!isObject(target)) return target

  const existingProxy = proxyMap.get(target)
  if(existingProxy) return existingProxy

  const proxy = new Proxy(target, baseHandlers)
  proxyMap.set(target, proxy)
  return proxy
}