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

  var a= require("JOSM-Scripts-HOT/examples/addOLC.js");
  a.addOLC();
  a.addOLC({"lat":lat,"lon":lon,"place":"Fiwila, Zambia"});

*/

(function() {
    var util = require("josm/util");
    var console = require("josm/scriptingconsole");
    var layers = require("josm/layers");
    var nb = require("josm/builder").NodeBuilder; 
    var wb = require("josm/builder").WayBuilder;
    var command = require("josm/command");	
    var OpenLocationCode = require("JOSM-Scripts-HOT/lib/openlocationcode_1.js");
    
    exports.addOLC = function(locality) {
	console.clear();
	console.println("A");
	var layer = layers.activeLayer;
	var buildings =	layer.data.query("building");
	var numB = buildings.length;
	console.println("Number of buildings: " + numB);
	for(i=0; i< buildings.length; i++)
	    addOLCtoBuilding(layer, buildings[i], locality);
    };
    
    function addOLCtoBuilding(layer, building, locality) {
	var coord = centroid(building);
	// Function not found:
	var code = OpenLocationCode.encode(coord.lat, coord.lon);
	var code = "AAAA+BB";
	var tags = building.tags;
	tags["ref:olc"] = code;
	if (locality) {
	    scode = OpenLocationCode.shorten(code, locality.lat, locality.lon);
	    var scode = scode + ", " + locality.place;
	    tags["ref:olc_short"] = scode;
	};
	// Doesn't work:
	building.tags = tags; 
    };
    
    function centroid(building) {
	// TODO
	var lat = 0;
	var lon = 0;
	if (building.isNode) {
	    lat = building.lat;
	    lon = building.lon;
	} else if (building.isWay) {
	    lat = building.firstNode().lat;
	    lon = building.firstNode().lon;
	} else {
	    // Dont handle relations.
	}
	return {"lat": lat, "lon": lon};
    };
 
}());





