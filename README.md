# arc-data-changes

Batch changes across your data from [Arc App](https://www.bigpaua.com/arcapp/), an iOS Location Tracking tracker.

This tool allows you to batch-manipulate your data, realizing use cases such as

* Merging duplicate places
* Rename places

## Procedure
The script will read the JSON Backups from Arc, which are stored in iCloud Drive.
Changed files will be exported to Arc's Import directory. The file will have the `lastSaved` property set to the current timestamp, so that the app respects the change and overwrites existing data.

After preparing the files for the Import folder, open Arc and go to *Settings > Backup, Import & Export > Open File Importer* to start the import in the app.

This script is **not at all** user friendly. Right now you need to manipulate `index.ts` to your needs and run the script.


## Configuration
Create a copy of `directories.json` named `directories.mine.json` and enter your directory paths.

## Commands
### Installation
* Install Node.js
* cd to this directory
* Install via `npm install`

### Start the script
`npm start`