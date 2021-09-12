
// 1.希望拿到packages下的所有包

const fs = require('fs')
const execa = require('execa') //作用单独开启一个进程去打包

// 读取文件夹的名称 过滤掉文件
const targets = fs.readdirSync('packages').filter(item => {
    //判断文件或者文件夹的状态
    return fs.statSync(`packages/${item}`).isDirectory()
})

async function build(target) {
    return execa('rollup',['-c', '--environment', 'TARGET:'+target], {
        stdio:'inherit' //表示子进程中的输出结果会输出到父进程中
    })
}

function runAll(targets){
    let results = []
    for(let target of targets){
        results.push(build(target))
    }
    return Promise.all(results)
}

//打包这些文件
runAll(targets).then( () => {
    console.log('完毕');
})