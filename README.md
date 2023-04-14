# muledump-asset-compiler

## Thanks to:

1. [AssetRipper](https://github.com/AssetRipper/AssetRipper)
1. [Haizor's ROTMG Asset Ripper](https://github.com/Haizor/rotmg-asset-ripper)
1. [Altafen's Muledump Render](https://github.com/BR-/muledump-render)

## About

Muledump Asset Compiler is a command-line utility that provides tools for downloading ROTMG game files, extracting Unity assets, generating Muledump renders, and a bit more. 

Combined with its Lambdas it can automatically publish updated game assets and Muledump Renders within minutes after Deca publishes updated game files.

## Publications

[Muledump Renders Canary](https://renders.muledump.com/) - Automated publication of latest Muledump Renders resources before they are validated and published to Muledump

[Realm of the Mad God Assets Repository](https://assets.muledump.com/) - Automated publication of latest ROTMG Unity game assets 

Both publications check for updates every 30 minutes (first assets, then renders).

## Requirements

The individual components run cross-platform on various Linux and Windows versions. You will need the following packages installed:

- Nodejs v18 or higher
- Python 3.9 (a higher version works, but you'll need to update the Pipfile in muledump-render)
- VisualStudio Tools with Nodejs, Python, and Desktop Development with C++

Currently, only one bootstrap script is provided - `run-linux-al2023.sh` - This is tested and works on AWS EC2 Amazon Linux 2023.

Getting this program to work on other Linux variants should not require any substantial changes to the script. Likely, just updating how the OS package manager is used will be sufficient. If you make a variant, feel free to submit a pull request or issue.

Windows and Graviton scripts will be coming soon(tm).

### Bootstrap Startup

When running locally and not with `muledump-stack-updater` the output folder must be empty before starting the program.

Clone the repo and cd into it, then run:

`sh run-linux-al2023.sh`

This will bootstrap the server by installing all dependencies, downloads the game files, and then running rotmg-asset-ripper and muledump-render.

Assuming it finishes successfully, all generated content will be stored in ../output.

All exported data can optionally be synced to an S3 bucket.

Default runtime configuration can be modified at the top of the file.

If utilizing an AWS bucket for storing/publishing resources, all optional runtime arguments become required.

#### Runtime Arguments

Supports the following runtime arguments: 

--game-dest <path> (default: `../output/rotmg-game-files`)  
The location of game file storage

--asset-dest <path> (default: `../output/rotmg-game-assets`)  
The location of ROTMG assets storage

--renders-dest <path> (default: `../output/muledump-renders`)  
The location of renders storage

--resources <path> (default: `$game_dest/RotMG Exalt_Data/resources.assets`)    
The location of the `resources.assets` ROTMG game file

--ar <path> (default: `./vendor/AssetRipper-linux-x64`)  
The path to the AssetRipper binary

--buildhash <string> (optional, but recommended)  
The current ROTMG game build hash (used in the `muledump-renders/constants.js` header for informational purposes only)

--aws-profile <string> (optional)  
The AWS profile to use for syncing outputted data to S3

In order to utilize the AWS features, you must create an AWS profile with `aws configure --profile <string>` before running the program.

--s3-bucket <string> (optional)  
The AWS S3 bucket name

--s3-prefix-assets <string> (optional)  
The AWS S3 key prefix for ROTMG assets

--s3-prefix-renders <string> (optional)  
The AWS S3 key prefix for Muledump renders

--buildinfo-https <string> (optional)  
The HTTPS URL for the current `rotmg-assets/build-info.json`  

--buildinfo-s3 <string> (optional)  
The S3 URL for the current `rotmg-assets/build-info.json`

### Individual Programs

#### rotmg-asset-ripper

Extracts all Unity assets and converts new spite atlases into the old style spritesheets.

Supports the following runtime arguments: 

--ar <path>  
The path to the AssetRipper binary 

--resources <path>  
The path to `resources.assets` in ROTMG game data files

--dest <path>  
The destination path for program output

#### muledump-render

Parses all ROTMG asset files and generates the corresponding Muledump Renders scripts (`constants.js`, `renders.png`, and `sheets.js`).

Supports the following runtime arguments: 

--dest <path>  
The destination path for program output

--source <path>  
The source path or remote URL for ROTMG assets

--game-version <string>  
The version number of the game files

--buildhash <string>
The build hash of the game files

#### rotmg-file-downloader

Downloads all game files for the latest (or specified) build.

Supports the following runtime arguments:

--dest <path>  
The destination path for program output

--buildurl <string>  
The URL to use for determining the latest build

--buildhash <string>
The buildhash to use instead of the latest build

#### rotmg-version-parser

Determines ROTMG game client version from game files.

Supports the following runtime arguments:

--source <path>  
The ROTMG assets path to search in

#### directory-indexer

Simple tool to generate directory index HTML files

Supports the following runtime arguments:

--source <path>  
The source to generate HTML files for

--name <string>  
The name of the index being generated

### Lambdas

The Lambda programs are built and tested specifically for use with AWS Lambda; however, with a little bit of additional work you can run them anywhere.

#### muledump-renders-rotmg-version-monitor

Determines the current ROTMG game build hash and version number, and then stores the information to `rotmg-assets/build-info.json`.

This runs a modified version of `rotmg-version-parser` utilizing remote resources instead of local resources.

#### muledump-stack-updater

Launches a temporary EC2 instance that downloads and runs `muledump-asset-compiler`.

Can be configured to run on a schedule that checks for a new version detected in `rotmg-assets/build-info.json`.

## Upstream Notes

### Changes to Haizor's ROTMG Asset Ripper

1. All hardcoded paths removed and replaced with config vars
1. Command-line arguments are used to dynamically update `config.json` at runtime

### Changes to Altafen's Muledump Render

1. All hardcoded paths removed and replaced with config vars
2. Added support for accessing ROTMG assets from local files

## Support

Jakcodex operates its own Discord server at https://discord.gg/JFS5fqW.

Feel free to join and ask for help getting setup, hear about new updates, offer your suggestions and feedback, or just say hi. We love to hear from the community!

If you encounter a bug, have a feature request, or have any other feedback you can also check out the [issue tracker](https://github.com/jakcodex/muledump/issues) to see if it's already being discussed. If not then you can [submit a new issue](https://github.com/jakcodex/muledump/issues/new).

## Jakcodex License

Copyright 2023 [Jakcodex](https://github.com/jakcodex)

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
