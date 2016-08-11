var reverseDataApp = angular.module('reverseDataApp',['ngRoute']);

reverseDataApp.config(function($routeProvider){
  $routeProvider
  .when('/', {
    controller: 'HomeController',
    templateUrl: 'home.html'
    // template: '<h1>HOME</h1>'
  })
  .when('/criteria/', {
    controller: 'CriteriaController',
    templateUrl: 'criteria.html'
  })
  .when('/edit', {
    controller: 'CreateDataController',
    templateUrl: 'edit.html'
  })
  // .when('/contact', {
  //   controller: 'ContactController',
  //   templateUrl: 'contact.html',
  // })
  .otherwise({redirectTo: '/'});
});

reverseDataApp.controller('HomeController', function($scope, $location) {
  $scope.isActive = true;
  $scope.criteriaList = function(){
    $location.path("/criteria");
  };
});

reverseDataApp.controller('CreateDataController', function($scope, $location) {
  $scope.isActive = true;
  $scope.createData = function(){
    $location.path("/edit");
  };
});
