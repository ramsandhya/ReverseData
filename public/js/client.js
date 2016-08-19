var reverseDataApp = angular.module('reverseDataApp',['ngRoute', 'ngCookies', 'ngMessages', 'ngAnimate']);

reverseDataApp.directive('slider', function($timeout) {
  return {
    restrict: 'AE',
    replace: true,
    scope: {
      images: '='
    },
    link: function(scope, elem, attrs) {
      scope.currentIndex = 0; // Initially the index is at the first image

      scope.next = function() {
        scope.currentIndex < scope.images.length - 1 ? scope.currentIndex++ : scope.currentIndex = 0;
      };

      scope.prev = function() {
        scope.currentIndex > 0 ? scope.currentIndex-- : scope.currentIndex = scope.images.length - 1;
      };

      scope.$watch('currentIndex', function() {
      scope.images.forEach(function(image) {
        image.visible = false; // make every image invisible
      });

      scope.images[scope.currentIndex].visible = true; // make the current image visible
      });
      var timer;
      var sliderFunc = function() {
      timer = $timeout(function() {
        scope.next();
        timer = $timeout(sliderFunc, 5000);
      }, 5000);
      };

      sliderFunc();
    },
    templateUrl: 'templateurl.html'
  };
});


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
  .when('/editcriteria/:criteriaId', {
    controller: 'EditCriteriaController',
    templateUrl: 'editcriteria.html'
  })
  .when('/register', {
    controller: 'RegisterController',
    templateUrl: 'register.html'
  })
  .when('/newcriteria', {
    controller: 'NewCriteriaController',
    templateUrl: 'newcriteria.html'
  })
  .when('/criteriadetail/:criteriaId', {
    controller: 'CriteriaDetailController',
    templateUrl: 'criteriadetail.html'
  })
  .when('/templateurl', {
    conroller: 'SliderController',
    templateUrl: 'templateurl.html'
  })
  .otherwise({redirectTo: '/'});
});

reverseDataApp.run(function($rootScope, $location, $cookies) {

  $rootScope.$on('$locationChangeStart', function(event, nextUrl, currentUrl) {
    // get path from url
    var path = nextUrl.split('/')[4];
    // if user is going to a restricted area and doesn't have a token stored in a cookie, redirect to the login page
    var token = $cookies.get('token');
    if (!token && (path === 'criteria' || path === 'editcriteria' || path === 'newcriteria')) {
      $rootScope.goHere = path;
      console.log("redirecting");
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
  $scope.getCriteria = function(){
    console.log("clicked");
    $location.path("/criteria");
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

reverseDataApp.controller('NewCriteriaController', function($scope, $http, $location){
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

reverseDataApp.controller('EditCriteriaController', function($scope, $http, $location, $routeParams){

  $scope.getCriteria = function(){
    console.log("clicked");
    $location.path("/criteria");
  };

    $http.get('/editCriteria/'+ $routeParams.criteriaId)
      .then(function(results) {
        console.log(results);
        $scope.criteria = results.data.criteria;
      })
      .catch(function(err) {
        console.log(err);
      })



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
  };
});


reverseDataApp.controller('CriteriaController', function($scope, $http, $location){
  console.log("Came to the controller");
  // $scope.criterias = null;
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
  };

  $http.get('/fetchData')
  .then(function(results){
    console.log(results);
    $scope.criterias = results.data.criteria;
  })
  .catch(function(err){
    $scope.criterias = [{err:"Could not load json criteria"}];
  });

  $scope.createCriteria = function(){
    console.log("clicked");
    $location.path("/newcriteria");
  };

  $scope.getCriteriaPage = function(){
    console.log("clicked");
    $location.path("/newcriteria");
  };

  $scope.editCriteria = function(criteria){
    console.log("Criteria is "+ criteria);
    $location.path("/editcriteria/" + criteria._id);
    $http.get('/editCriteria/'+ criteria._id)
      .then(function(results) {
        console.log(results);
        $scope.criteria = results.data.criteria;
      })
      .catch(function(err) {
        console.log(err);
      })
  };

  $scope.deleteCriteria = function(criteria){
    $http.get('/deleteCriteria/'+ criteria._id)
      .then(function(results) {
        console.log(results);
        $scope.criteria = results.data.criteria;
        $http.get('/fetchData')
        .then(function(results){
          console.log(results);
          $scope.criterias = results.data.criteria;
        })
        .catch(function(err){
          $scope.criterias = [{err:"Could not load json criteria"}];
        });
      })
      .catch(function(err) {
        console.log(err);
      })
  };

  // $scope.getCriteriaDetail = function(criteriaId){
  //   console.log("Criteria is "+ criteriaId);
  //   $location.path("/criteriadetail/" + criteriaId);
  //   $http.get('/editCriteria/'+ criteriaId)
  //     .then(function(results) {
  //       console.log(results);
  //       $scope.criteria = results.data.criteria;
  //     })
  //     .catch(function(err) {
  //       console.log(err);
  //     })
  // };
});

reverseDataApp.controller('CriteriaDetailController', function($scope, $http, $location, $routeParams){

  $http.get('/editCriteria/'+ $routeParams.criteriaId)
    .then(function(results) {
      console.log(results);
      $scope.criteria = results.data.criteria;
    })
    .catch(function(err) {
      console.log(err);
    });

  $scope.generateData = function(criteriaId){
    $scope.pushingData = false;
    $scope.pushedData = false;
    $scope.generatingData = true;
    $http.post('/generate', {
      criteriaId: criteriaId
    })
    .then(function(response) {
      if (response.status === 200) {
        // user successfully created
        console.log("Yay");
        $scope.generatingData = false;
        $scope.generatedData = true;
      }
    })
    .catch(function(err) {
      console.log(err);
    })
  };

  $scope.pushData = function(criteriaId){
    $scope.generatingData = false;
    $scope.generatedData = false;
    $scope.pushingData = true;
    $http.get('/push',{
      criteriaId: criteriaId
    })
    .then(function(response) {
      if (response.status === 200) {
        // user successfully created
        console.log("Yay");
        $scope.pushingData = false;
        $scope.pushedData = true;

      }
    })
    .catch(function(err) {
      console.log(err);
    })
  };

});

reverseDataApp.controller('SliderController', function($scope) {
  $scope.images = [{
    alt: 'Some text',
    title: 'Pic 1'
  }, {
    alt: 'Some text',
    title: 'Pic 2'
  }, {
    alt: 'Some text',
    title: 'Pic 3'
  }, {
    alt: 'Some text',
    title: 'Pic 4'
  }];

});

  // // if they've registered and clicked the login button, redirect to the login page
  // $scope.redirectToLogin = function() {
  //   $location.path('/');
  // };
