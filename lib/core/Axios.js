'use strict'

var utils = require('./../utils')
var buildURL = require('../helpers/buildURL')
var InterceptorManager = require('./InterceptorManager')
var dispatchRequest = require('./dispatchRequest')
var mergeConfig = require('./mergeConfig')

// 定义构造函数，实例中保存传入的配置和拦截器列表
function Axios(instanceConfig) {
    this.defaults = instanceConfig
    this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager(),
    }
}

Axios.prototype.request = function request(config) {
    if (typeof config === 'string') {
        config = arguments[1] || {}
        config.url = arguments[0]
    } else {
        config = config || {}
    }

    config = mergeConfig(this.defaults, config)

    if (config.method) {
        config.method = config.method.toLowerCase()
    } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase()
    } else {
        config.method = 'get'
    }

    var chain = [dispatchRequest, undefined]
    var promise = Promise.resolve(config)

    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected)
    })

    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected)
    })

    while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift())
    }

    return promise
}

Axios.prototype.getUri = function getUri(config) {
    config = mergeConfig(this.defaults, config)
    return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '')
}

utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
    Axios.prototype[method] = function (url, config) {
        return this.request(
            mergeConfig(config || {}, {
                method: method,
                url: url,
                data: (config || {}).data,
            })
        )
    }
})

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
    Axios.prototype[method] = function (url, data, config) {
        return this.request(
            mergeConfig(config || {}, {
                method: method,
                url: url,
                data: data,
            })
        )
    }
})

module.exports = Axios
