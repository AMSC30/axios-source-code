'use strict'

var utils = require('./../utils')

function encode(val) {
    return encodeURIComponent(val)
        .replace(/%3A/gi, ':')
        .replace(/%24/g, '$')
        .replace(/%2C/gi, ',')
        .replace(/%20/g, '+')
        .replace(/%5B/gi, '[')
        .replace(/%5D/gi, ']')
}

module.exports = function buildURL(url, params, paramsSerializer) {
    // params为对象形式，如果没有，直接返回url
    if (!params) {
        return url
    }

    var serializedParams
    // 如果config上配置了paramsSerializer函数，调用该函数处理查询参数
    if (paramsSerializer) {
        serializedParams = paramsSerializer(params)
    } else if (utils.isURLSearchParams(params)) {
        // 没有配置，判断params是不是一个URLSearchParams，如果是，返回其字符串
        serializedParams = params.toString()
    } else {
        // 传入了一个params普通对象，同时没有配置paramsSerializer，axios做默认处理
        var parts = []

        // 迭代每个属性
        utils.forEach(params, function serialize(val, key) {
            if (val === null || typeof val === 'undefined') {
                return
            }

            if (utils.isArray(val)) {
                key = key + '[]'
            } else {
                val = [val]
            }

            utils.forEach(val, function parseValue(v) {
                if (utils.isDate(v)) {
                    v = v.toISOString()
                } else if (utils.isObject(v)) {
                    v = JSON.stringify(v)
                }
                parts.push(encode(key) + '=' + encode(v))
            })
        })

        serializedParams = parts.join('&')
    }

    if (serializedParams) {
        var hashmarkIndex = url.indexOf('#')
        if (hashmarkIndex !== -1) {
            url = url.slice(0, hashmarkIndex)
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams
    }

    return url
}
