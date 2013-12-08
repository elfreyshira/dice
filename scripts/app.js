var app = angular.module('dice', ['angular.directives-round-progress']);

app.service('finiteListBias', function() {
	var startArr = [];
	for (i = 1; i <= 6; i++ ) {
		for (j = 1; j <= 6; j++) {
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

app.service('equalSpreadBias', function() {
	var startArr = [];
	for (i = 1; i <= 6; i++ ) {
		for (j = 1; j <= 6; j++) {
			startArr.push(i + j);
		}
	}
	var total = startArr.length;
	var currentArr = startArr.slice();
	var possibleValues = _.unique(startArr);
	var originalMappedValues = _.countBy(startArr);
	var currentMappedValues = _.countBy(currentArr);

	function shiftValues(numberRolled) {
		var valueToShare = currentMappedValues[numberRolled];
		currentMappedValues[numberRolled] = 0;
		possibleValues.forEach(function(val) {
			currentMappedValues[val] += originalMappedValues[val] / 36.0 * valueToShare;
		});
	}

	function roll() {
		var rawRoll = Math.random() * total;
		var currentSum = 0;

		var rolled;
		for (i = 0; i < possibleValues.length; i++) {
			var value = possibleValues[i];
			if (currentSum + currentMappedValues[value] > rawRoll) {
				shiftValues(value);
				return value;
			}
			currentSum += currentMappedValues[value];
		}
	}

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






// https://www.google.com/search?q=radial+progress+bar&oq=radial+progress+bar&aqs=chrome..69i57j0l5.3261j0j7&sourceid=chrome&espv=210&es_sm=91&ie=UTF-8

