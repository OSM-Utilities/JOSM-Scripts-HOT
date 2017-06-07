/*
gyslerc
Bjoern Hassler, http://bjohas.de

Run like this:
var a= require("JOSM-Scripts-HOT/markResAreas.js");
a.showStats(distance between buildings in metres, 
            min number of buildings in a residential area, 
            layerName, 
            tagKey "landuse", 
            tagValue"residential", 
            Use only first node for clustering "true"/ "false", 
            Buffer distance in meters);

example:

var a= require("JOSM-Scripts-HOT/markResAreas.js");
a.markAreas(100, 3, "ResAreaLayer", "landuse", "residential", "false", 20);

*/
(function() {
    var util = require("josm/util");
    var console = require("josm/scriptingconsole");
    var layers = require("josm/layers");
    var nb = require("josm/builder").NodeBuilder; 
    var wb = require("josm/builder").WayBuilder;
    var command = require("josm/command");	
    var geoutils = require("JOSM-Scripts-HOT/geoutils.js");
    const rad = Math.PI/180;
    
    exports.markAreas = function(distancem, minNumBldgInResArea,layerName,key,value,useFirstNodeOnly, bufferDistm) {
	var tagName={}
	tagName[key]=value;	
	console.clear();
	console.println("Hello, calculating..");	
	var distance = distancem / 6371e3 / rad;
	console.println("distance = "+distancem+" = "+distance + " deg lat");	
	var layer = current_layer(layers); 
	var buildings = countObjects(layer, useFirstNodeOnly); //Find subset of buildings
	console.println("Number of nodes: " + buildings.numNodes);
	console.println("Number of node-buildings: " + buildings.numNodeBuildings);
	console.println("Number of ways: " + buildings.numWays );
	console.println("Number of areas: " + buildings.numAreas);
	console.println("Number of area-buildings: " + buildings.numBuildings);
	console.println("Number of residential areas: " + buildings.numResidential);
	console.println("Number of nodes used in clustering: " + buildings.numAllNodes);
	var layerNew = addLayer(layerName);
	//TODO: We should allow anything here - just need to deal with the degenerate cases below.
	if (minNumBldgInResArea<3) { minNumBldgInResArea=3; }
	var cluster = dbAndGrahamScan(buildings.allNodes,distance,minNumBldgInResArea,tagName,layerNew,bufferDistm);
	var areasNew = countObjects(layerNew,"true"); 
	console.println("Number of residential areas in new layer: " + areasNew.numAreas );	
	console.println("Done!");
    };

    function current_layer(layers) {
	console.println("Active layer is " + layers.activeLayer.name)
	return layers.activeLayer;
    }

    function countObjects(layer,useFirstNodeOnly) {
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
		    /*
		      TODO: The are some 'degenerate' cases.
		      E.g. three node buildings on one line
		      E.g. a building with a large side length (compared to clustering length), and several points down the side on one line
		      The offset agorithm will still work, but because the objects don't 'span a plane', they will end up on the boundary of the area.
		      The offset algorithm notices these straight segments, and a possible solution is to add both points (lef/right of the segment) and then run the hull algrithm again on those points.
		     */
	            if(useFirstNodeOnly=="true") {
			allNodes[numAllNodes]=[result[j].firstNode().lat,  result[j].firstNode().lon];
			numAllNodes++;
		    } else {
			nodesinBuilding=result[j].nodes; 
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


    function flatten(dataset) {
	// This adjusts for unequal spacing in lat/lon:
	if (dataset.length > 0)
	    dataset.forEach( function(latlon) {
		latlon[1] *= Math.cos(rad * latlon[0]);
	    });
	return dataset;
    }

    function unflatten(dataset) {
	// This does the reverse, but on a slightly different structure
	if (dataset.length > 0)
	    dataset.forEach( function(latlon) {
		latlon.y /= Math.cos(rad * latlon.x);
	    });
	return dataset;
    }

    
    function dbAndGrahamScan(dataset,distance,minNumBldgInResArea,tagName,layer,bufferDistm) { 

	const DBSCAN = require("JOSM-Scripts-HOT/DBSCAN.js");
	const graham_scan = require("JOSM-Scripts-HOT/graham_scan.js");

	dataset = flatten(dataset);
	
	//console.println("db scan");
	var dbscan = new DBSCAN();

	//TODO: minNumBldgInResArea doesn't quite work here - because if you work on 'all nodes' minNumBldgInResArea is compared to all nodes, rather than buildings.
	var clusters = dbscan.run(dataset, distance, minNumBldgInResArea); 
	console.println("Total number of clusters found: " + clusters.length); 

	//console.println("graham scan");
	var convexHull=[];
	var hullPoints=[];
	var idx, latlon;
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
	    hullPoints = unflatten(hullPoints);
	    nodes=[];
	    // Points are returned clockwise, but "offset" expects anti-clockwise. Change sign on bufferDistm.
	    var negbufferDistm = - bufferDistm;
	    for(j=0; j<hullPoints.length; j++)  // extract coordinates of hull, offset coordinates
	    {
		var lat1=hullPoints[j].x;
		var lon1=hullPoints[j].y;
		x=(j+1)%hullPoints.length;
		var lat2=hullPoints[x].x;
		var lon2=hullPoints[x].y;
		x=(j+2)%hullPoints.length;
		var lat3=hullPoints[x].x;
		var lon3=hullPoints[x].y;
		var offsetpoint= geoutils.offset(lat1, lon1, lat2, lon2, lat3, lon3, negbufferDistm);
		nodes[j] = drawNode(offsetpoint.lat,offsetpoint.lon);
	    }
	    nodes[j+1]=nodes[0];
	    drawWays(nodes,tagName,layer);
	}

    }	

    function addLayer(layerName){
	//create a new layer with 'layerName'
	var b = layers.has(layerName); 
	if(b==false){
	    layer = josm.layers.addDataLayer(layerName);
	} else {
	    layer=layers.get(layerName);
	}
	console.println("Adding identified residential areas to layer named " + layer.name);
	return layer;
    };

    function drawNode(lat, lon){
	// create a node at specified lat and lon
	var node=nb.withPosition(lat, lon).create(); 
	return node;
    };	
    
    function drawWays(nodeVecIn,tagName,layer){
	// create a way from vector of nodes and add them to layer
	var w2=wb.withNodes(nodeVecIn).withTags(tagName).create();
	command.add(nodeVecIn).applyTo(layer)
	command.add(w2).applyTo(layer)
    };		
        
}());


