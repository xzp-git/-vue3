import { effect } from '@vue/reactivity'
import { ShapeFlags } from '@vue/shared'
import { createAppAPI } from './apiCreateApp'
import { invokeArrayFns } from './apiLifecycle'
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
        const {bm, m} = instance
        if (bm) {
          invokeArrayFns(bm)
        }
        const proxyToUse = instance.proxy
        // $vnode _vnode
        // vnode subTree
        const subTree = instance.subTree = instance.render.call(proxyToUse, proxyToUse)

        patch(null, subTree, container)
        instance.isMounted = true
        if (m) { //mounted 要求在我们子组件渲染完成后在执行
          invokeArrayFns(m)
        }
      }else{
        // 更新逻辑
        // diff
        const {bu, u} = instance
        if (bu) {
          invokeArrayFns(bu)
        }
        const prevTree = instance.subTree
        const proxyToUse = instance.proxy
        const nextTree = instance.render.call(proxyToUse,proxyToUse)
        patch(prevTree, nextTree, container)
        if (u) {
          invokeArrayFns(u)
        }
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
    let i = 0 //都是默认从头开始比对
    let e1 = c1.length - 1
    let e2 = c2.length - 1 
    /* 
      //0 2 3
      i 0 -> 1
      //1 2 3
      i 1 -> 2
      //2 2 3
      //2 -> 3
    */  
    //sync from start 从头开始一个个比 遇到不同的就停止了
    while(i <= e1 && i<= e2){
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el)
      }else{
        break
      }
      i++
    }    
    //sync from end 从结尾对比
    while (i <= e1 && i<= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el)
      }else{
        break
      }
      e1--
      e2--
    } 

    //common sequence + mount  同序列对比 假如比较后 有一方已经完全比对成功
    // 怎么确定是要挂载的
    //如果完成后 最终 i的值大于e1
    if (i > e1) {//老的少 新的多
      if (i <= e2) { //表示有新增的部分
        const nextPos = e2 + 1
           
        //想知道是向前插入还是向后插入

        const anchor = nextPos < c2.length ? c2[nextPos].el : null  
        while (i <= e2) {
          patch(null, c2[i], el, anchor)  
          i++
        }
      }
    }else if(i > e2){ //老的多新的少
      //common sequence + unmount  同序列对比 假如比较后 有一方已经完全比对成功
      while (i <= e1) {
        unmount(c1[i])
        i++
      }
    }else{
      //乱序比对  需要尽可能的复用 用心的元素去老的里面找 一样的就服用, 不一样的要不插入 要不删除
      const s1 = i
      const s2 = i
      //vue3 用的是新的 做映射表
      const KeyToNewIndexMap = new Map()

      for(let i=s2; i <= e2; i++){
        const childVNode = c2[i]
        KeyToNewIndexMap.set(childVNode.key,i)
      }

      const toBePatched = e2 - s2 + 1
  
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
      
      //去老的里面查找 看有没有复用的
      for(let i = s1; i<=e1; i++){
        const oldVnode = c1[i]
        const newIndex = KeyToNewIndexMap.get(oldVnode.key)
        if (newIndex === undefined) { //老的里的 没有新的需要的
          unmount(oldVnode)
        }else{//新老比对 比较完毕后位置存在差异
          //新的和旧的关系 索引关系
          newIndexToOldIndexMap[newIndex - s2] = i+1  
          patch(oldVnode,c2[newIndex],el)
        } 
      }
      const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
      let j = increasingNewIndexSequence.length - 1 //取出最后一个
      console.log(increasingNewIndexSequence)
      
      for(let i = toBePatched - 1; i>=0; i--){
        const currentIndex = i + s2 //找到H的索引
        const child = c2[currentIndex] //找到h对应的节点
        const anchor = currentIndex + 1 < c2.length ? c2[currentIndex + 1].el : null  
        if (newIndexToOldIndexMap[i] == 0) { //如果自己是0说明没有被patch过
          patch(null, child, el, anchor)
        }else{
          if (i != increasingNewIndexSequence[j]) {
            hostInsert(child.el, el, anchor)//操作当前的d 以d下一个作为参照物插入
          }else{
            j--  //跳过不需要移动的元素
          }
         
        }
      }
      //最后就是移动节点,并且将新增的节点插入
      //最长递增子序列

    }
  }

  function getSequence(arr){
    const len = arr.length
    const result = [0] //先默认第0个为参照物
    const p = arr.slice(0) //里面内容无所谓 和原本的数组相同 用来存放索引
    let start
    let end
    let middle
    for(let i = 0; i < len; i++){
      const arr1 = arr[i]
      if (arr1 !== 0) {
        const resultLastIndex = result[result.length - 1]
        if (arr[resultLastIndex] < arr1) {
          p[i] = resultLastIndex
          result.push(i)//当前的值 比上一个人大 直接push 并且让这个人 得记录他的前一个
          continue
        }
  
        //二分查找 找到比当前值大的那一个
        start = 0
        end = result.length - 1
  
        while (start < end) { //重合就说明找到了对应的值
          middle = ((start + end) / 2) | 0 //找到中间位置的前一个
          if (arr[result[middle]] < arr1) {
            start = start +1
          }else{
            end = middle
          } //找到结果集中比当前这一项大的数
        }
        //start end 就是找到的位置
        if (arr1 < arr[result[start]]) {
          if (start > 0) { //才需要替换
            p[i] = result[start - 1]
          }
          result[start] = i
  
        }
        
      }
      
    }
    let lens = result.length //总的个数
    let last = result[lens - 1]
    while (lens-- > 0) { //根据前驱节点一个个向前查找
      result[lens] = last
      last = p[last]
    }
    return result
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

    patchChildren(n1, n2, el)
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