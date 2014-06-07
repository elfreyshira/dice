var app = angular.module('dice',
	[
		'angular.directives-round-progress',
		'ngTouch'
	]);

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

	var originalDistributionAverage = averageValueChosen(originalMappedValues);
	
	var currentMappedValues = _.mapValues(originalMappedValues, function(distributionValue) {
		return distributionValue * originalDistributionAverage;
	});

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

	function roll() {
		var valueToRedistribute = averageValueChosen(currentMappedValues);
		var numberRolled = pickNumberFromDistribution(currentMappedValues, function(distributionValue) {
			return distributionValue >= valueToRedistribute
		});

		shiftValues(numberRolled, valueToRedistribute);

		// rollHistory[numberRolled] += 1;

		return numberRolled;
	}

	//////////////////////////////
	//////////////////////////////
	// rollHistory = _.reduce(possibleValues, function(result, num) {
	// 		result[num] = 0;
	// 		return result;
	// 	}, {});

	// $window.showState = function() {
	// 	console.log('rollHistory');
	// 	console.log(rollHistory);

	// 	console.log('currentMappedValues');
	// 	console.log(currentMappedValues);

	// 	// console.log('rollHistory');
	// 	// console.log(rollHistory);
	// };

	// $window.roll = function() {
	// 	roll();
	// }

	////////////////////////////
	////////////////////////////

	return {
		roll: roll
	};


});

app.service('finiteListBias', function() {
	var startArr = [];
	for (var i = 1; i <= 6; i++ ) {
		for (var j = 1; j <= 6; j++) {
			startArr.push(i + j);
		}
	}
	var startLength = startArr.length;

	var currentArr = startArr.slice();

	function roll() {

		if (currentArr.length < startLength/2) {
			currentArr = currentArr.concat(startArr);
		}

		var index = Math.floor(Math.random()*currentArr.length);
		var temp = currentArr[0];
		currentArr[0] = currentArr[index];
		currentArr[index] = temp;

		return currentArr.shift();
	}

	return {
		roll: roll
	};

});

app.service('equalSpreadBias', function($window) {
	var startArr,
	total,
	currentArr,
	possibleValues,
	originalMappedValues,
	currentMappedValues,
	rollHistory;

	function reset() {
		startArr = [];
		for (var i = 1; i <= 6; i++ ) {
			for (var j = 1; j <= 6; j++) {
				startArr.push(i + j);
			}
		}
		total = startArr.length;
		currentArr = startArr.slice();
		possibleValues = _.unique(startArr);
		originalMappedValues = _.countBy(startArr);
		currentMappedValues = _.countBy(currentArr);
		rollHistory = _.reduce(
			possibleValues,
			function(result, num) {
				result[num] = 0;
				return result;
			},
			{}
			);
	}

	reset();

	function shiftValues(numberRolled) {
		currentMappedValues[numberRolled] -= 1;
		possibleValues.forEach(function(val) {
			if (val !== numberRolled) {
				var addedValue = originalMappedValues[val] / 36.0;
				var extraValueFromRolledProportion = addedValue
				* originalMappedValues[numberRolled] / (36.0 - originalMappedValues[numberRolled]);
				currentMappedValues[val] += (addedValue + extraValueFromRolledProportion);
			}
		});
	}

	function rollSlave() {
		var rawRoll = Math.random() * total;
		var currentSum = 0;

		var rolled;
		for (var i = 0; i < possibleValues.length; i++) {
			var value = possibleValues[i];
			if (currentSum + currentMappedValues[value] > rawRoll) {
				return value;
			}
			currentSum += currentMappedValues[value];
		}
	}

	function rollHelper() {
		var numberRolled = rollSlave();
		if (currentMappedValues[numberRolled] >= originalMappedValues[numberRolled]) {
			shiftValues(numberRolled);
			return numberRolled;
		}
		else {
			return rollHelper();
		}
	}

	function roll() {
		var numberRolled = rollHelper();
		rollHistory[numberRolled] += 1;
		return numberRolled;
	}

	(function() {
		// comment out when debugging
		// return;
		$window.showState = function() {
			console.log(currentMappedValues);
			console.log(rollHistory);
		};
		$window.reset = reset;
		$window.roll = function() {
			console.log(roll());
			$window.showState();
		};
	})();

	return {
		roll: roll
	}

});

app.controller('DiceController', function($scope, $timeout, $interval, equalChanceDistributionBias) {

	var roller = equalChanceDistributionBias;

	$scope.roundProgressData = {
		label: "Hold",
		percentage: 0
	};

	$scope.increasing = false;

	var disableTouch = false;
	$scope.increase = function() {

		if (!disableTouch && $scope.roundProgressData.percentage < 1.0) {
			$scope.roundProgressData.percentage = Math.min(
				$scope.roundProgressData.percentage + 0.6,
				1.0
			);

			var decreaseInterval = $interval(function() {
				$scope.roundProgressData.percentage = Math.max(
					$scope.roundProgressData.percentage - .005,
					0.0
				);
				if ($scope.roundProgressData.percentage <= 0) {
					$interval.cancel(decreaseInterval);
				}
			}, 10)

			// Roll after it's full
			if ($scope.roundProgressData.percentage >= 1.0) {
				disableTouch = true;
				$scope.roundProgressData.label = roller.roll();

				$timeout(function() {
					disableTouch = false;
				}, 1000);
			}
		}

	};

});
