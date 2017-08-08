/*

  addMenuItem.js
  from: http://gubaer.github.io/josm-scripting-plugin/doc/menu.html

  https://github.com/OSM-Utilities/JOSM-Scripts-HOT
  gyslerc, Bjoern Hassler (http://bjohas.de)
  June 2017

  paste this code directly in the scripting console. 
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
// add it to the edit menu
action.addToMenu(josm.menu.get("edit"));
// This does not work:
// add it to the toolbar (append it at the end of the toolbar)
// action.addToToolbar({at: "end"});
// console.println("Action added to menu and toolbar. You can use the preferences to assign a keyboard shortcut.");
console.println("Action added to menu. You can use the preferences to assign a keyboard shortcut or create a toolbar item.");

action.onExecute = function() {
    josm.alert("Action is executing ...");
    // Add whatever functon you need here.
};
