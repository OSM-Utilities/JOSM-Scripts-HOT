/*
gyslerc
Bjoern Hassle, http://bjohas.de

Run like this:
var a= require("JOSM-Scripts-HOT/markResAreas.js");
a.showStats(distance, min number of buildings in a residential area, layerName, tagKey "landuse", tagValue"residential", Use only first node for clustering "true"/ "false");

example:
var a= require("JOSM-Scripts-HOT/markResAreas.js");
a.showStats(0.001, 3, "ResAreaLayer", "landuse", "residential", "true");
*/
(function() {
    var util = require("josm/util");
    var console = require("josm/scriptingconsole");
    var layers = require("josm/layers");
	
    exports.showStats = function() {
	var	distance=arguments[0];
	var	minNumBldgInResArea=arguments[1];
	var	layerName=arguments[2];
	var	key=arguments[3];
	var	value=arguments[4];	
	var useFirstNodeOnly=arguments[5];
	var tagName={}
	tagName[key]=value;	
	console.clear();
    console.println("Hello, calculating... ");	
	var layer = current_layer(layers); 
	var buildings = countObjects(layer, useFirstNodeOnly); //Find subset of buildings
	var allNodes = buildings.allNodes;   
	var layerNew=addlayer(layerName,console,layers);
	var cluster = dbAndGrahamScan(allNodes,distance,minNumBldgInResArea,tagName,layerNew,console);
	var areasNew = countObjects(layerNew,"true"); 

	console.println("Number of nodes: " + buildings.numNodes);
	console.println("Number of node-buildings: " + buildings.numNodeBuildings);
	console.println("Number of ways: " + buildings.numWays );
	console.println("Number of areas: " + buildings.numAreas);
	console.println("Number of area-buildings: " + buildings.numBuildings);
	console.println("Number of residential areas: " + buildings.numResidential);
	console.println("Number of nodes used in clustering: " + buildings.numAllNodes);
	console.println("Number of residential areas in new layer: " + areasNew.numAreas );	
	console.println("Done!");	
    };

    function current_layer() {
	layers = arguments[0];
	return layers.activeLayer;
    }

    function countObjects() {
	var layer = arguments[0];
	var useFirstNodeOnly=arguments[1];
	var dataset = layer.data;
	var result = dataset.query("type:way");
	var numAreas = 0;
	var numResidential = 0;
	var numBuildings = 0;
	var numWays= result.length;
	var nodesinBuilding=[];
	var allNodes=[];
	var numAllNodes=0;
	for (j = 0; j < numWays; j++)
	{
	    var way = result[j];
	    if(way.isArea()==true)
	    { 
		numAreas++;
		var type = way.tags.building;
		if(type)
		{  
	        if(useFirstNodeOnly=="true"){allNodes[numAllNodes]=[result[j].firstNode().lat,  result[j].firstNode().lon];  numAllNodes++; }
			else{nodesinBuilding=result[j].nodes; 
				for(i=0; i<nodesinBuilding.length; i++){
				allNodes[numAllNodes]=[nodesinBuilding[i].lat, nodesinBuilding[i].lon];  
				numAllNodes++;
				}
			}
			numBuildings++; 
		}
		if (way.tags.landuse) {
		    if (way.tags.landuse==="residential") {
			numResidential++;
		    };
		}
	    }
	}
	var numNodeBuildings = 0;
	result = dataset.query("type:node");
	var numNodes = result.length;
	for (j = 0; j < numNodes; j++) {
	    var node = result[j];
	    if (node.tags.building) {
		allNodes[numAllNodes]=[node.lat, node.lon]; 
		numNodeBuildings++; numAllNodes++;
	    };
	};	
	return{ 
	    numWays: numWays,
	    numAreas: numAreas,
	    numBuildings: numBuildings,
	    numNodes: numNodes,
	    numNodeBuildings: numNodeBuildings,
	    numResidential: numResidential,
		allNodes:allNodes,
		numAllNodes:numAllNodes
	};
    };	

	function dbAndGrahamScan() { 
	dataset=arguments[0];
	distance=arguments[1];
	minNumBldgInResArea=arguments[2];
	tagName=arguments[3];
	layer=arguments[4];
	console=arguments[5];
	
	const DBSCAN = require("DBSCAN.js");
	const graham_scan = require("graham_scan");
	var command = require("josm/command");
	var nb = require("josm/builder").NodeBuilder; 
	var wb = require("josm/builder").WayBuilder;
	
	var dbscan = new DBSCAN();
	var clusters = dbscan.run(dataset, distance, minNumBldgInResArea); 
//	console.println("All clusters are:"); 
//	console.println(clusters);
	var convexHull=[];
	var hullPoints=[];
//	var resArea=[];
//	var resAreaAll=[];
	var idx, latlon;
	console.println("Total number of clusters found: " + clusters.length); 
	for(i=0; i<clusters.length; i++)
	{
		convexHull[i] = new graham_scan(); //new convex hull for each cluster
		for(j=0; j<clusters[i].length; j++) 
		{
		idx=clusters[i][j];
		latlon=dataset[idx];
		convexHull[i].addPoint(latlon[0], latlon[1]);
		}
		hullPoints= convexHull[i].getHull(); // returns an array of objects [Point{x:10, y:20}, Point{x:...}...]
//		console.println("Convex hull points for cluster number:" + i);
//		console.println(hullPoints);
//		resArea=[];
		nodes=[];
		for(j=0; j<hullPoints.length; j++)  // extract coordinates of hull
		{ 
		x=hullPoints[j].x;
		y=hullPoints[j].y;
//		resArea[j]=[x,y];
		nodes[j] =nb.withPosition(x, y).create(); 
		}
		nodes[j+1]=nodes[0];
		var w2=wb.withNodes(nodes).withTags(tagName).create();
		command.add(nodes).applyTo(layer)
		command.add(w2).applyTo(layer)
//	resAreaAll[i]=resArea;
	}
//	console.println("All residential areas are: "); // [[array of nodes in residential area 1],[array of nodes in residential area 2],.. ]
//	console.println(resAreaAll);	
	}	

	function addlayer(){
	layerName=arguments[0];
	console=arguments[1];
	layers=arguments[2];
	console.println("layerName: " + layerName);
	//create a new layer with 'layerName'
	var b = layers.has(layerName); 
	if(b==false){ layer = josm.layers.addDataLayer(layerName);}
	else{layer=layers.get(layerName);}
	return layer;
	};
		
/*	function drawWays(){
	nodeVecIn=arguments[0];
	key=arguments[1];
	value=arguments[2];
	console=arguments[3];
	command=arguments[4];
	layer=arguments[5];
	tagName={}
	tagName[key]=value;
	var wb = require("josm/builder").WayBuilder; 
	// create a way from vector of nodes and add them layer
	var w2=wb.withNodes(nodeVecIn).withTags(tagName).create();
	command.add(nodeVecIn).applyTo(layer)
	command.add(w2).applyTo(layer)
	};		
	*/	
}());


