//组件中所有的方法

import { ShapeFlags } from '@vue/shared'


export function createComponentInstance(vnode) {
    
  const instance = { //组件的实例
    vnode,
    type:vnode.type,
    props:{}, //props attrs 有甚区别 vnode.props 包含 两者
    attrs:{},
    slots:{},
    ctx:{},
    setupState:{},//如果setup返回一个对象，这个对象回座位setUpstate
    isMounted:false //表示这个组件是否挂载过
  }
  instance.ctx = { _:instance} 
    
  return instance
}


export function setupComponent(instance) {
  const {props, children} = instance.vnode // {type, props, children}


  //根据props 解析出 props和 attrs 将其放到instance上

  instance.props = props //initProps
  instance.children = children //插槽的解析 initSlot()


  //需要先看一下 当前组件是不是有状态的组件， 函数组件
  
  const isStateful =  instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
  
  if (isStateful) { //表示现在是一个带状态的组件
    //调用 当前实例的setup方法， 用setup的返回值 填充setupState和对应的render方法 
    setupStatefulComponent(instance)
  }
}

function setupStatefulComponent(instance) {
  //1.代理 传递给 render函数的参数

  //2.获取组件的类型拿到组件的setup方法

  const Component = instance.type
  const {setup} = Component
  
  const setupContext = createContext(instance)
  setup(instance.props, setupContext)
}

function createContext(instance) {
    
  return{
    attrs: instance.attrs,
    slots:instance.slots,
    emit:()=>{'sss'},
    expose:()=>{'sss'},
    props:instance.props
  }
}