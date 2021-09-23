import { isObject, extend, isArray, isInteger, hasOwn, hasChanged } from '@vue/shared'
import { trigger, track } from './effect'
import { reactive, readonly } from './index'
import { TrackOpTypes, TriggerOrTypes } from './operators'

const get = createGetter()
const readonlyGet = createGetter(true, false)
const shallowGet = createGetter(false, true)
const shallowReadonlyGet = createGetter(true, true)


function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    
    
    const res = Reflect.get(target, key, receiver)
    if (!isReadonly) { //不是仅读的属性 才进行依赖收集
      track(target, TrackOpTypes.GET, key)
    }
    if (shallow) {
      return res //如果是浅的不需要进行递归代理
    }

    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res) 
    }

    return res
  }
}

const set = createSetter()
const readonlySet = {
  set(target, key){
    console.warn(`connot set on ${key}, ${target} is readonly!!!`)
  }
}

function createSetter() {
  return function set(target, key, value, receiver) {

    const oldValue = target[key] 
    
    
    const hadKey = isArray(target) && isInteger(key)? Number(key) < target.length : hasOwn(target,key)
    const res = Reflect.set(target, key, value, receiver)  
    //触发视图更新 做相应的处理
    if(!hadKey){//新增
      trigger(target,TriggerOrTypes.ADD , key, value)
      
    }else if (hasChanged(oldValue, value)) { //修改 
      trigger(target,TriggerOrTypes.SET , key, value, oldValue)
    }

    return res 
  }
}





export const mutableHandlers = {
  get,
  set
}

export const readonlyHandlers = extend({
  get:readonlyGet
}, readonlySet)


export const shallowReactiveHandlers ={
  get:shallowGet,
  set
}


export const shallowReadonlyHandlers = extend({
  get:shallowReadonlyGet
}, readonlySet)

