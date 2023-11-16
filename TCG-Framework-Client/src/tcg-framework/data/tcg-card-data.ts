import { TEXTURE_SHEET_CARDS } from "./tcg-card-texture-data";
import { CARD_FACTION_TYPE } from "./tcg-faction-data";
import { CARD_KEYWORD_ID } from "./tcg-keyword-data";

/**     TRADING CARD GAME - CARD DATA
    all definitions relavent to cards playable in the game; this includes a card's id,
    display details, and keywords.
*/

/** data interface for defining how many instances of a card can be unlocked */
export interface CardProvisionDataObject {
    id:CARD_DATA_ID; //targeted card
    count:number; //number of instances provided
}

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

/** defines subtypes for target selection */
export enum CARD_TARGETING_TYPE {
    //target can be anything
    ANY,
    //target must be player's team object
    //  ex: effect that damages player's health
    TEAM_PLAYER,
    //target must be a slot (can be either occupied or unoccupied)
    //  ex: effect that adds modifier to slot
    SLOT_ANY,
    //target must be an unoccupied slot
    //  ex: adding unit to field
    SLOT_UNOCCUPIED,
    //target must be an occupied slot
    //  ex: targeting unit on field
    SLOT_OCCUPIED,
}

/** defines primary types for target selection when a player is playing a card/activating an effect */
export enum CARD_TARGETING_OWNER {
    //target all of given subtype
    //  ex: defining an effect that causes damage to all enemy units
    ALL,
    //target belongs to anyone (up to given count)
    //  ex: defining an effect that purges effects from a target
    ANY,
    //target must be a friendly assets
    //  ex: defining an effect that heals an ally
    ALLY,
    //target must be an enemy assets 
    //  ex: defining an effect that damages an enemy
    ENEMY,
}

/** data interface for defining a card's splice sheet draw details */
export interface CardSheetDataObject {
    id:TEXTURE_SHEET_CARDS; //reference to sheet
    posX:number; //x position of character on sheet 
    posY:number; //y position of character on sheet
}

/** defines an effect tied to a card */
export interface CardKeywordEffectsDataObject {
    //effect type
    id:CARD_KEYWORD_ID; 
    //power of effect (ex: how much damage/how many stacks to be applied to target)
    strength:number;
    //how long effect will last (only checked for specific keywords that happen over time like burn/poison)
    //  this is ignored if the timing is instant or forever
    duration:number;
}

/** character attribute portions */
export interface CardSpellDataObject {
    //type
    type:CARD_TYPE.SPELL,
    //targeting
    targetOwner:CARD_TARGETING_OWNER;
    targetType:CARD_TARGETING_TYPE;
    targetCount:number;
}

/** character attribute portions */
export interface CardCharacterDataObject {
    //type
    type:CARD_TYPE.CHARACTER,
    //stats
    unitHealth:number; 
    unitAttack:number; 
    unitArmour:number;
}

/** character attribute portions */
export interface CardTerrainDataObject {
    //type
    type:CARD_TYPE.TERRAIN,
}

/** data interface for defining a card */
export interface CardDataObject {
    //indexing
    type:CARD_TYPE; //card type
    faction:CARD_FACTION_TYPE;   //faction type
    id:CARD_DATA_ID; //unique id for this card
    //display text
    name:string; //in-game display name
    desc:string; //in-game display desc
    //display 2D
    sheetData:CardSheetDataObject; //card image draw details
    //display 3D
    objPath:string; //object location
    //cost for playing card
    cardCost:number;
    //all effects associated with this card
    cardKeywordEffects:CardKeywordEffectsDataObject[];
    //specific attributes per card type
    cardAttributes:CardSpellDataObject|CardCharacterDataObject|CardTerrainDataObject;
}

/** listing of all card IDs */
export enum CARD_DATA_ID { 
    //### SPELLS
    //## NEUTRAL SPELLS
    SPELL_HEAL,
    //## FIRE SPELLS
    SPELL_FIREBOLT,
    //SPELL_HEALING_FLAME,
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
    CHARACTER_ELECTRIC_GOLEM,
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
    TERRAIN_VOID,
}

/** listing of all cards included in the game */
export const CardData:CardDataObject[] = [
    //### DEMO SPELLS
    //## NEUTRAL SPELLS
    {   //heals an ally unit
        //indexing
        type:CARD_TYPE.SPELL,
        faction:CARD_FACTION_TYPE.NEUTRAL,
        id:CARD_DATA_ID.SPELL_HEAL,
        //display text 
        name:"Heal",
        desc:"Heals a single ally unit.",
        //display 2D
        sheetData:{ id:TEXTURE_SHEET_CARDS.SHEET_SPELLS, posX: 0, posY: 0 },
        //display 3D
        objPath:"models/tcg-framework/card-spells/spell-heal.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.HEALTH_HEAL, strength:3, duration:0 }
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.SPELL,
            //targeting
            targetOwner:CARD_TARGETING_OWNER.ALLY,
            targetType:CARD_TARGETING_TYPE.SLOT_OCCUPIED,
            targetCount:1,
        }
    },
    //## FIRE SPELLS
    {   //deal damage and ignites an enemy unit
        //indexing
        type:CARD_TYPE.SPELL,
        faction:CARD_FACTION_TYPE.FIRE,
        id:CARD_DATA_ID.SPELL_FIREBOLT,
        //display text 
        name: "Skybolt",
        desc: "Deals damage & ignites an enemy unit.",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_SPELLS, posX: 1, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-spells/spell-firebolt.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.DAMAGE_STRIKE, strength:2, duration:0 },
            { id:CARD_KEYWORD_ID.HEALTH_IGNITE, strength:2, duration:3 }
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.SPELL,
            //targeting
            targetOwner:CARD_TARGETING_OWNER.ENEMY,
            targetType:CARD_TARGETING_TYPE.SLOT_OCCUPIED,
            targetCount:1,
        }
    },/*
    {   //heals target unit, but also applies burning
        //indexing
        type:CARD_TYPE.SPELL,
        faction:CARD_FACTION_TYPE.FIRE,
        id:CARD_DATA_ID.SPELL_HEALING_FLAME,
        //display text 
        name: "Healing Flame",
        desc: "Heals the unit, but also applies burning.",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_SPELLS, posX: 1, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-spells/spell-firebolt.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.HEALTH_HEAL, strength:4, duration:0 },
            { id:CARD_KEYWORD_ID.HEALTH_IGNITE, strength:1, duration:3 },
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.SPELL,
            //targeting
            targetOwner:CARD_TARGETING_OWNER.ENEMY,
            targetType:CARD_TARGETING_TYPE.SLOT_OCCUPIED,
            targetCount:1,
        }
    },*/
    //## ICE SPELLS
    {   //deal damage and bleeds an enemy unit
        //indexing
        type: CARD_TYPE.SPELL,
        faction: CARD_FACTION_TYPE.ICE,
        id:CARD_DATA_ID.SPELL_ICEBOLT,
        //display text 
        name: "Ice Razor",
        desc: "Deals damage & bleeds an enemy unit over.",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_SPELLS, posX: 2, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-spells/spell-icebolt.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.DAMAGE_STRIKE, strength:2, duration:0 },
            { id:CARD_KEYWORD_ID.HEALTH_BLEED, strength:2, duration:3 },
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.SPELL,
            //targeting
            targetOwner:CARD_TARGETING_OWNER.ENEMY,
            targetType:CARD_TARGETING_TYPE.SLOT_OCCUPIED,
            targetCount:1,
        }
    },
    //## ELECTRIC SPELLS
    {   //deal damage and exhausts an enemy unit
        //indexing
        type: CARD_TYPE.SPELL,
        faction: CARD_FACTION_TYPE.ELECTRIC,
        id:CARD_DATA_ID.SPELL_LIGHTNINGBOLT,
        //display text 
        name: "Lightningbolt",
        desc: "Deals damage & stuns an enemy unit.",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_SPELLS, posX: 3, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-spells/spell-lightningbolt.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.DAMAGE_STRIKE, strength:2, duration:0 },
            { id:CARD_KEYWORD_ID.ACTIVITY_MOD_EXHAUST, strength:1, duration:0 },
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.SPELL,
            //targeting
            targetOwner:CARD_TARGETING_OWNER.ENEMY,
            targetType:CARD_TARGETING_TYPE.SLOT_OCCUPIED,
            targetCount:1,
        }
    },
    //## VOID SPELLS
    {   //deal damage and annihilate an enemy unit
        //indexing
        type: CARD_TYPE.SPELL,
        faction: CARD_FACTION_TYPE.VOID,
        id:CARD_DATA_ID.SPELL_VOIDBOLT,
        //display text 
        name: "Void Strike",
        desc: "Deals damage an enemy unit, when enemy is killed its card is destroyed.",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_SPELLS, posX: 0, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-spells/spell-voidbolt.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.DAMAGE_STRIKE, strength:2, duration:0 },
            { id:CARD_KEYWORD_ID.DEATH_MOD_DESTROY, strength:1, duration:-1 },
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.SPELL,
            //targeting
            targetOwner:CARD_TARGETING_OWNER.ENEMY,
            targetType:CARD_TARGETING_TYPE.SLOT_OCCUPIED,
            targetCount:1,
        }
    },

   
    //### DEMO CHARACTERS
    //## NEUTRAL CHARACTERS 
    {   //character with standard attacks
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.NEUTRAL,
        id:CARD_DATA_ID.CHARACTER_NEUTRAL_GOLEM,
        //display text 
        name: "Stone Golem",
        desc: "A golem carved from ancient stone",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_CHARACTER_GOLEM, posX: 1, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/golem-neutral.glb",
        //cost of playing card
        cardCost:2,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.DAMAGE_PULVERIZE, strength:1, duration:2 },
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.CHARACTER,
            //unit stats
            unitHealth:5, 
            unitAttack:3, 
            unitArmour:1,
        },
    },
    //## FIRE CHARACTERS
    {   //character with standard attacks
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.FIRE,
        id:CARD_DATA_ID.CHARACTER_FIRE_GOLEM,
        //display text 
        name: "Fire Golem",
        desc: "A golem forged from molten rock",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_CHARACTER_GOLEM, posX: 1, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/golem-fire.glb",
        //cost of playing card
        cardCost:2,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.HEALTH_ENFLAME, strength:1, duration:2 },
            { id:CARD_KEYWORD_ID.HEALTH_FLAME_WARD, strength:1, duration:2 },
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.CHARACTER,
            //unit stats
            unitHealth:5, 
            unitAttack:3, 
            unitArmour:1,
        }, 
    },
    //## ICE CHARACTERS
    {   //character with standard attacks
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.ICE,
        id:CARD_DATA_ID.CHARACTER_ICE_GOLEM,
        //display text 
        name: "Ice Golem",
        desc: "A golem chiseled from permafrost",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_CHARACTER_GOLEM, posX: 2, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/golem-ice.glb",
        //cost of playing card
        cardCost:2,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.HEALTH_BLEED, strength:1, duration:2 },
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.CHARACTER,
            //unit stats
            unitHealth:5, 
            unitAttack:3, 
            unitArmour:1,
        },
    },
    //## ELECTRIC CHARACTERS
    {   //character with standard attacks
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.ELECTRIC,
        id:CARD_DATA_ID.CHARACTER_ELECTRIC_GOLEM,
        //display text 
        name: "Lightning Golem",
        desc: "A golem formed from pure energy",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_CHARACTER_GOLEM, posX: 0, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/golem-electric.glb",
        //cost of playing card
        cardCost:2,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.ATTACK_WEAKEN, strength:1, duration:2 },
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.CHARACTER,
            //unit stats
            unitHealth:5, 
            unitAttack:3, 
            unitArmour:1,
        },
    },
    //## VOID CHARACTERS
    {   //character with standard attacks
        //indexing
        type: CARD_TYPE.CHARACTER,
        faction: CARD_FACTION_TYPE.VOID,
        id:CARD_DATA_ID.CHARACTER_VOID_GOLEM,
        //display text 
        name: "Void Golem",
        desc: "A golem summoned realms beyond our comprehension",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_CHARACTER_GOLEM, posX: 0, posY: 0 },
        //display 3D
        objPath: "models/tcg-framework/card-characters/golem-void.glb",
        //cost of playing card
        cardCost:2,
        //effects
        cardKeywordEffects:[
            { id:CARD_KEYWORD_ID.HEALTH_WITHER, strength:1, duration:2 },
        ],
        //type-specific cards
        cardAttributes:{
            //type
            type:CARD_TYPE.CHARACTER,
            //unit stats
            unitHealth:5, 
            unitAttack:3, 
            unitArmour:1,
        },
    },


    //### DEMO TERRIANS
    //## FIRE TERRAIN
    {   //terrain that ignites all enemies once per turn
        //indexing
        type: CARD_TYPE.TERRAIN,
        faction: CARD_FACTION_TYPE.FIRE,
        id:CARD_DATA_ID.TERRAIN_FIRE,
        //display text 
        name: "Fire Terrain",
        desc: "A terrain of burning feilds, molten rivers and dark clouds",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_TERRAIN, posX: 1, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-terrain/terrain-fire.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            
        ],
        //type-specific cards
        cardAttributes: {
            //type
            type:CARD_TYPE.TERRAIN,
        },
    },
    //## ICE TERRAIN
    {   //terrain that bleeds all enemies once per turn
        //indexing
        type: CARD_TYPE.TERRAIN,
        faction: CARD_FACTION_TYPE.ICE,
        id:CARD_DATA_ID.TERRAIN_ICE,
        //display text 
        name: "Ice Terrain",
        desc: "A terrain of frozen rivers, whipping winds and heavy snowfall",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_TERRAIN, posX: 1, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-terrain/terrain-ice.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            
        ],
        //type-specific cards
        cardAttributes: {
            //type
            type:CARD_TYPE.TERRAIN,
        },
    },
    //## ELECTRIC TERRAIN
    {   //terrain that strikes all enemies once per turn
        //indexing
        type: CARD_TYPE.TERRAIN,
        faction: CARD_FACTION_TYPE.ELECTRIC,
        id:CARD_DATA_ID.TERRAIN_ELECTRIC,
        //display text 
        name: "Electric Terrain",
        desc: "A terrain situated admidst thunderous clouds",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_TERRAIN, posX: 1, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-terrain/terrain-lightning.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            
        ],
        //type-specific cards
        cardAttributes: {
            //type
            type:CARD_TYPE.TERRAIN,
        },
    },
    //## VOID TERRAIN
    {   //terrain that decays all enemies once per turn
        //indexing
        type: CARD_TYPE.TERRAIN,
        faction: CARD_FACTION_TYPE.VOID,
        id:CARD_DATA_ID.TERRAIN_VOID,
        //display text 
        name: "Void Terrain",
        desc: "An ominous terrain with green scattered around",
        //display 2D
        sheetData: { id:TEXTURE_SHEET_CARDS.SHEET_TERRAIN, posX: 1, posY: 1 },
        //display 3D
        objPath: "models/tcg-framework/card-terrain/terrain-void.glb",
        //cost of playing card
        cardCost:1,
        //effects
        cardKeywordEffects:[
            
        ],
        //type-specific cards
        cardAttributes: {
            //type
            type:CARD_TYPE.TERRAIN,
        },
    },
];