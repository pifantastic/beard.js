var beard = require('../beard')
  , http = require('http')
  , vows = require('vows')
  , assert = require('assert')
  , qs = require('querystring')
  , fs = require('fs')
  , url = require('url')

var server = http.createServer(function(request, response) {
  if (request.url == '/test.txt') {
    var file = fs.readFileSync(__dirname +  '/test.txt')
    response.writeHead(200, {'Content-Type': 'text/plain'})
    response.end(file)
  }
  else if (request.method === 'GET') {
    var data = url.parse(request.url, { parse: true }).query
      , redirects = ('redirect' in data) ? parseInt(data.redirect) : 0

    if (redirects) {
      response.writeHead(302, { 'Location': '/?msg=Redirected&redirect=' + --redirects })
      response.end()
    }
    else {
      response.writeHead(200, {'Content-Type': 'text/plain'})
      response.end(data.msg || '')
    }
  }
  else if (request.method === 'POST') {
    var body = ''
    request.on('data', function (data) {
      body += data
    })
    request.on('end', function () {
      var msg = qs.parse(body).msg
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end(msg)
    })
  }
})

server.listen(1337, "127.0.0.1")

console.log('beard.js test server running at http://127.0.0.1:1337/')

vows.describe('beard.js').addBatch({
  'When getting a Hello World message from an echo server': {
    topic: function() {
      beard()
        .get('http://127.0.0.1:1337/?msg=Hello+World')
        .always(this.callback)
    },
    'we get Hello World': function(text) {
      assert.equal(text, 'Hello World')
    },
    'we get a status of 200': function() {
      assert.equal(this.statusCode, 200)
    }
  },
  'When receiving a redirect with followRedirects enabled': {
    topic: function() {
      beard()
        .get('http://127.0.0.1:1337/?redirect=1')
        .always(this.callback)
    },
    'we get a status of 200': function(wat) {
      assert.equal(this.statusCode, 200)
    },
    "we get a 'Redirected' message": function(text) {
      assert.equal(text, 'Redirected')
    }
  },
  'When receiving a redirect with followRedirects disabled': {
    topic: function() {
      beard()
        .option('followRedirects', false)
        .get('http://127.0.0.1:1337/?redirect=1')
        .always(this.callback)
    },
    'we get a status of 302': function() {
      assert.equal(this.statusCode, 302)
    }
  },
  'When receiving more than maxRedirects with followRedirects enabled': {
    topic: function() {
      beard()
        .option('maxRedirects', 1)
        .get('http://127.0.0.1:1337/?redirect=2')
        .always(this.callback)
    },
    'we get a status of 302': function() {
      assert.equal(this.statusCode, 302)
    }
  },
  'When downloading a Hello World text file': {
    topic: function () {
      beard()
        .download('http://127.0.0.1:1337/test.txt')
        .always(this.callback)
    },
    'we get Hello World': function(text) {
      assert.equal(text, 'Hello World')
    },
    'we get a status of 200': function() {
      assert.equal(this.statusCode, 200)
    }
  },
  'When fetching a malformed URL': {
    topic: function () {
      beard()
        .download('http://127.0.0.1:WTF/')
        .always(this.callback)
    },
    'we get a failure': function(err) {
      assert.equal(toString.call(err), '[object Error]')
    }
  },
  'When posting a Hello World message to an echo server': {
    topic: function () {
      beard()
        .post('http://127.0.0.1:1337/', { msg: 'Hello World' })
        .always(this.callback)
    },
    'we get Hello World': function(text) {
      assert.equal(text, 'Hello World')
    },
    'we get a status of 200': function() {
      assert.equal(this.statusCode, 200)
    }
  }
}).run({ error: false }, function() {
  server.close()
})
