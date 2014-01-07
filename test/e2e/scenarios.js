'use strict';

/* http://docs.angularjs.org/guide/dev_guide.e2e-testing */

angular.scenario.dsl('angularFireLogout', function() {
   return function() {
      this.addFutureAction('Logging out', function($window, $document, done) {
         var fbRef = $document.injector().get('firebaseRef');
         var $firebaseAuth = $document.injector().get('$firebaseAuth');
         $firebaseAuth(fbRef()).$logout();
         done(null, true);
      });
   }
});

describe('opencare app', function() {

   beforeEach(function() {
      browser().navigateTo('../../app/index.html');
   });


   it('should automatically redirect to /profile when location hash/fragment is empty', function() {
      this.addFutureAction('authenticate', function($window, $document, done) {
         var loginService = $document.injector().get('loginService');
         loginService.login('test@test.com', 'test123', done);
      });
      expect(browser().location().url()).toBe("/profile");
   });

   describe('profile', function() {
      afterEach(function() {
         angularFireLogout();
      });

      it('should redirect to /login if not logged in', function() {
         browser().navigateTo('#/profile');
         expect(browser().window().hash()).toBe('/login');
      });

      it('should stay on profile screen if authenticated', function() {
         this.addFutureAction('authenticate', function($window, $document, done) {
            var loginService = $document.injector().get('loginService');
            loginService.login('test@test.com', 'test123', done);
         });
         browser().navigateTo('#/profile');
         expect(browser().window().hash()).toBe('/profile');

         expect(element('[ng-view] form:first').attr('class')).
         toMatch(/ *profile */);
      });
   });

   describe('schedule', function() {
      afterEach(function() {
         angularFireLogout();
      });

      it('should redirect to /login if not logged in', function() {
         browser().navigateTo('#/schedule');
         expect(browser().window().hash()).toBe('/login');
      });

      it('should stay on profile screen if authenticated', function() {
         this.addFutureAction('authenticate', function($window, $document, done) {
            var loginService = $document.injector().get('loginService');
            loginService.login('test@test.com', 'test123', done);
         });
         browser().navigateTo('#/schedule');
         expect(browser().window().hash()).toBe('/schedule');

         expect(element('[ng-view] h4:first').text()).
         toMatch(/New Appointments/);
      });
   });

   describe('login', function() {
      afterEach(function() {
         angularFireLogout();
      });

      it('should render login when user navigates to /login', function() {
         browser().navigateTo('#/login');
         expect(element('[ng-view] form:first').attr('class')).
         toMatch(/ *login */);
      });

      it('should show error if no email', function() {
         browser().navigateTo('#/login');
         expect(element('div.alert span').text()).toEqual('');
         input('email').enter('');
         input('pass').enter('test123');
         element('button[ng-click="login()"]').click();
         expect(element('div.alert').text()).not().toEqual('');
      });

      it('should show error if no password', function() {
         browser().navigateTo('#/login');
         expect(element('div.alert span').text()).toEqual('');
         input('email').enter('test@test.com');
         input('pass').enter('');
         element('button[ng-click="login()"]').click();
         expect(element('div.alert').text()).not().toEqual('')
      });

      it('should log in with valid fields', function() {
         browser().navigateTo('#/login');
         input('email').enter('test@test.com');
         input('pass').enter('test123');
         element('button[ng-click="login()"]').click();
         expect(element('div.alert span').text()).toEqual('');
      });
   });
});
