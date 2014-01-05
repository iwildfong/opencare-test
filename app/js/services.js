(function() {
   'use strict';

   /* Services */

   angular.module('opencare.services', [])

      // a simple utility to create references to Firebase paths
      .factory('firebaseRef', ['Firebase', 'FBURL', function(Firebase, FBURL) {
         /**
          * @function
          * @name firebaseRef
          * @param {String|Array...} path
          * @return a Firebase instance
          */
         return function(path) {
            return new Firebase(pathRef([FBURL].concat(Array.prototype.slice.call(arguments))));
         }
      }])

      // a simple utility to create $firebase objects from angularFire
      .service('syncData', ['$firebase', 'firebaseRef', function($firebase, firebaseRef) {
         /**
          * @function
          * @name syncData
          * @param {String|Array...} path
          * @param {int} [limit]
          * @return a Firebase instance
          */
         return function(path, limit) {
            var ref = firebaseRef(path);
            limit && (ref = ref.limit(limit));
            return $firebase(ref);
         }
      }])

      // simple service to map "appointment" objects from firebase to an array of "event" objects
      // compatible with ui-calendar
      .factory('eventService', ['$rootScope', function($rootScope) {
         var events = [];

         function Event(v,k){
            this.title = v.title;
            this.start = new Date(v.start);
            this.end = new Date(v.end);
            this.className = v.className;
            this.allDay = false
            this.key = k;
         }

         function keyInEvents(k) {
            var idx = -1;
            for ( var i = 0; i < events.length; i++ ) {
               if ( events[i].key === k ) {
                  idx = i;
                  break;
               }
            }
            return idx;
         }

         function eventForKey(key) {
            var idx = keyInEvents(key);
            if ( idx >= 0 ) {
               return events[idx];
            }
            return {};
         }

         function updateEvent(obj,key) {
            var e = eventForKey(key);
            if ( e ) {
               e.start = new Date(obj.start);
               e.end = new Date(obj.end);
               e.className = obj.className;
               return e;
            }
            return {};
         }

         function setEvents(list) {
            // remove any events that are no longer in list:
            for ( var i = events.length-1; i >= 0; i-- ) {
               if ( !list.hasOwnProperty(events[i].key) ) {
                  events.splice(i,1);
               }
            }

            // update events for each appointment in list:
            angular.forEach(list,function(v,k){
               if ( list.hasOwnProperty(k) && angular.isObject(v) ) {
                  var idx = keyInEvents(k);
                  if ( idx >= 0 ) {
                     events[idx] = new Event(v,k); // replace existing event with updated one
                  } else {
                     events.push(new Event(v,k)); // add new event to list
                  }
               }
            });

            return events;
         }

         function getEvents() {
            return events;
         }

         return {
            events: getEvents
         ,  updateEvent: updateEvent
         ,  setEvents: setEvents
         };
      }])

      .factory('loginService', ['$rootScope', '$firebaseAuth', 'firebaseRef', 'profileCreator', '$timeout',
         function($rootScope, $firebaseAuth, firebaseRef, profileCreator, $timeout) {
            var auth = null;
            return {
               init: function(path) {
                  return auth = $firebaseAuth(firebaseRef(), {path: path});
               },

               /**
                * @param {string} email
                * @param {string} pass
                * @param {Function} [callback]
                * @returns {*}
                */
               login: function(email, pass, callback) {
                  assertAuth();
                  auth.$login('password', {
                     email: email,
                     password: pass,
                     rememberMe: true
                  }).then(function(user) {
                     if( callback ) {
                        //todo-bug https://github.com/firebase/angularFire/issues/199
                        $timeout(function() {
                           callback(null, user);
                        });
                     }
                  }, callback);
               },

               logout: function() {
                  assertAuth();
                  auth.$logout();
               },

               changePassword: function(opts) {
                  assertAuth();
                  var cb = opts.callback || function() {};
                  if( !opts.oldpass || !opts.newpass ) {
                     $timeout(function(){ cb('Please enter a password'); });
                  }
                  else if( opts.newpass !== opts.confirm ) {
                     $timeout(function() { cb('Passwords do not match'); });
                  }
                  else {
                     auth.$changePassword(opts.email, opts.oldpass, opts.newpass, cb);
                  }
               },

               createAccount: function(email, pass, callback) {
                  assertAuth();
                  auth.$createUser(email, pass, callback);
               },

               createProfile: profileCreator
            };

            function assertAuth() {
               if( auth === null ) { throw new Error('Must call loginService.init() before using its methods'); }
            }
         }])

      .factory('profileCreator', ['firebaseRef', '$timeout', function(firebaseRef, $timeout) {
         return function(id, email, callback) {
            firebaseRef('users/'+id).set({email: email, name: firstPartOfEmail(email)}, function(err) {
               //err && console.error(err);
               if( callback ) {
                  $timeout(function() {
                     callback(err);
                  })
               }
            });

            function firstPartOfEmail(email) {
               return ucfirst(email.substr(0, email.indexOf('@'))||'');
            }

            function ucfirst (str) {
               // credits: http://kevin.vanzonneveld.net
               str += '';
               var f = str.charAt(0).toUpperCase();
               return f + str.substr(1);
            }
         }
      }]);

   function errMsg(err) {
      return err? typeof(err) === 'object'? '['+err.code+'] ' + err.toString() : err+'' : null;
   }

   function pathRef(args) {
      for(var i=0; i < args.length; i++) {
         if( typeof(args[i]) === 'object' ) {
            args[i] = pathRef(args[i]);
         }
      }
      return args.join('/');
   }
})();

