// function for counting number of ways, buildings and areas
/*
gyslerc
Bjoern Hassle, http://bjohas.de

Run like this:

paste this code directly in the scripting console. 
*/
// Get current layer
var layers = require("josm/layers"); //josm/layers is a module. 
var layer = layers.activeLayer;		//active layer is a property of josm/layer

// instantiate the console
var console = require("josm/scriptingconsole");
console.clear();
console.println("Active layer name is: " + layer );

//Find subset of buildings
var buildings=BuildingsSubset(layer);
var NumWays=buildings.NumWays;
var NumAreas=buildings.NumAreas;
var NumBuildings=buildings.NumBuildings;

console.println("Number of ways: " + NumWays );
console.println("Number of areas: " + NumAreas);
console.println("Number of buildings: " + NumBuildings);

function BuildingsSubset(layer) {
var dataset = layer.data;
var result = dataset.query("type:way"); // a method in DataSet mixin
var NumWays=result.length;
var NumAreas = 0;
var NumBuildings = 0;
var BuildingSet=[];
for (j = 0; j < result.length; j++)
{
 var way = result[j];
 if(way.isArea()==true) // way is a java class, it has a method called isArea ()
 { 
   NumAreas++;
   var type = way.tags.building;
   if(type=="yes")
   { NumBuildings++;
     BuildingSet[NumBuildings]= result[j];
   }
  }
} 
return{ 
  NumWays: NumWays,
  NumAreas: NumAreas,
  NumBuildings: NumBuildings
 };
}
