import {arcBackupPlace, arcBackupSubDirectory} from "./arcJson";

var glob = require("glob");
const fs = require('fs');
var async = require("async");
const readFiles = require('read-files-promise');

const arcarcBackupDir = "/Users/more/Library/Mobile Documents/iCloud~com~bigpaua~LearnerCoacher/Documents/Backups/";
const arcImportDir = "/Users/more/Library/Mobile Documents/iCloud~com~bigpaua~LearnerCoacher/Documents/Import/";

let globalPlacesAndFilenames: any[] = [];
let globaltimelineItemsAndFilenames: any[] = [];

// Index files
const indexFiles = (type: arcBackupSubDirectory): string[] => {
    const searchGlob = arcarcBackupDir+type+"/**/*.json";
    console.log(`indexFiles(${type}) - searching ${searchGlob}`);

    let files = glob.sync(searchGlob, {});
    console.log(`indexFiles(${type}) - Found ${files.length} backed up ${type} files`);
    return files;
};

// Read Place Files
let readPlaceFiles = (placeFileArr: string[]): Promise<arcBackupPlace[]> => {
    console.log("readPlaceFiles()");

    let places: arcBackupPlace[] = [];
    let placesAndFilenames: any[] = [];
    
    return readFiles(placeFileArr, {encoding: 'utf8'}).then(fileContentArr => {

        fileContentArr.map((fileContent, index) => {
            let placeBackup = <arcBackupPlace> JSON.parse(fileContent);

            placesAndFilenames.push(
                {
                    path: placeFileArr[index],
                    filename: placeFileArr[index].split('\\').pop().split('/').pop(),
                    content: placeBackup
                }
            );
            places.push(placeBackup);
            //console.log(placeBackup.name);
        })

        console.log(`Read ${places.length} placeBackupFiles`);
        return placesAndFilenames;  
    });
};

// Read Timeline Item Files
let readTimelineItemFiles = (timelineItemArr: string[]): Promise<any[]> => {
    console.log("readTimelineItemFiles()");

    let timelineItemsAndFilenames: any[] = [];

    return readFiles(timelineItemArr, {encoding: 'utf8'}).then(fileContentArr => {

        fileContentArr.map((fileContent, index) => {
            let timelineItemBackup = <any> JSON.parse(fileContent);

            timelineItemsAndFilenames.push(
                {
                    path: timelineItemArr[index],
                    filename: timelineItemArr[index].split('\\').pop().split('/').pop(),
                    content: timelineItemBackup
                }
            );
        })

        console.log(`Read ${timelineItemsAndFilenames.length} timelineItemFiles`);
        return timelineItemsAndFilenames;  
    });
};

// Place Action: Rename a place
const placeActionRenamePlace = (placeId: string, newName: string) => {
    globalPlacesAndFilenames.filter(placesAndFilename => {
        return placesAndFilename.content.placeId === placeId
    })
    .map(placeAndFilename => {
        console.log(placeAndFilename);
        placeAndFilename.content.name = newName;
        saveForImport("Place",placeAndFilename);
    })
};


// Timeline Item Action: Move a place
const timelineItemActionMovePlace = (fromPlaceId: string, toPlaceId: string, from: Date = null, to: Date = null) => {

    console.log(`timelineItemActionMovePlace(from = ${fromPlaceId}, to = ${toPlaceId})`);

    let fromPlace: arcBackupPlace = globalPlacesAndFilenames.filter(placesAndFilename => placesAndFilename.content.placeId === fromPlaceId)[0].content;
    let toPlace: arcBackupPlace = globalPlacesAndFilenames.filter(placesAndFilename => placesAndFilename.content.placeId === toPlaceId)[0].content;
    console.log(`moving Place '${fromPlace.name}' to '${toPlace.name}'`);

    let movedTimelineItems: number = 0;
    
    globaltimelineItemsAndFilenames.filter(timelineItemAndFilename => {
        let filterDate = true;
        if(from !== null && to !== null) {
            let startDate = new Date(timelineItemAndFilename.content.startDate);
            let endDate = new Date(timelineItemAndFilename.content.endDate);
            //console.log(`${new Date(timelineItemAndFilename.content.startDate)} / ${timelineItemAndFilename.content.startDate} >= ${from} ${new Date(timelineItemAndFilename.content.startDate) <= from}`);
            filterDate = (startDate >= from && endDate <= to);
        }

        return timelineItemAndFilename.content.placeId === fromPlaceId && filterDate;
    })
    .map(timelineItemAndFilename => {
        timelineItemAndFilename.content.placeId = toPlaceId;
        timelineItemAndFilename.content.manualPlace = true;
        saveForImport("TimelineItem",timelineItemAndFilename);
        movedTimelineItems++;
    });
    console.log(`timelineItemActionMovePlace(from = ${fromPlaceId} '${fromPlace.name}', to = ${toPlaceId} '${toPlace.name}') - Found ${movedTimelineItems} matching timeline items (visits).`);

}

// Save the changed file to the import
const saveForImport = (type: arcBackupSubDirectory, newObjAndFilename: any) => {

    console.log(`saveForImport(type = ${type}, filename = ${newObjAndFilename.filename}) ${ type == "TimelineItem" ? newObjAndFilename.content.startDate+' - '+newObjAndFilename.content.endDate : ''}`);

    // Update last saved property, remove milliseconds
    newObjAndFilename.content.lastSaved = new Date().toISOString().slice(0, -5)+'Z';

    let savePath = arcImportDir+type+'/'+newObjAndFilename.filename;
    //console.log(`saveForImport(type = ${type}, filename = ${newObjAndFilename.filename}) - savePath = ${savePath}`);

    fs.writeFile(savePath, JSON.stringify(newObjAndFilename.content, null, 4), function (err) {
        if (err) return console.log(err);
        // console.log(`saveForImport(type = ${type}, filename = ${newObjAndFilename.filename})`);
    });
};