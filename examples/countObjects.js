/*
gyslerc
Bjoern Hassle, http://bjohas.de

Run like this:

var a= require("JOSM-Scripts-HOT/examples/countObjects.js");
a.showStats();
*/
(function() {
    var util = require("josm/util");
    var command = require("josm/command");
    var console = require("josm/scriptingconsole");
   
    exports.showStats = function() {
	var layer = current_layer();
	//Find subset of buildings
	var buildings = BuildingsSubset(layer);
	console.clear();
	console.println("Number of nodes: " + buildings.NumNodes);
	console.println("Number of node-buildings: " + buildings.NumNodeBuildings);
	console.println("Number of ways: " + buildings.NumWays);
	console.println("Number of areas: " + buildings.NumAreas);
	console.println("Number of area-buildings: " + buildings.NumBuildings);
	console.println("Number of residential areas: " + buildings.NumResidential);
    };

    function current_layer() {
	var layers = require("josm/layers");
	return layers.activeLayer;
    }

    function BuildingsSubset() {
	var layer = arguments[0];
	var dataset = layer.data;
	var result = dataset.query("type:way");
	var NumAreas = 0;
	var NumResidential = 0;
	var NumBuildings = 0;
	var NumWays= result.length;
	for (j = 0; j < result.length; j++)
	{
	    var way = result[j];
	    if(way.isArea()==true)
	    { 
		NumAreas++;
		var type = way.tags.building;
		if(type)
		{ 
			NumBuildings++; 
		}
		if (way.tags.landuse) {
		    if (way.tags.landuse==="residential") {
			NumResidential++;
		    };
		}
	    }
	}
	var NumNodeBuildings = 0;
	result = dataset.query("type:node");
	var NumNodes = result.length;
	for (j = 0; j < NumNodes; j++) {
	    var node = result[j];
	    if (node.tags.building) {
		NumNodeBuildings++; 
	    };
	};	
	return{ 
	    NumNodes: NumNodes,
	    NumNodeBuildings: NumNodeBuildings,
		NumWays: NumWays,
	    NumAreas: NumAreas,
	    NumBuildings: NumBuildings,
	    NumResidential: NumResidential
	};
    }	
}());


