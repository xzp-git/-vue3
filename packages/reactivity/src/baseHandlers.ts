import { isObject, extend } from '@vue/shared'
import { reactive, readonly } from './index'

const get = createGetter()
const readonlyGet = createGetter(true, false)
const shallowGet = createGetter(false, true)
const shallowReadonlyGet = createGetter(true, true)


function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    
    
    const res = Reflect.get(target, key, receiver)
    if (!isReadonly) { //不是仅读的属性 才进行依赖收集
      console.log('取值')
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
    const res = Reflect.set(target, key, value, receiver)
    
    //触发视图更新 做相应的处理

    console.log('设置值', key, value)
    


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

