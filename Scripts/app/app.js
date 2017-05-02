﻿(function(angular) {
    'use strict';

    angular.module('app', [
        'ngRoute',
        'tubular',
        'ui.bootstrap',
        'toastr'
    ]).config([
        '$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: '/ui/views/home.html',
                    title: 'Home',
                    print: true
                }).when('/Something', {
                    templateUrl: '/ui/views/something.html',
                    title: 'Something'
                }).when('/Link', {
                    templateUrl: '/ui/views/link.html',
                    title: 'Link'
                }).when('/Login', {
                    templateUrl: '/ui/views/login.html',
                    title: 'Login'
                }).otherwise({
                    redirectTo: '/'
                });

            $locationProvider.html5Mode(true);
        }
    ]).service('alerts', [
        '$filter', 'toastr', function($filter, toastr) {
            var me = this;

            me.previousError = '';

            me.defaultErrorHandler = function(error) {
                var errorMessage = $filter('errormessage')(error);

                // Ignores same error
                if (me.previousError == errorMessage) return;

                me.previousError = errorMessage;

                // Ignores Unauthorized error because it's redirecting to login
                if (errorMessage != 'Unauthorized') {
                    toastr.error(errorMessage);
                }
            };
        }
    ]).controller('GenericCtrl', [
        '$scope', 'alerts', '$routeParams', function($scope, alerts, $routeParams) {
            $scope.senderKey = $routeParams.senderkey || '';

            $scope.$on('tbForm_OnConnectionError', function(ev, error) { alerts.defaultErrorHandler(error); });
            $scope.$on('tbGrid_OnConnectionError', function(ev, error) { alerts.defaultErrorHandler(error); });
        }
    ]).controller('TitleCtrl', [
        '$scope', '$route', '$location', 'tubularHttp', '$routeParams',
        function($scope, $route, $location, tubularHttp, $routeParams) {
            var me = this;
            me.content = 'Sample';
            me.pageTitle = 'Loading . . .';
            me.key = 'Loading . . .';

            $scope.$on('$routeChangeSuccess', function() {
                $scope.subheader = null;

                me.key = $route.current.title;
                me.pageTitle = me.key;
                if ($routeParams.param) me.pageTitle += ' - ' + $routeParams.param;
                me.content = me.pageTitle + ' - Sample';

                if ($route.current.title != 'Login' && tubularHttp.isAuthenticated() === false) {
                    $location.path('/Login');
                }
            });
        }
    ]).controller('NavCtrl', [
        '$scope', '$route', function($scope, $route) {
            $scope.hightlight = '';
            $scope.showMenu = false;

            $scope.$on('$routeChangeSuccess', function() {
                $scope.hightlight = $route.current.title;

                $scope.showMenu = $route.current.title !== 'Login';
            });

            $scope.menu = [
                { icon: 'fa-dashboard', title: 'Home', path: '/' },
                { icon: 'fa-desktop', title: 'Another link', path: '/Something' },
                { icon: 'fa-puzzle-piece', title: 'One link', path: '/Link' }
            ];
        }
    ]).controller('LoginCtrl', [
        '$scope', '$location', 'tubularHttp', 'toastr', function($scope, $location, tubularHttp, toastr) {
            $scope.loading = false;

            $scope.submitForm = function(valid) {
                if (valid == false) {
                    toastr.error('Please complete form');
                }

                $scope.loading = true;

                tubularHttp.authenticate($scope.username, $scope.password).then($scope.redirectHome, function(error) {
                    $scope.loading = false;
                    toastr.error(error);
                });
            };

            $scope.redirectHome = function() {
                $location.path('/');
            };
        }
    ]);
})(window.angular);