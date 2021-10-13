import { currentInstance, setCurrentInstance } from './component'


const enum LifeCycleHooks {
  BEFORE_MOUNT = 'bm',
  MOUNT = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATE = 'u'
}
const injectHook = (type, hook, target) => { 
  if (!target) {
    console.warn('injection APIs can only be used during execution of setup')
  }else{
    const hooks = target[type] || (target[type] = [])
    const wrap = () => {
      setCurrentInstance(target) // currentInstace = 自己的
      hook.call(target)
      setCurrentInstance(null)
    }
    hooks.push(wrap)
  }
}
const createHook = (lifecycle) => {
  return (hook,target = currentInstance) => { //target 用来标识他是那个实例的钩子

    // 给当前实例增加对应的生命周期 即可
    injectHook(lifecycle,hook,target)
  }
}
export const invokeArrayFns = (fns) => {
  for(let i = 0; i < fns.length; i++){ //vue2中也是让函数依次执行
    fns[i]()
  }
}



export const onBeforeMount = createHook(LifeCycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifeCycleHooks.MOUNT)
export const onBeforeUpdate = createHook(LifeCycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifeCycleHooks.UPDATE)

