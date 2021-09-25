//这里面是针对属性操作，一系列的属性操作

import { patchAttr } from './modules/attr'
import { patchClass } from './modules/class'
import { patchEvent } from './modules/event'
import { patchStyle } from './modules/style'

export const patchProp = (el, key, prevValue, nextValue) => {
  switch (key) {
  case 'class':
    patchClass(el, nextValue)
    break
  case 'style':
    patchStyle(el, prevValue ,nextValue)
    break        
  default:
    // 如果不是事件才是属性
    if (/^on[^a-z]/.test(key)) {
      patchEvent(el, key, nextValue) //事件就是添加 删除 修改
    }else{
      patchAttr(el, key, nextValue)
    }
    break
  }
} 