import fs = require('fs');
var glob = require("glob");
const readFiles = require('read-files-promise');
import {arcBackupPlace, arcBackupSubDirectory, arcPlaceAndFileName, arcTimelineItemAndFileName} from "./arcJson";

let globalPlacesAndFilenames: any[] = [];
let globaltimelineItemsAndFilenames: any[] = [];

export class config {
    // Load Directory Paths from config/directories.mine.json or config/directories.json
    arcBackupDir: string
    arcImportDir: string

    configFileMine    = "config/directories.mine.json"
    configFileDefault = "config/directories.json"

    configLoaded: boolean = false

    timelineItemFiles: string[]
    placeFiles: string[]

    public timelineItemsAndFilenamesArr: any[];
    public placesAndFilenamesArr: any[];

    constructor() {
        this.loadConfig();
    }

    loadConfig(): boolean {
        let fileFullPath: string;
        if (fs.existsSync(this.configFileMine)) {
            fileFullPath = this.configFileMine;
        }
        else {
            fileFullPath = this.configFileDefault;
        }

        console.log(`Reading JSON file ${fileFullPath}`)
        let config = JSON.parse(fs.readFileSync(fileFullPath, 'utf8'));

        this.arcBackupDir = config.arcBackupDir;
        this.arcImportDir = config.arcImportDir;

        console.log(`Backup Directory: ${config.arcBackupDir}`);
        console.log(`Import Directory: ${config.arcImportDir}`);
        // TODO: Check if directories really exist (and are directories)
        // TODO: Check for write access in import directory
        this.configLoaded = true;
        return true;
    }

    indexFiles(type: arcBackupSubDirectory): string[] {
        /* Scans through the subdirectory for the data type
           and returns all files (they're not read yet) */

        const searchGlob = `${this.arcBackupDir}${type}/**/*.json`;
        console.log(`indexFiles(${type}) - searching ${searchGlob}`);
    
        let files = glob.sync(searchGlob, {});
        console.log(`indexFiles(${type}) - Found ${files.length} backed up ${type} files`);
        return files;
    }
    
    readPlaceFiles(): Promise<arcPlaceAndFileName[]> {
        /* Read all Place Files into an Array of Places */

        console.log("readPlaceFiles()");

        this.placeFiles = this.indexFiles("Place");

        let places: arcBackupPlace[] = [];
        let placesAndFilenames: any[] = [];
        
        return readFiles(this.placeFiles, {encoding: 'utf8'}).then(fileContentArr => {

            fileContentArr.map((fileContent, index) => {
                let placeBackup = <arcBackupPlace> JSON.parse(fileContent);

                placesAndFilenames.push(
                    {
                        path: this.placeFiles[index],
                        filename: this.placeFiles[index].split('\\').pop().split('/').pop(),
                        content: placeBackup
                    }
                );
                places.push(placeBackup);
                //console.log(placeBackup.name);
            })

            console.log(`Read ${places.length} placeBackupFiles`);
            this.placesAndFilenamesArr = placesAndFilenames;
            return placesAndFilenames;
            // TODO Remove return here
        });
    };

    // Read Timeline Item Files
    readTimelineItemFiles(): Promise<arcTimelineItemAndFileName[]> {
        console.log("readTimelineItemFiles()");

        this.timelineItemFiles = this.indexFiles("TimelineItem");

        let timelineItemsAndFilenames: any[] = [];

        return readFiles(this.timelineItemFiles, {encoding: 'utf8'}).then(fileContentArr => {

            fileContentArr.map((fileContent, index) => {
                let timelineItemBackup = <any> JSON.parse(fileContent);

                timelineItemsAndFilenames.push(
                    {
                        path: this.timelineItemFiles[index],
                        filename: this.timelineItemFiles[index].split('\\').pop().split('/').pop(),
                        content: timelineItemBackup
                    }
                );
            })

            console.log(`Read ${timelineItemsAndFilenames.length} timelineItemFiles`);
            this.timelineItemsAndFilenamesArr = timelineItemsAndFilenames;
            return timelineItemsAndFilenames;  
            // TODO Remove return here
        });
    };

    // Save the changed file to the import
    saveForImport(type: arcBackupSubDirectory, newObjAndFilename: any) {
        /*  Export a modified object to a specific filename
            (for import into Arc) */

        console.log(`saveForImport(type = ${type}, filename = ${newObjAndFilename.filename}) ${ type == "TimelineItem" ? newObjAndFilename.content.startDate+' - '+newObjAndFilename.content.endDate : ''}`);

        // Update last saved property, remove milliseconds
        newObjAndFilename.content.lastSaved = new Date().toISOString().slice(0, -5)+'Z';

        let savePath = `${this.arcImportDir}${type}/${newObjAndFilename.filename}`;
        //console.log(`saveForImport(type = ${type}, filename = ${newObjAndFilename.filename}) - savePath = ${savePath}`);

        fs.writeFile(savePath, JSON.stringify(newObjAndFilename.content, null, 4), function (err) {
            if (err) return console.log(err);
            // console.log(`saveForImport(type = ${type}, filename = ${newObjAndFilename.filename})`);
        });
    };

    // Place Action: Rename a place
    placeActionRenamePlace(placeId: string, newName: string) {

        // Find out old name
        let fromPlace: arcBackupPlace = this.placesAndFilenamesArr.filter(placesAndFilename => placesAndFilename.content.placeId === placeId)[0].content;

        console.log(`Renaming Place '${fromPlace.name}' to '${newName}'`);

        this.placesAndFilenamesArr.filter(placesAndFilename => {
            return placesAndFilename.content.placeId === placeId
        })
        .map(placeAndFilename => {
            placeAndFilename.content.name = newName;
            this.saveForImport("Place",placeAndFilename);
        })
    };

    // Timeline Item Action: Move a place
    timelineItemActionMovePlace(timelineItemsAndFilenamesArr, fromPlaceId: string, toPlaceId: string, from: Date = null, to: Date = null) {

        console.log(`timelineItemActionMovePlace(from = ${fromPlaceId}, to = ${toPlaceId})`);

        let fromPlace: arcBackupPlace = this.placesAndFilenamesArr.filter(placesAndFilename => placesAndFilename.content.placeId === fromPlaceId)[0].content;
        let toPlace: arcBackupPlace   = this.placesAndFilenamesArr.filter(placesAndFilename => placesAndFilename.content.placeId === toPlaceId)[0].content;
        console.log(`moving Place '${fromPlace.name}' to '${toPlace.name}'`);

        let movedTimelineItems: number = 0;
        
        // Filter the Timeline Items to the place and date restriction (function parameters)
        timelineItemsAndFilenamesArr.filter(timelineItemAndFilename => {

            let filterDate = true;
            if(from !== null && to !== null) {
                let startDate = new Date(timelineItemAndFilename.content.startDate);
                let endDate = new Date(timelineItemAndFilename.content.endDate);
                filterDate = (startDate >= from && endDate <= to);
            }

            return timelineItemAndFilename.content.placeId === fromPlaceId && filterDate;
        })
        .map(timelineItemAndFilename => {
            timelineItemAndFilename.content.placeId = toPlaceId;
            timelineItemAndFilename.content.manualPlace = true;
            this.saveForImport("TimelineItem",timelineItemAndFilename);
            movedTimelineItems++;
        });
        console.log(`timelineItemActionMovePlace(from = ${fromPlaceId} '${fromPlace.name}', to = ${toPlaceId} '${toPlace.name}') - Found ${movedTimelineItems} matching timeline items (visits).`);
    }
}

