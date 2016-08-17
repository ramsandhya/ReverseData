Static data :-
  Account
    ID (Auto)
    Industry
    Account Name (Business Name) No Repeat
  Contact
    ID (Auto)
    First Name
    Last Name (No Repeat)
  Product
    Industry (Insurance, Finance, Retail, HiTech, Pharmaceutical, Hospitality)
    Product Name
    Price
    Unit of Measurement
  Opportunity Stage
    Stage Value
    Contacted
    Demo Scheduled
    Proposal Presented
    Negotiation Started
    Contract Signed
    Closed-Won
    Closed-Lost

Dynamic Data:-
  SFDCAccount
    Id
    Account Name (Business Name)
    SFDC Account ID
  SFDCContact
    Id
    LocalAccountId
    AccountId (SFDC Account ID)
    First Name
    Last Name
  SFDCOpportunity
    Id
    LocalAccountId
    AccountId (SFDC Account ID)
    SFDC Opportunity ID (null)
    Name (Product Name)
    Amount
    CreatedDate
    LastModifiedDate (same as CreatedDate)
    Stage

    var data = {
      accountName: $scope.accountName,
      firstName: $scope.firstName,
      ...
    }

index.js

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


client.js

var reverseDataApp = angular.module('reverseDataApp',['ngRoute', 'ngCookies', 'ngMessages']);

reverseDataApp.config(function($routeProvider){
  $routeProvider
  .when('/', {
    controller: 'HomeController',
    templateUrl: 'home.html'
    // template: '<h1>HOME</h1>'
  })
  .when('/criteria', {
    controller: 'CriteriaController',
    templateUrl: 'criteria.html'
  })
  .when('/edit', {
    controller: 'EditController',
    templateUrl: 'edit.html'
  })
  .when('/register', {
    controller: 'RegisterController',
    templateUrl: 'register.html',
  })
  .when('/data', {
    controller: 'DataController',
    templateUrl: 'data.html',
  })

  .otherwise({redirectTo: '/'});
});

reverseDataApp.run(function($rootScope, $location, $cookies) {

  $rootScope.$on('$locationChangeStart', function(event, nextUrl, currentUrl) {
    // get path from url
    var path = nextUrl.split('/')[4];
    // if user is going to a restricted area and doesn't have a token stored in a cookie, redirect to the login page
    var token = $cookies.get('token');
    if (!token && (path === 'criteria' || path === 'edit')) {
      $rootScope.goHere = path;
      $location.path('/');
    }

    // is the user logged in? used to display login, logout and signup links
    $rootScope.isLoggedIn = function() {
      return $cookies.get('token');
    };

    $rootScope.logout = function() {
      $cookies.remove('token');
      $location.path('/');
    };
  });
});

reverseDataApp.controller('HomeController', function($scope, $location, $http, $rootScope, $cookies) {
  // $scope.isActive = true;
  $scope.login = function() {
    if ($scope.loginForm.$valid) {
      $http.post('/login', { username: $scope.username, password: $scope.password })
        .then(function(response) {
          // if login is a success, redirect
          if (response.status === 200) {
            $scope.loginFailed = false;
            // set a cookie with the token from the database response
            $cookies.put('token', response.data.token);
            // redirect to the page they were trying to go to
            $location.path('/criteria');
            // $location.path('/edit' + $rootScope.goHere);
          }
        })
        .catch(function(err) {
          // tell user login wasn't successful
          $scope.loginFailed = true;
        });
    }
  };
  $scope.registration = function(){
    $location.path("/register");
  };
});

// reverseDataApp.controller('CriteriaController', function($scope, $location) {
//   // $scope.isActive = true;
//   $scope.createCriteria = function(){
//     console.log("clicked");
//     $location.path("/edit");
//   };
// });


reverseDataApp.controller('RegisterController', function($scope, $location, $http) {
  $scope.registerUser = function() {
    var data = {
      username: $scope.username,
      password: $scope.password,
      email: $scope.email
    };
    $http.post('/register', data)
      .then(function(response) {
        if (response.status === 200) {
          // user successfully created
          $scope.registered = true;
          $location.path('/');
        }
      })
      .catch(function(err) {
        console.log(err);
      })
  }
});

reverseDataApp.controller('EditController', function($scope, $http, $location){
  $scope.objectApiName = "Opportunity";
  $scope.createCriteria = function(){
    var data = {
      criteriaName: $scope.criteriaName,
      objectApiName: $scope.objectApiName,
      industryType: $scope.industryType,
      amountFrom: $scope.amountFrom,
      amountTo: $scope.amountTo,
      dataCreatedDateFrom: $scope.dataCreatedDateFrom,
      dataCreatedDateTo: $scope.dataCreatedDateTo,
      opportunityCloseRangeFrom: $scope.opportunityCloseRangeFrom,
      opportunityCloseRangeTo: $scope.opportunityCloseRangeTo,
      numberOfRecords: $scope.numberOfRecords,
      chartType: $scope.chartType
    };
    console.log(data);
    $http.post('/createCriteria', data)
      .then(function(response) {
        if (response.status === 200) {
          // user successfully created
          $scope.created = true;
          console.log("criteria created");
          $location.path('/criteria');
        }
      })
      .catch(function(err) {
        console.log(err);
      })
  }
});

reverseDataApp.controller('CriteriaController', function($scope, $http, $location){
  $scope.criterias = null;
    $http.get('/fetchData')
      .then(function(result){
        console.log(result);
        $scope.criterias = result.data.criteria;
      })
      .catch(function(err){
        $scope.criterias = [{err:"Could not load json criteria"}];
      });
      $scope.createCriteria = function(){
        console.log("clicked");
        $location.path("/edit");
      };
      $scope.generateData = function(criteriaId){
        $http.post('/generate', {
          criteriaId: criteriaId
        })
        .then(function(response) {
          if (response.status === 200) {
            // user successfully created
            console.log("Yay");
          }
        })
        .catch(function(err) {
          console.log(err);
        })
      }
      $scope.pushData = function(criteriaId){
        $http.get('/push',{
          criteriaId: criteriaId
        })
        .then(function(response) {
          if (response.status === 200) {
            // user successfully created
            console.log("Yay");
          }
        })
        .catch(function(err) {
          console.log(err);
        })
      }
});

  // // if they've registered and clicked the login button, redirect to the login page
  // $scope.redirectToLogin = function() {
  //   $location.path('/');
  // };

  {
     "response":{
        "status":"ok",
        "userTier":"developer",
        "total":329463,
        "startIndex":1,
        "pageSize":10,
        "currentPage":1,
        "pages":32947,
        "orderBy":"relevance",
        "results":[
           {
              "id":"global-development-professionals-network/adam-smith-international-partner-zone/2016/mar/04/nigerian-women-talk-business",
              "type":"article",
              "sectionId":"global-development-professionals-network/adam-smith-international-partner-zone",
              "sectionName":"Adam Smith International partner zone",
              "webPublicationDate":"2016-03-04T15:04:51Z",
              "webTitle":"Nigerian women talk business",
              "webUrl":"https://www.theguardian.com/global-development-professionals-network/adam-smith-international-partner-zone/2016/mar/04/nigerian-women-talk-business",
              "apiUrl":"https://content.guardianapis.com/global-development-professionals-network/adam-smith-international-partner-zone/2016/mar/04/nigerian-women-talk-business",
              "isHosted":false
           },
           {
              "id":"natwest-partner-zone/2016/mar/07/happy-staff-healthy-business-workforce-benefits-employees",
              "type":"article",
              "sectionId":"natwest-partner-zone",
              "sectionName":"NatWest partner zone",
              "webPublicationDate":"2016-03-07T12:00:03Z",
              "webTitle":"Happy staff, healthy business",
              "webUrl":"https://www.theguardian.com/natwest-partner-zone/2016/mar/07/happy-staff-healthy-business-workforce-benefits-employees",
              "apiUrl":"https://content.guardianapis.com/natwest-partner-zone/2016/mar/07/happy-staff-healthy-business-workforce-benefits-employees",
              "isHosted":false
           },
           {
              "id":"barclaycard-partner-zone/2016/aug/10/10-steps-business-growth-small-business-advice",
              "type":"article",
              "sectionId":"barclaycard-partner-zone",
              "sectionName":"Barclaycard partner zone",
              "webPublicationDate":"2016-08-10T12:26:11Z",
              "webTitle":"The 10 steps to small business growth",
              "webUrl":"https://www.theguardian.com/barclaycard-partner-zone/2016/aug/10/10-steps-business-growth-small-business-advice",
              "apiUrl":"https://content.guardianapis.com/barclaycard-partner-zone/2016/aug/10/10-steps-business-growth-small-business-advice",
              "isHosted":false
           },
           {
              "id":"facebook-partner-zone/2016/aug/03/business-trending-summer-social-media-facebook",
              "type":"article",
              "sectionId":"facebook-partner-zone",
              "sectionName":"Facebook partner zone",
              "webPublicationDate":"2016-08-03T11:25:33Z",
              "webTitle":"Will your business be trending this summer?",
              "webUrl":"https://www.theguardian.com/facebook-partner-zone/2016/aug/03/business-trending-summer-social-media-facebook",
              "apiUrl":"https://content.guardianapis.com/facebook-partner-zone/2016/aug/03/business-trending-summer-social-media-facebook",
              "isHosted":false
           },
           {
              "id":"hiscox-partner-zone/2016/jul/28/handle-risk-business-growth",
              "type":"article",
              "sectionId":"hiscox-partner-zone",
              "sectionName":"Hiscox partner zone",
              "webPublicationDate":"2016-07-28T09:56:14Z",
              "webTitle":"How to handle risk in business",
              "webUrl":"https://www.theguardian.com/hiscox-partner-zone/2016/jul/28/handle-risk-business-growth",
              "apiUrl":"https://content.guardianapis.com/hiscox-partner-zone/2016/jul/28/handle-risk-business-growth",
              "isHosted":false
           },
           {
              "id":"small-business-network/kia-fleet-partner-zone/2016/aug/01/how-to-build-a-resilient-business-brexit",
              "type":"article",
              "sectionId":"small-business-network/kia-fleet-partner-zone",
              "sectionName":"KIA Fleet partner zone",
              "webPublicationDate":"2016-08-01T14:39:20Z",
              "webTitle":"How to build a resilient business",
              "webUrl":"https://www.theguardian.com/small-business-network/kia-fleet-partner-zone/2016/aug/01/how-to-build-a-resilient-business-brexit",
              "apiUrl":"https://content.guardianapis.com/small-business-network/kia-fleet-partner-zone/2016/aug/01/how-to-build-a-resilient-business-brexit",
              "isHosted":false
           },
           {
              "id":"science/2016/jul/21/supply-ships-keep-iss-business-spacewatch",
              "type":"article",
              "sectionId":"science",
              "sectionName":"Science",
              "webPublicationDate":"2016-07-21T20:30:37Z",
              "webTitle":"Supply ships keep the ISS in business",
              "webUrl":"https://www.theguardian.com/science/2016/jul/21/supply-ships-keep-iss-business-spacewatch",
              "apiUrl":"https://content.guardianapis.com/science/2016/jul/21/supply-ships-keep-iss-business-spacewatch",
              "isHosted":false
           },
           {
              "id":"media/2016/jul/13/sky-plans-to-axe-business-bulletins",
              "type":"article",
              "sectionId":"media",
              "sectionName":"Media",
              "webPublicationDate":"2016-07-13T09:51:32Z",
              "webTitle":"Sky News plans to axe business bulletins",
              "webUrl":"https://www.theguardian.com/media/2016/jul/13/sky-plans-to-axe-business-bulletins",
              "apiUrl":"https://content.guardianapis.com/media/2016/jul/13/sky-plans-to-axe-business-bulletins",
              "isHosted":false
           },
           {
              "id":"business/2016/jul/11/brexit-uk-business-winners-and-losers-falling-pound",
              "type":"article",
              "sectionId":"business",
              "sectionName":"Business",
              "webPublicationDate":"2016-07-11T11:06:48Z",
              "webTitle":"Brexit fallout – the business winners ... and losers",
              "webUrl":"https://www.theguardian.com/business/2016/jul/11/brexit-uk-business-winners-and-losers-falling-pound",
              "apiUrl":"https://content.guardianapis.com/business/2016/jul/11/brexit-uk-business-winners-and-losers-falling-pound",
              "isHosted":false
           },
           {
              "id":"business/nils-pratley-on-finance/2016/jul/14/putting-the-industry-back-into-departmental-business",
              "type":"article",
              "sectionId":"business",
              "sectionName":"Business",
              "webPublicationDate":"2016-07-14T17:46:31Z",
              "webTitle":"Putting the industry back into departmental business",
              "webUrl":"https://www.theguardian.com/business/nils-pratley-on-finance/2016/jul/14/putting-the-industry-back-into-departmental-business",
              "apiUrl":"https://content.guardianapis.com/business/nils-pratley-on-finance/2016/jul/14/putting-the-industry-back-into-departmental-business",
              "isHosted":false
           }
        ]
     }
  }
