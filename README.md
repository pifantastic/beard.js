
    // Sexy shortand.
    beard()
      .get('http://whatever.com')
      .done(function(data) {
        console.log('yay! status:' + this.statusCode)
      })
      .fail(function(error) {
        console.log(error)
      })

    // More explicit.
    var client = new beard.Client()
    var request = client.download('http://barackobama.com/birth_certificate.txt')
    request.fail(function(error) {
      console.log('ಠ_ಠ')
    })
    request.done(function(cert) {
      inspectForAuthenticity(cert)
    })
    request.always(vote)

    beard()
      .post('http://github.com/login', { username: 'torvalds', password: 'micro$soft' })
      .done(function() {
        shell('rm -rf microsoft/windows-8')
      })
      .fail(function() {
        shell('rm -rf microsoft/windows-me')
      })
      .always(function() {
        shrug()
      })


