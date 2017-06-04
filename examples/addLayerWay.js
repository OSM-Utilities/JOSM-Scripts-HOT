/*
gyslerc
Bjoern Hassle, http://bjohas.de

Run like this:

var a= require("JOSM-Scripts-HOT/examples/addLayerWay.js");
a.addLayerWay();
*/
(function() {   
    exports.addLayerWay = function() {
	//create a new layer named 'test layer'
	var layers = require("josm/layers");
	var b = layers.has("test layer"); // if 'test layer' doesn't exist make one
	if(b==false){ layer = josm.layers.addDataLayer("test layer");}
	else{layer=layers.get("test layer");}

	// create nodes and ways
	var command = require("josm/command");
	var nb = require("josm/builder").NodeBuilder; 
	var wb = require("josm/builder").WayBuilder;
	var n1 =nb.withPosition(-2.792,  34.092).create(); // enter lat, lon of node
	var n2 = nb.withPosition(-2.790,  34.09).create(); // enter lat, lon of node
	var n3 = nb.withPosition(-2.785,  34.099).create(); // enter lat, lon of node
	var w1=wb.withNodes(n1,n2,n3,n1).withTags({landuse: 'residential'}).create(); // note: first and last node are the same to make it a closed way. 
	// add nodes and ways to 'test layer'
	command.add(n1,n2,n3).applyTo(layer)
	command.add(w1).applyTo(layer)

	// create a vector of nodes
	var x=-2.8; // enter lat, lon of node
	var y=34.08; // enter lat, lon of node
	var nodes=[];
	for(i=0; i<3; i++)
	{
	 nodes[i]=nb.withPosition(x, y).create();
	 x=x+0.01;
	 y=y-0.002*i;
	}
	nodes[i+1]=nodes[0];
	// create a way from vector of nodes and add them to 'test layer'
	var w2=wb.withNodes(nodes).withTags({landuse: 'residential'}).create();
	command.add(nodes).applyTo(layer)
	command.add(w2).applyTo(layer)
    };
}());


