/**     CARD DATA
 *  all definitions relavent to cards playable in the game, this includes a card's id,
 *  display details, and keywords.
 * 
 *  NOTE: some details are held seperately
 *      audio (we use an audio manager & play-by-key to reduce overhead) - 
 *      types (factions, elements, etc) - tcg-card-type-data.ts
 *      collection tokens (ownership) -
 * 
 *  NOTE: ids are passed over the network, so it is important to keep them small, the
 *  currently indexing scheme is as follows:
 *      (prefix)    (faction ID)    (type)      (card index)    
 *      'tcg-'      '0'             '0'         '00'
 *  this effectively gives us 99 card ids per type per factions
 */

import { CARD_FACTION_TYPE } from "./tcg-card-faction-data";

/** defines splice sheets in an easily changable manner */
export enum TEXTURE_SHEET_CARDS {
    SPELL_DEMO_SHEET = "SPELL_DEMO_SHEET",    
    CHARACTER_DEMO_SHEET = "CHARACTER_DEMO_SHEET",
    FIELD_DEMO_SHEET = "FIELD_DEMO_SHEET",
}
/** data interface for defining a card's texture sheet */
export interface CardTextureDataObject {
    id: string,     //sheet name
    path:string,    //sheet path
    sheetDetails: { 
        totalSizeX: number,     //total width of sheet
        totalSizeY: number,     //total height of sheet
        elementSizeX: number,   //width of each element
        elementSizeY: number,   //height of each element
    }
}
/** listing of all card splice sheets used by cards (this method allows for non-conformity between sheets) */
export const CardTextureData: CardTextureDataObject[] = [
    //### DEMO SPELL SPLICE
    {
        id: "SPELL_DEMO_SHEET", //sheet name
        path:"images/tcg-framework/card-images/card-characters/example-sheet-characters.png",  //sheet path
        sheetDetails: { 
            totalSizeX: 512,      //total width of sheet
            totalSizeY: 512,      //total height of sheet
            elementSizeX: 142,  //width of each element
            elementSizeY: 256,  //height of each element
        }
    },

    //### DEMO CHARACTER SPLICE
    {
        id: "CHARACTER_DEMO_SHEET",
        path:"images/tcg-framework/card-images/card-characters/example-sheet-characters.png",
        sheetDetails: { totalSizeX: 512, totalSizeY: 512, elementSizeX: 142, elementSizeY: 256, }
    },

    //### DEMO FIELD SPLICE
    {
        id: "FIELD_DEMO_SHEET",
        path:"images/tcg-framework/card-images/card-characters/example-sheet-characters.png",
        sheetDetails: { totalSizeX: 512, totalSizeY: 512, elementSizeX: 142, elementSizeY: 256, }
    },
];

/** defines what play type a card is  */
export enum CARD_PLAY_TYPE {
    //effect-based cards
    //  ex: card that causes damage or heals a unit
    SPELL,    
    //creates a unit on the field when played
    //  ex: when played spawns a tank at the designated location
    CHARACTER,
    //changes the player's own battle field, providing unique effects
    //  ex: creates a fortified zone that heals all units at the start of each turn
    FIELD,
}
/** data interface for defining a card */
export interface CardDataObject {
    //indexing
    type:CARD_PLAY_TYPE;    //card type
    faction:CARD_FACTION_TYPE;   //faction type
    id:string; //unique id for this card
    //display text
    name:string;    //in-game display name
    desc:string;    //in-game display desc
    //display 2D
    sheetData:CardSheetDataObject;  //defines how card's character will be drawn
    //display 3D
    objPath:string; //object location
    audioTriggers:string;   //linkage to play sounds at certain points
    //effects
    keywords:string;    //all associated keywords/effects of card
}
/** data interface for defining a card's splice sheet draw details */
export interface CardSheetDataObject {
    sheet:TEXTURE_SHEET_CARDS;    //reference to sheet
    posX:number;    //x position of character on sheet 
    posY:number;    //y position of character on sheet
}

/** listing of all cards included in the game */
export const CardData:CardDataObject[] = [
    //### DEMO SPELLS

    //### DEMO CHARACTERS (MAGES)
    //fire
    {
        //indexing
        type: CARD_PLAY_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.FIRE,
        id:"tcg-0100",
        //display text 
        name: "Fire Mage",
        desc: "An example of a game character",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 0, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/sample-tank/sample-tank.glb",
        audioTriggers: "",
        //effects
        keywords: ""
    },
    //ice
    {
        //indexing
        type: CARD_PLAY_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.ICE,
        id:"tcg-1100",
        //display text 
        name: "Ice Mage",
        desc: "An example of a game character",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 1, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/sample-tank/sample-tank.glb",
        audioTriggers: "",
        //effects
        keywords: ""
    },
    //void
    {
        //indexing
        type: CARD_PLAY_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.VOID,
        id:"tcg-2100",
        //display text 
        name: "Void Mage",
        desc: "An example of a game character",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 0, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/sample-tank/sample-tank.glb",
        audioTriggers: "",
        //effects
        keywords: ""
    },
    //lightning
    {
        //indexing
        type: CARD_PLAY_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.ELECTRIC,
        id:"tcg-3100",
        //display text 
        name: "Lightning Mage",
        desc: "An example of a game character",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 1, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/sample-tank/sample-tank.glb",
        audioTriggers: "",
        //effects
        keywords: ""
    },

    //### DEMO FIELDS
];