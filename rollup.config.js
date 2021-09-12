const path = require('path')
const ts = require('rollup-plugin-typescript2')
const resolvePlugin = require('@rollup/plugin-node-resolve').default
//1. 获取整个packages目录
let packagesDir = path.resolve(__dirname, 'packages')

//根据 调用rollup时候的参数来进行动态打包
const name = process.env.TARGET
console.log(name);
const packageDir = path.resolve(packagesDir, name)

//根据当前模块解析文件
const currentResolve = (p) => path.resolve(packageDir, p)



// 我需要拿到package.json的内容
const pkg = require(currentResolve('package.json'))

//读取自己设定的对象
const options = pkg.buildOptions

const outputConfig = {
    cjs:{
        file:currentResolve(`dist/${name}.cjs.js`),
        format:'cjs'
    },
    global:{
        file:currentResolve(`dist/${name}.global.js`),
        format:'iife'
    },
    'esm-bundler':{
        file:currentResolve(`dist/${name}.esm-bundler.js`),
        format:'esm'
    },
}

//rollup的配置可以返回一个数组

function createConfig(output) {
    output.name = options.name
    return{
        
        input:currentResolve('src/index.ts'),
        output,
        plugins:[
            ts({
                tsconfig:path.resolve(__dirname,'tsconfig.json')
            }),
            resolvePlugin()
        ]
    }
}

export default options.formats.map(f=>createConfig(outputConfig[f]))