/*

  processNodeBuildings.js

  Run like this:

  var a= require("JOSM-Scripts-HOT/processNodeBuildings.js");
  a.initNodeBuilding2Way();
  a.reconfigure(4);

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
// Shared vars
    var buildings;
    var counter = 0;
    var nodeBuildings
    var nbs;
    var layer;
    var hasMenu = false;
    var dataset;
//    var ds = new org.openstreetmap.josm.data.osm.DataSet();
//    var jmd = require("josm/mixin/DataSetMixin");
    var defaultsidelength = 4;
    
    exports.initNodeBuilding2Way = function() {
	console.clear();
	if (!hasMenu) {
	    addMenuItems();
	    hasMenu = true;
	} else {
	    console.println("Menu already added.");
	};
	layer = current_layer(layers); 
	dataset = layer.data;
	counter=0;
	nodeBuildings = dataset.query("type:node building");
	buildings = countNodeBuildings(layer);
	console.println("Number of node-buildings to expand: " + nodeBuildings.length);
	nbs = dataset.selection; // new DataSetSelectionFacade(ds);
	nbs.clearAll();
//	exports.next();
//	exports.expand("rectangle_up"); 
    };

    exports.reconfigure = function(length) {
	defaultsidelength = length;
    }
    
    exports.next = function() {
	counter++;
//	josm.alert("Action is executing ... "+counter);	
	nbs.clearAll();
	nbs.add(nodeBuildings[counter]);
	var autoScaleAction = org.openstreetmap.josm.actions.AutoScaleAction;
	autoScaleAction.zoomToSelection();
    };

    // The advanced setting of edit.zoom-enlarge-bbox effects this. Usual setting 0.002. Recmmend 0.0001 for small buildings.
/*
Doesn't work:
org.openstreetmap.josm.actions.ZoomInAction();
org.openstreetmap.josm.gui.dialogs.SelectionListDialog.zoomToSelectedElement();
org.openstreetmap.josm.data.osm.visitor.BoundingXYVisitor.visit(pos);
org.openstreetmap.josm.data.osm.visitor.BoundingXYVisitor.enlargeBoundingBox(1.0);
*/

    exports.expand = function(type) {
	var nodes = nbs.nodes;
	//console.println("id="+nodes[0].id);
	// expandNodeBuilding(layer,nodes[0],distance,id,tagName);
	// expandNodeBuildingToCircle(layer,nbs.nodes[0],4);
	var way = '';
	var node;
	for (var i=0 ; i<nodes.length; i++) {
	    node = nodes[i];
	    //TODO: Only process nodes
	    if (node.tags) {
		if (node.tags.building) {
		    switch(type) {
		    case "circle":  way = expandNodeBuildingToCircle(layer,node,defaultsidelength); break;
		    case "square":  way = expandNodeBuildingToSquare(layer,node,defaultsidelength); break;
		    case "diamond":  way = expandNodeBuildingToSquare(layer,node,defaultsidelength,45); break;
		    case "rectangle":
		    case "rectangle_up": way = expandNodeBuildingToRectangle(layer, node, defaultsidelength*1.5, 0, defaultsidelength); break;
		    case "rectangle_side": way = expandNodeBuildingToRectangle(layer, node, defaultsidelength*1.5, 90, defaultsidelength); break;
		    case "rectangle_45": way = expandNodeBuildingToRectangle(layer, node, defaultsidelength*1.5, 45, defaultsidelength); break;
		    case "rectangle_-45": way = expandNodeBuildingToRectangle(layer, node, defaultsidelength*1.5, -45, defaultsidelength); break; 
		    default:  way = expandNodeBuildingToSquare(layer,node,defaultsidelength); break;
		    };
		};
	    };
	};
	nbs.clearAll();
	if (way !== '') {
	    // Now select the (last) way, so it can be transformed manually
	    nbs.add(way);
	};
    };

    function addMenuItems() {
	addMenuItem("next","Go to next node building in download.", exports.next );
	addMenuItem("circle","Turn node into round building",(function(){ exports.expand("circle"); }) );
	addMenuItem("rect_side","Turn node into round building",(function(){ exports.expand("rectangle_side"); }) );
	addMenuItem("rect-45","Turn node into round building",(function(){ exports.expand("rectangle_-45"); }) );
	addMenuItem("rect_up","Turn node into round building",(function(){ exports.expand("rectangle_up"); }) );
	addMenuItem("rect+45","Turn node into round building",(function(){ exports.expand("rectangle_45"); }) );
	addMenuItem("square","Turn node into round building",(function(){ exports.expand("square"); }) );
	addMenuItem("diamond","Turn node into round building",(function(){ exports.expand("diamond"); }) );

    };
    
    function addMenuItem(name,tooltip,fn) {
	var JSAction = require("josm/ui/menu").JSAction;
	var menu=josm.menu.get("edit");
	if (menu) {
	    var action = new JSAction({
		name: name,
		tooltip: tooltip,
		onInitEnabled: function() { this.enabled = true;  }
	    });
	    action.addToMenu(menu);
	    action.onExecute = fn;
	};
    };
    
    function countNodeBuildings(layer) {

	dataset = layer.data;
	var nodeBuildings=[];
	var numNodeBuildings = 0;
	ds = dataset.query("type:node building");
	var numNodes = ds.length;
	for (j = 0; j < numNodes; j++) {
	    var node = ds[j];
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

    function getNodes(oldNode,lat,lon,dist,n,orientation,distort) {
	// console.println("GetNodes: "+lat + " "+lon+" " + dist + " " + orientation);
	var nodes=[];
	for(var j=0; j<n; j++)
	{
	    //console.println("j="+tags);
	    var brng = orientation * rad + (2*Math.PI)/(2*n) +  j * (2*Math.PI)/n;
	    if (distort !== 0) {
		brng +=  2 * (0.5-(j%2)) * (distort * rad * 4/n - (2*Math.PI)/(2*n));
	    };
     	    var offsetpoint = geoutils.transport(lat,lon, brng, dist);
	    // console.println(j+" " + offsetpoint.lat/rad + " " + offsetpoint.lon/rad);
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

    function annotate(nodeBuilding,text,remove) {
	var tags = nodeBuilding.tags;
	var tagForAnnotation = "source";
    	//var tagForAnnotation = "nodeBldgExp";
	//text = "yes";
	if (remove) {
	    tags[tagForAnnotation] = null;
	} else {
	    if (text)  {
		if (text !== '' && tagForAnnotation != '') {
		    if (tags[tagForAnnotation]) {
			tags[tagForAnnotation] += ";";
		    } else {
			tags[tagForAnnotation] = "";
		    }
		    tags[tagForAnnotation] += "nodeBldgExp:"+text;
		};
	    };
	};
	if (nodeBuilding.tags) {
	    nodeBuilding.tags[tagForAnnotation] = tags[tagForAnnotation];
	};
	return tags;
    };
    
    function expandNodeBuilding(layer, nodeBuilding, text, length, corners, angle, distort) {
	// d is the intended length of the building side. We're going to offset diagnonally by half a diagnoal: d*sqrt(2)/2.
	// var tagDone={};
	//var tags = nodeBuilding.tags;
	// console.println(tags);
	var nodes=[];
	var lat=nodeBuilding.lat*rad;
	var lon=nodeBuilding.lon*rad;
	nodes = getNodes(nodeBuilding,lat,lon,length,corners,angle,distort);
	nodes[nodes.length]=nodes[0];
	var tags = annotate(nodeBuilding,text);
	//console.println("o="+tags);
  	var way = drawWays(nodes,tags,layer);
	if (nodes[0])
	    if (nodes[0].tags) 
		nodes[0].tags = null;
	return way;
    };

    // Does work yet - dims and orientation not correct.
    function expandNodeBuildingToRectangle(layer, nodeBuilding, side_length_long, orientation, side_length_short,text) {
	if (!side_length_long)
	    side_length_long = defaultsidelength;
	if (!side_length_short)
	    side_length_short = defaultsidelength;
	if (!text)
	    text = '';
	var angle_offset = Math.atan(side_length_short/side_length_long)/rad;
	var angle_1 = 2*angle_offset;
	var angle_2 = 180 - angle_1;
	if (!orientation)
	    orientation = 0
	var radius = Math.sqrt(Math.pow(side_length_long,2) + Math.pow(side_length_short,2))/2;
	//console.println("abc " + side_length_long + " " + side_length_short + " " + radius + " " +angle_offset);
	return expandNodeBuilding(layer, nodeBuilding, text, radius, 4, orientation, angle_offset);
    };
    
    function expandNodeBuildingToSquare(layer, nodeBuilding, side_length, orientation, text) {
	if (!text)
	    text = '';
	if (!orientation)
	    orientation = 0;
	if (!side_length)
	    side_length = defaultsidelength;
	var radius = side_length * Math.sqrt(2) / 2;
	//console.println("Square: "+radius+ " " + orientation);
	return expandNodeBuilding(layer, nodeBuilding, text, radius, 4, orientation, 0);
    };

    function expandNodeBuildingToCircle(layer, nodeBuilding, diameter, orientation, text) {
	if (!orientation)
	    orientation = 0;
	if (!text)
	    text = '';
	var n = 12;
	orientation += 360/(2*n);
	// var radius = Math.sqrt(Math.pow(side_length_long,2) + Math.pow(side_length_short,2))/2;
	if (!diameter)
	    diameter = defaultsidelength;
	return expandNodeBuilding(layer, nodeBuilding, text, diameter/2, n, orientation, 0);
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
	return w2;
    };	

    function current_layer(layers) {
	console.println("Active layer: " + layers.activeLayer.name)
	return layers.activeLayer;
    }	

    
    function dbAndGrahamScan(dataset,distance,minNumBldgInResArea,tagName,layer,bufferDistm) { 

	const DBSCAN = require("JOSM-Scripts-HOT/lib/DBSCAN.js");
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
	    for(j=0; j<clusters[i].length; j++)
	    {
		idx=clusters[i][j];
		latlon=dataset[idx];		
	    }
	};
    };	


}());




