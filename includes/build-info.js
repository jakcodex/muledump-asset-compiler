const https = require('https')
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--help':
            params.help = true;
            break;
        case '--buildhash':
            params.buildhash = args[i + 1];
            break;
        case '--gameversion':
            params.gameversion = args[i + 1];
            break;
        case '--buildinfo':
            params.buildinfo = args[i + 1];
            break;
        default:
            break;
    }
}

if ( params["help"] === true ) {

    console.log('Build Info Updater: node build-info.js --buildhash <string> --gameversion <string> --buildinfo <string>');
    process.exit();

}

if ( !params.buildhash || !params.gameversion || !params.buildinfo ) {

    console.log('Missing required parameter: --buildhash <string> --gameversion <string> --buildinfo <string>');
    process.exit()

}

async function main() {

    //  download latest build info
    let buildinfo = await new Promise(function(resolve, reject) {
        https.get(params.buildinfo, (res) => {
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

    //  update build info with latest information
    buildinfo.version = params.gameversion
    buildinfo.buildhash = params.buildhash
    buildinfo.compiledhash = params.buildhash
    buildinfo.published = new Date()
    buildinfo.timestamp = buildinfo.published
    console.log(JSON.stringify(buildinfo, null, 4))

}

main()
