
    new(beard.Client)()
      .get('http://whatever.com')
      .done(function(data) {
        console.log('yay! status:' + this.statusCode)
      })
      .fail(function(error) {
        console.log(error)
      })

    var client = new beard.Client()
    client.download('http://barackobama.com/birth_certificate.txt')
    client.fail(function(error) {
      console.log('ಠ_ಠ')
    })
    client.done(function(cert) {
      inspectForAuthenticity(cert)
    })
    client.always(function() {
      vote()
    })

