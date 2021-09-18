export function effect(fn, options:any = {}) {
  const effect = createReactiveEffect(fn, options) //把fn包装成一个响应式的函数

  if (!options.lazy) {
    effect()
  }

  return effect
}


let uid = 0 
let activeEffect //此模块内的唯一一个变量
function createReactiveEffect(fn, options) {
  const effect = function () {

    // 我需要将effec暴露到外层
    activeEffect = effect

    fn()
    activeEffect= null
  }
  effect.id = uid++ //每个effect都有一个唯一的标识
  effect._isEffect = true //用于标识这个函数是一个effect函数
  effect.raw = fn //把用户传入的函数保存到当前的effect
  effect.deps = [] //后来用来存放efect对于哪写属性
  effect.options = options
  return effect
}

const targetMap = new WeakMap()
export function track(target, type, key) { //{obj:name => [effect, effect]} weakMap : (map){key: new Set()}
  if (!activeEffect) return // 说明取值操作是在effec之外操作的
  let depsMap = targetMap.get(target) //先尝试看一下这个对象中是否存过属性 
  if (!depsMap) targetMap.set(target, (depsMap = new Map))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set))
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
  }
  console.log(targetMap)
  
}

export function trigger(target, key, value) {
  // activeEffect()
  const depsMap = targetMap.get(target)
  if(!depsMap) return //如果没收集过 直接跳过
  const effects = depsMap.get(key)
  effects && effects.forEach(effect => effect())
}