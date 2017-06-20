
(function() {
    var console = require("josm/scriptingconsole");
	
    exports.addMenuItem = function(name,tooltip,fn) {
	var JSAction = require("josm/ui/menu").JSAction;
	var menutext = "edit";
	//var menutext = "scripting";
	var menu=josm.menu.get(menutext);
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

    exports.appendTag = function(object,tagToChange,text,remove) {
	var tags = object.tags;
	if (!tagToChange)
	    tagToChange = "fixme";
	if (!text)
	    tagToChange = "fixme";
	if (!remove)
	    remove = false;
	//var tagToChange = "source";
    	//var tagToChange = "nodeBldgExp";
	//text = "yes";
	if (remove) {
	    tags[tagToChange] = null;
	} else {
	    if (text)  {
		if (text !== '' && tagToChange != '') {
		    if (tags[tagToChange]) {
			tags[tagToChange] += ";";
		    } else {
			tags[tagToChange] = "";
		    }
		    tags[tagToChange] += text;
		};
	    };
	};
	if (object.tags) {
	    object.tags[tagToChange] = tags[tagToChange];
	};
	return tags;
    };



    exports.getBuildings = function(layer,useFirstNodeOnly,buffer) {
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
	// TODO: Exceptions if nothing is selected, residential area or way may be selected. 
	var nbs = dataset.selection;
	console.println("Finding a cluster around node: "+nbs.objects[0]);
	if(nbs.objects!=[])
	{allNodes[numAllNodes]=[nbs.objects[0].lat,  nbs.objects[0].lon];
	numAllNodes++;	}
	for (j = 0; j < numWays; j++)
	{
	    var way = result[j];
	    if(way.isArea()==true)
	    { 
		numAreas++;
		var type = way.tags.building;
		if(type)
		{  
		    /*
		      TODO: The are some 'degenerate' cases.
		      E.g. three node buildings on one line
		      E.g. a building with a large side length (compared to clustering length), and several points down the side on one line
		      The offset agorithm will still work, but because the objects don't 'span a plane', they will end up on the boundary of the area.
		      The offset algorithm notices these straight segments, and a possible solution is to add both points (lef/right of the segment) and then run the hull algrithm again on those points.
		     */
// Could consider input buffering, which would double the number of nodes.
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

}());
