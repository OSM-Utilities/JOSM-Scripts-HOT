/*
markResAreasAroundNode.js 

This script (intended for the JOSM scripting plugin) clusters buildings
in active layer in JOSM, and adds residential areas to new layer.

Run like this:

var a= require("JOSM-Scripts-HOT/markResAreasAroundNode.js");
a.showStats(distance between buildings in metres, 
            min number of buildings in a residential area, 
            layerName, 
            tagKey "landuse", 
            tagValue "residential", 
            Use only first node for clustering "true"/ "false", 
            Buffer distance in meters);

example 1:

    var a= require("JOSM-Scripts-HOT/markResAreasAroundNode.js");
    a.markAreas();

example 2:

    var a= require("JOSM-Scripts-HOT/markResAreasAroundNode.js");
    a.markAreas(300, 3, 20, "ResAreaLayer", "landuse", "residential", false);


gyslerc, Bjoern Hassler (http://bjohas.de)
https://github.com/OSM-Utilities/JOSM-Scripts-HOT
June 2017

*/
(function() {
    var util = require("josm/util");
    var console = require("josm/scriptingconsole");
    var layers = require("josm/layers");
    var nb = require("josm/builder").NodeBuilder; 
    var wb = require("josm/builder").WayBuilder;
    var command = require("josm/command");	
    var geoutils = require("JOSM-Scripts-HOT/lib/geoutils.js");
    var utils = require("JOSM-Scripts-HOT/lib/utils.js");
    const rad = Math.PI/180;

    exports.markAreas = function(distancem, minNumBldgInResArea, bufferDistm, layerName, key, value, useFirstNodeOnly) {
	if (!distancem)
	    distancem = 150;
	if (!minNumBldgInResArea)
	    minNumBldgInResArea = 3;	
	if (minNumBldgInResArea<3) { minNumBldgInResArea=3; }
	if (!layerName)
	    layerName = "ResAreaLayer";
	if (!key)
	    key = "landuse";
	if (!value)
	    value = "residential";
	var tags = {};
	tags[key]=value;
	if (!useFirstNodeOnly)
	    useFirstNodeOnly = false;
	if (!bufferDistm)
	    bufferDistm = 20;
	exports.markAreasRaw(distancem, minNumBldgInResArea, bufferDistm, layerName, tags, useFirstNodeOnly);
    };
    
    exports.markAreasRaw = function(distancem, minNumBldgInResArea, bufferDistm, layerName, tags, useFirstNodeOnly) {
	// var tags={}
	// tags[key]=value;	
	console.clear();
	var date = new Date();
	console.println("Start: "+date);
	console.println("Hello, calculating..");	
	var distance = distancem / 6371e3 / rad;
	console.println("distance = "+distancem+" = "+distance + " deg lat");	
	var layer = current_layer(layers); 
	var buildings = utils.getBuildings(layer, useFirstNodeOnly); //Find subset of buildings
	console.println("Number of nodes: " + buildings.numNodes);
	console.println("Number of node-buildings: " + buildings.numNodeBuildings);
	console.println("Number of ways: " + buildings.numWays );
	console.println("Number of areas: " + buildings.numAreas);
	console.println("Number of area-buildings: " + buildings.numBuildings);
	console.println("Number of residential areas: " + buildings.numResidential);
	console.println("Number of nodes used in clustering: " + buildings.numAllNodes);
	var layerNew = addLayer(layerName);
	//TODO: We should allow anything here - just need to deal with the degenerate cases below.
	// Moved up: // if (minNumBldgInResArea<3) { minNumBldgInResArea=3; }
	var cluster = dbAndGrahamScan(buildings.allNodes,distance,minNumBldgInResArea,tags,layerNew,bufferDistm);
	//var areasNew = countObjects(layerNew,"true"); 
	//console.println("Number of residential areas in new layer: " + areasNew.numAreas );	
	var date2 = new Date();
	var diff = date2-date;
	console.println("End: "+date2);
	var perobj = "-";
	var nObjects = buildings.numBuildings + buildings.numNodeBuildings;;
	if (nObjects > 0) {
	    perobj = Math.round(diff / nObjects * 10)/10;
	};
	diff = Math.round(diff/1000);
	console.println("time="+diff+" s, "+perobj+" ms per object");
	console.println("Done!");
    };

    function current_layer(layers) {
	console.println("Active layer is " + layers.activeLayer.name)
	return layers.activeLayer;
    }


    function dbAndGrahamScan(dataset,distance,minNumBldgInResArea,tagName,layer,bufferDistm) { 

	const DBSCAN = require("JOSM-Scripts-HOT/lib/DBSCAN_1cluster.js");
	const graham_scan = require("JOSM-Scripts-HOT/lib/graham_scan.js");

	dataset = geoutils.flatten(dataset);
	
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
		// Longitude goes in as x; latitude goes in as y:
		convexHull[i].addPoint(latlon[1], latlon[0]);
	    }
	    hullPoints= convexHull[i].getHull(); // returns an array of objects [Point{x:10, y:20}, Point{x:...}...]
	    hullPoints = geoutils.unflatten(hullPoints);
	    nodes=[];
	    // Points are returned clockwise, but "offset" expects anti-clockwise. Change sign on bufferDistm.
	    var negbufferDistm = - bufferDistm;
	    for(j=0; j<hullPoints.length; j++)  // extract coordinates of hull, offset coordinates
	    {
		var lat1=hullPoints[j].y;
		var lon1=hullPoints[j].x;
		x=(j+1)%hullPoints.length;
		var lat2=hullPoints[x].y;
		var lon2=hullPoints[x].x;
		x=(j+2)%hullPoints.length;
		var lat3=hullPoints[x].y;
		var lon3=hullPoints[x].x;
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


