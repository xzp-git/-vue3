import { hasChanged, isArray, isObject } from '@vue/shared'
import { reactive } from './reactive'
import { track, trigger } from './effect'
import { TrackOpTypes, TriggerOrTypes } from './operators'

export function ref(value) {
  //普通类型 变成一个对象

  return createRef(value)
}

//ref 和 reactive的区别 reactive内部采用proxy  ref内部使用的时defineProperty

export function shallowRef(value) {
  return createRef(value, true)
}
const convert = (val) => isObject(val)? reactive(val) : val
class RefImpl{
  public _value
  public __v_isRef = true  //产生的实例会被添加 __v_isRef表示ref属性
  constructor(public rawValue,public shallow){
    this._value = shallow ? rawValue : convert(rawValue) //如果是深度的我们需要把里面的每一项都转化

  }
  //类的属性访问器
  get value(){
    track(this, TrackOpTypes.GET, 'value')
    return this._value
  }

  set value(newValue){
    if (hasChanged(this.rawValue, newValue)) { //判断老值和新值是否有变化
      this.rawValue = newValue //新值会作为老值
      this._value = this.shallow? newValue : convert(newValue)
      trigger(this, TriggerOrTypes.SET, 'value', newValue)
    }
  }
}

function createRef(rawValue, shallow = false) {
  return new RefImpl(rawValue, shallow)
}

class ObjectRefImpl{
  public __v_isRef = true
  constructor(public target, public key){

  }
  get value(){
    return this.target[this.key]
  }

  set value(newValue){
    this.target[this.key] = newValue
  }
}

export function toRef(target, key) { //可以先把一个对象的值转化成 ref类型
  return new ObjectRefImpl(target, key)
}

export function toRefs(object) {
  const ret = isArray(object) ? new Array(object.length) :{}
  for(const key in object){
    ret[key] = toRef(object, key)
  }
  return ret
}