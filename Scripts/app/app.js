(function() {
    'use strict';

    angular.module('app', [
        'ngRoute',
        'tubular',
        'ui.bootstrap'
    ]).config([
        '$httpProvider', function($httpProvider) {
            $httpProvider.interceptors.push('noCacheInterceptor');
        }
    ]).config([
        '$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: '/ui/views/home.html',
                    title: 'Home',
                    print: true
                }).when('/Login', {
                    templateUrl: '/ui/views/login.html',
                    title: 'Login'
                }).otherwise({
                    redirectTo: '/'
                });

            $locationProvider.html5Mode(true);
        }
    ]).factory('noCacheInterceptor', function() {
        return {
            request: function(config) {
                if (config.method == 'GET' && config.url.indexOf('.htm') === -1 && config.url.indexOf('blob:') === -1) {
                    var separator = config.url.indexOf('?') === -1 ? '?' : '&';
                    config.url = config.url + separator + 'noCache=' + new Date().getTime();
                }
                return config;
            }
        };
    }).service('alerts', [
        '$filter', function alerts($filter) {
            var me = this;

            me.previousError = '';

            me.defaultErrorHandler = function(error) {
                var errorMessage = $filter('errormessage')(error);

                // Ignores same error
                if (me.previousError == errorMessage) return;

                me.previousError = errorMessage;

                // Ignores Unauthorized error because it's redirecting to login
                if (errorMessage != "Unauthorized") {
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
            me.content = "Sample";
            me.pageTitle = "Loading . . .";
            me.key = "Loading . . .";

            $scope.$on('$routeChangeSuccess', function () {
                $scope.subheader = null;

                me.key = $route.current.title;
                me.pageTitle = me.key;
                if ($routeParams.param) me.pageTitle += " - " + $routeParams.param;
                me.content = me.pageTitle + " - Sample";

                if ($route.current.title != 'Login' && tubularHttp.isAuthenticated() == false) {
                    $location.path("/Login");
                }
            });
        }
    ]).controller('NavCtrl', [
        '$scope', '$route', function ($scope, $route) {
            $scope.hightlight = "";
            $scope.showMenu = false;

            $scope.$on('$routeChangeSuccess', function () {
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
        '$scope', '$location', 'tubularHttp', function ($scope, $location, tubularHttp) {
            $scope.loading = false;

            $scope.submitForm = function (valid) {
                if (valid == false) {
                    toastr.error("Please complete form");
                }

                $scope.loading = true;

                tubularHttp.authenticate($scope.username, $scope.password, $scope.redirectHome, function (error) {
                    $scope.loading = false;
                    toastr.error(error);
                }, true);
            };

            $scope.redirectHome = function () {
                $location.path("/");
                $("#wrapper").removeClass('toggled');
                $("#menu-toggle").show();
            };

            $("#wrapper").addClass('toggled');
            $("#menu-toggle").hide();
        }
    ]);
})();