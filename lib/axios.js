'use strict'

var utils = require('./utils')
var bind = require('./helpers/bind')
var Axios = require('./core/Axios')
var mergeConfig = require('./core/mergeConfig')
var defaults = require('./defaults')

function createInstance(defaultConfig) {
    var context = new Axios(defaultConfig)
    // 将axios上的实例方法request单独拿出来
    var instance = bind(Axios.prototype.request, context)

    // 扩展原型对象和实例上的方法到instance函数上，但执行时的上下文依旧是axios
    utils.extend(instance, Axios.prototype, context)
    utils.extend(instance, context)

    return instance
}

var axios = createInstance(defaults)

axios.Axios = Axios

axios.create = function create(instanceConfig) {
    return createInstance(mergeConfig(axios.defaults, instanceConfig))
}

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel')
axios.CancelToken = require('./cancel/CancelToken')
axios.isCancel = require('./cancel/isCancel')

// Expose all/spread
axios.all = function all(promises) {
    return Promise.all(promises)
}
axios.spread = require('./helpers/spread')

// Expose isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError')

module.exports = axios

// Allow use of default import syntax in TypeScript
module.exports.default = axios
