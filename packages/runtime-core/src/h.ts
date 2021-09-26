import { isArray, isObject } from '@vue/shared'
import { createVNode, isVnode } from './vnode'




export function h(type, propsOrChildren, children) {
  const i = arguments.length //儿子节点要么是字符串 要么是字符串

  if (i == 2) { //类型+ 属性   类型 + 孩子
      
    //如果propsOrChildren 是数组 直接作为第三个参数  
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVnode(propsOrChildren)) {
        return createVNode(type, null,[propsOrChildren])
      }
      return createVNode(type, propsOrChildren)
    } else {
    //如果第二个参数 不是对象 一定是孩子

      return createVNode(type, null, propsOrChildren)
    }
  }else{
    if (i > 3) {
      children = Array.prototype.slice.call(arguments,2)
    }else if (i === 3 && isVnode(children)) {
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
    
}