const version = "1.0";
const fs = require('fs');
const pattern = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?=\x00)/g;
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
        params.help = true;
        break;
      case '--version':
        params.version = true;
        break;
      case '--source':
        params.source = args[i + 1];
        break;
      default:
        break;
    }
  }
  
if ( params["help"] === true ) {
	
	console.log(`ROTMG Version Parser v${version}: node rotmg-version-parser.js --source /path/to/assets`);
	process.exit();
	
}

if ( params.version === true ) {
	
	console.log(`ROTMG Version Parser v${version}`);
	process.exit();
	
}
  
if ( !params.source ) {
	
	console.log("Missing required parameter: --source");
	process.exit()
	
}
  
const filePath = params["source"] + '/RotMG Exalt_Data/il2cpp_data/Metadata/global-metadata.dat';

// Create a readable stream from the file
const stream = fs.createReadStream(filePath);

// Accumulate chunks of data until the pattern is found
let buffer = '';
let versions = {};
stream.on('data', (chunk) => {
    buffer += chunk.toString('binary');
    const matches = buffer.match(pattern);
    if (matches) {
        for (const match of matches) {
            if ( !versions[match] ) versions[match] = 0
            versions[match]++;
        }
    }
    // we need to keep a few bytes at each chunk boundary,
    // in case the version number is split between two chunks.
    // we don't need to keep anything earlier in the chunk, or
    // from previous chunks, because those have already been
    // searched. the version number pattern is at most 20 bytes,
    // but we'll keep a few more in case it grows in the future.
    buffer = buffer.slice(-100);
});

stream.on('end', () => {
    if ( Object.keys(versions).length === 1 ) {
        console.log(Object.keys(versions)[0])
    } else {
        console.log("0.0.0.0.0");
    }
});
