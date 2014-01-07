module.exports = function(config){
   config.set({
      basePath : '../',

      files : [
         'http://static.firebase.com/v0/firebase.js',
         'https://cdn.firebase.com/v0/firebase-simple-login.js',
         'http://ajax.googleapis.com/ajax/libs/angularjs/1.2.7/angular.js',
         'http://ajax.googleapis.com/ajax/libs/angularjs/1.2.7/angular-route.js',
         'test/lib/angular/angular-mocks.js',
         'app/js/**/*.js',
         'test/unit/**/*.js'
      ],

      exclude : [
         'app/lib/angular/angular-loader.js',
         'app/lib/angular/*.min.js',
         'app/lib/angular/angular-scenario.js'
      ],

      autoWatch : true,

      frameworks: ['jasmine'],

      browsers : ['Chrome'],

      plugins : [
         'karma-junit-reporter',
         'karma-chrome-launcher',
         'karma-firefox-launcher',
         'karma-jasmine'
      ],

      junitReporter : {
         outputFile: 'test_out/unit.xml',
         suite: 'unit'
      }

   })}
