var beard = require('../beard')
  , http = require('http')
  , vows = require('vows')
  , assert = require('assert')
  , qs = require('querystring')
  , fs = require('fs')

var server = http.createServer(function(request, response) {
  if (request.url == '/test.txt') {
    var file = fs.readFileSync(__dirname +  '/test.txt')
    response.writeHead(200, {'Content-Type': 'text/plain'})
    response.end(file)
  }
  else if (request.method === 'GET') {
    response.writeHead(200, {'Content-Type': 'text/plain'})
    response.end('Hello World\n')
  }
  else if (request.method === 'POST') {
    var body = ''
    request.on('data', function (data) {
      body += data
    });
    request.on('end', function () {
      var msg = qs.parse(body).msg
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end(msg)
    });
  }
})

server.listen(1337, "127.0.0.1")

console.log('beard.js test server running at http://127.0.0.1:1337/')

vows.describe('beard().get').addBatch({
  'When fetching a Hello World text response': {
    topic: function () {
      beard()
        .get('http://127.0.0.1:1337/')
        .always(this.callback)
    },
    'we get Hello World': function(text) {
      assert.equal(text, 'Hello World\n')
    },
    'we get a status of 200': function() {
      assert.equal(this.statusCode, 200)
    }
  }
}).run({ error: false })

vows.describe('beard().download').addBatch({
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
  }
}).run({ error: false })

vows.describe('beard().post').addBatch({
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
