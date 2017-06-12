/*

  addMenuItem.js

  https://github.com/OSM-Utilities/JOSM-Scripts-HOT
  gyslerc, Bjoern Hassler (http://bjohas.de)
  June 2017

*/


var console = require("josm/scriptingconsole");
var JSAction = require("josm/ui/menu").JSAction;
// Check if  menu item already exist
var x=josm.menu.get("edit");
console.println("Adding action to: "+x);
var action = new JSAction({
    name: "My Action 1",
    tooltip: "This is my action",
    onInitEnabled: function() { this.enabled = true;  }
});
action.addToMenu(josm.menu.get("edit"));
//action.addToToolbar({at: "end"});
console.println("Action added. You can use the preferences to assign a keyboard shortcut.");

action.onExecute = function() {
    josm.alert("Action is executing ...");
    // Add whatever functon you need here.
};
