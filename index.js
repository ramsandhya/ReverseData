var express = require('express');
var mongoose = require('mongoose');
var Promise = require('bluebird');
mongoose.Promise = Promise;
var bodyParser = require('body-parser');
var randtoken = require('rand-token');
var bcrypt = Promise.promisifyAll(require('bcrypt'));
var sf = require('node-salesforce');

mongoose.connect(process.env.MONGODB_URI);
var SFDCConnection = mongoose.model('SFDCConnection',{
  accessToken: { type: String, required: true },
  instanceUrl: { type: String, required: true },
  userId: { type: String, required: true },
  orgId: { type: String, required: true }
});

var oauth2 = new sf.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  //
  // OAuth2 client information can be shared with multiple connections.
  //
  // loginUrl : 'https://test.salesforce.com',
  // clientId : '<your Salesforce OAuth2 client ID is here>',
  // clientSecret : '<your Salesforce OAuth2 client secret is here>',
  // redirectUri : '<callback URI is here>'
  clientId : process.env.CLIENT_ID,
  clientSecret : process.env.CLIENT_SECRET,
  redirectUri : process.env.REDIRECT_URI,
  response_type: 'code'
});

var app = express();

app.use(bodyParser.json());

app.set('port', (process.env.PORT || 3000));
// app.use(express.static(__dirname + '/ReverseData'));
app.use(express.static('public'));

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
  AccountId: { type: String, required: true },
  Amount: { type: Number, required: true },
  CloseDate: { type: Date, required: true },
  Name: { type: String, required: true },
  StageName: { type: String, required: true },
  CreatedDate: { type: Date, required: true },
  LastModifiedDate: { type: Date, required: true }
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

app.get('/editCriteria/:criteriaId', function(req, res){
  var criteriaId = req.params.criteriaId;
  console.log(criteriaId);
  Criteria.findOne({_id: criteriaId})
    .then(function(criteria){
      if(!criteria){
        throw new Error("Criteria not found");
      } else {
        return res.json({status: "OK", criteria: criteria});
      }
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
          // var diff = criteria.amountTo - criteria.amountFrom;
          // var increment = diff / criteria.numberOfRecords;
          var dateIncrement = (criteria.dataCreatedDateTo.getTime() - criteria.dataCreatedDateFrom.getTime())/criteria.numberOfRecords;
          // var amount = 0;
          var dateInMilliSeconds = 0;
          var randomCloseDaysInMilliSeconds = (Math.random() * (criteria.opportunityCloseRangeTo - criteria.opportunityCloseRangeFrom) + criteria.opportunityCloseRangeFrom)*24*60*60*1000;
          console.log("Begin generate");
          console.log(criteria.numberOfRecords);
          //Get the expression
          var expr = getExpression(criteria.chartType, [{x: 0, y: criteria.amountFrom},{x:criteria.numberOfRecords, y: criteria.amountTo}])
          for (var i = 0; i < criteria.numberOfRecords; i++){
            // if (criteria.chartType === "Linear") {
            //   console.log(criteria.chartType);
              //amount = getY(expr,i);
            //   console.log(criteria.amountFrom);
            // } else if (criteria.chartType === "exponential") {
            //   console.log(criteria.chartType);
            //   amount = (i === 0)? criteria.amountFrom : criteria.amountFrom +
            //    Math.pow(Math.E, i);
            //    console.log(criteria.amountFrom);
            //
            // }
              dateInMilliSeconds = (i === 0)? criteria.dataCreatedDateFrom.getTime() : dateInMilliSeconds + dateIncrement;
              list.push({
                AccountId: '00141000002gC3Q',
                Amount: getY(expr,i),
                CloseDate: new Date(dateInMilliSeconds + randomCloseDaysInMilliSeconds),
                Name: 'Opportunity Name ' + i,
                StageName: 'Closed/Won',
                CreatedDate: new Date(dateInMilliSeconds),
                LastModifiedDate: new Date(dateInMilliSeconds)
              });
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

// Code used from this link:
// https://www.npmjs.com/package/node-salesforce
//
// Get authz url and redirect to it.
//
function getExpression(type, coordinatesArray) {
	var x0 = coordinatesArray[0].x;
	var y0 = coordinatesArray[0].y;
	var x1 = coordinatesArray[1].x;
	var y1 = coordinatesArray[1].y;
	if (type == "Linear") {
		return {
			type: type,
			a: (y1 - y0)/x1,
			b: y0
		}
	} else if (type == "exponential") {
		return {
			type: type,
			a: (y1 - y0)/(Math.pow(Math.E,x1) -1),
			b: y0 - (y1 - y0)/(Math.pow(Math.E,x1) -1)
		}
	}
}

var getY = function (expr, x) {
	if(expr.type == "Linear") {
		return expr.a * x + expr.b;
	} else {
		return expr.a * Math.pow(Math.E, x) + expr.b;
	}
}

var createOpportunities = function (accessToken, instanceUrl) {
  var results = [];
  Opportunity.find({})
  .then(function(opportunityArray) {
    var myOpportunityArray = JSON.parse(JSON.stringify(opportunityArray));
    var conn = new sf.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken
     });
    myOpportunityArray.forEach(function(opportunity){ delete opportunity._id;  delete opportunity.__v; });
    // conn.sobject("Opportunity").find({
    //     AccountId: '00141000002gC3Q'
    //   })
    //   .destroy("Opportunity",function(err, ret) {
    //     if (err || !ret.success) { console.error(err, ret); }
        //console.log('Deleted Successfully : ' + ret.id);
        // var conn = new sf.Connection({
        //   instanceUrl: instanceUrl,
        //   accessToken: accessToken
        //  });
        conn.sobject("Opportunity").create(
            myOpportunityArray,
            function(err, resultData) {
            if (err) { return console.error(err); }
            for (var i=0; i < resultData.length; i++) {
              if (resultData[i].success) {
                console.log("Created record id : " + resultData[i].id);
              }
            }
            results = resultData;
          });
      // });
  });
  return results;
};

app.get('/push', function(req, res) {
  var accessToken;
  var instanceUrl;
  var results;
  SFDCConnection.findOne ({})
  .then(function(sfdcConn) {
    // if sfdcConn isn't found
    if (!sfdcConn) {
      var conn = new sf.Connection({ oauth2 : oauth2 });
      conn.login(process.env.SFDC_USERNAME, process.env.SFDC_PWD, function(err, userInfo) {
        if (err) { res.json({ "status": "fail", "message": err.message });
        } else {
          // compare submitted password with encrypted password in database
          accessToken = conn.accessToken;
          instanceUrl = conn.instanceUrl;

          SFDCConnection.create( {
            accessToken: conn.accessToken,
            refreshToken: conn.refreshToken,
            instanceUrl: conn.instanceUrl,
            userId: userInfo.id,
            orgId: userInfo.organizationId
          })
          .then(function(sfdcConn){
            results = createOpportunities(accessToken, instanceUrl);
          })
          .catch(function(err){
            console.log(err);
            res.json({ "status": "fail", "message": err.message });
          });
          res.json({status: "OK", result: results});
        }
      });
    } else {
      results = createOpportunities(sfdcConn.accessToken, sfdcConn.instanceUrl);
      res.json({status: "OK", result: results});
    }
  })
  .catch(function(err){
    console.log(err);
    res.json({ "status": "fail", "message": err.message });
  });

});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

// app.get('/oauth2/callback', function(req, res) {
//   var conn = new sf.Connection({ oauth2 : oauth2 });
//   var code = req.param('code');
//   conn.authorize(code, function(err, userInfo) {
//     if (err) { return console.error(err); }
//     // Now you can get the access token, refresh token, and instance URL information.
//     // Save them to establish connection next time.
//     console.log(conn.accessToken);
//     console.log(conn.refreshToken);
//     console.log(conn.instanceUrl);
//     console.log("User ID: " + userInfo.id);
//     console.log("Org ID: " + userInfo.organizationId);
//     // ...
//   });
// });

// app.get('/', function(request, response) {
//   response.render('criteria.html', {
//     title: 'Hello',
//     name: 'world!'
//   });
// });

// app.get('/editCriteria/:criteriaId', function(req, res){
//   var criteriaId = req.params.criteriaId;
//   console.log(criteriaId);
//   Criteria.findOne({_id: criteriaId})
//     .then(function(criteria){
//       if(!criteria){
//         throw new Error("Criteria not found");
//       } else {
//         return res.json({status: "OK", criteria: criteria});
//       }
//       })
//       .catch(function(err){
//         res.json({ "status": "fail", "message": err.message });
//       })
// });
