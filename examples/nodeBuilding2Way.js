/*

  nodeBuilding2Way.js

  This script (intended for the JOSM scripting plugin) expands node-buildings
  into way-buildings.

  Run like this:

  var a= require("JOSM-Scripts-HOT/examples/nodeBuilding2Way.js");
  a.nodeBuilding2Way(distance the building side,
        tagKey "some key", 
        tagValue "some value", 
  );

  Example 1:

  var a= require("JOSM-Scripts-HOT/examples/nodeBuilding2Way.js");
  a.nodeBuilding2Way();

  Example 2:

  var a= require("JOSM-Scripts-HOT/examples/nodeBuilding2Way.js");
  a.nodeBuilding2Way(5, "some key", "some value");

  Note: The script does not run fast - e.g. 100 buildings will take a few seconds.

  https://github.com/OSM-Utilities/JOSM-Scripts-HOT
  gyslerc, Bjoern Hassler (http://bjohas.de)
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
    const rad = Math.PI/180;
    
    exports.nodeBuilding2Way = function(distance_, key, value){
	var tagName={}
	var distance = 4;
	if (distance_)
	    distance = distance_
	if (key)
	    if (value)
		tagName[key]=value; 
	console.clear();
	var layer = current_layer(layers); 
	var buildings = countNodeBuildings(layer); //Find subset of node buildings
	console.println("Number of node-buildings to expand: " + buildings.numNodeBuildings);
	expandNodeBuilding(layer,buildings.nodeBuildings,distance,tagName);
	console.println("Done");
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
	return { 
	    nodeBuildings:nodeBuildings,
	    numNodeBuildings:numNodeBuildings
	};
    };	

    function expandNodeBuilding(layer, nodeBuilding, d, tagName) {
	// tagName currently not used. Could be merged into 'tags' in case the user wants to input additional tags
	// d is the intended length of the building side. We're going to offset diagnonally by half a diagnoal: d*sqrt(2)/2.
	var dist= d * Math.sqrt(2) / 2;
	// var tagDone={};
	for(var i=0; i<nodeBuilding.length; i++)
	{
	    var tags = nodeBuilding[i].tags;
	    // console.println(tags);
	    var nodes=[];
	    var lat=nodeBuilding[i].lat*rad;
	    var lon=nodeBuilding[i].lon*rad;
	    for(var j=0; j<4; j++)
	    {
		//console.println("j="+tags);
		var brng = Math.PI/4+j*Math.PI/2;
     		var offsetpoint = transport(lat,lon, brng, dist);
		if(j==0){
		    nodes[j] = nodeBuilding[i];
		    nodes[j].pos = {lat:offsetpoint.lat/rad, lon:offsetpoint.lon/rad};
		    // Does not work: If nodes[j].tags is set to null, tags also becomes null.
		    //nodes[j].tags = null;
		} else { 	 
		    nodes[j]=drawNode(offsetpoint.lat/rad,offsetpoint.lon/rad); 
		}
	    }
	    nodes[j+1]=nodes[0];
	    if (tags.source) {
		tags.source += ";";
	    } else {
		tags.source = "";
	    }
	    tags.source += "nodeBldgExp";
	    //console.println("o="+tags);
  	    drawWays(nodes,tags,layer);
	    nodes[0].tags = null;
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
    
    function drawWays(nodeVecIn,tags,layer){
	// create a way from vector of nodes and add them to layer
	//console.println(tagName);
	var w2=wb.withNodes(nodeVecIn).withTags(tags).create();
	command.add(nodeVecIn).applyTo(layer)
	command.add(w2).applyTo(layer)
    };	

    function current_layer(layers) {
	console.println("Active layer: " + layers.activeLayer.name)
	return layers.activeLayer;
    }	
}());





