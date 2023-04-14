const https = require('https');
const path = require('path');
const fs = require('fs').promises;
const zlib = require('zlib');
const xml2js = require('xml2js');
const args = process.argv.slice(2);
const params = {
    "dest": "./tmp",
    "buildurl": "https://www.realmofthemadgod.com/app/init?platform=standalonewindows64&key=9KnJFxtTvLu2frXv"
};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--help':
            params.help = true;
            break;
        case '--version':
            params.version = true;
            break;
        case '--dest':
            params.dest = args[i + 1];
            break;
        case '--buildurl':
            params.buildurl = args[i + 1];
            break;
        case '--buildhash':
            params.buildhash = args[i + 1];
            break;
        default:
            break;
    }
}

async function main() {

    console.log("ROTMG File Downloader starting ...")
    //  first we must lookup the latest build
    if ( params.buildhash === undefined ) {

        console.log("+ Finding latest build hash")
        let builddata = await new Promise(function (resolve, reject) {
            https.get(params.buildurl, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve(data)
                });

            }).on("error", (err) => {
                console.log("Error: " + err.message);
                reject(err)
            });
        });

        const xmlparser = new xml2js.Parser({explititArray: false});
        builddata = await xmlparser.parseStringPromise(builddata)
        params.buildhash = builddata.AppSettings.BuildHash[0]
        console.log("+ Found build hash: ", params.buildhash)

    }

    const fileprefix = "https://rotmg-build.decagames.com/build-release/" + params.buildhash + "/rotmg-exalt-win-64"
    const filelist = fileprefix + "/checksum.json"

    //  second we will download the file list
    console.log("+ Downloading file list")
    let files = await new Promise(function(resolve, reject) {
        https.get(filelist, (res) => {
           let data = '';

           res.on('data', (chunk) => {
            data += chunk;
           });

           res.on('end', () => {
            const jsonData = JSON.parse(data);
            resolve(jsonData)
           });

        }).on("error", (err) => {
            console.log("Error: " + err.message);
            reject(err)
        });
    });

    for ( const key in files.files ) {

        const file = files.files[key]
        const filefolder = params.dest + "/" + path.dirname(file.file)
        const filename = params.dest + "/" + file.file
        const fileurl = fileprefix + "/" + file.file + ".gz"

        try {
            await fs.access(filefolder);
        } catch (err) {
            console.log("+ Creating file folder:", filefolder)
            await fs.mkdir(filefolder, {recursive:true})
        }

        console.log("+ Downloading file: ", fileurl)
        let filedata = await new Promise(function(resolve, reject) {
               https.get(fileurl, (res) => {
                const chunks = [];
                res.on('data', (chunk) => {
                  chunks.push(chunk);
                });
                res.on('end', () => {
                  const data = Buffer.concat(chunks);
                  resolve(data);
                });

               }).on("error", (err) => {
                 console.log("+ Error: " + err.message);
                 reject(err)
               });
        });

        console.log("+ Decompressing file ...")
        let rawfile = await new Promise(function(resolve, reject) {
           zlib.gunzip(filedata, (err, data) => {
            if (err) {
                console.log(fileurl)
                throw err
            }
            resolve(data)
           });
        });

        console.log("+ Writing file: ", filename)
        await fs.writeFile(filename, rawfile);


    }

}

main()
