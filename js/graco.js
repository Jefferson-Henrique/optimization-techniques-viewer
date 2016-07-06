var ANT_VELOCITY = 150;
var MAX_PHEROMONE_TRAIL_WIDTH = 20;

var loader, antSprite;
(function init() {
	var data = new createjs.SpriteSheet({
		"images": ["imgs/ant_sheet2.png"],
		"frames": {"height": 352, "width": 485, "regX": 176, "regY": 180},
		// define two animations, run (loops, 1.5x speed) and jump (returns to run):
		"animations": {"move": [0, 1, "move", 0.2], "move_deposit": [0, 2, "move_deposit", 0.2]}
	});
	antSprite = new createjs.Sprite(data, "move");
	antSprite.framerate = 30;
})();

$(document).ready(function(){
	$(".glyphicon-info-sign").popover({trigger: "hover"});
	
	var btnExecute = $("#btnExecute");
	var btnDeposit = $("#btnDepositPheromone");
	var btnNextIteration = $("#btnNextIteration");
	var btnShowBestPath = $("#btnShowBestPath");
	var labelResultBestInfo = $("#result-iteration-best-info");
	var labelResultBestInfoCost = $("#result-iteration-best-info-cost");
	
	var panelConfigurations = $("#panel-configurations").find(".panel-body");
	var panelResult = $("#panel-result");
	var panelResultConfig = $(".panel-result-config");
	
	$("#resultCanvas").attr("width", panelResult.find(".panel-body").width() + "px");
	$("#resultCanvas").attr("height", (panelConfigurations.outerHeight() - panelResultConfig.outerHeight()) + "px");
	
	var stage = new createjs.Stage("resultCanvas");
	var containerNormalLines = new createjs.Container();
	var containerPheromoneLines = new createjs.Container();
	var containerStates = new createjs.Container();
	var containerAnts = new createjs.Container();
	stage.addChild(containerNormalLines);
	stage.addChild(containerPheromoneLines);
	stage.addChild(containerStates);
	stage.addChild(containerAnts);
	
	var mouseDownPosition, previousX, previousY;
	
	$("#resultCanvas").on("mousedown", function(event) {
		mouseDownPosition = [event.screenX, event.screenY];
		
		previousX = stage.x;
		previousY = stage.y;
	}).on("mouseup", function(event) {
		mouseDownPosition = null;
	}).on("mousemove", function(event) {
		if (mouseDownPosition) {
			stage.x = previousX + event.screenX - mouseDownPosition[0];
			stage.y = previousY + event.screenY - mouseDownPosition[1];
		}
	});
	
	var allStates = [];
	var allAnts = [];
	var pheromoneTrails = [];
	var currentIteration = 0;
	var resultAntSystem = null;
	var antSystem = null;
	var maxIterations = 0;
	var trailsLines = null;
	
	btnExecute.click(function() {
		containerNormalLines.removeAllChildren();
		containerPheromoneLines.removeAllChildren();
		containerStates.removeAllChildren();
		containerAnts.removeAllChildren();
		
		allAnts.length = 0;
		allStates.length = 0;
		pheromoneTrails.length = 0;
		currentIteration = 0;
		resultAntSystem = null;
		antSystem = null;
		trailsLines = {};
		btnShowBestPath.hide();
		labelResultBestInfo.hide();
		btnDeposit.addClass("disabled");
		btnNextIteration.addClass("disabled");
		
		var systemNumberOfAnts = parseInt($("#data-number-of-ants").val());
		var systemNumberOfIterations = parseInt($("#data-number-of-iterations").val());
		var systemEvaporation = parseFloat($("#data-evaporation").val());
		var systemInitialPheromone = parseFloat($("#data-initial-pheromone").val());
		var systemConstant = parseFloat($("#data-constant").val());
		var systemAlpha = parseFloat($("#data-alpha").val());
		var systemBeta = parseFloat($("#data-beta").val());
		
		maxIterations = systemNumberOfIterations;
		$("#result-iteration-current").text(1);
		$("#result-iteration-max").text(systemNumberOfIterations);
		$("#result-iteration").show();
		
		var dataStates = $("#data-data").val().trim();
		var dataStatesSplitted = dataStates.split(";");
		for (var i in dataStatesSplitted) {
			var posMixed = dataStatesSplitted[i].trim().split(" ");
			
			if (posMixed.length == 2) {
				var posX = parseFloat(posMixed[0]);
				var posY = parseFloat(posMixed[1]);
	
				allStates.push([posX, posY]);
				
				var circle = new createjs.Shape();
				circle.graphics.beginStroke("black").beginFill("white").drawCircle(0, 0, 30);
				circle.x = posX;
				circle.y = posY;
				
				containerStates.addChild(circle);
				
				var text = new createjs.Text(""+i, "20px Arial", "blue");
				text.x = posX;
				text.y = posY;
				text.textBaseline = "middle";
				text.textAlign = "center";
				containerStates.addChild(text);
			}
		}
		
		antSystem = new AntSystemSystem(allStates.length, systemNumberOfAnts, systemInitialPheromone, systemConstant, systemEvaporation, systemAlpha, systemBeta);
		for (var index1 = 0; index1 < antSystem.numberOfNodes; index1++) {
			pheromoneTrails.push([]);
			for (var index2 = 0; index2 < antSystem.numberOfNodes; index2++) {
				pheromoneTrails[index1][index2] = 0;
				if (index1 != index2) {
					var pos1X = allStates[index1][0];
					var pos1Y = allStates[index1][1];
					
					var pos2X = allStates[index2][0];
					var pos2Y = allStates[index2][1];
					
					var line = new createjs.Shape();
					line.graphics.setStrokeStyle(0.5);
					line.graphics.beginStroke("black");
					line.graphics.moveTo(pos1X, pos1Y).lineTo(pos2X, pos2Y);
					containerNormalLines.addChild(line);
					
					var diffX = pos2X - pos1X;
					var diffY = pos2Y - pos1Y;
					
					antSystem.addPathCost(index1, index2, Math.sqrt(diffX * diffX + diffY * diffY));
				}
			}
		}
		
		resultAntSystem = antSystem.execute(systemNumberOfIterations, 0);
		
		for (var index = 0; index < systemNumberOfAnts; index++) {
			var currentAntSprite = antSprite.clone();
			containerAnts.addChild(currentAntSprite);
			allAnts.push(currentAntSprite);
		}
		
		executeCurrentIteration();
		
		createjs.Ticker.setPaused(false);
	});
	
	function executeCurrentIteration() {
		var afterEvaporationTrail = resultAntSystem.iterations[currentIteration].afterEvaporation;
		
		if (trailsLines) {
			for (var index1 in trailsLines) {
				var fromState = allStates[index1];
				for (var index2 in trailsLines[index1]) {
					var toState = allStates[index2];
					
					var line = trailsLines[index1][index2];
					line.graphics.clear();
					line.graphics.setStrokeStyle(afterEvaporationTrail[index1][index2]/resultAntSystem.maxPheromone * MAX_PHEROMONE_TRAIL_WIDTH);
					line.graphics.beginStroke("#F25581");
					line.graphics.moveTo(fromState[0], fromState[1]).lineTo(toState[0], toState[1]);
				}
			}
		}
		
		for (var index = 0; index < allAnts.length; index++) {
			var currentAntSprite = allAnts[index];
			
			var correlatedAnt = resultAntSystem.iterations[currentIteration].ants[index];
			currentAntSprite._back = false;
			currentAntSprite._answer = correlatedAnt.result;
			currentAntSprite._trails = correlatedAnt.trails;
			currentAntSprite.setTransform(allStates[currentAntSprite._answer[0]][0], allStates[currentAntSprite._answer[0]][1], 0.1, 0.1);
			currentAntSprite._nextNode = 1;
			currentAntSprite.gotoAndPlay("move");
		}
		
		currentIteration++;
		$("#result-iteration-current").text(currentIteration);
	};
	
	btnNextIteration.click(function(){
		executeCurrentIteration();
		$(this).addClass("disabled");
		btnDeposit.addClass("disabled");
	});
	
	btnDeposit.click(function() {
		var afterEvaporationTrail = resultAntSystem.iterations[currentIteration-1].afterEvaporation;
		
		pheromoneTrails.length = 0;
		for (var index1 = 0; index1 < antSystem.numberOfNodes; index1++) {
			pheromoneTrails.push([]);
			for (var index2 = 0; index2 < antSystem.numberOfNodes; index2++) {
				if (afterEvaporationTrail[index1][index2]) {
					pheromoneTrails[index1][index2] = afterEvaporationTrail[index1][index2];
				} else {
					pheromoneTrails[index1][index2] = 0;
				}
			}
		}
		
		for (var index in allAnts) {
			var currentAnt = allAnts[index];
			currentAnt._back = true;
			currentAnt._answer = currentAnt._answer.reverse();
			currentAnt.x = allStates[currentAnt._answer[0]][0];
			currentAnt.y = allStates[currentAnt._answer[0]][1];
			currentAnt._nextNode = 1;
			currentAnt.gotoAndPlay("move_deposit");
		}
		
		btnDeposit.addClass("disabled");
	});
	
	btnShowBestPath.click(function() {
		containerPheromoneLines.removeAllChildren();
		containerAnts.removeAllChildren();
		
		var totalCost = 0;
		
		var bestPath = resultAntSystem.bestPath;
		for (var index = 0; index < (bestPath.length - 1); index++) {
			var bestPathCurrent = bestPath[index];
			var bestPathNext = bestPath[index+1];
			
			var fromState = allStates[bestPathCurrent];
			var toState = allStates[bestPathNext];
			
			totalCost += antSystem.pathCosts[bestPathCurrent][bestPathNext];
			
			var line = new createjs.Shape();
			line.graphics.setStrokeStyle(3);
			line.graphics.beginStroke("blue");
			line.graphics.moveTo(fromState[0], fromState[1]).lineTo(toState[0], toState[1]);
			containerNormalLines.addChild(line);
		}
		
		totalCost = Math.round(totalCost * 100) / 100;
		
		labelResultBestInfoCost.text(totalCost);
		labelResultBestInfo.show();
	});
	
	function tick(event) {
		if (event.paused) {
			return;
		}
		
		var allAntsHaveFinished = allAnts.length > 0;
		for (var index in allAnts) {
			var currentAnt = allAnts[index];

			if (currentAnt._nextNode < allStates.length) {
				allAntsHaveFinished = false;
				
				var fromStateIndex = currentAnt._answer[currentAnt._nextNode - 1];
				var toStateIndex = currentAnt._answer[currentAnt._nextNode];
				
				var currentState = allStates[fromStateIndex];
				var nextState = allStates[toStateIndex];
				var diffX = nextState[0] - currentAnt.x;
				var diffY = nextState[1] - currentAnt.y;
				var distance = Math.sqrt(diffX*diffX + diffY*diffY);
				
				var auxDistance = distance;
				if (auxDistance < 1) {
					diffX = nextState[0] - currentState[0];
					diffY = nextState[1] - currentState[1];
					distance = Math.sqrt(diffX*diffX + diffY*diffY);
					auxDistance = Math.sqrt(diffX*diffX + diffY*diffY);
				}
				
				var angleRadians = Math.asin(diffY / auxDistance);
				if (nextState[0] < currentState[0]) {
					angleRadians = Math.PI - angleRadians;
				}
				
				var angleDegree = angleRadians * (180/Math.PI);
				var cosAngle = Math.cos(angleRadians);
				var sinAngle = Math.sin(angleRadians);
				
				var amountX = event.delta/1000*ANT_VELOCITY * cosAngle;
				if (Math.abs(amountX) < 0.001) {
					amountX = 0;
				}
				
				var amountY = event.delta/1000*ANT_VELOCITY * sinAngle;
				if (Math.abs(amountY) < 0.001) {
					amountY = 0;
				}
				
				if (
						(amountX != 0 && 
								(
								(currentAnt.x <= nextState[0] && nextState[0] <= (currentAnt.x + amountX))
										 || 
								(currentAnt.x >= nextState[0] && nextState[0] >= (currentAnt.x + amountX))
								)
						) ||
						(amountY != 0 && 
								(
								(currentAnt.y >= nextState[1] && nextState[1] >= (currentAnt.y + amountY))
										||
								(currentAnt.y <= nextState[1] && nextState[1] <= (currentAnt.y + amountY))
								)
						)
					) {
					currentAnt.x = nextState[0];
					currentAnt.y = nextState[1];
					
					currentAnt._nextNode++;

					if (currentAnt._backline) {
						currentAnt._backline = null;
					} else if (currentAnt._back) {
						var line = trailsLines[fromStateIndex][toStateIndex];
						
						pheromoneTrails[fromStateIndex][toStateIndex] += currentAnt._trails[fromStateIndex][toStateIndex];
						pheromoneTrails[toStateIndex][fromStateIndex] += currentAnt._trails[toStateIndex][fromStateIndex];
						
						line.graphics.setStrokeStyle(pheromoneTrails[fromStateIndex][toStateIndex]/resultAntSystem.maxPheromone * MAX_PHEROMONE_TRAIL_WIDTH);
						line.graphics.beginStroke("#F25581");
						line.graphics.moveTo(currentState[0], currentState[1]).lineTo(currentAnt.x, currentAnt.y);
					}
					
				} else {
					currentAnt.x += amountX;
					currentAnt.y += amountY;
					
					currentAnt.rotation = angleDegree;
					
					if (trailsLines[fromStateIndex] && trailsLines[fromStateIndex][toStateIndex]) {
						if (currentAnt._backline) {
							currentAnt._backline.graphics.clear();
							currentAnt._backline.graphics.setStrokeStyle(currentAnt._backtrail);
							currentAnt._backline.graphics.beginStroke("#F25581");
							currentAnt._backline.graphics.moveTo(currentState[0], currentState[1]).lineTo(currentAnt.x, currentAnt.y);
						}
					} else if (currentAnt._back) {
							var line = new createjs.Shape();
							currentAnt._backline = line;
							
							pheromoneTrails[fromStateIndex][toStateIndex] += currentAnt._trails[fromStateIndex][toStateIndex];
							pheromoneTrails[toStateIndex][fromStateIndex] += currentAnt._trails[toStateIndex][fromStateIndex];
							currentAnt._backtrail = pheromoneTrails[fromStateIndex][toStateIndex]/resultAntSystem.maxPheromone * MAX_PHEROMONE_TRAIL_WIDTH;
							
							if (!trailsLines[fromStateIndex]) {
								trailsLines[fromStateIndex] = {};
							}
							if (!trailsLines[toStateIndex]) {
								trailsLines[toStateIndex] = {};
							}
							trailsLines[fromStateIndex][toStateIndex] = line;
							trailsLines[toStateIndex][fromStateIndex] = line;
							
							line.graphics.setStrokeStyle(currentAnt._backtrail);
							line.graphics.beginStroke("#F25581");
							line.graphics.moveTo(currentState[0], currentState[1]).lineTo(currentAnt.x, currentAnt.y);
							containerPheromoneLines.addChild(line);
					}
				}
			}
		}
		
		if (allAntsHaveFinished) {
			if (allAnts[0]._back) {
				if (currentIteration >= (maxIterations)) {
					btnNextIteration.addClass("disabled");
					btnDeposit.addClass("disabled");
					btnShowBestPath.show();
				} else {
					btnNextIteration.removeClass("disabled");
				}
			} else {
				btnDeposit.removeClass("disabled");
			}
		}
		
		stage.update(event);
	}
	
	createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCH;
	createjs.Ticker.framerate = 30;
	createjs.Ticker.addEventListener("tick", tick);
	createjs.Ticker.setPaused(true);
});