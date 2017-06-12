
var autoScaleAction = org.openstreetmap.josm.actions.AutoScaleAction;
autoScaleAction.zoomToSelection();
// The advanced setting of edit.zoom-enlarge-bbox effects this. Usual setting 0.002. Recmmend 0.0001 for small buildings.
/*
Doesn't work:
org.openstreetmap.josm.actions.ZoomInAction();
org.openstreetmap.josm.gui.dialogs.SelectionListDialog.zoomToSelectedElement();
org.openstreetmap.josm.data.osm.visitor.BoundingXYVisitor.visit(pos);
org.openstreetmap.josm.data.osm.visitor.BoundingXYVisitor.enlargeBoundingBox(1.0);
*/
