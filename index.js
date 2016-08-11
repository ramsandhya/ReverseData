var express = require('express');

var app = express();

app.set('port', (process.env.PORT || 3000));
// app.use(express.static(__dirname + '/ReverseData'));
app.use(express.static('public'));

app.get('/', function(request, response) {
  response.render('criteria.html', {
    title: 'Hello',
    name: 'world!'
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
