export const isObject = (val) => val !== null && typeof val === 'object'
export const extend = Object.assign
export const isArray = Array.isArray
export const hasChanged = (oldVal, val) => oldVal !== val
export const isFunction = (val) => typeof val === 'function'
export const isInteger = (key) => parseInt(key) + '' === key
export const isString = (val) => typeof val === 'string'
export const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target,key)



export *  from './shapeFlag'