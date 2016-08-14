var express = require('express');
var mongoose = require('mongoose');
var Promise = require('bluebird');
mongoose.Promise = Promise;
var bodyParser = require('body-parser');
var randtoken = require('rand-token');
var bcrypt = Promise.promisifyAll(require('bcrypt'));

var app = express();

app.use(bodyParser.json());

app.set('port', (process.env.PORT || 3000));
// app.use(express.static(__dirname + '/ReverseData'));
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI);

var User = mongoose.model('User', {
  _id: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  authenticationTokens: [{ token: String, expiration: Date }]
});

var Criteria = mongoose.model('Criteria',{
  criteriaName: { type: String, required: true },
  objectApiName: { type: String, required: true },
  industryType: { type: String, required: true },
  amountFrom: { type: Number, required: true },
  amountTo: { type: Number, required: true },
  dataCreatedDateFrom: { type: Date, required: true },
  dataCreatedDateTo: { type: Date, required: true },
  opportunityCloseRangeFrom: { type: Number, required: true },
  opportunityCloseRangeTo: { type: Number, required: true },
  numberOfRecords: { type: Number, required: true },
  chartType: { type: String, required: true }

});

var Opportunity = mongoose.model('Opportunity', {
  amountTo: { type: Number, required: true },
  numberOfRecords: { type: Number }
});

// handle signups
app.post('/register', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;
  bcrypt.hashAsync(password, 10)
    .then(function(encryptedPassword) {
      return [encryptedPassword, User.findOne({ _id: username })];
    })
    .spread(function(encryptedPassword, user) {
      if (!user) {
        // create user
        return User.create({
          _id: username,
          password: encryptedPassword,
          email: email
        });
      } else {
        // user already exists, throw error with 409 status code
        var error = new Error("Username is taken!");
        error.statusCode = 409;
        throw error;
      }
    })
    .then(function() {
      //successfully created user, respond with ok
      res.status(200).json({ "status": "ok" });
    })
    .catch(function(err) {
      if (!err.statusCode) {
        err.statusCode = 400;
      }
      res.status(err.statusCode).json({ "status": "fail", "message": err.message });
    });
});

// handle login
app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  // find user in database
  User.findOne({ _id: username })
    .then(function(user) {
      // if user isn't found
      if (!user) {
        throw new Error("User not found");
      } else {
        // compare submitted password with encrypted password in database
        return [user, bcrypt.compareAsync(password, user.password)];
      }
    })
    .spread(function(user, matched) {
      // return token in response body
      if (matched) {
        var token = randtoken.generate(64);
        // set token to expire in 10 days and push to authenticationTokens array
        user.authenticationTokens.push({ token: token, expiration:  Date.now() + 1000 * 60 * 60 * 24 * 10 });
        // save user's new token
        /*
          changing to return user.save() which will go to the next .then()
          throw error which will be caught by .catch() if incorrect password
        */
        return [token, user.save()];
      } else {
        // incorrect password, throw error
        throw new Error("Incorrect password!");
      }
    })
    .spread(function(token) {
      res.status(200).json({ "status": "ok", "token": token });
    })
    .catch(function(err) {
      res.status(400).json({ "status": "fail", "message": err.message });
    });
});


app.post('/createCriteria',function(req, res){
  var criteriaName = req.body.criteriaName;
  var objectApiName = req.body.objectApiName;
  var industryType = req.body.industryType;
  var amountFrom = req.body.amountFrom;
  var amountTo = req.body.amountTo;
  var dataCreatedDateFrom = req.body.dataCreatedDateFrom;
  var dataCreatedDateTo = req.body.dataCreatedDateTo;
  var opportunityCloseRangeFrom = req.body.opportunityCloseRangeFrom;
  var opportunityCloseRangeTo = req.body.opportunityCloseRangeTo;
  var numberOfRecords = req.body.numberOfRecords;
  var chartType = req.body.chartType;


  // console.log(criteriaName, objectApiName);

  Criteria.create({
    criteriaName: criteriaName,
    objectApiName: objectApiName,
    industryType: industryType,
    amountFrom: amountFrom,
    amountTo: amountTo,
    dataCreatedDateFrom: dataCreatedDateFrom,
    dataCreatedDateTo: dataCreatedDateTo,
    opportunityCloseRangeFrom: opportunityCloseRangeFrom,
    opportunityCloseRangeTo: opportunityCloseRangeTo,
    numberOfRecords: numberOfRecords,
    chartType: chartType
  })
  .then(function(criteria){
    console.log(criteria);
    return res.json({status: "OK", criteria: criteria});
  })
  .catch(function(err){
    console.log(err);
    res.json({ "status": "fail", "message": err.message });
  });
});

app.get('/fetchData', function(req, res){
  Criteria.find()
  .then(function(criteria){
    return res.json({status: "OK", criteria: criteria});
  })
  .catch(function(err){
    res.json({ "status": "fail", "message": err.message });
  })
});

app.post('/generate', function(req, res){
  var criteriaId = req.body.criteriaId;
  console.log(criteriaId);
  Criteria.findOne({_id: criteriaId})
    .then(function(criteria){
      if(!criteria){
        throw new Error("Criteria not found");
      } else {
        Opportunity.remove({})
        .then(function (){
          var list = [];
          var diff = criteria.amountTo - criteria.amountFrom;
          var increment = diff / criteria.numberOfRecords;
          for (var i = 0; i < criteria.numberOfRecords; i++){
            if (criteria.chartType === "Linear") {
              criteria.amountFrom += increment;
              list.push({
                amountTo: criteria.amountFrom
              });
            }
          }
          Opportunity.create(list)
          .then(function(results) {
            return res.json({status: "OK", result: results})
          })
          .catch(function(err) {
            console.log(err);
            return res.json({status: "fail", "message": err.message});
          });
        })
        .catch(function(err) {
          console.log(err);
          return res.json({status: "fail", "message": err.message});
        });
      }
    })
    .catch(function(err) {
      console.log(err);
      return res.json({status: "fail", "message": err.message});
    });
});


// app.get('/', function(request, response) {
//   response.render('criteria.html', {
//     title: 'Hello',
//     name: 'world!'
//   });
// });

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
