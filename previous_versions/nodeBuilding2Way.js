/*

  nodeBuilding2Way.js

  This script (intended for the JOSM scripting plugin) expands
  node-buildings into way-buildings. 

  Run like this:

  var a= require("JOSM-Scripts-HOT/examples/nodeBuilding2Way.js");
  a.nodeBuilding2Way("user:date",distance the building side,
        tagKey "some key", 
        tagValue "some value", 
  );

  "user:date" can be any string, but recommended is to use your OSM id + date, e.g. bjohas:201705609.
  A string "nodeBldgExp:bjohas:201705609" will be added to the "source" tag, meaning you can then revisit 
  the expanded buildings using a JOSM search.

  tagkey/tagvalue is currently ignored. Idea is that it would add an extra tag.

  Example 1:

  var a= require("JOSM-Scripts-HOT/examples/nodeBuilding2Way.js");
  a.nodeBuilding2Way("user:date");

  Example 2:

  var a= require("JOSM-Scripts-HOT/examples/nodeBuilding2Way.js");
  a.nodeBuilding2Way("user:date", 5, "some key", "some value");

  Note: The script does not run fast - assume that 10 buildings will
  take one to a few seconds! So with larger numbers of buildings, this
  script will run for a few minutes, without user feedback: We haven't
  worked out how to do progress indicators yet!

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
           
    exports.nodeBuilding2Way = function(id, distance_, key, value){
	// console.clear();
	var date = new Date();
	console.println("Start: "+date);
	var tagName={}
	var distance = 4;
	if (distance_)
	    distance = distance_
	if (key)
	    if (value)
		tagName[key]=value; 
	var layer = current_layer(layers); 
	var buildings = countNodeBuildings(layer); //Find subset of node buildings
	console.println("Number of node-buildings to expand: " + buildings.numNodeBuildings);
	if (id) {
	    expandNodeBuilding(layer,buildings.nodeBuildings,distance,id,tagName);
	    console.println("Done");
	} else {
    	    console.println("Sorry, please provide some kind if identifier e.g. user:date.");
	};
	// timing
	var date2 = new Date();
	var diff = date2-date;
	console.println("End: "+date2);
	var perobj = "-";
	if (buildings.numNodeBuildings > 0) {
	    perobj = Math.round(diff / buildings.numNodeBuildings * 10)/10;
	};
	diff = Math.round(diff/1000);
	console.println("time="+diff+" s, "+perobj+" ms per object");
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

    function getNodes(oldNode,lat,lon,dist,n,ang,distort) {
	var nodes=[];
	for(var j=0; j<n; j++)
	{
	    //console.println("j="+tags);
	    var brng = (j*2) * Math.PI/n + ang/180*Math.PI;
     	    var offsetpoint = geoutils.transport(lat,lon, brng, dist);
	    if(j==0){
		nodes[j] = oldNode;
		nodes[j].pos = {lat:offsetpoint.lat/rad, lon:offsetpoint.lon/rad};
		// Does not work: If nodes[j].tags is set to null, tags also becomes null. pass-by-ref?
		//nodes[j].tags = null;
	    } else { 	 
		nodes[j]=drawNode(offsetpoint.lat/rad,offsetpoint.lon/rad); 
	    }
	}
	return nodes;
    };

    
    function expandNodeBuilding(layer, nodeBuilding, d, id, tagName) {
	// tagName currently not used. Could be merged into 'tags' in case the user wants to input additional tags
	// d is the intended length of the building side. We're going to offset diagnonally by half a diagnoal: d*sqrt(2)/2.
	// var tagDone={};
	for(var i=0; i<nodeBuilding.length; i++)
	{
	    var tags = nodeBuilding[i].tags;
	    // console.println(tags);
	    var nodes=[];
	    var lat=nodeBuilding[i].lat*rad;
	    var lon=nodeBuilding[i].lon*rad;
	    var dist= d * Math.sqrt(2) / 2;
	    nodes = getNodes(nodeBuilding[i],lat,lon,dist,4,0,0);
	    nodes[j+1]=nodes[0];
	    if (tags.source) {
		tags.source += ";";
	    } else {
		tags.source = "";
	    }
	    tags.source += "nodeBldgExp:"+id;
	    //console.println("o="+tags);
  	    drawWays(nodes,tags,layer);
	    nodes[0].tags = null;
	}
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





