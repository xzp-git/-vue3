


const execa = require('execa') //作用单独开启一个进程去打包


const target = 'reactivity'
async function build(target) {
  return execa('rollup',['-cw', '--environment', 'TARGET:'+target], {
    stdio:'inherit' //表示子进程中的输出结果会输出到父进程中
  })
}
build(target)