/*
gyslerc
Bjoern Hassle, http://bjohas.de

Run like this:
var a= require("JOSM-Scripts-HOT/addLayerWay_args.js");
a.addLayerWay_args("layerName","wayKey","wayValue", lat, lon, size);

Example:
var a= require("JOSM-Scripts-HOT/addLayerWay_args.js");
a.addLayerWay_args("ResidentialAreas","landuse","residential",-2.743, 34.08, 1);
*/
(function() {       
    exports.addLayerWay_args = function(){
	var	layerName=arguments[0];
	var	key=arguments[1];
	var	value=arguments[2];
	var	lat=arguments[3];
	var	lon=arguments[4];
	var	size=arguments[5];
	var console = require("josm/scriptingconsole");
	var command = require("josm/command");
	var layers = require("josm/layers");
	console.clear();
	var nb = require("josm/builder").NodeBuilder; 
	var x=lat;
	var y=lon;
	var nodes=[];
	for(i=0; i<3; i++)
	{
	 nodes[i]=nb.withPosition(x, y).create();
	 x=x+0.01;
	 y=y-0.002*size*i;
	}
	nodes[i+1]=nodes[0];
	layer=addlayer(layerName,console,layers);
	drawWays(nodes,key,value,console,command,layer);
    };
	
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
		
	function drawWays(){
	nodeVecIn=arguments[0];
	key=arguments[1];
	value=arguments[2];
	console=arguments[3];
	command=arguments[4];
	layer=arguments[5];
	tagName={}
	tagName[key]=value;
	console.println("nodeVectorIn: " + nodeVecIn);
	console.println("key: " + key);
	console.println("value: " + value);
	var wb = require("josm/builder").WayBuilder; 
	// create a way from vector of nodes and add them layer
	var w2=wb.withNodes(nodeVecIn).withTags(tagName).create();
	command.add(nodeVecIn).applyTo(layer)
	command.add(w2).applyTo(layer)
	};	
	
}());


