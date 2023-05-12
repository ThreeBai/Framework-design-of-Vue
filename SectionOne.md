<a id='chapter_one'></a> 

## Chapter 1 权衡之术

### 1.1 命令式<=>声明式 && 性能<=>可维护性
从范式来说，框架设计有命令式与声明式两种
```
// 这是命令式，关注过程
const div = document.querySelector('#app')
div.innterText = 'HelloWorld'
div.addEventListener('click', () => { alert('ok') })
// 以vue为例，这是声明式，更关注结果
<div @click = "() => alert('ok')">HelloWorld</div>
```
vue内部通过命令式来实现，暴露给用户的是声明式。命令式的性能>=声明式，但声明式提升了可维护性，体现在框架设计上则是**性能与可维护性**之间的权衡。
命令式与声明式关于性能的计算原理如下： 命令式明确知道变更项，声明式需要在命令式的基础上多出了找变更项的性能消耗，即**声明式性能消耗 = 找出变更所需的性能 + 命令式性能**。当**找出变更所需的性能**越小时，声明式的性能消耗越低，虚拟DOM由此诞生。

### 1.2 运行时<=>编译时<=>运行时+编译时
| | 运行时 | 编译时 | 运行时+编译时|
|---| ---| --- | ---|
| 函数设计| 定义一个render函数，为其提供一个树形结构的数据，render会递归将其渲染成DOM| 定义一个complier函数，为其提供HTML字符串，complier直接将其编译成命令式代码| 定义compiler+render，为其提供HTML字符串，comp负责将其编译成树形结构数据，render负责将树形数据渲染为DOM|
|特点| 无法分析用户提供的内容| 直接编译性能更好，但灵活性相对差一些，提供的内容必须编译才能使用（例：Svelte）| 可在编译时提取内容并分析，renderk用于进一步优化|

## Chapter 2 框架设计核心要素

### 2.1 用户的开发体验
提供友好的警告信息： 核心代码为`console.warn()`函数

### 2.2 框架代码的体积
以vue3源码为例： 调用`warn`函数时通过常量`__DEV__`对当前环境进行检查，这个产量是通过*rollup.js*的插件进行配置的，用于判断当前环境是否为开发环境，如果不是开发环境，则不执行`warn`函数，从而实现**在开发环境中为用户提供友好警告，又不会增加生产环境的代码**

### 2.3 Tree-Shaking
Tree-Shaking定义: 消除那些永远不会被执行的代码
Tree-Shaking依赖： ESM(ES Module)静态结构
<a id='effect'></a> 

副作用： 调用函数时对外部产生影响，如修改了全局变量。通常产生副作用的代码都是**模块内函数的*顶级调用***
如何识别dead code:js本身是动态语言，静态分析dead code有难度，像rollup.js这类工具中，都会提供标识机制**注释代码**。
注释代码： `/*#__PURE__#/`用于告诉rollup，某段代码不会产生副作用，可对其进行Tree-Shaking

### 2.4 框架输出的构建产物
构建产物的类型是基于使用者的需求的： 
- 在`<script src="/pathto/vue.js">`标签中直接引入并使用时： 需要生成IIFE格式的资源
- 在`<script type="module" src="/pathto/vue.esm-browser.js">`标签中以ESM格式资源引入时： 需要生成ESM格式的资源
- 在node.js中引用时`const Vue = require('vue')`：需要生成CommonJS格式的资源

特殊说明： 可通过在rollup.config.js中配置输出的format来实现输出不同格式的资源（'iife'、'esm'、'cjs'）;其中vue的'esm'格式会输出两个文件**vue.esm-browser.js**和**vue.esm-bundler.js**,前者带有-brower字样用于`<script>`标签，直接使用`__DEV__`控制使用环境，后者带有-bundler字样提供给打包工具，此时无法直接设置`__DEV__`，此包会将此常量替换成`process.env.NODE_ENV !== 'production'`语句。

### 2.5 特性开关
特性开关的作用： 
1. 用户关闭的特性，可直接使用Tree-Shaking将其从最中资源中优化出去。
2. 通过特性开关可为框架添加新的特性，或用来支持遗留API

特性开关的实现原理： 与`__DEV__`一致，基于rollup的预定义常量插件来实现。例如vue3中的`__VUE__OPTIONS_API__`,可用于是否关闭选项式API。

### 2.6 错误处理
vue之callWithErrorHandling: 此函数封装了统一的错误处理程序，用户无需自己使用`try{}catch()`对每个函数进行错误处理。
vue之errorHandler: vue暴露给用户的错误处理函数，内部调用callWithErrorHandling，将获取到错误信息传递给用户，由用户自行决定如何处理该错误

### 2.7 TypeScript类型支持

使用TS编写框架和对TS类型支持友好是两码事。可通过vue源码中的runtime-core/src/apiDefineComponents.ts窥见一斑，整个文件在浏览器中运行的代码仅有三行，但全部代码接近200行，这些代码都是在为类型支持而服务。此处以ts为例，说明了实现完善的类型支持友好并不是想象中那么容易。

## Chanpter 3 Vue.js3的设计思路

### 3.1 声明式地描述UI

在vue.js中，支持使用手写虚拟DOM和使用模板来描述UI，这两种方法都属于声明式地描述UI，根据这两种方法引出vue的**编译器**和**渲染器**两个核心组成部分。

### 3.2 手写虚拟DOM

虚拟DOM的本质：用来描述真实DOM的一个javascript对象。
以下为一个手写渲染函数实例👇
```javascript
// 不使用h函数
export default {
  render() {
    return {
      tag: 'h1',
      props: { onClick : handler },
      children: 'click me'
    }
  }
 }
// 使用h函数
import { h } from 'vue'
export default {
  render() {
    return h('h1', { onClick : handler }, 'click me')
  }
}
// 使用jsx-需要babel插件支持
export default {
  render() {
    return (
      <h1 onClick={handler}>click me</h1>
    )
  }
 }
```
h()函数的本质： 用于创建虚拟节点（VNode），而无数个VNode组成的整个树就是虚拟DOM
render函数：是vue暴露给用户的一个函数，需要返回一个js对象，vue.js根据此函数获取到虚拟DOM。在Babel插件的支持下，返回也可使用jsx语法。
渲染器（renderer）：用于将上述拿到的虚拟DOM渲染为真实DOM。
渲染器实现思路（极简）： 
   step 1 创建元素：如果是字符串，则直接使用tag作为标签名称创建DOM元素；如果是其他类型如对象或函数等，则说明是个组件（组件的表达方式有很多），调用其他方法进行渲染。
   step 2 为元素添加属性与事件： 遍历props对象，正则匹配生成对应属性或事件
   step 3 处理children: 如果是字符串，则直接添加到文本节点中；如果是数组，则递归调用renderer

### 3.3 使用模板

以下是一个最简单的使用模板的例子👇
```html
<div @click="handler">
  click me
</div>
```
编译器：以.vue文件为例，编译器会**将模板内容编译为渲染函数**，并添加到`<script>`标签块的组件对象上。
```
// .vue文件如下
<templete>
  <div @click="handler">
    click me
  </div>
</templete>
<script>
  export default {}
</script>
```
```javascript
// 经编译器编译后在浏览器中运行的代码如下
export default {
  render() {
    return return h('h1', { onClick : handler }, 'click me')
  }
}
```

### 3.4 编译器与渲染器之间的信息流

在[Chapter 1](#chapter_one)中我们知道声明式编程需要找出变更所在点，这样渲染器才能够去变更对应的内容，但对渲染器来说，”亲自“去寻找这写变更点并不是那么容易。如果编译器能够分析动态内容，在编译阶段将这些信息提取出来，直接交给渲染器，那渲染器就能够省去寻找变更点的工作量，性能自然就提升了。
在vue的设计中，编译器是能够识别动态属性与静态属性的，然后以虚拟DOM作为一个媒介，将编译器识别到的信息传递到渲染器。虚拟DOM因此会包含多种数据字段。

## Chapter 4 响应系统的作用与实现

### 4.1 响应式系统的基本实现

在本章开始之前，我们先了解一下以下几个概念👇
副作用函数：顾名思义，副作用函数即调用时会产生[副作用](#effect)的函数
响应式数据：以一个对象为例，如果对象中的某个属性更改后，与之相关的副作用函数能够随之执行，则称这个数据为响应式数据

```javascript
// 此处的obj还是一个普通对象，不具备响应性
// 函数effect是一个副作用函数
const obj ={ text: 'hello world'}
function effect() {
  document.body.innerText = obj.text
}
```

响应式实现的核心：拦截到对数据的**读取**操作，收集相关的副作用函数；拦截**设置**操作，触发副作用函数重新执行。在vue2中通过`Object.defineProperty`来实现，在vue3中则是使用代理对象`Proxy`来实现的。

```javascript
// 定义存放副作用函数的bucket
const bucket = new WeakMap()
// track函数，拦截了数据读取，将副作用收集到bucket中
function track(target, key) {
  if(!activeEffect) return 
  let depsMap = bucket.get(target)
  if(!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = dapsMap.get(key)
  if(!deps) {
    despsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
  // 将依赖集合放到当前激活函数的deps属性中，这样当前激活函数就能自己管理依赖集合
  activeEffect.deps.push(deps)
}
// trigger函数，拦截了数据设置，出发副作用函数重新执行
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if(!depsMap) return 
  const effects = depsMap.get(key)
  // 防止遍历执行函数时，由于clearup先执行track后执行导致的无限遍历。
  const effectsToRun = new Set(effects)
  effectsToRun && effectsToRun.forEach(fn => fn())
}
//定义一个全局变量用于存储被注册的副作用函数，effect函数用于注册副作用函数，将副作用函数赋给全局变量activeEffect.
let activeEffect
function effect(fn) {
  const effectFn = () => {
    clearup(effectFn)
    activeEffect = effectFn
    fn()
  }
  effectFn.deps = []
  effectFn()
}
function clearup(effectFn) {
  for(let i = 0; i < effectFn.deps.length; i++){
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}
effect(
  () => document.body.innerText = obj.text
)
// 从非响应数据data生成响应式数据obj
const obj = new Proxy(data, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    trigger(target, key)
  }
})
```
在以上这个响应式系统demo设计中涉及到一些细节点如下：
1. 变量说明： target→被代理的原始对象  key→被操作的字段名  effectFn→副作用函数
2. 事实上，bucket中保存的不只是副作用函数，而是一棵数据树，数据树中保存了相应数据与副作用函数的关系，具体结构如下图![bucket](/assets/bucket.png)
3. bucket的数据类型是**weakmap**，由于weakmap的key是弱引用，当用户侧不再对key有任何引用时，可被垃圾回收器回收，从而避免内存溢出。
4. 注册副作用函数的effect的设计点1：用于将副作用函数赋给全局变量，传参使得副作用函数的形式不必局限于命名函数，即使是匿名函数也能够被赋给activeEffect
5. effect的设计点2： 注册时添加一个deps属性，值是一个数组用来存储所有包含了当前函数的依赖集合（这里保存的是内存地址），用于在每次函数执行前都将该函数从依赖集合中删除，从而避免出现遗留的副作用函数引起不必要的函数调用。
6. effect的设计点3：清除函数首先将每个依赖集合中的该函数删除，然后将保存了依赖集合内存地址的deps清空。
7. 
