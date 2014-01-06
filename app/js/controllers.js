'use strict';

/* Controllers */

angular.module('opencare.controllers', [])
   
   .controller('MenuCtrl', ['$scope', 'loginService', '$location', function($scope, loginService, $location) {

      $scope.activetab = function(route) {
         return route === $location.path();
      };

      $scope.logout = function() {
         loginService.logout();
         $location.path('/login');
      };

   }])

   .controller('ProfileCtrl', ['$scope', 'syncData', function($scope, syncData ) {

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

      var DEFAULT_START = (new Date()).setHours(9,0,0,0);
      var DEFAULT_END = (new Date()).setHours(17,0,0,0);

      $scope.resetHours = function() { 
         $scope.profile.available = [
            { "dayOfWeek": 0, "start": DEFAULT_START, "end": DEFAULT_END, "closed" : true }
         ,  { "dayOfWeek": 1, "start": DEFAULT_START, "end": DEFAULT_END, "closed" : true }
         ,  { "dayOfWeek": 2, "start": DEFAULT_START, "end": DEFAULT_END, "closed" : true }
         ,  { "dayOfWeek": 3, "start": DEFAULT_START, "end": DEFAULT_END, "closed" : true }
         ,  { "dayOfWeek": 4, "start": DEFAULT_START, "end": DEFAULT_END, "closed" : true }
         ,  { "dayOfWeek": 5, "start": DEFAULT_START, "end": DEFAULT_END, "closed" : true }
         ,  { "dayOfWeek": 6, "start": DEFAULT_START, "end": DEFAULT_END, "closed" : true }
         ];
      }

      $scope.toggleClosed = function(day) {
         day.start = DEFAULT_START;
         day.end = DEFAULT_END;
      }

      $scope.toggleEdit = function() {
         $scope.editing = !$scope.editing;

         if ( !angular.isObject($scope.profile.available) ) { $scope.resetHours(); }
      };

   }])

   .controller('EventCtrl', ['$scope', '$modalInstance', 'currentEvent', 'approveAppointment', 'removeAppointment', 'updateAppointment', function($scope, $modalInstance, currentEvent, approveAppointment, removeAppointment, updateAppointment) {

      // set currentEvent to be a copy of the appointment so that changes aren't finalized
      // until the user presses the "done" button
      $scope.currentEvent = angular.copy(currentEvent);

      $scope.cancel = function() {
         $modalInstance.dismiss();
      }

      // pass back the event to the ScheduleCtrl:
      $scope.approveAppointment = function() {
         $modalInstance.close(approveAppointment(currentEvent));
      };

      $scope.removeAppointment = function() {
         $modalInstance.close(removeAppointment(currentEvent));
      };

      $scope.updateAppointment = function() {
         $modalInstance.close(updateAppointment($scope.currentEvent,currentEvent));
      };
   }])

   .controller('ScheduleCtrl', ['$scope', 'syncData', 'eventService', '$timeout', '$modal', function($scope, syncData, eventService, $timeout, $modal) {

      // assume all appointments are one hour to make life easier:
      $scope.DEFAULT_DURATION = 1000 * 60 * 60;

      $scope.appointments = syncData(['appointments', $scope.auth.user.uid]);

      $scope.appointments.$on('change',function(){
         eventService.setEvents($scope.appointments);
      });

      $scope.events = eventService.events();

      $scope.saveEvent = function(e) {
         $scope.appointments.$save(e.$id);
         var theEvent = eventService.updateEvent(e);
         $scope.calendar.fullCalendar('updateEvent',theEvent);
      };

      $scope.approveAppointment = function(appt) {
         appt.state = 'approved';
         $scope.saveEvent(appt);
      };

      $scope.removeAppointment = function(appt) {
         appt.state = 'dr_pending';
         $scope.saveEvent(appt);
      };

      $scope.updateAppointment = function(evt,appt) {
         var oldD = new Date(appt.start);
         var newD = new Date(evt.start);

         // only send to patient if user actually changed something:
         if ( oldD.getTime() !== newD.getTime() ) {
            appt.state = 'patient_pending';
            appt.start = newD;
            appt.end = new Date(appt.start.getTime() + $scope.DEFAULT_DURATION);
            $scope.saveEvent(appt);
         }
      };

      $scope.editAppointment = function(appt) {
         var modal = $modal.open({
            templateUrl: 'partials/event.html'
         ,  controller: 'EventCtrl'
         ,  resolve: {
               currentEvent: function() { return appt; }
            ,  approveAppointment: function() { return $scope.approveAppointment; }
            ,  removeAppointment: function() { return $scope.removeAppointment; }
            ,  updateAppointment: function() { return $scope.updateAppointment; }
            }
         });
      };

      $scope.handleEventClick = function(evt,jsEvent,view) {
         $scope.editAppointment($scope.appointments[evt.key]);
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

   .controller('AccountCtrl', ['$scope', 'loginService', 'syncData', '$location', function($scope, loginService, syncData, $location ) {

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
