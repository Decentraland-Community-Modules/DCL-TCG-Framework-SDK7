/**     CARD KEYWORDS
 * all definitions relavent to the function and display 
 * details (name, effect, etc.) of card keywords
 */

import { Color4 } from "@dcl/sdk/math";
import { TEXTURE_SHEET_CARD_KEYWORD } from "./tcg-keyword-texture-data";

/** defines when application type of  */
export enum CARD_KEYWORD_TRIGGER_TYPE {
    //applied once, as soon as card is played
    //  use to trigger effects as soon as card is played
    //  ex: defining a spell card that causes a damage to a unit
    INSTANT,    
    //applied constantly on card
    //  use for effects that is always going to be applied on a card
    //  ex: adding a buff that provides increased damage
    CONSTANT,
    //applied after N number of turns 
    //  use 0 to activate the effect at the end of the current player's turn
    //  ex: a card with a 0 delay stealth is placed, it can attack that turn,
    //      then becomes invisible at the end of that player's turn
    DELAYED,    
    //applied effect is reapplied every N number of turns
    //  use for damage/heal over time effects
    REOCCURING,
    //applied once card reaches zero HP
    // ex: upon card death card ressurects once
    ON_DEATH,
}

/** data interface for defining a trigger type */
export interface CardKeywordTriggerDataObject {
    //type of trigger
    type:CARD_KEYWORD_TRIGGER_TYPE;
    //defines additional function of type
    //  delay: number of turns before effect happens
    //  reoccuring: number of turns between effect occuring 
    value:Number;
}

/** all possible effects tied to a keyword (like causing damage to health) */
export enum CARD_KEYWORD_EFFECT_TYPE {
    //### DAMAGE
    //cause damage starting from top defense mechanism, all the way down
    //  ex: damage effects shield, then gets reduced by armour, then effects health
    DAMAGE_OVERFLOW,
    //only causes damage to health, ignores other def mechs 
    DAMAGE_HEALTH,
    //only causes damage to armour, ignores other def mechs 
    DAMAGE_ARMOUR,
    //only causes damage to shield, ignores other def mechs 
    DAMAGE_SHIELD,
    //modifier tag for damage dealt to health, restores health to dealer
    DAMAGE_VAMPIRISM,

    //### HEALING
    RESTORE_HEALTH,
    RESTORE_ARMOUR,
    RESTORE_SHIELD,
    
    //### EXPAND
    EXPAND_HEALTH,
    EXPAND_ARMOUR,
    EXPAND_SHIELD,

    //### ATTRIBUTE INCREASE
    INCREASE_ATTACK,
    
    //### MODIFIERS
    MODIFIER_TAUNT,
    MODIFIER_PURITY,
    MODIFIER_STEALTH,
    MODIFIER_DISABLE,
    MODIFIER_REFRESH,
    MODIFIER_ANNIHILATION,

}

export interface CardKeywordEffectDataObject {
    type:CARD_KEYWORD_EFFECT_TYPE;
}


/** data interface for defining a card keyword's splice sheet draw details */
export interface CardKeywordSheetDataObject {
    id:TEXTURE_SHEET_CARD_KEYWORD; //reference to sheet
    posX:number; //x position of character on sheet 
    posY:number; //y position of character on sheet
}

/** data interface for defining a trigger type */
export interface CardKeywordDataObject
{
    ID:CARD_KEYWORD_ID;
    //displays
    displayName: string;
    displayDesc: string;
    //display 2D
    iconColour: Color4,
    sheetData:CardKeywordSheetDataObject;
    //gameplay
    playType:CardKeywordTriggerDataObject;
    playEffects: CardKeywordEffectDataObject [];
}

export enum CARD_KEYWORD_ID {
    STRIKE,
    BLEED,
    BURN,
    REND,
    MELT,
    HEAL,
    MEND,
    EXPAND,
    GROWTH,
    FORTIFY,
    SHARPEN,
    EMPOWERED,
    GUARD,
    SHEILDED,
    STEALTH,
    DISABLE,
    REFRESH,
    DRAIN,
    ANNIHILATION,
    EXHAUST,

}

/** listing of all card keywords, official keywords are 'tcg' */
export const CardKeywordData: CardKeywordDataObject [] = [
    
    
    //### DAMAGE
    //damage enemy target overflow
    {
        ID: CARD_KEYWORD_ID.STRIKE,
        //displays
        displayName: "Strike",
        displayDesc: "Causes damage to the enemy target",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.INSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.DAMAGE_OVERFLOW},
        ]
    },
    //causes direct damage over time
    {
        ID:CARD_KEYWORD_ID.BLEED,
        //displays  
        displayName: "Bleed",
        displayDesc: "inflicts constant direct damage to targeted unit(s)",
        //display 2D
        iconColour: Color4.Green(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 1, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.REOCCURING, value:2,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.DAMAGE_HEALTH},
        ]
    },
    //causes overall damage over time
    {
        ID:CARD_KEYWORD_ID.BURN,
        //displays 
        displayName: "Burn",
        displayDesc: "inflicts constant overall damage to targeted unit(s)",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 2, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.REOCCURING, value:2,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.DAMAGE_OVERFLOW},
        ]
    },
    //damage enemy target(s) armour
    {
        ID:CARD_KEYWORD_ID.REND,
        //displays 
        displayName: "Rend",
        displayDesc: "Causes damage to the enemy target(s) armour",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.INSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.EXPAND_ARMOUR},
        ]
    },
    //damage enemy target(s) armour over time
    {
        ID:CARD_KEYWORD_ID.MELT,
        //displays 
        displayName: "Melt",
        displayDesc: "Causes damage to the enemy target(s) armour",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.REOCCURING, value:2,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.EXPAND_ARMOUR},
        ]
    },



    //### HEAL
    //heal instantly
    {
        ID:CARD_KEYWORD_ID.HEAL,
        //displays
        displayName: "Heal",
        displayDesc: "Heals any allied card targeted over time",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.INSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.RESTORE_HEALTH},
        ]
    },
    //heal over time
    {
        ID:CARD_KEYWORD_ID.MEND,
        //displays 
        displayName: "Mend",
        displayDesc: "Heals any allied card targeted",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.REOCCURING, value:2,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.RESTORE_HEALTH},
        ]
    },
    //increases max health
    {
        ID:CARD_KEYWORD_ID.EXPAND,
        //displays 
        displayName: "Expand",
        displayDesc: "increases the max HP of targeted unit(s)",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.INSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.EXPAND_HEALTH},
        ]
    },
    //regenerates health past max
    {
        ID:CARD_KEYWORD_ID.GROWTH,
        //displays 
        displayName: "Growth",
        displayDesc: "regenerates HP of targeted unit(s)",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.REOCCURING, value:2,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.EXPAND_HEALTH},
        ]
    },
    //applies armour past max
    {
        ID:CARD_KEYWORD_ID.FORTIFY,
        //displays 
        displayName: "Fortify",
        displayDesc: "regenerates armour of targeted unit(s)",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.REOCCURING, value:2,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.EXPAND_ARMOUR},
        ]
    },


    //### ATTRIBUTES
    //increases max attack
    {
        ID:CARD_KEYWORD_ID.SHARPEN,
        //displays 
        displayName: "Sharpen",
        displayDesc: "increases the max dmg of targeted unit(s)",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.INSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.INCREASE_ATTACK},
        ]
    },
    //increases max attack for a number of turns
    {
        ID:CARD_KEYWORD_ID.EMPOWERED,
        //displays 
        displayName: "Empowered",
        displayDesc: "increases the max dmg of targeted unit(s) for a set ammount of turns",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.REOCCURING, value:2,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.INCREASE_ATTACK},
        ]
    },


    //### MODIFIERS
    //forces attacks onto specific units
    {
        ID:CARD_KEYWORD_ID.GUARD,
        //displays 
        displayName: "Guard",
        displayDesc: "increases the max dmg of targeted unit(s) for a set ammount of turns",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.CONSTANT, value:2,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.MODIFIER_TAUNT},
        ]
    },
    //forces next negative debuff upon unit
    {
        ID:CARD_KEYWORD_ID.SHEILDED,
        //displays 
        displayName: "Sheilded",
        displayDesc: "forces next debuff upon targeted unit(s)",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.CONSTANT, value:2,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.MODIFIER_PURITY},
        ]
    },
    //makes targeted unit invisible
    {
        ID:CARD_KEYWORD_ID.STEALTH,
        //displays 
        displayName: "Stealth",
        displayDesc: "puts targeted unit(s) into an undetectable state until next action",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.CONSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.MODIFIER_STEALTH},
        ]
    },
    //disallows action of unit
    {
        ID:CARD_KEYWORD_ID.DISABLE,
        //displays 
        displayName: "Disable",
        displayDesc: "puts targeted unit(s) into a disabled state until cleared",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.CONSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.MODIFIER_DISABLE},
        ]
    },
    //allows action of unit
    {
        ID:CARD_KEYWORD_ID.REFRESH,
        //displays 
        displayName: "Refresh",
        displayDesc: "allows targeted unit(s) into a re-enabled state once played",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.INSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.MODIFIER_REFRESH},
        ]
    },
    //drains health from trageted unit and applies it to your own
    {
        ID:CARD_KEYWORD_ID.DRAIN,
        //displays 
        displayName: "Drain",
        displayDesc: "syphons health from enemy unit(s) and applies it to your own",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.INSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.DAMAGE_VAMPIRISM},
        ]
    },
    //kills and removes enemy card from game
    {
        ID:CARD_KEYWORD_ID.ANNIHILATION,
        //displays 
        displayName: "Annihilation",
        displayDesc: "when this card kills another card remove that card from the game",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.CONSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.MODIFIER_ANNIHILATION},
        ]
    },
    //kills and removes enemy card from game
    {
        ID:CARD_KEYWORD_ID.EXHAUST,
        //displays 
        displayName: "Exhaust",
        displayDesc: "after this card is played remove the card from the game",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playType: {type:CARD_KEYWORD_TRIGGER_TYPE.CONSTANT, value:0,},
        playEffects: [
            {type:CARD_KEYWORD_EFFECT_TYPE.MODIFIER_ANNIHILATION},
        ]
    },

];