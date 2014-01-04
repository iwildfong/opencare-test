'use strict';

/* Controllers */

angular.module('opencare.controllers', [])

   .controller('ProfileCtrl', ['$scope', 'syncData', function($scope, syncData) {
      syncData(['profiles', $scope.auth.user.uid]).$bind($scope, 'profile');

      $scope.editing = false;

      $scope.addSpecialty = function() {
         if ( !$scope.profile.specialties ) { $scope.profile.specialties = []; }
         $scope.profile.specialties.push({value:''});
      };

      $scope.removeSpecialty = function(idx) {
         $scope.profile.specialties.splice(idx,1);
      };

      $scope.addLanguage = function() {
         if ( !$scope.profile.languages ) { $scope.profile.languages = []; }
         $scope.profile.languages.push({value:''});
      };

      $scope.removeLanguage = function(idx) {
         $scope.profile.languages.splice(idx,1);
      };

      $scope.resetHours = function() { 
         $scope.profile.available = [
            { "dayOfWeek": 0, "open": "closed", "close": "closed" }
         ,  { "dayOfWeek": 1, "open": "closed", "close": "closed" }
         ,  { "dayOfWeek": 2, "open": "closed", "close": "closed" }
         ,  { "dayOfWeek": 3, "open": "closed", "close": "closed" }
         ,  { "dayOfWeek": 4, "open": "closed", "close": "closed" }
         ,  { "dayOfWeek": 5, "open": "closed", "close": "closed" }
         ,  { "dayOfWeek": 6, "open": "closed", "close": "closed" }
         ];
      }

      $scope.toggleEdit = function() {
         $scope.editing = !$scope.editing;

         if ( !$scope.profile.available ) { $scope.resetHours(); }
      };

   }])

   .controller('ScheduleCtrl', ['$scope', 'syncData', function($scope, syncData) {
      $scope.schedule = null;
   }])

   .controller('LoginCtrl', ['$scope', 'loginService', '$location', function($scope, loginService, $location) {
      $scope.email = null;
      $scope.pass = null;
      $scope.confirm = null;
      $scope.createMode = false;

      $scope.$on('$firebaseAuth:login', function() {
         $location.replace();
         $location.path('/profile');
      });

      $scope.login = function(cb) {
         $scope.err = null;
         if( !$scope.email ) {
            $scope.err = 'Please enter an email address';
         }
         else if( !$scope.pass ) {
            $scope.err = 'Please enter a password';
         }
         else {
            loginService.login($scope.email, $scope.pass, function(err, user) {
               $scope.err = err? err + '' : null;
               if( !err ) {
                  cb && cb(user);
               }
            });
         }
      };

      $scope.createAccount = function() {
         if( !$scope.email ) {
            $scope.err = 'Please enter an email address';
         }
         else if( !$scope.pass ) {
            $scope.err = 'Please enter a password';
         }
         else if( $scope.pass !== $scope.confirm ) {
            $scope.err = 'Passwords do not match';
         }
         else {
            loginService.createAccount($scope.email, $scope.pass, function(err, user) {
               if( err ) {
                  $scope.err = err? err + '' : null;
               }
               else {
                  // must be logged in before I can write to my profile
                  $scope.login(function() {
                     loginService.createProfile(user.uid, user.email);
                  });
               }
            });
         }
      };
   }])

   .controller('AccountCtrl', ['$scope', 'loginService', 'syncData', '$location', function($scope, loginService, syncData, $location) {
      syncData(['users', $scope.auth.user.uid]).$bind($scope, 'user');

      $scope.logout = function() {
         loginService.logout();
         $location.path('/login');
      };

      $scope.oldpass = null;
      $scope.newpass = null;
      $scope.confirm = null;

      $scope.reset = function() {
         $scope.err = null;
         $scope.msg = null;
      };

      $scope.updatePassword = function() {
         $scope.reset();
         loginService.changePassword(buildPwdParms());
      };

      function buildPwdParms() {
         return {
            email: $scope.auth.user.email,
            oldpass: $scope.oldpass,
            newpass: $scope.newpass,
            confirm: $scope.confirm,
            callback: function(err) {
               if( err ) {
                  $scope.err = err;
               }
               else {
                  $scope.oldpass = null;
                  $scope.newpass = null;
                  $scope.confirm = null;
                  $scope.msg = 'Password updated!';
               }
            }
         }
      }

   }]);
