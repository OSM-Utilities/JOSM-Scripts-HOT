/*

  processNodeBuildings.js

  Run like this:

  var a= require("JOSM-Scripts-HOT/processNodeBuildings.js");
  a.initNodeBuilding2Way();
  a.reconfigure(4,5,false);

  https://github.com/OSM-Utilities/JOSM-Scripts-HOT
  Bjoern Hassler (http://bjohas.de), gyslerc
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
    var buildings;
    var counter = 0;
    var nodeBuildings
    var nbs;
    var layer;
    var hasMenu = false;
    var dataset;
//    var ds = new org.openstreetmap.josm.data.osm.DataSet();
//    var jmd = require("josm/mixin/DataSetMixin");
    var allNodes;
    var clusters;
    var defaultsidelength = 4;
    var defaultsidelength2 = 5;
    var autoadvance = false;
    
    exports.initNodeBuilding2Way = function() {
	console.clear();
	if (!hasMenu) {
	    addMenuItems();
	    hasMenu = true;
	} else {
	    console.println("Menu already added.");
	};
	exports.getNodeBuildings();	
    };

    exports.getNodeBuildings = function() {
	layer = current_layer(layers); 
	dataset = layer.data;
	counter=0;
	// buildings = countNodeBuildings(layer);
	nodeBuildings = dataset.query("type:node building");
	allNodes = [];
	for (var j=0; j<nodeBuildings.length; j++) { 
	    allNodes[j] = [nodeBuildings[j].lat,  nodeBuildings[j].lon];
	};
	clusters = cluster(allNodes);
	console.println("Number of node-buildings to expand: " + nodeBuildings.length);
	josm.alert("Number of node-buildings to expand: " + nodeBuildings.length);
	nbs = dataset.selection; // new DataSetSelectionFacade(ds);
	nbs.clearAll();
	exports.next();
//	exports.expand("rectangle_up"); 
    };

    //TODO: Show some kind of progress indicator somewhere (console)?
    
    exports.reconfigure = function(length1,length2,auto) {
	defaultsidelength = length1;
	defaultsidelength2 = length2;
	autoadvance = auto;
    }

    var startdate ;
    var nowdate ;

    showtime = function(date,lastdate,number) {
	// timing
	var date2 = new Date();
	var diff = date2 - date;
	var last = date2 - lastdate;
	// console.println("End: "+date2);
	var perobj = "-";
	if (number > 0) {
	    perobj = Math.round(diff / number * 10)/10;
	};
	diff = Math.round(diff/1000);
	last = Math.round(last);
	console.println("time="+diff+" s, avg= "+perobj+" ms per object, since last: "+last + " ms");
    };
    
    exports.next = function() {
	if (counter==0) {
	    startdate = new Date();
	    nowdate = new Date();
	    console.println("Start: "+startdate);
	};
	counter++;
	nbs.clearAll();
//	console.println("counter "+counter);
	var thiscounter = counter-1;
	if (thiscounter < nodeBuildings.length) {
	    bcounter = selectNodeByLatLon(allNodes,llN(allNodes,clusters,thiscounter));
//	    console.println("bcounter "+bcounter+", " + llN(allNodes,clusters,thiscounter));
	    if (nodeBuildings[bcounter].tags) {
		if (nodeBuildings[bcounter].tags.building)  {
		    nbs.add(nodeBuildings[bcounter]);
		    var autoScaleAction = org.openstreetmap.josm.actions.AutoScaleAction;
		    autoScaleAction.zoomToSelection();
		} else {
		    exports.next();
		};
	    };
	} else {
	    josm.alert("Done! " + nodeBuildings.length + " - if you skipped any buildings, press start to start over again.");	
	    counter = 0;
	};
	showtime(startdate,nowdate,counter);
	nowdate = new Date();
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
		    case "circle_small":  way = expandNodeBuildingToCircle(layer,node,defaultsidelength); break;
		    case "circle_large":  way = expandNodeBuildingToCircle(layer,node,defaultsidelength2); break;
		    case "square":  way = expandNodeBuildingToSquare(layer,node,defaultsidelength2); break;
		    case "diamond":  way = expandNodeBuildingToSquare(layer,node,defaultsidelength2,45); break;
		    case "rectangle":
		    case "rectangle_up": way = expandNodeBuildingToRectangle(layer, node, defaultsidelength2*1.5, 0, defaultsidelength2); break;
		    case "rectangle_side": way = expandNodeBuildingToRectangle(layer, node, defaultsidelength2*1.5, 90, defaultsidelength2); break;
		    case "rectangle_45": way = expandNodeBuildingToRectangle(layer, node, defaultsidelength2*1.5, 45, defaultsidelength2); break;
		    case "rectangle_-45": way = expandNodeBuildingToRectangle(layer, node, defaultsidelength2*1.5, -45, defaultsidelength2); break; 
		    default:  way = expandNodeBuildingToSquare(layer,node,defaultsidelength); break;
		    };
		};
	    };
	};
	if (nodes.length === 0) {
	    exports.next();
	} else {
	    nbs.clearAll();
	    if (way !== '') {
		// Now select the (last) way, so it can be transformed manually
		nbs.add(way);
		if (autoadvance)
		    exports.next();
	    };
	};
    };

    exports.test = function() {
	exports.next();
	exports.expand("rectangle");
	exports.next();
	exports.expand("circle_small");
	exports.next();
	exports.expand("circle_large");
	exports.next();
	exports.expand("square");
	exports.next();
	exports.expand("diamond");
	exports.next();
	exports.expand("rectangle");
	exports.next();
	exports.expand("rectangle_up");
	exports.next();
	exports.expand("rectangle_side");
	exports.next();
	exports.expand("rectangle_45");
	exports.next();
	exports.expand("rectangle_-45");
	exports.next();
	josm.alert("Do not upload!!");
    };
    
    exports.addFixme = function(building) {	
	var nodes = nbs.nodes;
	var ways = nbs.ways;
	for (var i=0 ; i<nodes.length; i++) {
	    var node = nodes[i];
	    utils.appendTag(node,"fixme","nodeBlg:Needs improvement.");
	};
	for (var i=0 ; i<ways.length; i++) {
	    var way = ways[i];
	    utils.appendTag(way,"fixme","nodeBlg:Needs improvement.");
	};	
    }

    
    function addMenuItems() {
	utils.addMenuItem("start","Get data and start.", exports.getNodeBuildings );
	utils.addMenuItem("next","Go to next node building in download.", exports.next );
	utils.addMenuItem("fixme","Go to next node building in download.", exports.addFixme );
	utils.addMenuItem("circle_small","Turn node into round building",(function(){ exports.expand("circle_small"); }) );
	utils.addMenuItem("circle_large","Turn node into round building",(function(){ exports.expand("circle_large"); }) );
	utils.addMenuItem("rect_side","Turn node into round building",(function(){ exports.expand("rectangle_side"); }) );
	utils.addMenuItem("rect-45","Turn node into round building",(function(){ exports.expand("rectangle_-45"); }) );
	utils.addMenuItem("rect_up","Turn node into round building",(function(){ exports.expand("rectangle_up"); }) );
	utils.addMenuItem("rect+45","Turn node into round building",(function(){ exports.expand("rectangle_45"); }) );
	utils.addMenuItem("square","Turn node into round building",(function(){ exports.expand("square"); }) );
	utils.addMenuItem("diamond","Turn node into round building",(function(){ exports.expand("diamond"); }) );

    };
    
    /*
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
    */
    
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
	var tags = utils.appendTag(nodeBuilding,"comment","bShape:"+text);
	//var tags = nodeBuilding.tags;
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
	    text = 'rectangle';
	var angle_offset = Math.atan(side_length_short/side_length_long)/rad;
	var angle_1 = 2*angle_offset;
	var angle_2 = 180 - angle_1;
	if (!orientation)
	    orientation = 0
	var radius = Math.sqrt(Math.pow(side_length_long,2) + Math.pow(side_length_short,2))/2;
	// Add a a tag to rectangle buildings:
	// var tags = utils.appendTag(nodeBuilding,"comment","nodeBlg:rectangle");
	//console.println("abc " + side_length_long + " " + side_length_short + " " + radius + " " +angle_offset);
	return expandNodeBuilding(layer, nodeBuilding, text, radius, 4, orientation, angle_offset);
    };
    
    function expandNodeBuildingToSquare(layer, nodeBuilding, side_length, orientation, text) {
	if (!text)
	    text = 'square';
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
	    text = 'circle';
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

    
    function cluster(dataset) {
	const DBSCAN = require("JOSM-Scripts-HOT/lib/DBSCAN.js");
	// const graham_scan = require("JOSM-Scripts-HOT/lib/graham_scan.js");
	//dataset = geoutils.flatten(dataset);	<- don't do this, as we need exact values, to find nodes later.
	var dbscan = new DBSCAN();
        var distance = 50 / 6371e3 / rad;
	var clusters = dbscan.run(dataset, distance, 1); 
	console.println("Total number of clusters found: " + clusters.length); 
	return clusters;	
    };

//TODO: Rather than searching every time, it would be better to create a map once, check it, and then use it.
    
    // nodeBuildings[selectNodeByLatLon(allNodes,llN(clusters,i))]
    function selectNodeByLatLon(arr,latlon) {
	for (var i=0 ; i<arr.length; i++) {
	    // could also do this by tolerace...
	    if (arr[i][0] == latlon[0] && arr[i][1] == latlon[1]) {
		// console.println("lat="+arr[i][0] +",lat="+ latlon[0] +",lon=" + arr[i][1] +",lon="+ latlon[1]);
		return i;
	    };
	};
	return -1;
    };
    
    function llN(dataset,clusters,N) {
	var idx, latlon;
	var counter = -1;
	for(var i=0; i<clusters.length; i++)
	{
	    for(var j=0; j<clusters[i].length; j++)
	    {
		counter++;
		if (counter == N) {
		    idx=clusters[i][j];
		    latlon=dataset[idx];
		    return latlon;
		};
	    }
	};
	return false;
    };	
    

}());




