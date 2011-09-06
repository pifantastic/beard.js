
var http = require('http')
  , https = require('https')
  , url = require('url')
  , querystring = require('querystring')
  , _ = require('underscore')

var Client = function Client(opts) {
  var defaults = {
    followRedirects: true,
    timeout: 60,
    encoding: 'utf-8',
    maxRedirects: 30
  }

  this.options = _.extend(defaults, opts)
  this.cookieJar = []
}

Client.prototype = {

  option: function(option, value) {
    if (arguments.length == 2) {
      this.options[option] = value
      return this
    }

    return (option in this.options) ? this.options[option] : undefined
  },

  post: function(url, data, options) {
    data = querystring.stringify(data || {})

    var promise = new Promise()

    this._request('POST', url, data, options, function(err, data, response) {
      if (err)
        promise.rejectWith(response, err)
      else
        promise.resolveWith(response, data)
    })

    return promise
  },

  get: function(url, data, options) {
    if (!_.isEmpty(data))
      url = this._mergeUrl(url, data)

    var promise = new Promise()

    this._request('GET', url, null, options, function(err, data, response) {
      if (err)
        promise.rejectWith(response, err)
      else
        promise.resolveWith(response, data)
    })

    return promise
  },

  json: function(url, data, options) {
    if (!_.isEmpty(data))
      url = this._mergeUrl(url, data)

    var promise = new Promise()

    promise.filterDone(function(data) {
      try {
        return JSON.parse(data)
      }
      catch (e) {
        return data
      }
    })

    this._request('GET', url, null, options, function(err, data, response) {
      if (err)
        promise.rejectWith(response, err)
      else
        promise.resolveWith(response, data)
    })

    return promise
  },

  download: function(url, data, options) {
    options = _.extend(options || {}, { encoding: 'binary' })
    return this.get(url, data, options)
  },

  request: function(type, url, data, options) {
    if (type.toLowerCase() === 'GET')
      return this.get(url, data, options)
    else if (type.toLowerCase() === 'POST')
      return this.post(url, data, options)
    else
      throw Error('Type must be either GET or POST')
  },

  _request: function(type, uri, data, opts, callback) {
    var self = this
      , rxdata = ''
      , client = http.request
      , opts = opts || {}

    opts._numRedirects = opts._numRedirects || 0

    uri = url.parse(uri)

    var options = {
      host: uri.hostname,
      port: uri.port || 80,
      path: uri.pathname + (uri.search || ''),
      method: type.toUpperCase(),
      headers: this.cookieJar.length ? { 'Cookie': this.cookieJar.join('; ') } : {}
    }

    options = _.extend(options, this.options, opts)

    if (options.method === 'POST')
      options.headers['Content-Length'] = data.length

    if (uri.protocol === 'https:') {
      options.port = 443
      client = https.request
    }

    var request = client(options, function(res) {
      if (options.encoding)
        res.setEncoding(options.encoding)

      if ('set-cookie' in res.headers) {
        self.cookieJar = []
        res.headers['set-cookie'].forEach(function(cookie) {
          var parts = cookie.split(/[;,] */)
          self.cookieJar.push(parts[0].trim())
        })
      }

      if (('location' in res.headers) && self.options.followRedirects && opts._numRedirects < self.options.maxRedirects) {
        opts._numRedirects++
        var newUrl = url.resolve(uri.href, res.headers['location'])
        return self._request('GET', newUrl, null, opts, callback)
      }

      res.on('data', function(chunk) {
        rxdata += chunk
      }).on('end', function() {
        callback(null, rxdata, res)
      })
    })

    request.on('error', function(err) {
      callback(err, null, {})
    })

    if (data)
      request.write(data)

    request.end()
  },

  _mergeUrl: function(mergeUrl, data) {
    var parsed = url.parse(mergeUrl, true)
    data = _.extend(data || {}, parsed.query)
    parsed.query = querystring.stringify(data)
    parsed.search = '?' + parsed.query
    return url.format(parsed)
  }
}

var Promise = function Promise() {
  this.init()
}

Promise.prototype = {

  init: function() {
    this.resolved = false
    this.rejected = false

    this._callbackArgs = []
    this._callbackContext = {}
    this._done = []
    this._fail = []
    this._always = []
    this._doneFilter = function(v) { return v }
    this._failFilter = function(v) { return v }
  },

  filter: function(done, fail) {
    this._doneFilter = done || this._doneFilter
    this._failFilter = fail || this._failFilter
    return this
  },

  filterDone: function(cb) {
    return this.filter(cb, null)
  },

  filterFail: function(cb) {
    return this.filter(null, cb)
  },

  done: function(cb) {
    if (this.resolved)
      cb.apply(this._callbackContext, this._callbackArgs)
    else
      this._done.push(cb)

    return this
  },

  fail: function(cb) {
    if (this.rejected)
      cb.apply(this._callbackContext, this._callbackArgs)
    else
      this._fail.push(cb)

    return this
  },

  always: function(cb) {
    if (this.resolved || this.rejected)
      cb.apply(this._callbackContext, this._callbackArgs)
    else
      this._always.push(cb)

    return this
  },

  resolve: function() {
    return this.resolveWith.apply(this, _.toArray(arguments))
  },

  reject: function() {
    return this.rejectWith.apply(this, _.toArray(arguments))
  },

  resolveWith: function(context) {
    var self = this

    if (this.resolved || this.rejected)
      return

    this.resolved = true
    this._callbackArgs = _.map(_.rest(arguments), this._doneFilter)
    this._callbackContext = context

    this._done.forEach(function(cb) {
      cb.apply(context, self._callbackArgs)
    })

    this._done = []

    this._runAlways()

    return this
  },

  rejectWith: function(context) {
    var self = this

    if (this.resolved || this.rejected)
      return

    this.rejected = true
    this._callbackArgs = _.map(_.rest(arguments), this._failFilter)
    this._callbackContext = context

    this._fail.forEach(function(cb) {
      cb.apply(context, self._callbackArgs)
    })

    this._fail = []

    this._runAlways()

    return this
  },

  _runAlways: function() {
    var self = this
    this._always.forEach(function(cb) {
      cb.apply(self._callbackContext, self._callbackArgs)
    })

    this._always = []
  },

  isResolved: function() {
    return this.resolved
  },

  isRejected: function() {
    return this.rejected
  }
}

var beard = function(opts) {
  return new Client(opts)
}

beard.Client = Client
beard.Promise = Promise

module.exports = beard
