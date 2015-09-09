// ------------------------------------------------------------------------- //
// ------------------------------------------------------------------------- //
// -- layerList.js (JavaScript) ---------------------------------- //
// -- written by Cody M Leff (codymleff@gmail.com) ------------------------- //
// -- for Forma Urbis Romae at CESTA - Spatial History Lab ----------------- //
// ------------------------------------------------------------------------- //
// ------------------------------------------------------------------------- //

/*
*   This script creates registers a controller and directive with the main
*   module for the layer list view.
*/

(function() {

    var module = angular.module('FormaUrbisRomae');


    /*
    *   Controller for the layer list view.  Deals with synchronizing the
    *   checkboxes and sending any updates to the search model.
    */
    module.controller('LayerListController', function($scope, $q, LayerHierarchy, ModifySearch) {

        $scope.list = [];

        LayerHierarchy.done.then(function() {

            addSublayers(LayerHierarchy.layerHierarchy, [], 0);

        });


        /*  Recursively generates a single-depth list of layers
        *   for the view to display.  Note: the viewLayer object is different
        *   from the layer object, and is used only internally by the view.
        */
        function addSublayers(children, ancestorViewLayers, depth) {

            var descendantViewLayers = [];

            for (var i = 0; i < children.length; i++) {

                var child = children[i];

                var item = {

                    depth: depth,
                    name: child.name,
                    ancestorViewLayers: ancestorViewLayers,
                    checked: false,

                };

                $scope.list.push(item);

                if (child.role === 'layer') {

                    item.type = child.source.type;
                    item.source = child.source;
                    item.descendantViewLayers = [];

                    descendantViewLayers.push(item);

                } else {

                    item.type = 'group';

                    var updatedAncestors = ancestorViewLayers.slice()
                    updatedAncestors.push(item);

                    item.descendantViewLayers = addSublayers(child.children, updatedAncestors, depth + 1);

                    Array.prototype.push.apply(descendantViewLayers, item.descendantViewLayers);
                    descendantViewLayers.push(item);
                }
            }

            return descendantViewLayers;

        };


        /*
        *   Makes sure all descendant and ancestor boxes that may be affected
        *   are also checked, then sends resulting source dataset changes to
        *   the view model.
        */
        $scope.updateLayers = function(viewLayer) {

            var changedViewLayers = [];

            changedViewLayers.push(viewLayer);

            //  update all descendants, too
            for (var i = 0; i < viewLayer.descendantViewLayers.length; i++) {

                var descendantViewLayer = viewLayer.descendantViewLayers[i];

                if (descendantViewLayer.checked !== viewLayer.checked) {

                    descendantViewLayer.checked = viewLayer.checked;
                    changedViewLayers.push(descendantViewLayer);
                }
            }

            updateDatasets(changedViewLayers);

            //  check all ancestorLayers to see if any should be changed.
            for (var i = viewLayer.ancestorViewLayers.length - 1; i > -1; i--) {

                var ancestorLayer = viewLayer.ancestorViewLayers[i];
                var element = document.querySelector('input[type="checkbox"][name="' + ancestorLayer.name + '"]');

                //  if all descendants are checked, check the parent
                if (ancestorLayer.descendantViewLayers.every(function(child) { return child.checked; })) {

                    element.indeterminate = false;
                    ancestorLayer.checked = true;

                //  if no descendants are checked, uncheck the parent
                } else if (ancestorLayer.descendantViewLayers.every(function(child) { return !child.checked; })) {

                    element.indeterminate = false;
                    ancestorLayer.checked = false;

                //  if some descendants are checked, intermediate-check the parent
                } else {

                    element.indeterminate = true;
                    ancestorLayer.checked = false;

                }
            }
        };


        /*
        *   Makes the updates to the search model and the map model.
        */
        function updateDatasets(changedViewLayers) {
            console.log(changedViewLayers);
            /*  begins the queue of chained asynchronous tasks for the vector
            *   dataset changes.
            */
            var queue = $q.resolve();

            //  processes each layer change according to its type
            for (var i = 0; i < changedViewLayers.length; i++) {

                var changedViewLayer = changedViewLayers[i];

                //  sends raster layers to the map controller to add.
                if (changedViewLayer.type === 'raster') {

                    //  to mapcontroller
                }

                //  sends vector layers to the search controller to filter
                if (changedViewLayer.type === 'vector') {

                    if (changedViewLayer.checked) {
                        console.log('layer checked: ', changedViewLayer);

                        queue = queue.then(function() {

                            return ModifySearch.addDataset(changedViewLayer.source);
                        });

                    } else {

                        queue = queue.then(function() {

                            ModifySearch.removeDataset(changedViewLayer.source);
                        });
                    }
                }
            }
        };
    });


    /*
    *   HTML directive to display the layer list template.
    */
    module.directive('layers', function() {

        return {
            restrict: 'E',
            templateUrl: 'templates/layerList.html',
        };

    });

})();