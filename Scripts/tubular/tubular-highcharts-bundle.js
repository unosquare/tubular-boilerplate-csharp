/**
 * highcharts-ng
 * @version v0.0.13 - 2016-10-04
 * @link https://github.com/pablojim/highcharts-ng
 * @author Barry Fitzgerald <>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports){
  module.exports = 'highcharts-ng';
}

(function () {
  'use strict';
  /*global angular: false, Highcharts: false */


  angular.module('highcharts-ng', [])
    .factory('highchartsNG', ['$q', '$window', highchartsNG])
    .directive('highchart', ['highchartsNG', '$timeout', highchart]);

  //IE8 support
  function indexOf(arr, find, i /*opt*/) {
    if (i === undefined) i = 0;
    if (i < 0) i += arr.length;
    if (i < 0) i = 0;
    for (var n = arr.length; i < n; i++)
      if (i in arr && arr[i] === find)
        return i;
    return -1;
  }

  function prependMethod(obj, method, func) {
    var original = obj[method];
    obj[method] = function () {
      var args = Array.prototype.slice.call(arguments);
      func.apply(this, args);
      if (original) {
        return original.apply(this, args);
      } else {
        return;
      }

    };
  }

  function deepExtend(destination, source) {
    //Slightly strange behaviour in edge cases (e.g. passing in non objects)
    //But does the job for current use cases.
    if (angular.isArray(source)) {
      destination = angular.isArray(destination) ? destination : [];
      for (var i = 0; i < source.length; i++) {
        destination[i] = deepExtend(destination[i] || {}, source[i]);
      }
    } else if (angular.isObject(source)) {
      destination = angular.isObject(destination) ? destination : {};
      for (var property in source) {
        destination[property] = deepExtend(destination[property] || {}, source[property]);
      }
    } else {
      destination = source;
    }
    return destination;
  }

  function highchartsNG($q, $window) {
    var highchartsProm = $q.when($window.Highcharts);

    function getHighchartsOnce() {
      return highchartsProm;
    }

    return {
      getHighcharts: getHighchartsOnce,
      ready: function ready(callback, thisArg) {
        getHighchartsOnce().then(function() {
          callback.call(thisArg);
        });
      }
    };
  }

  function highchart(highchartsNGUtils, $timeout) {

    // acceptable shared state
    var seriesId = 0;
    var ensureIds = function (series) {
      var changed = false;
      angular.forEach(series, function(s) {
        if (!angular.isDefined(s.id)) {
          s.id = 'series-' + seriesId++;
          changed = true;
        }
      });
      return changed;
    };

    // immutable
    var axisNames = [ 'xAxis', 'yAxis' ];
    var chartTypeMap = {
      'stock': 'StockChart',
      'map':   'Map',
      'chart': 'Chart'
    };

    var getMergedOptions = function (scope, element, config) {
      var mergedOptions = {};

      var defaultOptions = {
        chart: {
          events: {}
        },
        title: {},
        subtitle: {},
        series: [],
        credits: {},
        plotOptions: {},
        navigator: {enabled: false},
        xAxis: {
          events: {}
        },
        yAxis: {
          events: {}
        }
      };

      if (config.options) {
        mergedOptions = deepExtend(defaultOptions, config.options);
      } else {
        mergedOptions = defaultOptions;
      }
      mergedOptions.chart.renderTo = element[0];

      angular.forEach(axisNames, function(axisName) {
        if(angular.isDefined(config[axisName])) {
          mergedOptions[axisName] = deepExtend(mergedOptions[axisName] || {}, config[axisName]);

          if(angular.isDefined(config[axisName].currentMin) ||
              angular.isDefined(config[axisName].currentMax)) {

            prependMethod(mergedOptions.chart.events, 'selection', function(e){
              var thisChart = this;
              if (e[axisName]) {
                scope.$apply(function () {
                  scope.config[axisName].currentMin = e[axisName][0].min;
                  scope.config[axisName].currentMax = e[axisName][0].max;
                });
              } else {
                //handle reset button - zoom out to all
                scope.$apply(function () {
                  scope.config[axisName].currentMin = thisChart[axisName][0].dataMin;
                  scope.config[axisName].currentMax = thisChart[axisName][0].dataMax;
                });
              }
            });

            prependMethod(mergedOptions.chart.events, 'addSeries', function(e){
              scope.config[axisName].currentMin = this[axisName][0].min || scope.config[axisName].currentMin;
              scope.config[axisName].currentMax = this[axisName][0].max || scope.config[axisName].currentMax;
            });
            prependMethod(mergedOptions[axisName].events, 'setExtremes', function (e) {
              if (e.trigger && e.trigger !== 'zoom') { // zoom trigger is handled by selection event
                $timeout(function () {
                  scope.config[axisName].currentMin = e.min;
                  scope.config[axisName].currentMax = e.max;
                  scope.config[axisName].min = e.min; // set min and max to adjust scrollbar/navigator
                  scope.config[axisName].max = e.max;
                }, 0);
              }
            });
          }
        }
      });

      if(config.title) {
        mergedOptions.title = config.title;
      }
      if (config.subtitle) {
        mergedOptions.subtitle = config.subtitle;
      }
      if (config.credits) {
        mergedOptions.credits = config.credits;
      }
      if(config.size) {
        if (config.size.width) {
          mergedOptions.chart.width = config.size.width;
        }
        if (config.size.height) {
          mergedOptions.chart.height = config.size.height;
        }
      }
      return mergedOptions;
    };

    var updateZoom = function (axis, modelAxis) {
      var extremes = axis.getExtremes();
      if(modelAxis.currentMin !== extremes.dataMin || modelAxis.currentMax !== extremes.dataMax) {
        if (axis.setExtremes) {
          axis.setExtremes(modelAxis.currentMin, modelAxis.currentMax, false);
        } else {
          axis.detachedsetExtremes(modelAxis.currentMin, modelAxis.currentMax, false);
        }
      }
    };

    var processExtremes = function(chart, axis, axisName) {
      if(axis.currentMin || axis.currentMax) {
        chart[axisName][0].setExtremes(axis.currentMin, axis.currentMax, true);
      }
    };

    var chartOptionsWithoutEasyOptions = function (options) {
      return angular.extend(
        deepExtend({}, options),
        { data: null, visible: null }
      );
    };

    var getChartType = function(scope) {
      if (scope.config === undefined) return 'Chart';
      return chartTypeMap[('' + scope.config.chartType).toLowerCase()] ||
             (scope.config.useHighStocks ? 'StockChart' : 'Chart');
    };

    function linkWithHighcharts(Highcharts, scope, element, attrs) {
      // We keep some chart-specific variables here as a closure
      // instead of storing them on 'scope'.

      // prevSeriesOptions is maintained by processSeries
      var prevSeriesOptions = {};
      // chart is maintained by initChart
      var chart = false;

      var processSeries = function(series, seriesOld) {
        var i;
        var ids = [];

        if(series) {
          var setIds = ensureIds(series);
          if(setIds && !scope.disableDataWatch) {
            //If we have set some ids this will trigger another digest cycle.
            //In this scenario just return early and let the next cycle take care of changes
            return false;
          }

          //Find series to add or update
          angular.forEach(series, function(s, idx) {
            ids.push(s.id);
            var chartSeries = chart.get(s.id);
            if (chartSeries) {
              if (!angular.equals(prevSeriesOptions[s.id], chartOptionsWithoutEasyOptions(s))) {
                chartSeries.update(angular.copy(s), false);
              } else {
                if (s.visible !== undefined && chartSeries.visible !== s.visible) {
                  chartSeries.setVisible(s.visible, false);
                }
                
                // Make sure the current series index can be accessed in seriesOld
                if (idx < seriesOld.length) {
                  var sOld = seriesOld[idx];
                  var sCopy = angular.copy(sOld);
                  
                  // Get the latest data point from the new series
                  var ptNew = s.data[s.data.length - 1];
                  
                  // Check if the new and old series are identical with the latest data point added
                  // If so, call addPoint without shifting
                  sCopy.data.push(ptNew);
                  if (angular.equals(sCopy, s)) {
                    chartSeries.addPoint(ptNew, false);
                  }
                  
                  // Check if the data change was a push and shift operation
                  // If so, call addPoint WITH shifting
                  else {
                    sCopy.data.shift();
                    if (angular.equals(sCopy, s)) {
                      chartSeries.addPoint(ptNew, false, true);
                    }
                    else {
                      chartSeries.setData(angular.copy(s.data), false);
                    }
                  }
                }
                else {
                  chartSeries.setData(angular.copy(s.data), false);
                }
              }
            } else {
              chart.addSeries(angular.copy(s), false);
            }
            prevSeriesOptions[s.id] = chartOptionsWithoutEasyOptions(s);
          });

          //  Shows no data text if all series are empty
          if(scope.config.noData) {
            var chartContainsData = false;

            for(i = 0; i < series.length; i++) {
              if (series[i].data && series[i].data.length > 0) {
                chartContainsData = true;

                break;
              }
            }

            if (!chartContainsData) {
              chart.showLoading(scope.config.noData);
            } else {
              chart.hideLoading();
            }
          }
        }

        //Now remove any missing series
        for(i = chart.series.length - 1; i >= 0; i--) {
          var s = chart.series[i];
          if (s.options.id !== 'highcharts-navigator-series' && indexOf(ids, s.options.id) < 0) {
            s.remove(false);
          }
        }

        return true;
      };

      var initChart = function() {
        if (chart) chart.destroy();
        prevSeriesOptions = {};
        var config = scope.config || {};
        var mergedOptions = getMergedOptions(scope, element, config);
        var func = config.func || undefined;
        var chartType = getChartType(scope);

        chart = new Highcharts[chartType](mergedOptions, func);

        for (var i = 0; i < axisNames.length; i++) {
          if (config[axisNames[i]]) {
            processExtremes(chart, config[axisNames[i]], axisNames[i]);
          }
        }
        if(config.loading) {
          chart.showLoading();
        }
        config.getHighcharts = function() {
          return chart;
        };

      };
      initChart();


      if(scope.disableDataWatch){
        scope.$watchCollection('config.series', function (newSeries, oldSeries) {
          processSeries(newSeries);
          chart.redraw();
        });
      } else {
        scope.$watch('config.series', function (newSeries, oldSeries) {
          var needsRedraw = processSeries(newSeries, oldSeries);
          if(needsRedraw) {
            chart.redraw();
          }
        }, true);
      }

      scope.$watch('config.title', function (newTitle) {
        chart.setTitle(newTitle, true);
      }, true);

      scope.$watch('config.subtitle', function (newSubtitle) {
        chart.setTitle(true, newSubtitle);
      }, true);

      scope.$watch('config.loading', function (loading) {
        if(loading) {
          chart.showLoading(loading === true ? null : loading);
        } else {
          chart.hideLoading();
        }
      });
      scope.$watch('config.noData', function (noData) {
        if(scope.config && scope.config.loading) {
          chart.showLoading(noData);
        }
      }, true);

      scope.$watch('config.credits.enabled', function (enabled) {
        if (enabled) {
          chart.credits.show();
        } else if (chart.credits) {
          chart.credits.hide();
        }
      });

      scope.$watch(getChartType, function (chartType, oldChartType) {
        if (chartType === oldChartType) return;
        initChart();
      });

      angular.forEach(axisNames, function(axisName) {
        scope.$watch('config.' + axisName, function(newAxes) {
          if (!newAxes) {
            return;
          }

          if (angular.isArray(newAxes)) {

            for (var axisIndex = 0; axisIndex < newAxes.length; axisIndex++) {
              var axis = newAxes[axisIndex];

              if (axisIndex < chart[axisName].length) {
                chart[axisName][axisIndex].update(axis, false);
                updateZoom(chart[axisName][axisIndex], angular.copy(axis));
              }

            }

          } else {
            // update single axis
            chart[axisName][0].update(newAxes, false);
            updateZoom(chart[axisName][0], angular.copy(newAxes));
          }

          chart.redraw();
        }, true);
      });
      scope.$watch('config.options', function (newOptions, oldOptions, scope) {
        //do nothing when called on registration
        if (newOptions === oldOptions) return;
        initChart();
        processSeries(scope.config.series);
        chart.redraw();
      }, true);

      scope.$watch('config.size', function (newSize, oldSize) {
        if(newSize === oldSize) return;
        if(newSize) {
          chart.setSize(newSize.width || chart.chartWidth, newSize.height || chart.chartHeight);
        }
      }, true);

      scope.$on('highchartsng.reflow', function () {
        chart.reflow();
      });

      scope.$on('$destroy', function() {
        if (chart) {
          try{
            chart.destroy();
          }catch(ex){
            // fail silently as highcharts will throw exception if element doesn't exist
          }

          $timeout(function(){
            element.remove();
          }, 0);
        }
      });
    }

    function link(scope, element, attrs) {
      function highchartsCb(Highcharts) {
        linkWithHighcharts(Highcharts, scope, element, attrs);
      }
      highchartsNGUtils
        .getHighcharts()
        .then(highchartsCb);
    }

    return {
      restrict: 'EAC',
      replace: true,
      template: '<div></div>',
      scope: {
        config: '=',
        disableDataWatch: '='
      },
      link: link
    };
  }
}());

(function (angular) {
    'use strict';

    angular.module('tubular-hchart.directives', ['tubular.services', 'highcharts-ng'])
        /**
         * @ngdoc component
         * @name tbHighcharts
         *
         * @description
         * The `tbHighcharts` component is the base to create any Highcharts component.
         * 
         * @param {string} serverUrl Set the HTTP URL where the data comes.
         * @param {string} chartName Defines the chart name.
         * @param {string} chartType Defines the chart type.
         * @param {string} title Defines the title.
         * @param {bool} requireAuthentication Set if authentication check must be executed, default true.
         * @param {function} onLoad Defines a method to run in chart data load
         * @param {string} emptyMessage The empty message.
         * @param {string} errorMessage The error message.
         * @param {object} options The Highcharts options method.
         */
        .component('tbHighcharts', {
            template: '<div class="tubular-chart">' +
                '<highchart config="$ctrl.options" ng-hide="$ctrl.isEmpty || $ctrl.hasError">' +
                '</highchart>' +
                '<div class="alert alert-info" ng-show="$ctrl.isEmpty">{{$ctrl.emptyMessage}}</div>' +
                '<div class="alert alert-warning" ng-show="$ctrl.hasError">{{$ctrl.errorMessage}}</div>' +
                '</div>',
            bindings: {
                serverUrl: '@',
                title: '@?',
                requireAuthentication: '=?',
                name: '@?chartName',
                chartType: '@?',
                emptyMessage: '@?',
                errorMessage: '@?',
                onLoad: '=?',
                options: '=?',
                onClick: '=?'
            },
            controller: [
                '$scope', 'tubularHttp', '$timeout', 'tubularConfig',
                function ($scope, tubularHttp, $timeout, tubularConfig) {
                    var $ctrl = this;

                    $ctrl.dataService = tubularHttp.getDataService($ctrl.dataServiceName);
                    $ctrl.showLegend = angular.isUndefined($ctrl.showLegend) ? true : $ctrl.showLegend;
                    $ctrl.chartType = $ctrl.chartType || 'line';

                    $ctrl.options = angular.extend({}, $ctrl.options, {
                        options: {
                            chart: { type: $ctrl.chartType },
                            plotOptions: {
                                pie: {
                                    point: {
                                        events: {
                                            click: ($ctrl.onClick || angular.noop)
                                        }
                                    }
                                },
                                series: {
                                    point: {
                                        events: {
                                            click: ($ctrl.onClick || angular.noop)
                                        }
                                    }
                                }
                            }
                        },
                        title: { text: $ctrl.title || '' },
                        xAxis: {
                            categories: []
                        },
                        yAxis: {},
                        series: []
                    });

                    // Setup require authentication
                    $ctrl.requireAuthentication = angular.isUndefined($ctrl.requireAuthentication) ? true : $ctrl.requireAuthentication;

                    $ctrl.loadData = function () {
                        tubularConfig.webApi.requireAuthentication($ctrl.requireAuthentication);
                        $ctrl.hasError = false;

                        tubularHttp.get($ctrl.serverUrl).then($ctrl.handleData, function (error) {
                            $scope.$emit('tbChart_OnConnectionError', error);
                            $ctrl.hasError = true;
                        });
                    };

                    $ctrl.handleData = function (data) {
                        if (!data || !data.Data || data.Data.length === 0) {
                            $ctrl.isEmpty = true;
                            $ctrl.options.series = [{ data: [] }];

                            if ($ctrl.onLoad) {
                                $ctrl.onLoad($ctrl.options, {});
                            }

                            return;
                        }

                        $ctrl.isEmpty = false;

                        if (data.Series) {
                            $ctrl.options.xAxis.categories = data.Labels;
                            $ctrl.options.series = data.Series.map(function (el, ix) {
                                return {
                                    name: el,
                                    data: data.Data[ix]
                                };
                            });
                        } else {
                            var uniqueSerie = data.Labels.map(function (el, ix) {
                                return {
                                    name: el,
                                    y: data.Data[ix]
                                };
                            });

                            $ctrl.options.series = [{ name: data.SerieName || '', data: uniqueSerie, showInLegend: (data.SerieName || '') !== '' }];
                        }

                        if ($ctrl.onLoad) {
                            $timeout(function () {
                                $ctrl.onLoad($ctrl.options, {}, $ctrl.options.getHighcharts().series);
                            }, 100);

                            $ctrl.onLoad($ctrl.options, {}, null);
                        }
                    };

                    $scope.$watch('$ctrl.serverUrl', function (val) {
                        if (angular.isDefined(val) && val != null && val !== '') {
                            $ctrl.loadData();
                        }
                    });

                    $scope.$watch('$ctrl.chartType', function (val) {
                        if (angular.isDefined(val) && val != null) {
                            $ctrl.options.options.chart.type = val;
                        }
                    });
                }
            ]
        });
})(angular);