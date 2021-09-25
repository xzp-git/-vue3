

export const patchEvent = (el, key, value) => {
  //对函数的缓存
  const invokers = el._vei || (el._vei = {})

  const exists = invokers[key] 

  if (value && exists) { //需要绑定事件 而且还存在的情况下
    exists.value = value
  }else{
    const eventName = key.slice(2).toLowerCase()
    if (value) { //要绑定的事件 以前没有绑定过
      const invoker = invokers[key] = createInvoker(value)
      el.addEventListener(eventName, invoker)
    }else{ //以前绑定了 当时没有value
      el.removeEventListener(eventName, exists)
      invokers[key] = undefined
    }
  }
}

function createInvoker(value) {
  const invoker = (e) => {
    invoker.value(e)
  }
  invoker.value = value //为了能随时更改value
  return invoker
}

//一个元素绑定事件 addEventListener

