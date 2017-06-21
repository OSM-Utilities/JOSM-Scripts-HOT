/*
markResAreasAroundNode.js 

This script (intended for the JOSM scripting plugin) clusters buildings
in active layer in JOSM, and adds residential areas to new layer.

Run like this:
var a= require("JOSM-Scripts-HOT/markResAreasAroundNodeUI.js");
a.initMarkResAreas(); // Needs to be run only once after startup of JOSM. 
Then tun preset settings from Toolbar> Edit>  Distance 100m, min 10 nodes....

example 1: For adjustable settings
    var a= require("JOSM-Scripts-HOT/markResAreasAroundNodeUI.js");
    a.markAreas(300, 3, 20, "ResAreaLayer", "landuse", "residential", false); 
	
// Format for markAreas(distance between buildings in metres, 
            min number of nodes in a residential area, 
			buffer distance around the cluster of buildings
            layerName, 
            tagKey "landuse", 
            tagValue "residential", 
            Use only first node for clustering "true"/ "false", 
            ); 
	
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
    // Shared vars
    var hasMenu = false;
    var defaultdist=150;
    
    exports.initMarkResAreas = function() {
	console.clear();
	if (!hasMenu) {
	    addMenuItems();
	    //hasMenu = true;
	    console.println("Added menu items in Edit. You can add them to the toolbar using preferences.");
	} else {
	    console.println("Menu already added in Toolbar>Edit.");
	};	
    };
    
    function addMenuItems() {
	utils.addMenuItem("increment distance by 50m","increment distance by 50m", 
			  (function(){ 
			      defaultdist=defaultdist+50; if(defaultdist>=500){defaultdist=500;} josm.alert("The new distance setting is: " + defaultdist);
			      exports.markAreas(defaultdist, 3, 20, "ResAreaLayer", "landuse", "residential", false); })  );
	utils.addMenuItem("decrement distance by 50m","increment distance by 50m", 
			  (function(){
			      defaultdist=defaultdist-50; if(defaultdist<=50){defaultdist=50;} josm.alert("The new distance setting is: " + defaultdist);	
			      exports.markAreas(defaultdist, 3, 20, "ResAreaLayer", "landuse", "residential", false); })  );
	utils.addMenuItem("Distance 100m, no minimum of nodes","Distance 100m, no minimum of nodes",
			  (function(){ exports.markAreas(100, 3, 20, "ResAreaLayer", "landuse", "residential", false);	}) );
	utils.addMenuItem("Distance 100m, min 10 nodes","Distance 100m, min 10 nodes",
			  (function(){ exports.markAreas(100, 10, 20, "ResAreaLayer", "landuse", "residential", false);	}) );
	utils.addMenuItem("Distance 150m, no minimum of nodes","Distance 150m, no minimum of nodes",
			  (function(){ exports.markAreas(150, 3, 20, "ResAreaLayer", "landuse", "residential", false);	}) );
	utils.addMenuItem("Distance 150m, min 10 nodes","Distance 150m, min 10 nodes",
			  (function(){ exports.markAreas(150, 10, 20, "ResAreaLayer", "landuse", "residential", false);	}) );
	utils.addMenuItem("Distance 200m, no minimum of nodes","Distance 200m, no minimum of nodes",
			  (function(){ exports.markAreas(200, 3, 20, "ResAreaLayer", "landuse", "residential", false);	}) );
	utils.addMenuItem("Distance 200m, min 10 nodes","Distance 200m, min 10 nodes",
			  (function(){ exports.markAreas(200, 10, 20, "ResAreaLayer", "landuse", "residential", false); }) );
	return hasMenu = true;
    };

    function checkValidSelection(layers){
	var layer = current_layer(layers);
	var dataset = layer.data;	
	if (dataset.selection.objects[0]==undefined) {
	    isValid = false;
	    josm.alert("Please select a node or building and try again.");
	} else {
	    isValid = true;
	}
	return isValid;
    }

    function getBuildings(layer,useFirstNodeOnly,buffer) {
	if (!buffer)
	    buffer = false;
	if (!useFirstNodeOnly)
	    useFirstNodeOnly = false;
	var dataset = layer.data;
	// First get ways...
	var result = dataset.query("type:way");
	var numAreas = 0;
	var numResidential = 0;
	var numBuildings = 0;
	var numWays= result.length;
	var nodesinBuilding=[];
	var allNodes=[];
	var numAllNodes=0;
	var nbs=[];	
	if(dataset.selection.objects[0].type=="way")
	    nbs=dataset.selection.objects[0].firstNode()
	else
	    nbs=dataset.selection.objects[0];
	console.println("Finding a cluster around node: " + nbs);
	if(nbs.objects!=undefined) {
	    allNodes[numAllNodes]=[nbs.lat,  nbs.lon];
	    numAllNodes++;
	}
	for (j = 0; j < numWays; j++)
	{
	    var way = result[j];
	    if(way.isArea()==true)
	    { 
		numAreas++;
		var type = way.tags.building;
		if(type)
		{  
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
	// ... now get nodes.
	result = dataset.query("type:node");
	var numNodes = result.length;
	for (j = 0; j < numNodes; j++) {
	    var node = result[j];
	    if (node.tags.building) {
		/*
		  TODO: The are some 'degenerate' cases.
		  E.g. three node buildings on one line
		  The offset agorithm will still work, but because the objects don't 'span a plane', they will end up on the boundary of the area.
		  At this point add input buffering for node-buildings.
		*/
		var inputBuffer = false;
		if (inputBuffer) {
		    console.log("Input buffer not implemented.");
		} else {
		    allNodes[numAllNodes]=[node.lat, node.lon]; 
		    numNodeBuildings++;
		    numAllNodes++;
		};
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
	if(checkValidSelection(layers)==true){exports.markAreasRaw(distancem, minNumBldgInResArea, bufferDistm, layerName, tags, useFirstNodeOnly);}
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
	var buildings = getBuildings(layer, useFirstNodeOnly); //Find subset of buildings
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
	console.println("time="+diff+" s, "+perobj+" ms per object. Select next node");
	
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


