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

import { CARD_FACTION_TYPE } from "./tcg-faction-data";
import { CARD_KEYWORD_ID } from "./tcg-keyword-data";

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
export enum CARD_TYPE {
    //effect-based cards
    //  ex: card that causes damage or heals a unit
    SPELL,    
    //creates a unit on the field when played
    //  ex: when played spawns a tank at the designated location
    CHARACTER,
    //changes the player's own battle field, providing unique effects
    //  ex: creates a fortified zone that heals all units at the start of each turn
    TERRAIN,
}
/** represents all display strings per card type */
export const CARD_TYPE_STRINGS:string[] = [
    "Spell",
    "Character",
    "Terrain"
];

/** defines what targets are valid/required for the effect */
export enum CARD_KEYWORD_TARGET_TYPE {
    //does not require a target
    //  use this with effects that are global
    //  ex: defining an effect that causes the player to pick up more cards
    NONE,
    //target must not be owned by the player 
    //  ex: defining an effect that damages an enemy
    ENEMY,
    //target must be owned by the player 
    //  ex: defining an effect that heals an ally
    ALLY,
    //target can be owned by any player
    //  ex: defining an effect that removes effects a target
    ANY,
}
/** defines how many targets will be affected by an effect */
export enum CARD_KEYWORD_TARGET_COUNT_TYPE {
    //targets no units on the board
    NONE,
    //targets N number of targets
    COUNT,
    //targets all units on the board
    ALL,
}
/** data interface for defining a target type */
export interface CardKeywordTargetDataObject {
}

export interface CardEffectDataObject {
    type:CARD_KEYWORD_ID; 
    //
    strength:number;
    //
    targetType:CARD_KEYWORD_TARGET_TYPE;
    //
    targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE;
    //
    targetCount:number
}


/** data interface for defining a card */
export interface CardDataObject {
    //indexing
    type:CARD_TYPE;    //card type
    faction:CARD_FACTION_TYPE;   //faction type
    id:CARD_DATA_ID; //unique id for this card
    //display text
    name:string;    //in-game display name
    desc:string;    //in-game display desc
    //display 2D
    sheetData:CardSheetDataObject;  //defines how card's character will be drawn
    //display 3D
    objPath:string; //object location
    //attributes
    attributeCost:number;
    attributeCharacter?:CardCharacterDataObject;
    //effects
    keywords: CardEffectDataObject [];    //all associated keywords/effects of card
}

export interface CardCharacterDataObject {
    unitHealth:number; 
    unitAttack:number; 
    unitArmour:number;
}


/** data interface for defining a card's splice sheet draw details */
export interface CardSheetDataObject {
    sheet:TEXTURE_SHEET_CARDS;    //reference to sheet
    posX:number;    //x position of character on sheet 
    posY:number;    //y position of character on sheet
}

//list of card ID's
export enum CARD_DATA_ID { 
    //### SPELLS
    //## NEUTRAL SPELLS
    SPELL_HEAL,
    //## FIRE SPELLS
    SPELL_FIREBOLT,
    //## ICE SPELLS
    SPELL_ICEBOLT,
    //## ELECTRIC SPELLS
    SPELL_LIGHTNINGBOLT,
    //## VOID SPELLS
    SPELL_VOIDBOLT,
    
    
    //### CHARACTERS
    //## NEAUTRAL CHARACTERS
    CHARACTER_NEUTRAL_GOLEM,
    //## FIRE CHARACTERS
    CHARACTER_FIRE_GOLEM,
    //## ICE CHARACTERS
    CHARACTER_ICE_GOLEM,
    //## ELECTRIC CHARACTERS
    CHARACTER_LIGHTNING_GOLEM,
    //## VOID CHARACTERS
    CHARACTER_VOID_GOLEM,


    //### TERRAINS
    //## FIRE
    TERRAIN_FIRE,
    //## ICE
    TERRAIN_ICE,
    //## ELECTRIC
    TERRAIN_ELECTRIC,
    //## VOID
    TERRAIN_VOID

}


/** listing of all cards included in the game */
export const CardData:CardDataObject[] = [
    //### DEMO SPELLS
    //## NEUTRAL SPELLS
    {
        //indexing
        type: CARD_TYPE.SPELL,
        faction: CARD_FACTION_TYPE.NEUTRAL,
        id:CARD_DATA_ID.SPELL_HEAL,
        //display text 
        name: "Heal",
        desc: "A spell of healing",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/neutral-golem.glb",
        //Attributes
        attributeCost:1,
        //effects
        keywords:[
            {
                type:CARD_KEYWORD_ID.HEAL, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ALLY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            }
        ]
    },
    //## FIRE SPELLS
    {
        //indexing
        type: CARD_TYPE.SPELL,
        faction: CARD_FACTION_TYPE.FIRE,
        id:CARD_DATA_ID.SPELL_FIREBOLT,
        //display text 
        name: "Fireball",
        desc: "A bolt of fire",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/fire-golem.glb",
        //Attributes
        attributeCost:1,
        //effects
        keywords:[
            {
                type:CARD_KEYWORD_ID.BURN, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            }
        ]
    },
    //## ICE SPELLS
    {
        //indexing
        type: CARD_TYPE.SPELL,
        faction: CARD_FACTION_TYPE.ICE,
        id:CARD_DATA_ID.SPELL_ICEBOLT,
        //display text 
        name: "Icebolt",
        desc: "A bolt of ice",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/ice-golem.glb",
        //Attributes
        attributeCost:1,
        //effects
        keywords:[
            {
                type:CARD_KEYWORD_ID.BLEED, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            }
        ]
    },
    //## ELECTRIC SPELLS
    {
        //indexing
        type: CARD_TYPE.SPELL,
        faction: CARD_FACTION_TYPE.ELECTRIC,
        id:CARD_DATA_ID.SPELL_LIGHTNINGBOLT,
        //display text 
        name: "Lightningbolt",
        desc: "A bolt of Lightning",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/electric-golem.glb",
        //Attributes
        attributeCost:1,
        //effects
        keywords:[
            {
                type:CARD_KEYWORD_ID.DISABLE, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            }
        ]
    },
    //## VOID SPELLS
    {
        //indexing
        type: CARD_TYPE.SPELL,
        faction: CARD_FACTION_TYPE.VOID,
        id:CARD_DATA_ID.SPELL_VOIDBOLT,
        //display text 
        name: "Voidbolt",
        desc: "A bolt from the void",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/void-golem.glb",
        //Attributes
        attributeCost:1,
        //effects
        keywords:[
            {
                type:CARD_KEYWORD_ID.DRAIN, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            }
        ]
    },

   
    //### DEMO CHARACTERS
    //## NEUTRAL CHARACTERS 
    {
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.NEUTRAL,
        id:CARD_DATA_ID.CHARACTER_NEUTRAL_GOLEM,
        //display text 
        name: "Stone Golem",
        desc: "a stone golem carved from stone",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/neutral-golem.glb",
        //Attributes
        attributeCost:1,
        attributeCharacter:{unitHealth:5, unitAttack:3, unitArmour:1,},
        //effects
        keywords: [
            {
                type:CARD_KEYWORD_ID.STRIKE, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            }
        ]  
    },
    //## FIRE CHARACTERS
    {
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.FIRE,
        id:CARD_DATA_ID.CHARACTER_FIRE_GOLEM,
        //display text 
        name: "Fire Golem",
        desc: "a lava golem carved from molten rock",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/fire-golem.glb",
        //Attributes
        attributeCost:1,
        attributeCharacter:{unitHealth:5, unitAttack:3, unitArmour:1,},
        //effects
        keywords: [
            {
                type:CARD_KEYWORD_ID.STRIKE, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            },
            {
                type:CARD_KEYWORD_ID.BURN, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            },
        ]  
    },
    //## ICE CHARACTERS
    {
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.ICE,
        id:CARD_DATA_ID.CHARACTER_ICE_GOLEM,
        //display text 
        name: "Ice Golem",
        desc: "a golem of ice chiped from permafrost",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/ice-golem.glb",
        //Attributes
        attributeCost:1,
        attributeCharacter: {unitHealth:5, unitAttack:3, unitArmour:1,},
        //effects
        keywords: [
            {
                type:CARD_KEYWORD_ID.STRIKE, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            },
            {
                type:CARD_KEYWORD_ID.BLEED, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            },
        ]  
    },
    //## ELECTRIC CHARACTERS
    {
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.ELECTRIC,
        id:CARD_DATA_ID.CHARACTER_LIGHTNING_GOLEM,
        //display text 
        name: "Lightning Golem",
        desc: "a golem formed from pure energy",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/electric-golem.glb",
        //Attributes
        attributeCost:1,
        attributeCharacter:  {unitHealth:5, unitAttack:3, unitArmour:1,},
        //effects
        keywords: [
            {
                type:CARD_KEYWORD_ID.STRIKE, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            },
            {
                type:CARD_KEYWORD_ID.DISABLE, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            },
        ]  
    },
    //## VOID CHARACTERS
    {
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.VOID,
        id:CARD_DATA_ID.CHARACTER_VOID_GOLEM,
        //display text 
        name: "Void Golem",
        desc: "a golem from realms beyond our comprehension",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/void-golem.glb",
        //Attributes
        attributeCost:1,
        attributeCharacter:  {unitHealth:5, unitAttack:3, unitArmour:1,},
        //effects
        keywords: [
            {
                type:CARD_KEYWORD_ID.STRIKE, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            },
            {
                type:CARD_KEYWORD_ID.DRAIN, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.COUNT, targetCount:1
            },
        ]  
    },


    //### DEMO TERRIANS
    //## FIRE TERRAIN
    {
        //indexing
        type: CARD_TYPE.TERRAIN,
        faction: CARD_FACTION_TYPE.FIRE,
        id:CARD_DATA_ID.TERRAIN_FIRE,
        //display text 
        name: "Fire Terrain",
        desc: "a terrain of burning feilds molten rivers and dark clouds and trees with black leaves",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/fire-golem.glb",
        //Attributes
        attributeCost:1,
        //effects
        keywords: [
            {
                type:CARD_KEYWORD_ID.BURN, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.ALL, targetCount:0
            },
        ]  
    },
    //## ICE TERRAIN
    {
        //indexing
        type: CARD_TYPE.TERRAIN,
        faction: CARD_FACTION_TYPE.ICE,
        id:CARD_DATA_ID.TERRAIN_ICE,
        //display text 
        name: "Ice Terrain",
        desc: "a terrain of frozen rivers whipping winds and heavy snowfall surrounded by endless trees",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/ice-golem.glb",
        //Attributes
        attributeCost:1,
        //effects
        keywords: [
            {
                type:CARD_KEYWORD_ID.BLEED, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.ALL, targetCount:0
            },        ]  
    },
    //## ELECTRIC TERRAIN
    {
        //indexing
        type: CARD_TYPE.TERRAIN,
        faction: CARD_FACTION_TYPE.ELECTRIC,
        id:CARD_DATA_ID.TERRAIN_ELECTRIC,
        //display text 
        name: "Electric Terrain",
        desc: "a terrain based admidst thunderous clouds",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/electric-golem.glb",
        //Attributes
        attributeCost:1,
        //effects
        keywords: [
            {
                type:CARD_KEYWORD_ID.DISABLE, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.ALL, targetCount:0
            },
        ]  
    },
    //## VOID TERRAIN
    {
        //indexing
        type: CARD_TYPE.TERRAIN,
        faction: CARD_FACTION_TYPE.VOID,
        id:CARD_DATA_ID.TERRAIN_VOID,
        //display text 
        name: "Void Terrain",
        desc: "a terrain based in a glossy dark zone with purple stars littering the sky",
        //display 2D
        sheetData: { sheet:TEXTURE_SHEET_CARDS.CHARACTER_DEMO_SHEET, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/void-golem.glb",
        //Attributes
        attributeCost:1,
        //effects
        keywords: [
            {
                type:CARD_KEYWORD_ID.DRAIN, strength:1,
                targetType:CARD_KEYWORD_TARGET_TYPE.ENEMY, targetCountType:CARD_KEYWORD_TARGET_COUNT_TYPE.ALL, targetCount:0
            },
        ]  
    },
];