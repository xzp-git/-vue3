const isObject = (val) => val !== null && typeof val === 'object';
const extend = Object.assign;
const isArray = Array.isArray;
const isString = (val) => typeof val === 'string';

//createVNode 创建虚拟节点
// h('div', {style:{color:red},'children'})  //h方法和createApp类似
const createVNode = (type, props, children = null) => {
    //可以根据type 来区分 是组件 还是普通的元素
    //根据type来区分 是元素还是组件
    //给虚拟节点加一个类型
    const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : 0;
    const vnode = {
        __v_isVnode: true,
        type,
        props,
        children,
        component: null,
        el: null,
        key: props && props.key,
        shapeFlag //判读出当前自己的类型 和 儿子的类型
    };
    normalizeChildren(vnode, children);
    return vnode;
};
function normalizeChildren(vnode, children) {
    let type = 0;
    if (children == null) ;
    else if (isArray(children)) {
        type = 16 /* ARRAY_CHILDREN */;
    }
    else {
        type = 8 /* TEXT_CHILDREN */;
    }
    vnode.shapeFlag |= type;
}

function createAppAPI(render) {
    return function createApp(rootComponent, rootProps) {
        const app = {
            _props: rootProps,
            _component: rootComponent,
            _container: null,
            mount(container) {
                // const vnode = {}
                // render(vnode, container)
                //1.根据组件创建虚拟节点
                //2.将虚拟节点和容器获取到后调用render方法进行渲染
                //创建虚拟节点
                const vnode = createVNode(rootComponent, rootProps);
                // 调用render
                render(vnode, container);
                app._container = container;
            }
        };
        return app;
    };
}

//组件中所有的方法
function createComponentInstance(vnode) {
    const instance = {
        vnode,
        type: vnode.type,
        props: {},
        attrs: {},
        slots: {},
        ctx: {},
        setupState: {},
        isMounted: false //表示这个组件是否挂载过
    };
    instance.ctx = { _: instance };
    return instance;
}
function setupComponent(instance) {
    const { props, children } = instance.vnode; // {type, props, children}
    //根据props 解析出 props和 attrs 将其放到instance上
    instance.props = props; //initProps
    instance.children = children; //插槽的解析 initSlot()
    //需要先看一下 当前组件是不是有状态的组件， 函数组件
    const isStateful = instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
    if (isStateful) { //表示现在是一个带状态的组件
        //调用 当前实例的setup方法， 用setup的返回值 填充setupState和对应的render方法 
        setupStatefulComponent(instance);
    }
}
function setupStatefulComponent(instance) {
    //1.代理 传递给 render函数的参数
    //2.获取组件的类型拿到组件的setup方法
    const Component = instance.type;
    const { setup } = Component;
    const setupContext = createContext(instance);
    setup(instance.props, setupContext);
}
function createContext(instance) {
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: () => {
            'sss';
        },
        expose: () => {
            'sss';
        },
        props: instance.props
    };
}

function createRenderer(renderOptions) {
    const mountComponent = (initialVNode, container) => {
        // 组件的渲染流程 最核心的就是 调用 setup 拿到返回值 获取到返回结果来进行渲染
        //1. 先有实例
        const instance = initialVNode.component = createComponentInstance(initialVNode);
        //2. 需要的数据解析到实例上
        setupComponent(instance);
    };
    const processComponent = (n1, n2, container) => {
        if (n1 == null) { //组件没有上一次的虚拟节点
            mountComponent(n2);
        }
    };
    const patch = (n1, n2, container) => {
        //针对不同类型，做初始化操作
        const { shapeFlag } = n2;
        if (shapeFlag & 1 /* ELEMENT */) {
            console.log('元素');
        }
        else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
            processComponent(n1, n2);
        }
    };
    const render = (vnode, container) => {
        //core 的核心,根据不同的节点 创建对应的真实元素
        //默认调用render 可能是初始化流程
        patch(null, vnode);
    };
    return {
        createApp: createAppAPI(render)
    };
}
//createRenderer 目的是创建一个渲染器
// 框架 都是将组价 转化成虚拟DOM ->  虚拟DOM生成真实DOM挂载到真实页面上

const nodeOps = {
    // createElement 不同的平台创建元素方式不同
    createElement: tagName => document.createElement(tagName),
    remove: child => {
        const parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    insert: (child, paraent, anchor = null) => {
        paraent.insertBefore(child, anchor); //如果参照物为空 则相当于appendChild
    },
    querySelector: selector => document.querySelector(selector),
    setElementText: (el, text) => el.textContent = text,
    createText: text => document.createTextNode(text)
};

const patchAttr = (el, key, value) => {
    if (value == null) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, value);
    }
};

const patchClass = (el, value) => {
    if (value == null) {
        value = '';
    }
    el.className = value;
};

const patchEvent = (el, key, value) => {
    //对函数的缓存
    const invokers = el._vei || (el._vei = {});
    const exists = invokers[key];
    if (value && exists) { //需要绑定事件 而且还存在的情况下
        exists.value = value;
    }
    else {
        const eventName = key.slice(2).toLowerCase();
        if (value) { //要绑定的事件 以前没有绑定过
            const invoker = invokers[key] = createInvoker(value);
            el.addEventListener(eventName, invoker);
        }
        else { //以前绑定了 当时没有value
            el.removeEventListener(eventName, exists);
            invokers[key] = undefined;
        }
    }
};
function createInvoker(value) {
    const invoker = (e) => {
        invoker.value(e);
    };
    invoker.value = value; //为了能随时更改value
    return invoker;
}
//一个元素绑定事件 addEventListener

const patchStyle = (el, prev, next) => {
    const style = el.style; //获取样式
    if (next == null) {
        el.removeAttribute('style');
    }
    else {
        //老的有 新的没有
        if (prev) {
            for (const key in prev) {
                if (next[key] == null) {
                    style[key] = '';
                }
            }
        }
        //新的里面需要赋值到style
        for (const key in next) {
            style[key] = next[key];
        }
    }
};

//这里面是针对属性操作，一系列的属性操作
const patchProp = (el, key, prevValue, nextValue) => {
    switch (key) {
        case 'class':
            patchClass(el, nextValue);
            break;
        case 'style':
            patchStyle(el, prevValue, nextValue);
            break;
        default:
            // 如果不是事件才是属性
            if (/^on[^a-z]/.test(key)) {
                patchEvent(el, key, nextValue); //事件就是添加 删除 修改
            }
            else {
                patchAttr(el, key, nextValue);
            }
            break;
    }
};

// runtime-dom 核心就是 提供domAPI方法
//节点操作就是增删改查
//属性操作 添加 删除 更新 （样式 类 事件 其他属性）
//渲染时用到的所有方法
extend({ patchProp }, nodeOps);
//用户调用的是runtime-dom -> runtime-core
//runtime-dom 是为了解决平台差异（浏览器的）
//vue中 runtime-core 提供了核心的用法 用来处理渲染的， 他会使用 runtime-dom中的api进行渲染
function createApp(rootComponent, rootProps = null) {
    const app = createRenderer().createApp(rootComponent, rootProps);
    const { mount } = app;
    app.mount = function (container) {
        //清空容器的操作
        container = nodeOps.querySelector(container);
        container.innerHTML = '';
        mount(container);
        //将组价 渲染成dom元素 进行挂载
    };
    return app;
}

export { createApp };
