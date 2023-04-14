const version = "1.0";
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const params = {"name": ""};

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
		case '--name':
			params.name = args[i + 1];
			break;
        case '--bi':
            params.bi = true
            break;
		default:
			break;
    }
}
  
if ( params["help"] === true ) {
	
	console.log(`Directory Indexer v${version}: node directory-indexer.js --source /path/to/dir --name parent-dir-name`);
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

const rootDir = params.source; // replace with your directory path
const outputDir = rootDir; // replace with your output directory path

// recursively traverse the directory and its subdirectories
function traverseDir(dirPath, parentDirPath = '') {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  // create an array of subdirectories and files
  const subdirs = [];
  const dirFiles = [];
  files.forEach(file => {
    if (file.isDirectory()) {
      subdirs.push(file);
    } else {
	  if ( file.name.match(/\.html$/) ) return;
      dirFiles.push(file);
    }
  });

  // generate HTML for the directory index
  const folderName = ( parentDirPath !== '' ) ? parentDirPath : params.name;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Index of ${folderName}</title>
      </head>
      <body>
        <h1>Index of ${folderName}</h1>
        <ul>
          ${parentDirPath ? `
            <li><a href="/">..</a></li>
          ` : ''}
          ${subdirs.map(subdir => `
            <li><a href="${parentDirPath}/${subdir.name}.html">${subdir.name}/</a></li>
          `).join('')}
          ${dirFiles.map(file => `
            <li><a href="${parentDirPath}/${file.name}">${file.name}</a></li>
          `).join('')}
          ${parentDirPath && params.bi ? '' : '<li><a href="/build-info.json">build-info.json</a></li>'}
        </ul>
      </body>
    </html>
  `;

  // write the HTML to a file in the output directory
  const outputFilename = parentDirPath ? `${parentDirPath.replace(/\//g, '-')}.html` : 'index.html';
  const outputFilePath = path.join(rootDir, outputFilename);
  fs.writeFileSync(outputFilePath, html);

  // recursively traverse subdirectories
  subdirs.forEach(subdir => {
    traverseDir(path.join(dirPath, subdir.name), path.join(parentDirPath, subdir.name));
  });
}

traverseDir(rootDir);
