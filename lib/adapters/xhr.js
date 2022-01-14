'use strict'

var utils = require('./../utils')
var settle = require('./../core/settle')
var cookies = require('./../helpers/cookies')
var buildURL = require('./../helpers/buildURL')
var buildFullPath = require('../core/buildFullPath')
var parseHeaders = require('./../helpers/parseHeaders')
var isURLSameOrigin = require('./../helpers/isURLSameOrigin')
var createError = require('../core/createError')

module.exports = function xhrAdapter(config) {
    return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data
        var requestHeaders = config.headers

        // 如果data是FormData形式，删除header的contentType，由浏览器自己设置
        if (utils.isFormData(requestData)) {
            delete requestHeaders['Content-Type']
        }

        var request = new XMLHttpRequest()

        // 处理auth
        if (config.auth) {
            var username = config.auth.username || ''
            var password = config.auth.password
                ? unescape(encodeURIComponent(config.auth.password))
                : ''
            requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password)
        }

        // 构建全路径
        // 1.如果不存在baseURL，直接返回config.url
        // 2.存在baseURL但config.url是绝对路径，直接返回config.url
        // 3.存在baseURL同时config.url是相对路径，进行拼接
        // 4.不存在baseURL同时config.url是相对路径，直接返回config.url
        var fullPath = buildFullPath(config.baseURL, config.url)

        request.open(
            config.method.toUpperCase(),
            // 将查询参数拼接到fullPath后
            buildURL(fullPath, config.params, config.paramsSerializer),
            true
        )

        request.timeout = config.timeout

        // 主要是响应成功的处理
        request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
                return
            }

            if (
                request.status === 0 &&
                !(request.responseURL && request.responseURL.indexOf('file:') === 0)
            ) {
                return
            }

            // 以下是readyState等于4同时不是file协议的情况下对响应进行操作

            // 获取响应头
            var responseHeaders =
                'getAllResponseHeaders' in request
                    ? parseHeaders(request.getAllResponseHeaders())
                    : null

            // 获取响应数据
            var responseData =
                !config.responseType || config.responseType === 'text'
                    ? request.responseText
                    : request.response

            // 构建响应结果
            var response = {
                headers: responseHeaders,
                data: responseData,
                status: request.status,
                statusText: request.statusText,
                config: config,
                request: request,
            }

            // 最后根据http status处理
            settle(resolve, reject, response)

            request = null
        }

        // 注册失败的回调
        request.onabort = function handleAbort() {
            if (!request) {
                return
            }

            reject(createError('Request aborted', config, 'ECONNABORTED', request))

            // Clean up request
            request = null
        }
        request.onerror = function handleError() {
            reject(createError('Network Error', config, null, request))

            request = null
        }
        request.ontimeout = function handleTimeout() {
            var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded'
            if (config.timeoutErrorMessage) {
                timeoutErrorMessage = config.timeoutErrorMessage
            }
            reject(createError(timeoutErrorMessage, config, 'ECONNABORTED', request))

            request = null
        }

        /*
         * 在标准浏览器中，携带cookie
         */
        if (utils.isStandardBrowserEnv()) {
            var xsrfValue =
                (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName
                    ? cookies.read(config.xsrfCookieName)
                    : undefined

            if (xsrfValue) {
                requestHeaders[config.xsrfHeaderName] = xsrfValue
            }
        }

        if ('setRequestHeader' in request) {
            utils.forEach(requestHeaders, function setRequestHeader(val, key) {
                if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
                    delete requestHeaders[key]
                } else {
                    request.setRequestHeader(key, val)
                }
            })
        }

        if (!utils.isUndefined(config.withCredentials)) {
            request.withCredentials = !!config.withCredentials
        }

        if (config.responseType) {
            try {
                request.responseType = config.responseType
            } catch (e) {
                if (config.responseType !== 'json') {
                    throw e
                }
            }
        }

        if (typeof config.onDownloadProgress === 'function') {
            request.addEventListener('progress', config.onDownloadProgress)
        }

        if (typeof config.onUploadProgress === 'function' && request.upload) {
            request.upload.addEventListener('progress', config.onUploadProgress)
        }

        if (config.cancelToken) {
            config.cancelToken.promise.then(function onCanceled(cancel) {
                if (!request) {
                    return
                }

                request.abort()
                reject(cancel)
                // Clean up request
                request = null
            })
        }

        if (!requestData) {
            requestData = null
        }

        // Send the request
        request.send(requestData)
    })
}
