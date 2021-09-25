

export const patchStyle = (el, prev ,next) => {
  const style = el.style //获取样式
  if (next == null) {
    el.removeAttribute('style')
  }else{

    //老的有 新的没有
    if (prev) {
      for(const key in prev){
        if (next[key] == null) {
          style[key] = ''
        }
      }
    }

    //新的里面需要赋值到style
    for(const key in next){
      style[key] = next[key]
    }
  }
}