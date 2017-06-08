/*
  gyslerc
  Bjoern Hassler, http://bjohas.de

  Run like this:

  var a= require("JOSM-Scripts-HOT/examples/nodeBuilding2Way.js");
  a.nodeBuilding2Way(distance on each side of node in metres, 
        tagKey "building", 
        tagValue "expanded from nodeBuilding", 
  );

  example:

  var a= require("JOSM-Scripts-HOT/examples/nodeBuilding2Way.js");
  a.nodeBuilding2Way(20, "building", "expanded from nodeBuilding");

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
    
    exports.nodeBuilding2Way = function(distance, key, value){
	var tagName={}
	tagName[key]=value;	
	console.clear();
	var layer = current_layer(layers); 
	var buildings = countNodeBuildings(layer); //Find subset of node buildings
	console.println("Number of node-buildings: " + buildings.numNodeBuildings);
	expandNodeBuilding(layer,buildings.nodeBuildings,distance,tagName);
    };
    
    function countNodeBuildings(layer) {
	var dataset = layer.data;
	var nodeBuildings=[];
	var numNodeBuildings = 0;
	result = dataset.query("type:node");
	var numNodes = result.length;
	for (j = 0; j < numNodes; j++) {
	    var node = result[j];
	    if (node.tags.building) {
		nodeBuildings[numNodeBuildings]=node; 
		numNodeBuildings++; 
	    };
	};	
	return{ 
	    nodeBuildings:nodeBuildings,
	    numNodeBuildings:numNodeBuildings
	};
    };	

    function expandNodeBuilding(layer,nodeBuilding,d, tagName) {
	var dist=d*Math.sqrt(2);
	var tagDone={};
	tagDone["building"]="";
	for(i=0; i<nodeBuilding.length; i++)
	{
	    var nodes=[];
	    var lat=nodeBuilding[i].lat*rad;
	    var lon=nodeBuilding[i].lon*rad;
	    for(j=0; j<4; j++)
	    {  
		var brng=Math.PI/4+j*Math.PI/2;
     		var offsetpoint=transport(lat,lon,brng,dist);
		if(j==1)
		{nodes[j]=nodeBuilding[i];
		 nodes[j].pos={lat:offsetpoint.lat/rad, lon:offsetpoint.lon/rad};
		 nodes[j].tags=tagDone;
		}
		else
		{ 	 
		    nodes[j]=drawNode(offsetpoint.lat/rad,offsetpoint.lon/rad); 
		}
	    }
	    nodes[j+1]=nodes[0];
  	    drawWays(nodes,tagName,layer);	 
	}
    };

    function transport(lat1,lon1,brng,d) {
	// Starting from lat1,lon2 go in bearing angle for distance dist
	const R = 6371e3;
	var lat = Math.asin( Math.sin(lat1)*Math.cos(d/R) +
			     Math.cos(lat1)*Math.sin(d/R)*Math.cos(brng) );
	var lon = lon1 + Math.atan2(Math.sin(brng)*Math.sin(d/R)*Math.cos(lat1),
				    Math.cos(d/R)-Math.sin(lat1)*Math.sin(lat));
	return{lat:lat,lon:lon};
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

    function current_layer(layers) {
	console.println("Active layer is " + layers.activeLayer.name)
	return layers.activeLayer;
    }	
}());





