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
    nextSibling:hostNextSibling
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
        // diff
        const prevTree = instance.subTree
        const proxyToUse = instance.proxy
        const nextTree = instance.render.call(proxyToUse,proxyToUse)
        patch(prevTree, nextTree, container)
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

  const mountElement = (vnode, container, anchor) => {
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

    hostInsert(el, container, anchor)
  }
  const patchProp = (oldProps, newProps, el) => {
    if (oldProps !== newProps) {
      for(const key in newProps){
        const prev = oldProps[key]
        const next = newProps[key]

        if (prev !== next) {
          hostPatchProp(el, key, prev, next)
        }
      }

      for(const key in oldProps){  
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
  }
  const patchKeyedChildren = (c1, c2, el) => {
    //vue3对特殊情况做了优化
    const i = 0 //都是默认从头开始比对
    const e1 = c1.length - 1
    const e2 = c2.length - 1
    //sync from start 从头开始一个个比 遇到不同的就停止了
    while(i <= e1 && i<= e2){
      const n1 = c1[i]
      const n2 = c2[i]
    }
  }
  const unmountChildren = (children) => {
    for(let i = 0; i < children.length; i++){
      unmount(children[i])
    }
  }
  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children
    const c2 = n2.children

    //老的有儿子新的没儿子  老的没儿子新的有儿子    新老都有儿子  新老都是文本
    const prevShapeFlag = n1.shapeFlag
    const shapeFlag = n2.shapeFlag //分别标识过儿子的状况

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {//case1:现在是文本之前是数组

      //老的是n个孩子   新的是文本

      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1) // 如果c1
      }

      //两个人都是文本的情况
      if (c2 !== c1) {  //case2:两个都是文本 
        hostSetElementText(el, c2)
      }
    }else{
      //现在是元素 上一次有可能是文本或者数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {

        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { //case3两个都是数组
          //当前是数组 之前是数组
        //两个数组的比对 -> diff算法  **************************

          patchKeyedChildren(c1, c2, el)


        }else{
          //没有孩子 当前是null
          unmountChildren(c1) //删除老的
        }
      
      }else{
        //上次是文本
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) { //case4 现在是数组 之前是文本
          hostSetElementText(el, '')
        }

        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el)
        }
      }
    }


  }

  const  patchElement = (n1, n2, container) => {
    // 元素是相同节点
    const el = (n2.el = n1.el)

    //更新属性 更新儿子
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    patchProp(oldProps, newProps, el)

    patchChildren(n1, n2, container)
  }

  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      mountElement(n2, container, anchor)
    } else {
      //元素更新
      patchElement(n1,n2,container)
    }
  }

  /***************************处理元素 */ 

  /***************************文本处理 */

  const processText =(n1, n2, container) => {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    }
  }

  const isSameVNodeType = (n1, n2) => {
    return n1.type === n2.type && n1.key === n2.key
  }

  const unmount = (n1) => { //如果是组件 调用组件的声明周期
    hostRemove(n1.el)
  }

  const patch = (n1, n2, container, anchor = null) => {
    //针对不同类型，做初始化操作
    const {shapeFlag, type} = n2
    if (n1 && !isSameVNodeType(n1,n2)) {
      // 把以前的删掉 换成n2

      anchor = hostNextSibling(n1.el)
      unmount(n1)
      n1 = null //重新渲染n2对应的内容 
    }
    switch (type) {
    case Text:
      processText(n1, n2, container)
      break
    
    default:
      if(shapeFlag & ShapeFlags.ELEMENT){
        processElement(n1, n2, container, anchor)
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