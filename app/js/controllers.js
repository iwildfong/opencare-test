'use strict';

/* Controllers */

angular.module('opencare.controllers', [])
   
   .controller('MenuCtrl', ['$scope', 'loginService', '$location', function($scope, loginService, $location) {

      // set active tab in menu based on current page
      $scope.activetab = function(route) {
         return route === $location.path();
      };

      // logout on button click
      $scope.logout = function() {
         loginService.logout();
         $location.path('/login');
      };

   }])

   .controller('ProfileCtrl', ['$scope', 'syncData', '$modal', function($scope, syncData, $modal ) {

      // 3-way binding for profile data
      syncData(['profiles', $scope.auth.user.uid]).$bind($scope, 'profile');

      $scope.editing = false;

      // add an empty specialty so the input field will appear
      $scope.addSpecialty = function() {
         if ( !$scope.profile.specialties ) { $scope.profile.specialties = []; }
         $scope.profile.specialties.push({value:''});
      };

      $scope.removeSpecialty = function(idx) {
         $scope.profile.specialties.splice(idx,1);
      };

      // add an empty language so the input field will appear
      $scope.addLanguage = function() {
         if ( !$scope.profile.languages ) { $scope.profile.languages = []; }
         $scope.profile.languages.push({value:''});
      };

      $scope.removeLanguage = function(idx) {
         $scope.profile.languages.splice(idx,1);
      };

      $scope.toggleClosed = function(day) {
         // reset hours to 9am - 5pm
         day.start = (new Date()).setHours(9,0,0,0);
         day.end = (new Date()).setHours(17,0,0,0);
      }

      $scope.toggleEdit = function() {
         $scope.editing = !$scope.editing;
      };

      // use a modal for popover timepicker since angular-ui popover doesn't support HTML content
      // https://github.com/angular-ui/bootstrap/issues/220
      $scope.timepicker = function(day,which) {
         var modal = $modal.open({
            templateUrl: 'partials/popoverTimepicker.html'
         ,  controller: 'TimepickerCtrl'
         ,  resolve: {
               day: function() { return day; }
            ,  timeToPick: function() { return which; }
            }
         });
      }
   }])

   .controller('TimepickerCtrl', ['$scope', '$modalInstance', 'day', 'timeToPick', function($scope, $modalInstance, day, timeToPick ) {

      $scope.modal = {
         time: day[timeToPick]
      };

      $scope.cancel = function() {
         $modalInstance.dismiss();
      };

      $scope.done = function() {
         day[timeToPick] = $scope.modal.time;
         $modalInstance.close(day);
      };
   }])

   .controller('EventCtrl', ['$scope', '$modalInstance', 'currentEvent', 'approveAppointment', 'removeAppointment', 'updateAppointment', function($scope, $modalInstance, currentEvent, approveAppointment, removeAppointment, updateAppointment) {

      // set currentEvent to be a copy of the appointment so that changes aren't finalized
      // until the user presses the "done" button
      $scope.currentEvent = angular.copy(currentEvent);

      $scope.cancel = function() {
         $modalInstance.dismiss();
      }

      // let ScheduleCtrl do the actual approving:
      $scope.approveAppointment = function() {
         $modalInstance.close(approveAppointment(currentEvent));
      };

      // let ScheduleCtrl do the actual removing:
      $scope.removeAppointment = function() {
         $modalInstance.close(removeAppointment(currentEvent));
      };

      // let ScheduleCtrl do the actual updating:
      $scope.updateAppointment = function() {
         $modalInstance.close(updateAppointment($scope.currentEvent,currentEvent));
      };
   }])

   .controller('ScheduleCtrl', ['$scope', 'syncData', 'eventService', '$timeout', '$modal', function($scope, syncData, eventService, $timeout, $modal) {

      // assume all appointments are one hour to make life easier:
      $scope.DEFAULT_DURATION = 1000 * 60 * 60;

      $scope.appointments = syncData(['appointments', $scope.auth.user.uid]);

      // make sure the service's event list gets updated when appointments changes remotely
      $scope.appointments.$on('change',function(){
         eventService.setEvents($scope.appointments);
      });

      // ui-calendar doesn't play nicely with firebase, so use an event service to generate the
      // event list based on the appointments data
      $scope.events = eventService.events();

      // save appointment to firebase and update the calendar UI
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

      // open modal for editing date/time of an appointment:
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

      // handle click on scheduled event from calendar UI
      $scope.handleEventClick = function(evt,jsEvent,view) {
         $scope.editAppointment($scope.appointments[evt.key]);
      };

      // change to day view in calendar UI when click on day in month view:
      $scope.handleDayClick = function(day,allDay,jsEvent,view) {
         if ( view.name !== 'month' ) { return; }
         
         $scope.calendar.fullCalendar('changeView','agendaDay')
                        .fullCalendar('gotoDate',day);
      };

      // make sure calendar events are styled according to their status:
      $scope.handleRenderEvent = function(evt,element) {
         var appt = $scope.appointments[evt.key];
         if ( !angular.isObject(appt) ) { return false; }

         // element has several classes associated with the calendar already, so rather than
         // clobbering the class attribute, we remove all possible "special classes", then 
         // reapply whatever classes are set for the given appointment
         var klass = ( evt.conflict ) ? 'conflict ' + appt.state : appt.state;
         element.removeClass('approved dr_pending patient_pending conflict')
                .addClass(klass);
      };

      // TODO: show current office hours on calendar?
      $scope.eventSources = [$scope.events];

      // initialize calendar UI
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
