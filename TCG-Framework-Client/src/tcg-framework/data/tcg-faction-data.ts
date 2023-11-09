/**     TRADING CARD GAME - CARD FACTION DATA
 *  all definitions relavent to card factions that can be used by cards in the game. these usually
 *  mainly define card backgrounds and what cards can be used in the deck at the same time.
 */

import { TEXTURE_SHEET_CARD_FACTIONS } from "./tcg-faction-texture-data";

/** defines what factions are available to be used on cards  */
export enum CARD_FACTION_TYPE {
    NEUTRAL,
    FIRE,
    VOID,
    ELECTRIC,
    ICE
}

/** data interface for defining a card */
export interface CardFactionDataObject {
    //indexing
    id:CARD_FACTION_TYPE;    //card type
    //display text
    name:string;    //in-game display name
    desc:string;    //in-game display desc
    //display 2D
    sheetData:CardFactionSheetDataObject;  //defines how card's character will be drawn
}

/** data interface for defining a card's splice sheet draw details */
export interface CardFactionSheetDataObject {
    id:TEXTURE_SHEET_CARD_FACTIONS;    //reference to sheet
    posX:number;    //x position of character on sheet 
    posY:number;    //y position of character on sheet
}

/** listing of all cards included in the game */
export const CardFactionData:CardFactionDataObject[] = [
    //### DEMO FACTIONS
    //neutral
    {
        //indexing
        id: CARD_FACTION_TYPE.NEUTRAL,
        //display text 
        name: "Neutral",
        desc: "Neutral themed cards",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_0, posX: 0, posY: 0 },
    },
    //fire
    {
        //indexing
        id: CARD_FACTION_TYPE.FIRE,
        //display text 
        name: "Fire",
        desc: "Fire themed cards",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_1, posX: 0, posY: 0 },
    },
    //void
    {
        //indexing
        id: CARD_FACTION_TYPE.VOID,
        //display text 
        name: "Void",
        desc: "Void themed cards",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_1, posX: 1, posY: 0 },
    },
    //electric
    {
        //indexing
        id: CARD_FACTION_TYPE.ELECTRIC,
        //display text 
        name: "Electric",
        desc: "Electric themed cards",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_2, posX: 0, posY: 0 },
    },
    //ice
    {
        //indexing
        id: CARD_FACTION_TYPE.ICE,
        //display text 
        name: "Ice",
        desc: "Ice themed cards",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_2, posX: 1, posY: 0 },
    },
];