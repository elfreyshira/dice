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

app.controller('DiceController', function($scope, $timeout, finiteListBias) {

	var rollers = {
		finiteListBias: finiteListBias
	}

	$scope.roundProgressData = {
		label: "Hold",
		percentage: 0
	};

	$scope.increasing = false;
	$scope.roller = rollers.finiteListBias;

	$scope.increase = function() {
		$scope.increasing = true;
		function progress() {
			if ($scope.roundProgressData.percentage < 1.0 && $scope.increasing) {

				$scope.roundProgressData.percentage = Math.min(
					$scope.roundProgressData.percentage + .04,
					1.0
				);

				if ($scope.roundProgressData.percentage >= 1.0) {
					$scope.roundProgressData.label = finiteListBias.roll();
				}

				$timeout(function(){
					progress();
				}, 10);
			}
		}
		progress();
	}

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
	}


});

