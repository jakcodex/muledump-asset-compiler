import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import { Canvas, createCanvas, Image, loadImage } from "canvas";
import { parse } from "fast-xml-parser";
import { exec, execFile } from 'child_process'
import { argv } from 'process';

const args = argv.slice(2);

const sheets = new Map<string, SpriteAtlas>();
const atlases: UnityAtlas[] = []

const cli_params = {
	"ar": undefined,
	"resources": undefined,
	"dest": undefined
}

let configURL = "./config.json"
let defaultConfig = "./default_config.json"

for (let i = 0; i < args.length; i += 2) {
    const command = args[i];
    const value = args[i + 1];

    switch (command) {
        case "--config":
            configURL = value;
            break;
		case "--ar":
			cli_params["ar"] = value;
			break;
		case "--resources":
			cli_params["resources"] = value
			break;
		case "--dest":
			cli_params["dest"] = value
			break;
    }
}

let defaultParams = JSON.parse(fs.readFileSync(defaultConfig, "utf-8"))
Object.keys(cli_params).forEach(function(key) {
    if ( cli_params[key] === undefined ) cli_params[key] = defaultParams[key];
});

let missing = [];
Object.keys(cli_params).forEach(function(key) {
    if ( cli_params[key] === undefined ) missing.push("--" + key);
});

if ( missing.length > 0 ) {
	
	console.log("Missing required arguments: ", missing);
	process.exit()

}

const atlasMapper = {
    1: "groundTiles",
    2: "characters",
    4: "mapObjects",
}

type SpriteData = {
    aId: number,
    index: number,
    position: {
        x: number,
        y: number,
        w: number,
        h: number
    },
    maskPosition: {
        x: number,
        y: number,
        w: number,
        h: number
    },
    spriteSheetName?: string;
    direction?: number,
    action?: number,
    isT: boolean
}

let jsonData = fs.readFileSync(configURL, "utf-8")
Object.keys(cli_params).forEach(function(key) {
	const regex = new RegExp(`\\[\\[${key}\\]\\]`, "g");
	jsonData = jsonData.replace(regex, cli_params[key]);
})
console.log("config", jsonData)
const config = JSON.parse(jsonData);

async function main() {

    if (config.decompile) {
        await decompile(config.decompiler);
    }


    const manifest = await loadManifest(config.manifestLocation);
    await loadUnityAtlases(config.input);
    
    const { sprites, animatedSprites } = (JSON.parse(await fsPromises.readFile(`${config.input}/spritesheet.json`, "utf-8")));
    
    for (const atlasData of sprites) {
        setSpriteAtlas(atlasData, manifest);
    }

    for (const data of animatedSprites) {
        //TODO: bandaid fix
        setAnimated({...data.spriteData, ...data}, manifest);
    }

    const promises = [];

    try {
        await fsPromises.mkdir(`${config.output}`);
    } catch {}

    sheets.forEach((sheet, key) => {
        promises.push(sheet.save(config.output, key, manifest[key]));
        if (config.copy[key]) {
            for (let copy of config.copy[key]) {
                promises.push(sheet.save(config.output, copy, manifest[key]));
            }
        }
    })

    await Promise.all(promises);
}

async function decompile(options) {
    return new Promise<void>((res, rej) => {
        execFile(options.exe, [
            options.input, '-o', options.output
        ], async (err, data) => {
            const atlases = [
                "mapObjects.png",
                "characters.png",
                "characters_masks.png",
                "groundTiles.png"
            ]
            

            await fsPromises.mkdir(config.input);
            await fsPromises.copyFile(`${options.output}/ExportedProject/Assets/TextAsset/spritesheet.json`, `${config.input}/spritesheet.json`);
            await Promise.all(atlases.map((atlas) => {
                return fsPromises.copyFile(`${options.output}/ExportedProject/Assets/Texture2D/${atlas}`, `${config.input}/${atlas}`);
            }))

            await fsPromises.mkdir(`${options.output}/xml`);

            const textAssets = await fsPromises.readdir(`${options.output}/ExportedProject/Assets/TextAsset`);
            await Promise.all(textAssets.map(async (assetPath) => {
                const src = `${options.output}/ExportedProject/Assets/TextAsset/` + assetPath;
                const lines = await fsPromises.readFile(`${options.output}/ExportedProject/Assets/TextAsset/` + assetPath, {encoding: "ascii"});
                if (lines.indexOf(`<?xml version="1.0`) >= 0) {
                    await fsPromises.copyFile(src, `${options.output}/xml/` + assetPath.replace(".txt", ".xml"));

                }
            }))

            await fsPromises.rm(`${options.output}/ExportedProject`, { recursive: true })

            res();
        })
    })
}

async function loadUnityAtlases(dir) {
    for (const entry of Object.entries(atlasMapper)) {
        atlases[entry[0]] = await UnityAtlas.create(`${dir}/${entry[1]}`)
    }
}

async function loadManifest(dir) {
    const manifestXML = parse(await fsPromises.readFile(dir, "utf-8"), {
        ignoreAttributes: false,
    });
    const manifest = {};
    for (let set of [...<any[]>Object.values(manifestXML.Manifest.Importer.AnimatedImageSets)[0], ...<any[]>Object.values(manifestXML.Manifest.Importer.ImageSets)[0]]) {
        manifest[set["@_name"]] = {
            frameWidth: +set["@_frameWidth"],
            frameHeight: +set["@_frameHeight"],
            mask: set["@_mask"] != null
        }
    }
    return manifest;
}

function setSpriteAtlas(data: SpriteAtlasData, manifest) {
    let frameWidth = 8, frameHeight = 8;
    if (manifest[data.spriteSheetName]) {
        ({ frameWidth, frameHeight } = manifest[data.spriteSheetName]);
    }

    const atlas = new SpriteAtlas(frameWidth, frameHeight, data);
    for (const sprite of atlas.data.elements) {
        set(sprite, atlas);
    }
    sheets.set(atlas.data.spriteSheetName, atlas);
}

function set(sprite: SpriteData, sheet: SpriteAtlas) {
    sheet.set(sprite);
}

function setAnimated(sprite: SpriteData, manifest) {
    const { spriteSheetName } = sprite;
    let frameWidth = 8, frameHeight = 8;
    if (manifest[spriteSheetName]) {
        ({ frameWidth, frameHeight } = manifest[spriteSheetName]);
    }
    if (/(16x16)/g.test(sprite.spriteSheetName)) {
        frameWidth = frameHeight = 16;
    } else if (/(32x32)/g.test(sprite.spriteSheetName)) {
        frameWidth = frameHeight = 16;
    }
    
    if (!sheets.has(spriteSheetName)) {
        sheets.set(spriteSheetName, new AnimatedSpriteAtlas(sprite.position.w, sprite.position.h, frameWidth, frameHeight, null));
    }

    sheets.get(spriteSheetName).set(sprite);
}

class UnityAtlas {
    image: Image;
    maskImage: Image;
    constructor(imageURL) {}

    static async create(imageURL): Promise<UnityAtlas> {
        const atlas = new UnityAtlas(imageURL);
        atlas.image = await loadImage(imageURL + '.png');
        try {
            atlas.maskImage = await loadImage(imageURL + "_masks.png");
        } catch {

        }

        return atlas;
    }
}

type SpriteAtlasData = {
    spriteSheetName: string;
    atlasId: number;
    elements: SpriteData[];
}


class SpriteAtlas {
    spriteWidth: number
    spriteHeight: number
    canvas: Canvas
    maskCanvas: Canvas;
    maskDrawnTo: boolean;
    data: SpriteAtlasData;

    constructor(spriteWidth, spriteHeight, data) {
        this.spriteWidth = spriteWidth;
        this.spriteHeight = spriteHeight;
        this.canvas = createCanvas(spriteWidth * 16, spriteHeight * 16);
        this.maskCanvas = createCanvas(this.canvas.width, this.canvas.height);
        this.maskDrawnTo = false;
        this.data = data;
    }

    expandCanvas(newHeight) {
        const newCanvas = createCanvas(this.canvas.width, newHeight);
        const newCanvasCtx = newCanvas.getContext("2d");

        newCanvasCtx.drawImage(this.canvas, 0, 0);
        this.canvas = newCanvas;

        const newMaskCanvas = createCanvas(newCanvas.width, newCanvas.height);
        const newMaskCanvasCtx = newMaskCanvas.getContext("2d");
        newMaskCanvasCtx.drawImage(this.maskCanvas, 0, 0);
        this.maskCanvas = newMaskCanvas;
    }

    set(sprite: SpriteData) {
        if (sprite.position == undefined || sprite.isT) return;
        let { x, y, w, h } = sprite.position;
        let { aId } = sprite;

        //hacky tile fix :(
        if (aId == 1) {
            w = 8;
            h = 8;
        }

        const sheetPos = {
            x: (sprite.index * w) % this.canvas.width,
            y: Math.floor(sprite.index / (this.canvas.width / w)) * h
        }

        if (sheetPos.y + h > this.canvas.height) {
            this.expandCanvas(this.canvas.height + (this.spriteHeight * 16));
        }

        const ctx = this.canvas.getContext("2d");
        ctx.drawImage(atlases[aId].image, x, y, w, h, sheetPos.x, sheetPos.y, w, h);

        if (sprite.maskPosition.w != 0) {
            const { x, y, w, h } = sprite.maskPosition;
            const maskCtx = this.maskCanvas.getContext("2d");
            maskCtx.drawImage(atlases[aId].maskImage, x, y, w, h, sheetPos.x, sheetPos.y, w, h);
            this.maskDrawnTo = true;
        }
    }

    async save(path, name, manifestEntry) {
        const canvasPromise = fsPromises.writeFile(`${path}/${name}.png`, this.canvas.toBuffer());
        if (this.maskDrawnTo) {
            return Promise.all([canvasPromise, fsPromises.writeFile(`${path}/${name}_mask.png`, this.maskCanvas.toBuffer())]);
        }
        return canvasPromise
    }
}

class AnimatedSpriteAtlas extends SpriteAtlas {
    animCounter: Map<string, number>
    frameWidth: number
    frameHeight: number

    playerSheet: boolean

    indexCount: any;

    constructor(spriteWidth, spriteHeight, frameWidth, frameHeight, data) {
        super(spriteWidth, spriteHeight, data);
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.canvas = createCanvas(frameWidth, frameHeight * 16);
        this.maskCanvas = createCanvas(frameWidth, frameHeight * 16);
        this.playerSheet = spriteHeight != frameHeight;
        this.animCounter = new Map();
        this.indexCount = {};
    }

    set(sprite: SpriteData) {
        const spriteKey = `${sprite.spriteSheetName}+${sprite.index}+${sprite.direction}+${sprite.action}`
        let { action, direction } = sprite;
        let { x, y, w, h } = sprite.position;
        

        if (!this.animCounter.has(spriteKey)) {
            this.animCounter.set(spriteKey, 0);
        }

        const sheetPos = {
            x: (action == 2) ? this.spriteWidth * 4 : 0,
            y: sprite.index * this.frameHeight
        }

        if (this.playerSheet) {
            let dirMult = 0;
            switch(direction) {
                case 2:
                    dirMult = 2;
                    break;
                case 3:
                    dirMult = 1;
                    break;
            }
            sheetPos.y += this.spriteHeight * dirMult;
        }

        sheetPos.x += (this.animCounter.get(spriteKey) * this.spriteWidth);

        if (sheetPos.y + h > this.canvas.height) {
            this.expandCanvas(this.canvas.height + (this.spriteHeight * 16));
        }

        const ctx = this.canvas.getContext("2d");
        ctx.drawImage(atlases[sprite.aId].image, x, y, w, h, sheetPos.x, sheetPos.y, w, h);

        if (sprite.maskPosition.w != 0) {
            const { x, y, w, h } = sprite.maskPosition;
            const maskCtx = this.maskCanvas.getContext("2d");
            maskCtx.drawImage(atlases[sprite.aId].maskImage, x, y, w, h, sheetPos.x, sheetPos.y, w, h);
            this.maskDrawnTo = true;
        }

        this.animCounter.set(spriteKey, this.animCounter.get(spriteKey) + 1);
    }
}

main();
