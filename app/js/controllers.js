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

   .controller('ScheduleCtrl', ['$scope', 'syncData', 'eventService', function($scope, syncData, eventService) {
      // assume all appointments are one hour to make life easier:
      $scope.DEFAULT_DURATION = 1000 * 60 * 60;

      $scope.appointments = syncData(['appointments', $scope.auth.user.uid]);

      $scope.appointments.$on('change',function(){
         eventService.setEvents($scope.appointments);
      });

      $scope.events = eventService.events();

      $scope.updateConflicts = function() {
         for (var i=0; i < $scope.events.length; i++) {
            var s1 = $scope.events[i].start.getTime();
            var e1 = $scope.events[i].end.getTime();
            var conflicts = false;

            for (var j=0; j < $scope.events.length; j++) {
               if ( i == j ) { continue; }
               var s2 = $scope.events[j].start.getTime();
               var e2 = $scope.events[j].end.getTime();

               // if app1 starts after app2, but before app2 finishes
               // OR 
               // app1 finishes after app2, but starts before app2 finishes
               if ( ( s1 >= s2 && s1 < e2 ) || ( e1 > s2 && s1 < e2 ) ) {
                  var idx1 = $scope.events[i].className.indexOf('conflict');
                  var idx2 = $scope.events[j].className.indexOf('conflict');
                  if ( idx1 < 0 ) {
                     $scope.events[i].className.push('conflict');
                  }
                  if ( idx2 < 0 ) {
                     $scope.events[j].className.push('conflict');
                  }
                  conflicts = true;
                  break;
               }
            }
            if ( !conflicts ) {
               var idx = $scope.events[i].className.indexOf('conflict');
               if ( idx >= 0 ) {
                  $scope.events[i].className.splice(idx,1);
               }
            }
         }
      };

      $scope.saveEvent = function(e,k) {
         $scope.appointments.$save(k);

         var theEvent = eventService.updateEvent(e,k);
         $scope.calendar.fullCalendar('updateEvent',theEvent);
      };

      $scope.approveAppointment = function(appt,key) {
         var idx = appt.className.indexOf('dr_pending');
         if ( idx >= 0 ) {
            appt.className.splice(idx,1,'approved');
         }
         $scope.saveEvent(appt,key);
      };

      $scope.removeAppointment = function(appt,key) {
         var idx = appt.className.indexOf('approved');
         if ( idx >= 0 ) {
            appt.className.splice(idx,1,'dr_pending');
         }
         $scope.saveEvent(appt,key);
      };

      $scope.updateAppointment = function(appt,date) {
         appt.className = ['approved','patient_pending'];
         appt.start = date;
         appt.end = new Date(date.getTime() + $scope.DEFAULT_DURATION);
         $scope.updateConflicts();
         $scope.saveEvent(appt);
      };

      $scope.handleEventClick = function(evt,jsEvent,view) {
         var appt = $scope.appointments[evt.key];
         alert( 'TODO: add detail/edit view for appointment: ' + appt.patient );
      };

      $scope.handleDayClick = function(day,allDay,jsEvent,view) {
         if ( view.name !== 'month' ) { return; }
         
         $scope.calendar.fullCalendar('changeView','agendaDay')
                        .fullCalendar('gotoDate',day);
      };

      $scope.handleRenderEvent = function(evt,element) {
         if ( evt.className.indexOf('approved') >= 0 ) {
            element.addClass('approved').css('background-color','green');
         } else if ( evt.className.indexOf('dr_pending') >= 0 ) {
            element.addClass('dr_pending').css('background-color','orange');
         } else if ( evt.className.indexOf('patient_pending') >= 0 ) {
            element.addClass('patient_pending').css('background-color','grey');
         }

         if ( evt.className.indexOf('conflict') >= 0 ) {
            element.addClass('conflict').css('border-color','red');
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
