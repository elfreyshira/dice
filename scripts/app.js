var app = angular.module('dice', ['angular.directives-round-progress']);

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

app.controller('DiceController', function($scope, $timeout, finiteListBias, equalSpreadBias) {

	// var roller = finiteListBias;
	var roller = equalSpreadBias;

	$scope.roundProgressData = {
		label: "Hold",
		percentage: 0
	};

	$scope.increasing = false;

	$scope.increase = function() {
		$scope.increasing = true;
		function progress() {
			if ($scope.roundProgressData.percentage < 1.0 && $scope.increasing) {

				$scope.roundProgressData.percentage = Math.min(
					$scope.roundProgressData.percentage + .04,
					1.0
				);

				if ($scope.roundProgressData.percentage >= 1.0) {
					$scope.roundProgressData.label = roller.roll();
				}

				$timeout(function(){
					progress();
				}, 10);
			}
		}
		progress();
	};

	$scope.decrease = function() {
		$scope.increasing = false;
		function progress() {
			if ($scope.roundProgressData.percentage > 0 && !$scope.increasing) {

				$scope.roundProgressData.percentage = Math.max(
					$scope.roundProgressData.percentage - .06,
					0.0
				);
				$timeout(function(){
					progress();
				}, 10);
			}
		}
		progress();
	};


});






// https://www.google.com/search?q=radial+progress+bar&oq=radial+progress+bar&aqs=chrome..69i57j0l5.3261j0j7&
// sourceid=chrome&espv=210&es_sm=91&ie=UTF-8

