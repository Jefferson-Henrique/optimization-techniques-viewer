function AntSystemAnt(antSystem) {

	this.antSystem = antSystem;
	this.solutionQuality = 0;
	this.visitedNodes = [];
	
	var currentNodeIndex = -1;
	
	this.setNextCurrentNode = function(nodeIndex) {
		currentNodeIndex = nodeIndex;
		this.visitedNodes.push(nodeIndex);
	};
	
	this.clear = function() {
		this.solutionQuality = 0;
		this.visitedNodes.length = 0;
		currentNodeIndex = 0;
	};
	
	this.pickNextNode = function() {
		var mapNodesKeys = [];
		var mapNodesValues = [];
		
		var denominatorSum = 0;
		for (var nodeIndex = 0; nodeIndex < this.antSystem.numberOfNodes; nodeIndex++) {
			if (this.visitedNodes.indexOf(nodeIndex) == -1) {
				var pheromoneValue = Math.pow(this.antSystem.pheromoneCosts[currentNodeIndex][nodeIndex], this.antSystem.alpha);
				var heuristicValue = Math.pow(1 / this.antSystem.pathCosts[currentNodeIndex][nodeIndex], this.antSystem.beta);
				
				var totalValue = pheromoneValue * heuristicValue;
				
				denominatorSum += totalValue;
				mapNodesKeys.push(nodeIndex);
				mapNodesValues.push(totalValue);
			}
		}
		
		var randomValueChoosen = Math.random() * denominatorSum;
		var probabilityAux = 0;
		
		var nextNodeIndex = -1;
		for (var mapIndex = 0; mapIndex < mapNodesKeys.length; mapIndex++) {
			var currentValue = mapNodesValues[mapIndex];
			
			if (randomValueChoosen >= probabilityAux && randomValueChoosen < (probabilityAux + currentValue)) {
				nextNodeIndex = mapNodesKeys[mapIndex];
				break;
			}
			
			probabilityAux += currentValue;
		}
		
		this.setNextCurrentNode(nextNodeIndex);
	};
	
	this.calcSolutionQuality = function() {
		this.solutionQuality = 0;
		
		for (var index = 0; index < (this.visitedNodes.length - 1); index++) {
			this.solutionQuality += this.antSystem.pathCosts[this.visitedNodes[index]][this.visitedNodes[index+1]];
		}
	};
	
	this.getDepositedPheromone = function(nodeFromIndex, nodeToIndex) {
		var indexFrom = this.visitedNodes.indexOf(nodeFromIndex);
		
		if ((indexFrom > 0 && this.visitedNodes[indexFrom-1] == nodeToIndex) || (indexFrom < (this.visitedNodes.length - 1) && this.visitedNodes[indexFrom+1] == nodeToIndex)) {
			return this.antSystem.functionConstant / this.solutionQuality;
		}
		
		return 0;
	};
	
	this.getVisitedPath = function() {
		var result = [];
		for (var indexX = 0; indexX < this.visitedNodes.length; indexX++) {
			result.push(this.visitedNodes[indexX]);
		}
		
		return result;
	};
	
}

function AntSystemSystem(numberOfNodes, numberOfAnts, initialPheromone, functionConstant, evaporationRate, alpha, beta) {
	
	var self = this;
	
	this.numberOfNodes = numberOfNodes;
	
	this.ants = [];
	
	this.initialPheromone = initialPheromone;
	this.functionConstant = functionConstant;
	this.evaporationRate = evaporationRate;
	this.alpha = alpha;
	this.beta = alpha;
	this.pathCosts = [];
	this.pheromoneCosts = [];
	
	for (var index = 0; index < numberOfAnts; index++) {
		this.ants.push(new AntSystemAnt(this));
	}
	
	for (var index1 = 0; index1 < numberOfNodes; index1++) {
		this.pathCosts.push([]);
		this.pheromoneCosts.push([]);
		for (var index2 = 0; index2 < numberOfNodes; index2++) {
			this.pathCosts[index1].push(0);
			this.pheromoneCosts[index1].push(0);
		}
	}
	
	var init = function() {
		for (var index1 = 0; index1 < numberOfNodes; index1++) {
			for (var index2 = 0; index2 < numberOfNodes; index2++) {
				self.pheromoneCosts[index1][index2] = Math.random() * self.initialPheromone;
			}
		}
	};
	
	this.addPathCost = function(nodeFromIndex, nodeToIndex, cost) {
		this.pathCosts[nodeFromIndex][nodeToIndex] = cost;
		this.pathCosts[nodeToIndex][nodeFromIndex] = cost;
	};
	
	this.execute = function(maxSteps, initialNodeIndex) {
		var result = {iterations:[], maxPheromone: 0, bestPath: null};
		
		init();
		
		var qualityValues = [];
		var stepCounter = 0;
		
		while (stepCounter < maxSteps) {
			result.iterations.push({ants: [], afterEvaporation: {}});
			var resultIteration = result.iterations[stepCounter];
			
			for (var antIndex = 0; antIndex < numberOfAnts; antIndex++) {
				var currentAnt = this.ants[antIndex];
				currentAnt.clear();
				currentAnt.setNextCurrentNode(initialNodeIndex);
				
				while (currentAnt.visitedNodes.length != numberOfNodes) {
					currentAnt.pickNextNode();
				}
				
				currentAnt.calcSolutionQuality();
				
				resultIteration.ants.push({result: currentAnt.getVisitedPath(), trails: {}});
				qualityValues.push(currentAnt.solutionQuality);
			}
			
			for (var index1 = 0; index1 < numberOfNodes; index1++) {
				for (var index2 = 0; index2 < numberOfNodes; index2++) {
					if (index1 != index2) {
						this.pheromoneCosts[index1][index2] *= (1 - this.evaporationRate);
						if (!resultIteration.afterEvaporation[index1]) {
							resultIteration.afterEvaporation[index1] = {};
						}
						resultIteration.afterEvaporation[index1][index2] = this.pheromoneCosts[index1][index2]; 
						
						var depositedPheromone = 0;
						for (var antIndex = 0; antIndex < numberOfAnts; antIndex++) {
							var pheromoneLevel = this.ants[antIndex].getDepositedPheromone(index1, index2);
							depositedPheromone += pheromoneLevel;
							
							var antTrails = resultIteration.ants[antIndex].trails;
							if (!antTrails[index1]) {
								antTrails[index1] = {};
							}
							
							antTrails[index1][index2] = pheromoneLevel;
						}
						
						this.pheromoneCosts[index1][index2] += depositedPheromone;
						
						if (result.maxPheromone < this.pheromoneCosts[index1][index2]) {
							result.maxPheromone = this.pheromoneCosts[index1][index2];
						}
					}
				}
			}
			
			stepCounter++;
		}
		
		var minPathAntIndex = 0;
		for (var antIndex = 1; antIndex < numberOfAnts; antIndex++) {
			if (this.ants[antIndex].solutionQuality < this.ants[minPathAntIndex].solutionQuality) {
				minPathAntIndex = antIndex;
			}
		}
		
		result.bestPath = this.ants[minPathAntIndex].getVisitedPath();
		
		return result;
	}
}