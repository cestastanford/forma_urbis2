// ------------------------------------------------------------------------- //
// ------------------------------------------------------------------------- //
// -- filterWorker.js (JavaScript) ----------------------------------------- //
// -- written by Cody M Leff (codymleff@gmail.com) ------------------------- //
// -- for Forma Urbis Romae at CESTA - Spatial History Lab ----------------- //
// ------------------------------------------------------------------------- //
// ------------------------------------------------------------------------- //

/*
*   This module is the source file for a WebWorker that filters a supplied
*   layer by the supplied filters.  It contains the functions to convert
*   formats and perform filters.
*/

/*
*   Receives the dataset and filters to process, then returns it when
*   done.
*/
addEventListener('message', function(event) {

    var dataset = event.data.dataset;
    var activeFilters = event.data.activeFilters;
    var activeFilterValues = event.data.activeFilterValues;
    console_log('hey, its me from the back');

    var filteredDataset = filter(dataset, activeFilters, activeFilterValues);

    postMessage(filteredDataset);
    close();

});

/*
*   Runs the filters.  dataset is a dataset object, activeFilters is an array
*   of filterTemplate objects and activeFilterValues is an array of objects, with
*   each object corresponding to the activeFilters filterTemplate object of
*   the same index.  Each object contains a subtypes array with the selected
*   subtypes and an input array with the values from the input fields.
*/
var filter = function(dataset, activeFilters, activeFilterValues) {

    var fields = dataset.fields;
    var features = dataset.data.features;

    return features.filter(function(feature) {

        for (var i = 0; i < activeFilters.length; i++) {

            var filter = activeFilters[i];
            var input = activeFilterValues[i].input;
            var subtypes = activeFilterValues[i].subtypes;

            /*
            *   Get the list of fields that the filter applies to.
            */
            var applicableFields = fields;

            if (filter['applicable-type'] !== null) {

                applicableFields = fields.filter(function(field) {
                    if (filter['applicable-type'] === field.type) {
                        if (subtypes.indexOf(field.subtype) > -1) {
                            return true;
                        }
                    }
                    return false;
                });
            }

            /*
            *   Convert the input to the default format.
            */
            var inputFormat = filter['ui-input-format'];
            if (inputFormat !== filter['function-input-format']) {

                input = conversions[filter['applicable-type']][inputFormat](input);
            }

            /*
            *   Get the list of fields that satisfy the filter.
            */
            var satisfiedFields = applicableFields.filter(function(field) {

                var data = [feature.properties[field.name]];

                if (data[0]) {

                    if (filter['applicable-type'] && field.format !== filter['function-input-format']) {

                        data = [conversions[filter['applicable-type']][field.format](data)];
                    }

                    if (data[0]) return functions[filter.name](data, input);
                }

                return false;
            });

            /*
            *   Returns true or false depending on whether the filter
            *   is satisfied if any fields pass or if all fields pass.
            */
            if (satisfiedFields.length < 1) return false;

        }

        //  if passed all filters
        return true;

    });

}

//  allows the worker to send messages back to the console.
var console_log = function(message) {

    postMessage({message: message});
};

// -------------------- Static Functions -------------------- //

/*
*   An object containing functions for each filter, organized by filter name.
*/
var functions = {

    "matching-case-insensitive-word-prefix": function(data, input) {

        var lowerCaseInput = input[0].toLowerCase();
        var lowerCaseData = data[0].toLowerCase();
        var re = new RegExp('\\b' + lowerCaseInput);

        return re.test(lowerCaseData);

    },

    "overlapping-date-range": function(data, input) {

        if (isNaN(input[0])) return false;

        var inputIsAfterData = input[0] > data[1];
        var inputIsBeforeData = input[1] < data[0];

        if (inputIsBeforeData || inputIsAfterData) return false;
        return true;

    },

    "matching-type": function(data, input) {

        return data[0] === input[0];

    },

    "matching-case-insensitive-substring": function(data, input) {

        var lowerCaseInput = input[0].toLowerCase();
        var lowerCaseData = data[0].toLowerCase();

        return lowerCaseData.indexOf(lowerCaseInput) > -1;

    },

    "keyword": function(data, input) {

        var lowerCaseInput = input[0].toLowerCase();
        var lowerCaseData = data[0].toLowerCase();

        return lowerCaseData.indexOf(lowerCaseInput) > -1;

    }

}


/*
*   An object containing functions to convert between formats.  The enclosing
*   object organizes conversions by type, and each inner object organizes
*   them by the 'from' format, with all conversions converting to the format
*   accepted by the filter function.
*/
var conversions = {

    'date': {

        'text-period-slash-delim': function(input) {

            var FIRST_DATE = -2000;
            var LAST_DATE = 2015;
            var periods = {
                'Kingdom': [-1000, -508],
                'Republic': [-509, -26],
                'Empire': [-27, 323],
                'Early Medieval': [324, 599],
                'Medieval': [600, 1419],
                'Early Modern': [1420, 1797],
                'Modern': [1798, 2015],
                'Early Christian': [700, 1420],
                'Early Renaissance': [1421, 1500],
                'High Renaissance': [1501, 1527],
                'Late Renaissance': [1528, 1600],
                'Baroque': [1601, 1700],
                'Late Baroque': [1701, 1750],
                'Neoclassical': [1751, 1850],
                'Roma Capitale': [1870, 1922],
                'Fascism': [1923, 1945],
                'Post-WWII': [1946, 2015],
            };

            var inputArray = input[0].split('/');

            if (inputArray.length > 1) {

                var range = inputArray.reduce(function(previous, current) {
                    if (periods[current]) {
                        if (periods[current][0] < previous[0]) previous[0] = periods[current][0];
                        if (periods[current][1] > previous[1]) previous[1] = periods[current][1];
                    }
                    return previous;
                }, [LAST_DATE, FIRST_DATE]);
                if (range[0] < range[1]) return range;

            } else if (periods[input]) return periods[input];
        },

        'string, string': function(input) {

            return [+input[0], +input[1]];
        },
    }
};
