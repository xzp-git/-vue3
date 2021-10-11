const arr = [2, 3, 1, 5, 6, 8, 7, 9, 4]
/* 
2
2 3
1 3 5
1 3 5 6
1 3 5 6 8
1 3 5 6 7 
1 3 5 6 7 9
*/
//默认我们每次放入的时候 我都知道当前的最小的结尾

function getSequence(arr){
  const len = arr.length
  const result = [0]
  const p = arr.slice(0) //里面内容无所谓 和原本的数组相同 用来存放索引
  let start
  let end
  let middle
  for(let i = 0; i < len; i++){
    const arr1 = arr[i]
    if (arr1 !== 0) {
      let resultLastIndex = result[result.length - 1]
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
  while (start-- > 0) { //根据前驱节点一个个向前查找
    result[start] = last
    last = p[last]
  }
  return result
}
console.log(getSequence(arr))
