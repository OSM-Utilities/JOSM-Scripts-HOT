/*
gyslerc
Bjoern Hassler, http://bjohas.de

Run like this:
var a= require("JOSM-Scripts-HOT/markResAreas.js");
a.showStats(distance, min number of buildings in a residential area, layerName, tagKey "landuse", tagValue"residential", Use only first node for clustering "true"/ "false", Buffer distance in meters);

example:
var a= require("JOSM-Scripts-HOT/markResAreas.js");
a.showStats(0.001, 3, "ResAreaLayer", "landuse", "residential", "true", 20);
*/
(function() {
    var util = require("josm/util");
    var console = require("josm/scriptingconsole");
    var layers = require("josm/layers");
    var nb = require("josm/builder").NodeBuilder; 
    var wb = require("josm/builder").WayBuilder;
    var command = require("josm/command");	
    
    exports.showStats = function(distance, minNumBldgInResArea,layerName,key,value,useFirstNodeOnly, bufferDistm) {
	var tagName={}
	tagName[key]=value;	
	console.clear();
	console.println("Hello, calculating..");	
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

    function dbAndGrahamScan(dataset,distance,minNumBldgInResArea,tagName,layer,bufferDistm) { 

	const DBSCAN = require("JOSM-Scripts-HOT/DBSCAN.js");
	const graham_scan = require("JOSM-Scripts-HOT/graham_scan.js");

	console.println("db scan");
	var dbscan = new DBSCAN();
	var clusters = dbscan.run(dataset, distance, minNumBldgInResArea); 
	console.println("Total number of clusters found: " + clusters.length); 

	console.println("graham scan");
	var convexHull=[];
	var hullPoints=[];
	var idx, latlon;
	for(i=0; i<clusters.length; i++)
	{
	    console.println(i);
	    convexHull[i] = new graham_scan(); //new convex hull for each cluster
	    for(j=0; j<clusters[i].length; j++) 
	    {
		idx=clusters[i][j];
		latlon=dataset[idx];
		convexHull[i].addPoint(latlon[0], latlon[1]);
	    }
	    hullPoints= convexHull[i].getHull(); // returns an array of objects [Point{x:10, y:20}, Point{x:...}...]
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
		var offsetpoint=offset(lat1, lon1, lat2, lon2, lat3, lon3, negbufferDistm);
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
    
    function offset(lat1, lon1, lat2, lon2, lat3, lon3,d) {
	// In a line segment p1->p2->p3, find a point P offset from p2, bisecting the angle.
	// The point is offset to the right, i.e. if p1->p2->p3->p1 are traversed anti-clockwise, offset points are on the outside.
	var lat;
	var lon;
	var rad = Math.PI/180;
	lat1 *= rad;
	lat2 *= rad;
	lat3 *= rad;
	lon1 *= rad;
	lon2 *= rad;
	lon3 *= rad;	
	var b1 = bearing(lat1, lon1, lat2, lon2);
	var b2 = bearing(lat2, lon2, lat3, lon3);
	var angle =(b1-b2);
	while (angle <= -Math.PI) {
	    angle += 2*Math.PI;
	};
	while (angle > Math.PI) {
	    angle -= 2*Math.PI;
	};
	if (angle < 0) {
	    angle += 2*Math.PI;
	};
	angle = b1 - angle/2 - Math.PI/2;
	var offsetlatlon = transport(lat2, lon2, angle, d);
	lat=offsetlatlon.lat/rad;
	lon=offsetlatlon.lon/rad;
	return {lat:lat, lon:lon};
    };

    // https://stackoverflow.com/questions/2187657/calculate-second-point-knowing-the-starting-point-and-distance
    // https://stackoverflow.com/questions/7222382/get-lat-long-given-current-point-distance-and-bearing
    function transport(lat1,lon1,brng,d) {
	// Starting from lat1,lon2 go in bearing angle for distance dist
	R = 6371e3;
	var lat = Math.asin( Math.sin(lat1)*Math.cos(d/R) +
			     Math.cos(lat1)*Math.sin(d/R)*Math.cos(brng) );
	var lon = lon1 + Math.atan2(Math.sin(brng)*Math.sin(d/R)*Math.cos(lat1),
				    Math.cos(d/R)-Math.sin(lat1)*Math.sin(lat));
	return{lat:lat,lon:lon};
    };
    // http://www.movable-type.co.uk/scripts/latlong.html
    function bearing(lat1, lon1, lat2, lon2) {
	// Calculate the bearing from p1 to p2, provided as four coords    
	var y = Math.sin(lon2-lon1) * Math.cos(lat2);
	var x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);
	var brng = Math.atan2(y, x);	
	return brng;
    };
    
}());


