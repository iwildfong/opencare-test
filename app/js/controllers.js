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
            { "dayOfWeek": 0, "start": "", "end": "", "closed" : true }
         ,  { "dayOfWeek": 1, "start": "", "end": "", "closed" : true }
         ,  { "dayOfWeek": 2, "start": "", "end": "", "closed" : true }
         ,  { "dayOfWeek": 3, "start": "", "end": "", "closed" : true }
         ,  { "dayOfWeek": 4, "start": "", "end": "", "closed" : true }
         ,  { "dayOfWeek": 5, "start": "", "end": "", "closed" : true }
         ,  { "dayOfWeek": 6, "start": "", "end": "", "closed" : true }
         ];
      }

      $scope.toggleClosed = function(day) {
         day.start = "";
         day.end = "";
      }

      $scope.toggleEdit = function() {
         $scope.editing = !$scope.editing;

         if ( !angular.isObject($scope.profile.available) ) { $scope.resetHours(); }
      };

   }])

   .controller('ScheduleCtrl', ['$scope', 'syncData', 'eventService', '$timeout', function($scope, syncData, eventService, $timeout) {
      // assume all appointments are one hour to make life easier:
      $scope.DEFAULT_DURATION = 1000 * 60 * 60;

      $scope.appointments = syncData(['appointments', $scope.auth.user.uid]);

      $scope.appointments.$on('change',function(){
         eventService.setEvents($scope.appointments);
      });

      $scope.events = eventService.events();

      $scope.currentEvent = null;

      $scope.saveEvent = function(e,k) {
         $scope.appointments.$save(k);
         var theEvent = eventService.updateEvent(e,k);
         $scope.calendar.fullCalendar('updateEvent',theEvent);
      };

      $scope.approveAppointment = function(key) {
         var appt = $scope.appointments[key];
         appt.state = 'approved';
         $scope.saveEvent(appt,key);
         $timeout(function(){$scope.setCurrentEvent(null);});
      };

      $scope.removeAppointment = function(key) {
         var appt = $scope.appointments[key];
         appt.state = 'dr_pending';
         $scope.saveEvent(appt,key);
         $timeout(function(){$scope.setCurrentEvent(null);});
      };

      $scope.updateAppointment = function(key) {
         var appt = $scope.appointments[key];
         var oldD = new Date(appt.start);
         var newD = new Date($scope.currentEvent.start);

         // only send to patient if user actually changed something:
         if ( oldD.getTime() !== newD.getTime() ) {
            appt.state = 'patient_pending';
            appt.start = newD;
            appt.end = new Date(appt.start.getTime() + $scope.DEFAULT_DURATION);
            $scope.saveEvent(appt);
         }
         $timeout(function(){$scope.setCurrentEvent(null);});
      };

      $scope.setCurrentEvent = function(appt) {
         $scope.currentEvent = ( angular.isObject(appt) ) ? angular.copy(appt) : null;
      };

      $scope.handleEventClick = function(evt,jsEvent,view) {
         var appt = $scope.appointments[evt.key];
         // set currentEvent to be a copy of the appointment so that changes aren't finalized
         // until the user presses the "update" button
         $timeout(function(){$scope.setCurrentEvent(appt);});
      };

      $scope.handleDayClick = function(day,allDay,jsEvent,view) {
         if ( view.name !== 'month' ) { return; }
         
         $scope.calendar.fullCalendar('changeView','agendaDay')
                        .fullCalendar('gotoDate',day);
      };

      $scope.handleRenderEvent = function(evt,element) {
         var appt = $scope.appointments[evt.key];
         if ( !angular.isObject(appt) ) { return false; }

         // element has several classes associated with the calendar already, so rather than
         // clobbering the class element, we remove all possible "special classes", then 
         // reapply whatever classes are set for the given appointment
         var klass = ( evt.conflict ) ? 'conflict ' + appt.state : appt.state;
         element.removeClass('approved dr_pending patient_pending conflict')
                .addClass(klass);

         // TODO: remove this once the css has the necessary class definitions: 
         if ( appt.state === 'approved' ) {
            element.css('background-color','green');
         } else if ( appt.state === 'dr_pending' ) {
            element.css('background-color','orange');
         } else if ( appt.state === 'patient_pending' ) {
            element.css('background-color','grey');
         }
         if ( evt.conflict ) {
            element.css('border-color','red');
         }
      };

      // TODO: show current office hours on calendar?
      $scope.eventSources = [$scope.events];

      $scope.uiConfig = {
         calendar: {
            editable: false
         ,  header: {
               left: 'prev,next today'
            ,  center: 'title'
            ,  right: 'month,agendaWeek,agendaDay'
            }
         ,  allDaySlot: false
         ,  dayClick: $scope.handleDayClick
         ,  eventClick: $scope.handleEventClick
         ,  eventRender: $scope.handleRenderEvent
         }
      };

      // extra watchers for event data:
      $scope.eventState = function(e){
         return "" + e.state;
      }

      $scope.eventConflict = function(e){
         return false || e.conflict;
      }
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
