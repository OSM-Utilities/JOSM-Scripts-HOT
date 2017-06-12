
var autoScaleAction = org.openstreetmap.josm.actions.AutoScaleAction;
autoScaleAction.zoomToSelection();

/*
Doesn't work:
org.openstreetmap.josm.actions.ZoomInAction();
org.openstreetmap.josm.gui.dialogs.SelectionListDialog.zoomToSelectedElement();
org.openstreetmap.josm.data.osm.visitor.BoundingXYVisitor.visit(pos);
org.openstreetmap.josm.data.osm.visitor.BoundingXYVisitor.enlargeBoundingBox(1.0);
*/
