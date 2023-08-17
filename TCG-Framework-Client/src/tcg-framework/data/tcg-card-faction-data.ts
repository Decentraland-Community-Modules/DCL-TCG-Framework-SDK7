/**     CARD FACTION DATA
 *  all definitions relavent to card factions that can be used by cards in the game. these usually
 *  mainly define card backgrounds and what cards can be used in the deck at the same time.
 * 
 *  NOTE: in this demo cards are themed into elemental factions. 
 */

/** defines splice sheets in an easily changable manner */
export enum TEXTURE_SHEET_CARD_FACTIONS {
    TYPE_BACKGROUND_0 = "TYPE_BACKGROUND_0",    
    TYPE_BACKGROUND_1 = "TYPE_BACKGROUND_1",
}
/** data interface for defining a card type's texture sheet */
export interface CardFactionTextureDataObject {
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
export const CardFactionTextureData: CardFactionTextureDataObject[] = [
    //### DEMO BACKGROUND SPLICE
    {
        id: "TYPE_BACKGROUND_0", //sheet name
        path:"images/tcg-framework/card-images/card-backgrounds/card-type-example-0.png",  //sheet path
        sheetDetails: { 
            totalSizeX: 512,      //total width of sheet
            totalSizeY: 512,      //total height of sheet
            elementSizeX: 256,  //width of each element
            elementSizeY: 512,  //height of each element
        }
    },
    {
        id: "TYPE_BACKGROUND_1", //sheet name
        path:"images/tcg-framework/card-images/card-backgrounds/card-type-example-1.png",  //sheet path
        sheetDetails: { 
            totalSizeX: 512,      //total width of sheet
            totalSizeY: 512,      //total height of sheet
            elementSizeX: 256,  //width of each element
            elementSizeY: 512,  //height of each element
        }
    },
];

/** defines what factions are available to be used on cards  */
export enum CARD_FACTION_TYPE {
    NEUTRAL,
    FIRE,
    ICE,
    VOID,
    ELECTRIC
}

export enum CARD_FACTION_ID {
    FACTION_NEUTRAL,
    FACTION_FIRE,
    FACTION_ICE,
    FACTION_VOID,
    FACTION_ELECTRIC,
}

/** data interface for defining a card */
export interface CardFactionDataObject {
    //indexing
    type:CARD_FACTION_TYPE;    //card type
    id:CARD_FACTION_ID; //unique id for this card
    //display text
    name:string;    //in-game display name
    desc:string;    //in-game display desc
    //display 2D
    sheetData:CardFactionSheetDataObject;  //defines how card's character will be drawn
}
/** data interface for defining a card's splice sheet draw details */
export interface CardFactionSheetDataObject {
    sheet:TEXTURE_SHEET_CARD_FACTIONS;    //reference to sheet
    posX:number;    //x position of character on sheet 
    posY:number;    //y position of character on sheet
}

/** listing of all cards included in the game */
export const CardFactionData:CardFactionDataObject[] = [
    //### DEMO FACTIONS
    //neutral
    {
        //indexing
        type: CARD_FACTION_TYPE.NEUTRAL,
        id:CARD_FACTION_ID.FACTION_NEUTRAL,
        //display text 
        name: "Neutral",
        desc: "Can be used in any deck.",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_1, posX: 1, posY: 0 },
    },
    //fire
    {
        //indexing
        type: CARD_FACTION_TYPE.FIRE,
        id:CARD_FACTION_ID.FACTION_FIRE,
        //display text 
        name: "Fire",
        desc: "Can only be used in fire decks.",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_0, posX: 0, posY: 0 },
    },
    //ice
    {
        //indexing
        type: CARD_FACTION_TYPE.ICE,
        id:CARD_FACTION_ID.FACTION_ICE,
        //display text 
        name: "Ice",
        desc: "Can only be used in ice decks.",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_1, posX: 1, posY: 0 },
    },
    //void
    {
        //indexing
        type: CARD_FACTION_TYPE.VOID,
        id:CARD_FACTION_ID.FACTION_VOID,
        //display text 
        name: "Void",
        desc: "Can only be used in void decks.",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_0, posX: 1, posY: 0 },
    },
    //electric
    {
        //indexing
        type: CARD_FACTION_TYPE.ELECTRIC,
        id:CARD_FACTION_ID.FACTION_ELECTRIC,
        //display text 
        name: "Electric",
        desc: "Can only be used in electric decks.",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARD_FACTIONS.TYPE_BACKGROUND_1, posX: 0, posY: 0 },
    }
];