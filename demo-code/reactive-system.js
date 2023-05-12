const originData = {
  color: '#FFFFFF',
}

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
function clearup(effectFn) {
  for(let i = 0; i < effectFn.deps.length; i++){
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
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

effect(
  () => console.log(`color change${new Date()}`)
)
// 从非响应数据data生成响应式数据reactiveData
const reactiveData = new Proxy(originData, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    trigger(target, key)
  }
})


setTimeout(() => {originData.color = '#a1b6c3'}, 1000)
setTimeout(() => {console.log(reactiveData,'reactiveData',originData)}, 1000)
setTimeout(() => {originData.color = '#ab1111'}, 1000)
setTimeout(() => {originData.color = '#ab1111'}, 1000)