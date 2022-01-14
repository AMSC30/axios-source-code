'use strict'

var utils = require('./../utils')
var transformData = require('./transformData')
var isCancel = require('../cancel/isCancel')
var defaults = require('../defaults')

function throwIfCancellationRequested(config) {
    if (config.cancelToken) {
        config.cancelToken.throwIfRequested()
    }
}

module.exports = function dispatchRequest(config) {
    throwIfCancellationRequested(config)

    config.headers = config.headers || {}

    // 如果data是formdata或者file或者blob，直接返回data

    // 如果URLSearchParams对象，设置contentType为application/x-www-form-urlencoded;charset=utf-8，返回toString结果

    // 如果是json对象，设置contentType为application/json;charset=utf-8，返回stringify结果
    config.data = transformData(config.data, config.headers, config.transformRequest)

    config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
    )

    utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
            delete config.headers[method]
        }
    )

    var adapter = config.adapter || defaults.adapter

    return adapter(config).then(
        function onAdapterResolution(response) {
            throwIfCancellationRequested(config)

            // 如果是字符串，尝试转换为对象
            response.data = transformData(response.data, response.headers, config.transformResponse)

            return response
        },
        function onAdapterRejection(reason) {
            if (!isCancel(reason)) {
                throwIfCancellationRequested(config)

                if (reason && reason.response) {
                    reason.response.data = transformData(
                        reason.response.data,
                        reason.response.headers,
                        config.transformResponse
                    )
                }
            }

            return Promise.reject(reason)
        }
    )
}
