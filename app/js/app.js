'use strict';

// Declare app level module which depends on filters, and services
angular.module('opencare',
      ['opencare.config', 'opencare.filters', 'opencare.services', 'opencare.directives', 'opencare.controllers', 'firebase', 'ngRoute', 'waitForAuth', 'ui.calendar']
   )

   // configure views; note the authRequired parameter for authenticated pages
   .config(['$routeProvider', function($routeProvider) {
      $routeProvider.when('/profile', {
         authRequired: true,
         templateUrl: 'partials/profile.html',
         controller: 'ProfileCtrl'
      });

      $routeProvider.when('/schedule', {
         authRequired: true,
         templateUrl: 'partials/schedule.html',
         controller: 'ScheduleCtrl'
      });

      $routeProvider.when('/account', {
         authRequired: true, // must authenticate before viewing this page
         templateUrl: 'partials/account.html',
         controller: 'AccountCtrl'
      });

      $routeProvider.when('/login', {
         templateUrl: 'partials/login.html',
         controller: 'LoginCtrl'
      });

      $routeProvider.otherwise({redirectTo: '/login'});
   }])


   // establish authentication
   .run(['loginService', '$rootScope', 'FBURL', function(loginService, $rootScope, FBURL) {
      $rootScope.auth = loginService.init('/login');
      $rootScope.FBURL = FBURL;
   }]);
