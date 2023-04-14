# RotMG Asset Ripper
Extracts assets from the game files, and tries to recompile the new sprite atlases into the old spritesheets.

## Usage
1. Download the latest version of https://github.com/AssetRipper/AssetRipper/releases
2. Update the `default_config.json` settings if not using command-line arguments
3. Install dependencies with "npm install".
4. Compile the program with "npm run build".
5. Run the program using `node out/index.ts`
   1. Optional runtime arguments:
      1. `--ar` - Path to AssetRipper executable
      2. `--resources` - Path to RotMG Data `resources.assets` file
      3. `--dest` - Output destination for generated content
      