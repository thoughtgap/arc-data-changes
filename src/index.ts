import {arcBackupPlace, arcBackupSubDirectory} from "./arcJson";
import * as arcBackupFiles from "./arcBackupFiles";

const arcBackupManipulation = new arcBackupFiles.config();

// Read all TimelineItems and Places and perform Actions on them
arcBackupManipulation.readTimelineItemFiles().then(timelineItemsAndFilenamesArr => {
    arcBackupManipulation.readPlaceFiles().then(placesAndFilenamesArr => {

        /*
            You have access to all loaded timelineItemsAndFilenames as well as
            placesAndFilenames here, which you can use for filtering.
            
            Manipulation via <type>Action<ActionDescription> function inside the class,
            for example: 
                placeActionRenamePlace
                timelineItemActionMovePlace
        */
        

        // Example: Rename a place
        arcBackupManipulation.placeActionRenamePlace(
            "CD2E231D-E17A-4BC2-AC29-E485E75C04A0",
            "New Name of Place A"
        );

        // Example: Move all visits of Place A to Place B
        arcBackupManipulation.timelineItemActionMovePlace(
            timelineItemsAndFilenamesArr,
            "1EA4B40C-9CA4-4903-AF52-C2F5B91879D9", // Place A, weird duplicate from 2019
            "CD2E231D-E17A-4BC2-AC29-E485E75C04A0"  // Place B (main place)
        );


        // Example: Find all duplicate places with the exact same name and assigned visits
        var deduplicatedPlaces = [];

        placesAndFilenamesArr.forEach(place => {
            
            // Define Place name + Coordinates (exact match) as key
            let key = `${place.content.name}_${place.content.center.latitude}_${place.content.center.longitude}`;

            // If coordinates should be matched more losely, they can be rounded:
            // let key = `${place.content.name}_${place.content.center.latitude.toFixed(3)}_${place.content.center.longitude.toFixed(3)}`;

            // Search all timelineItems for visits, otherwise ignore the place.
            if(timelineItemsAndFilenamesArr.filter(timelineItem => timelineItem.content.placeId == place.content.placeId).length > 0) {
                if(!deduplicatedPlaces[key]) {
                    deduplicatedPlaces[key] = [];
                }
                deduplicatedPlaces[key].push(place);
            }
        });

        for (var key in deduplicatedPlaces) {
            // Consider this place a duplicate if more than one places match the key
            if(deduplicatedPlaces[key].length > 1) {
                console.log(deduplicatedPlaces[key].length + '   ' + key);

                deduplicatedPlaces[key].forEach((dupePlace, i) => {
                    console.log("   "+dupePlace.content.placeId + '   ' + dupePlace.content.name + ' (' +dupePlace.content.center.latitude +'  '+ dupePlace.content.center.longitude + ')' + (dupePlace.content.foursquareVenueId ? ' Foursquare '+dupePlace.content.foursquareVenueId : '') );

                    // Move all places to the first one
                    if(i>0) {

                        // Get Place ID of First one
                        let targetPlaceId = deduplicatedPlaces[key][0].content.placeId;
                        
                        // Move
                        arcBackupManipulation.timelineItemActionMovePlace(
                            timelineItemsAndFilenamesArr,
                            dupePlace.content.placeId,
                            targetPlaceId
                        );
                    }
                });
            }
        }
    });
});