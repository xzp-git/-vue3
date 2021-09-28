import { effect } from '@vue/reactivity'
import { ShapeFlags } from '@vue/shared'
import { createAppAPI } from './apiCreateApp'
import { createComponentInstance, setupComponent } from './component'
import { queueJob } from './scheduler'
import { normalizeVNode, Text } from './vnode'



export  function createRenderer(renderOptions) { //告诉core 怎么渲染

  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
  } = renderOptions

  /***************************处理组件 */ 
  const setupRenderEffect = (instance, container) => {
    //需要创建一个effect 在effect中调用render方法 这样 render方法中拿到的数据会收集这个effect   属性更新时effect会重新执行
    
    effect(function componentEffect() { //每个组件都有一个efect vue3是组件级更新
      if (!instance.isMounted) {
        //初次渲染
        const proxyToUse = instance.proxy
        // $vnode _vnode
        // vnode subTree
        const subTree = instance.subTree = instance.render.call(proxyToUse, proxyToUse)

        patch(null, subTree, container)
        instance.isMounted = true
      }else{
        // 更新逻辑
        console.log('更新了')
        
      }

    },{scheduler:queueJob})
    
    
  }

  const mountComponent = (initialVNode, container) => {
    // 组件的渲染流程 最核心的就是 调用 setup 拿到返回值 获取到返回结果来进行渲染
    //1. 先有实例
    const instance = initialVNode.component = createComponentInstance(initialVNode)
    //2. 需要的数据解析到实例上
    setupComponent(instance) // 给实例赋值
    //3. 创建一个effect 让render函数执行
    setupRenderEffect(instance, container)
  }

  const processComponent = (n1, n2, container) => {

    if (n1 == null) { //组件没有上一次的虚拟节点
      mountComponent(n2, container)      
    }else{
      // 组件更新流程
    }
  }
  /***************************处理组件 */ 


  /***************************处理元素 */ 

  const mountChildren = (children,container) => {
    for(let i=0; i<children.length; i++){
      const child = normalizeVNode(children[i])
      patch(null, child, container)
    }
  }

  const mountElement = (vnode, container) => {
    //递归渲染
    const {props, shapeFlag, type, children} = vnode
    const el = (vnode.el = hostCreateElement(type))

    if (props) {
      for(const key in props){
        hostPatchProp(el, key, null, props[key])
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    }else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children,el)
    }

    hostInsert(el, container)
  }

  const processElement = (n1, n2, container) => {
    if (n1 == null) {
      mountElement(n2, container)
    } else {
      //元素更新
    }
  }

  /***************************处理元素 */ 

  /***************************文本处理 */

  const processText =(n1, n2, container) => {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    }
  }

  const patch = (n1, n2, container) => {
    //针对不同类型，做初始化操作
    const {shapeFlag, type} = n2

    switch (type) {
    case Text:
      processText(n1, n2, container)
      break
    
    default:
      if(shapeFlag & ShapeFlags.ELEMENT){
        processElement(n1, n2, container)
      }else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(n1, n2, container)
      }
      break
    }

    
  }

  const render = (vnode, container) => {
    //core 的核心,根据不同的节点 创建对应的真实元素

    //默认调用render 可能是初始化流程
    patch(null, vnode, container)

  }
  
  return{
    createApp:createAppAPI(render)
  }
}



//createRenderer 目的是创建一个渲染器

// 框架 都是将组价 转化成虚拟DOM ->  虚拟DOM生成真实DOM挂载到真实页面上