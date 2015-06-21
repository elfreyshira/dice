var app = angular.module('dice',
    [
        'angular.directives-round-progress',
        'ngTouch'
    ]
);

app.factory('pickNumberFromDistribution', function() {

    var alwaysTrue = _.constant(true);

    /*
    Takes in a distribution and randomly picks a value from it
    - distribution {Object} mapping of number to probability distribution
    - meetCriteria {Function} takes distribution value and returns boolean
    */
    return function pickNumberFromDistribution(distribution, meetCriteria) {

        meetCriteria = meetCriteria || alwaysTrue;

        var sumTotal = _.reduce(distribution, function(sum, number) {
            return sum + number;
        }, 0);

        var possibleValues = _.keys(distribution);

        var rawRoll = Math.random() * sumTotal;
        var currentSum = 0;

        for (var i = 0; i < possibleValues.length; i++) {
            var number = possibleValues[i];
            var distributionValue = distribution[number];
            currentSum += distributionValue;
            if (currentSum > rawRoll) {
                if (meetCriteria(distributionValue)) {
                    return number;
                }
                else {
                    return pickNumberFromDistribution(distribution, meetCriteria);
                }
            }
        }
    };
});

app.service('equalChanceDistributionBias', function($window, pickNumberFromDistribution) {

    var startArr = [];
    for (var i = 1; i <= 6; i++ ) {
        for (var j = 1; j <= 6; j++) {
            startArr.push(i + j);
        }
    }
    var possibleValues = _.unique(startArr);
    var originalMappedValues = _.countBy(startArr);

    // 36
    var sumTotal = startArr.length;

    /*
        {
            2: 1/36,
            ...
            7: 6/26,
            ...
        }
    */
    var originalProbabilities = _.mapValues(originalMappedValues, function(number) {
        return number / sumTotal;
    });

    var currentMappedValues = _.cloneDeep(originalMappedValues);

    /*
    After each roll, the probability is taken down to 0 for that number.
    Given a mapping, this returns the average probability that will be distributed.

    Around 4.0556 for originalMappedValues
    */
    function averageValueChosen(mapping) {
        return _.reduce(mapping, function(sum, probability, number) {
            return sum + (probability * originalProbabilities[number]);
        }, 0);
    }

    function shiftValues(numberRolled, valueToRedistribute) {

        currentMappedValues[numberRolled] -= valueToRedistribute;
        _.forEach(possibleValues, function(number) {
            currentMappedValues[number] += valueToRedistribute * originalProbabilities[number];
        });

    }

    var previousNumber;
    var onRepeat = false;

    function meetRepeatCriteria(numberRolled) {
        if (onRepeat) {
            return true;
        }
        else if (previousNumber === numberRolled) {
            if (Math.random() <= originalProbabilities[numberRolled])*3 {
                onRepeat = false;
                return true
            }
            else {
                onRepeat = true;
                return false;
            }
        }
        else {
            previousNumber = numberRolled;
            onRepeat = false;
            return true;
        }
    }

    function roll() {
        var valueToRedistribute = averageValueChosen(currentMappedValues);
        var numberRolled = pickNumberFromDistribution(currentMappedValues);

        if (meetRepeatCriteria(numberRolled)) {
            shiftValues(numberRolled, valueToRedistribute);
            rollHistory[numberRolled] += 1;
            return numberRolled;
        }
        else {
            return roll();
        }

    }

    //////////////////////////////
    // Debugging purposes
    //////////////////////////////
   //  rollHistory = _.reduce(possibleValues, function(result, num) {
   //      result[num] = 0;
   //      return result;
   //  }, {});

   //  $window.showState = function() {
   //      console.log('rollHistory');
   //      console.log(rollHistory);

   //      console.log(averageValueChosen(currentMappedValues));

   //      console.log('currentMappedValues');
   //      console.log(currentMappedValues);
   //  };

   //  $window.roll = function() {
   //     roll();
   // }

    ////////////////////////////
    ////////////////////////////

    var rollHistory = _.reduce(possibleValues, function(result, num) {
        result[num] = 0;
        return result;
    }, {});

    return {
        roll: roll,
        rollHistory: rollHistory
    };

});

app.factory('getRollAudio', function() {

    var sounds = _.map([
        'ff-move',
        'mario-jump',
        'metal-gear-alarm',
        'sf-hadouken',
        'sonic-coin'
    ], function(mp3Title) {
        var audioObj = new Audio('resources/' + mp3Title + '.mp3');
        audioObj.preload = 'auto';
        return audioObj;
    });

    return function() {
        return _.sample(sounds);
    };

});

app.controller('DiceController', function($scope, $timeout, $interval, equalChanceDistributionBias, getRollAudio) {

    var roller = equalChanceDistributionBias;
    var INITIAL_LABEL = 'Tap';
    var HELPER_LABEL = 'Again';

    $scope.roundProgressData = {
        label: INITIAL_LABEL,
        percentage: 0
    };

    $scope.rollHistory = roller.rollHistory;

    var disableTouch = false;
    $scope.increase = function() {

        if($scope.roundProgressData.label === INITIAL_LABEL) {
            $scope.roundProgressData.label = HELPER_LABEL;
        }

        if (!disableTouch && $scope.roundProgressData.percentage < 1.0) {

            $scope.roundProgressData.percentage = Math.min(
                $scope.roundProgressData.percentage + 0.6,
                1.0
            );

            var decreaseInterval = $interval(function() {

                $scope.roundProgressData.percentage = Math.max(
                    $scope.roundProgressData.percentage - .01,
                    0.0
                );

                if ($scope.roundProgressData.percentage <= 0) {
                    $interval.cancel(decreaseInterval);
                    disableTouch = false;

                    if ($scope.roundProgressData.label === HELPER_LABEL) {
                        $scope.roundProgressData.label = INITIAL_LABEL;
                    }

                }
            }, 15)

            // Roll dice after it's full
            if ($scope.roundProgressData.percentage >= 1.0) {
                getRollAudio().play();
                disableTouch = true;
                $scope.roundProgressData.label = roller.roll();
            }
        }

    };

});


app.directive('bars', function ($parse) {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            data: '=',
        },
        template: '<div id="chart"></div>',
        link: function (scope, element, attrs) {
            
            var pairedData = _.pairs(scope.data);

            d3.select('#chart')
                .append('div').attr('class', 'chart')
                .selectAll('div')
                .data(pairedData).enter()
                .append('div').attr('class', function(d) {
                    return 'bar';
                })
                .transition().ease('elastic')
                .style('width', function(d) {
                    return d[1] + '%';
                })
                .text(function(d) {
                    return d[0];
                });

            scope.$watch('data', function(newDataObj, oldDataObj) {
                if (_.isEqual(newDataObj, oldDataObj)) {
                    return;
                }

                var newPairedData = _.pairs(newDataObj);
                var maxTimesNumberRolled = _.max(newPairedData, function(pair) {
                    return pair[1];
                })[1];

                d3.select('#chart')
                    .selectAll('div.bar')
                    .style('width', function(dataPair) {
                        var number = dataPair[0];
                        return (newDataObj[number] / maxTimesNumberRolled * 100) + '%';
                    });

            // the `true` means deep watch the object
            }, true);
        }
    };
});
