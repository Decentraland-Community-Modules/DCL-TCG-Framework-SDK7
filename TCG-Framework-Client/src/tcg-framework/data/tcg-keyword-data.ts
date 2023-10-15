/**     TRADING CARD GAME - CARD KEYWORDS
    all definitions relavent to card keywords in the game; this includes a keyword's id,
    display details, and effects they apply.

    think of the keywords as the visual representation/on-card view of what a card does,
    card status effects as what is being done to a unit/card in the game

    an advanced use of this system is the keyword cauterize (applies an instant heal to the target, but also an over time burn), 
    it makes use of 2 status effects while the concept only requires a single keyword to convay what is happening

    keywords are used to define how status effects can be applied to cards, ex:
        when played against a target, a spell card with the 'ignite' keyword will apply the 'burning' effect to the target
        when a unit with the 'enflame' keyword attacks a target it will apply the 'burning' effect to the defending unit
        when a unit with the 'flame ward' keyword defends against an attack from a target it will apply the 'burning' effect to the attacking unit
    in this example there are 3 different keywords in use, but each makes use of the same status effect
 */

import { Color4 } from "@dcl/sdk/math";
import { TEXTURE_SHEET_CARD_KEYWORD } from "./tcg-keyword-texture-data";
import { STATUS_EFFECT_ID } from "./tcg-status-effect-data";

/** defines all possible timing types for status effects tied to a keyword
 *      this defines when a keyword effect is processed against a card
 *  are you damaging the enemy once or every round?
 */
export enum CARD_KEYWORD_EFFECT_TIMING {
    //applied 1 time, instantly after being played
    //  ex: healing a unit increases their current health (effect does not need tracking)
    INSTANT,
    //applied 1 time, but effect is tracked (so can be purged/modified)
    //  ex: giving a unit a sword that increases attack (sword can be taken away)
    CONSTANT,
    //applied n times, once per round after being played
    //  ex: healing a unit across multiple rounds (effect )
    EXPIRES,
}

/** data interface for defining a card keyword's splice sheet draw details */
export interface CardKeywordSheetDataObject {
    id:TEXTURE_SHEET_CARD_KEYWORD; //reference to sheet
    posX:number; //x position of character on sheet 
    posY:number; //y position of character on sheet
}

/** data interface for defining a trigger type */
export interface CardKeywordEffectDataObject
{
    id:STATUS_EFFECT_ID;
    timing:CARD_KEYWORD_EFFECT_TIMING;
    isPurgable:boolean; //defines whether an effect can be purged, this is irrelevent for certain 
}

/** data interface for defining a trigger type */
export interface CardKeywordDataObject
{
    id:CARD_KEYWORD_ID;
    //displays
    displayName:string;
    displayDesc:string;
    //display 2D
    iconColour:Color4,
    sheetData:CardKeywordSheetDataObject;
    //gameplay
    playEffects:CardKeywordEffectDataObject[];
}

/** unique ids for every possible card keyword */
export enum CARD_KEYWORD_ID {
    //### DAMAGING
    //  deals damage to the unit using the standard process (reduced by armour, applied to health)
    DAMAGE_STRIKE, //instant
    DAMAGE_PULVERIZE, //over time
    
    //### HEALTH
    //  increases current health, up to the max
    HEALTH_HEAL,
    HEALTH_MEND, //over time
    //  decreases current health (skips armour calc)
    HEALTH_PUNCTURE, //instant
    HEALTH_BLEED, //over time
    //  increases max health (current health also increases by amount)
    HEALTH_GIGANTAZIE, //instant
    HEALTH_GROWTH, //over time
    //  decreases max health (current health is not reduced by amount, but is leashed to max health)
    HEALTH_SHRINK, //instant
    HEALTH_DECAY, //instant
    HEALTH_IGNITE, //over time
    HEALTH_WITHER, //over time
    //  mixed
    HEALTH_CAUTERIZE, //instant heal, over time burn

    //### ATTACK
    //  increases attack
    ATTACK_SHARPEN, //instant
    ATTACK_ASCEND, //over time
    //  decreases attack
    ATTACK_BLUNT, //instant
    ATTACK_WEAKEN, //over time

    //### ARMOUR
    //  increases armour
    ARMOUR_REINFORCE, //instant
    ARMOUR_FORTIFY, //over time
    //  decreases armour
    ARMOUR_SHEAR, //instant
    ARMOUR_MELTING, //over time

    //### ACTIVITY MODIFIERS
    //  resets the action state of the unit (allowing them to attack again)
    ACTIVITY_MOD_REFRESH, //instant
    //  disables the action for the targeted unit (stops them from attacking)
    ACTIVITY_MOD_EXHAUST, //instant
    
    //### TARGETING MODIFIERS
    //all units on the field have 'targeting layers' that define whether they can be targeted or not
    //if a unit exists in a higher targeting layer than others, it must be targeted first (certain effects
    //like target-all spells ignore this)
    //  sets unit to highest targeting layer (taunts)
    TARGETING_MOD_TAUNT, //instant
    //  sets unit to lowest targeting layer (hides)
    TARGETING_MOD_STEALTH, //instant

    //### DEATH MODIFIERS
    //  when the unit is defeated its card is added back to the player's hand
    DEATH_MOD_TO_HAND, //instant
    //  when the unit is defeated its card is added back to the player's deck
    DEATH_MOD_TO_DECK, //instant
    //  when the unit is defeated its card is removed from the game
    DEATH_MOD_DESTROY, //instant
}

/** listing of all card keywords, official keywords are 'tcg' */
export const CardKeywordData: CardKeywordDataObject [] = [
    //### DAMAGE
    //deals damage to the unit using the standard process (reduced by armour, applied to health)
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.DAMAGE_STRIKE,
        //displays
        displayName: "Strike",
        displayDesc: "Inflicts @P damage, reduced by armour",
        //display 2D
        iconColour: Color4.Red(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.DAMAGE, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:false }
        ]
    },
    //deals damage to the unit using the standard process (reduced by armour, applied to health)
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.DAMAGE_PULVERIZE,
        //displays
        displayName: "Pulverize",
        displayDesc: "Inflicts @P damage for @T rounds, reduced by armour",
        //display 2D
        iconColour: Color4.Red(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.DAMAGE_RECOILING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },


    //### HEALTH
    //increases current health, up to the max
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.HEALTH_HEAL,
        //displays
        displayName: "Heal",
        displayDesc: "Restores @P health",
        //display 2D
        iconColour: Color4.Green(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 5, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_HEAL, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true }
        ]
    },
    //increases current health, up to the max
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.HEALTH_MEND,
        //displays
        displayName: "Mend",
        displayDesc: "Restores @P health for @T rounds",
        //display 2D
        iconColour: Color4.Green(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 5, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_MENDING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },
    //decreases current health (skips armour calc)
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.HEALTH_PUNCTURE,
        //displays
        displayName: "Puncture",
        displayDesc: "Inflicts @P damage to the unit, ignores armour",
        //display 2D
        iconColour: Color4.Red(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 5, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_PUNCTURE, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true }
        ]
    },
    //decreases current health (skips armour calc)
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.HEALTH_BLEED,
        //displays
        displayName: "Bleed",
        displayDesc: "Inflicts @P damage for @T rounds, ignores armour",
        //display 2D
        iconColour: Color4.Red(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 1, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_BLEEDING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },
    //increases max health (current health also increases by amount)
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.HEALTH_GIGANTAZIE,
        //displays
        displayName: "Gigantazie",
        displayDesc: "Increases max health by @P",
        //display 2D
        iconColour: Color4.Green(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 7, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_PUNCTURE, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true }
        ]
    },
    //increases max health (current health also increases by amount)
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.HEALTH_GROWTH,
        //displays
        displayName: "Growth",
        displayDesc: "Increases max health by @P for @T rounds",
        //display 2D
        iconColour: Color4.Green(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 6 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_BLEEDING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },
    //decreases max health (current health is not reduced by amount, but is leashed to max health)
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.HEALTH_SHRINK,
        //displays
        displayName: "Shrink",
        displayDesc: "Reduces max health by @P",
        //display 2D
        iconColour: Color4.Green(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 7, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_SHRINK, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true }
        ]
    },
    //decreases max health (current health is not reduced by amount, but is leashed to max health)
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.HEALTH_DECAY,
        //displays
        displayName: "Decay",
        displayDesc: "Reduces max health by @P",
        //display 2D
        iconColour: Color4.Purple(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 7, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_DECAY, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true }
        ]
    },
    //decreases max health (current health is not reduced by amount, but is leashed to max health)
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.HEALTH_IGNITE,
        //displays
        displayName: "Ignite",
        displayDesc: "Reduces max health by @P for @T rounds",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 2, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_BURNING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },
    //decreases max health (current health is not reduced by amount, but is leashed to max health)
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.HEALTH_WITHER,
        //displays
        displayName: "Wither",
        displayDesc: "Reduces max health by @P for @T rounds",
        //display 2D
        iconColour: Color4.Purple(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 6 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_WITHERING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },
    //#COMPLEX => increases cur health, applies burn over time
    {
        id: CARD_KEYWORD_ID.HEALTH_CAUTERIZE,
        //displays
        displayName: "Cauterize",
        displayDesc: "Restores @P health, but also inflicts burning on the target for @T rounds",
        //display 2D
        iconColour: Color4.Red(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 6 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.HEALTH_HEAL, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true },
            { id:STATUS_EFFECT_ID.HEALTH_BURNING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },
    

    //### ATTACK
    //increases attack
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.ATTACK_SHARPEN,
        //displays
        displayName: "Sharpen",
        displayDesc: "Increases attack damage by @P",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 7, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ATTACK_SHARPEN, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true }
        ]
    },
    //increases attack
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.ATTACK_ASCEND,
        //displays
        displayName: "Ascend",
        displayDesc: "Increases attack damage by @P for @T rounds",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 3, posY: 6 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ATTACK_ASCENDING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },
    //decreases attack
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.ATTACK_BLUNT,
        //displays
        displayName: "Blunt",
        displayDesc: "Reduces attack damage by @P",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 7, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ATTACK_BLUNT, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true }
        ]
    },
    //decreases attack
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.ATTACK_WEAKEN,
        //displays
        displayName: "Weaken",
        displayDesc: "Reduces attack damage by @P for @T rounds",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 6 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ATTACK_WEAKENING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },


    //### ARMOUR
    //increases armour
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.ARMOUR_REINFORCE,
        //displays
        displayName: "Reinforce",
        displayDesc: "Increases armour by @P",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 1, posY: 6 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ARMOUR_REINFORCE, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true }
        ]
    },
    //increases armour
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.ARMOUR_FORTIFY,
        //displays
        displayName: "Fortify",
        displayDesc: "Increases armour by @P for @T rounds",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 1, posY: 6 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ARMOUR_FORTIFYING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },
    //decreases armour
    //  applied 1 time, instantly/on-use
    {
        id: CARD_KEYWORD_ID.ARMOUR_SHEAR,
        //displays
        displayName: "Shear",
        displayDesc: "Reduces armour by @P",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 3, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ARMOUR_SHEAR, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:true }
        ]
    },
    //decreases armour
    //  applied n times, once per round
    {
        id: CARD_KEYWORD_ID.ARMOUR_MELTING,
        //displays
        displayName: "Melting",
        displayDesc: "Reduces armour by @P for @T rounds",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 4, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ARMOUR_MELTING, timing:CARD_KEYWORD_EFFECT_TIMING.EXPIRES, isPurgable:true }
        ]
    },
    

    //### ACTIVITY MODIFIERS
    //resets the action state of the unit (allowing them to attack again)
    {
        id: CARD_KEYWORD_ID.ACTIVITY_MOD_REFRESH,
        //displays
        displayName: "Refresh",
        displayDesc: "Restores an action to the unit",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 0, posY: 5 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ACTIVITY_MOD_REFRESH, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:false }
        ]
    },
    //disables the action for the targeted unit (stops them from attacking)
    {
        id: CARD_KEYWORD_ID.ACTIVITY_MOD_EXHAUST,
        //displays
        displayName: "Exhaust",
        displayDesc: "Removes an action from the unit",
        //display 2D
        iconColour: Color4.Yellow(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 3, posY: 5 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.ACTIVITY_MOD_EXHAUST, timing:CARD_KEYWORD_EFFECT_TIMING.INSTANT, isPurgable:false }
        ]
    },
    

    //### TARGETING MODIFIERS
    //sets unit to highest targeting layer (taunts)
    {
        id: CARD_KEYWORD_ID.TARGETING_MOD_TAUNT,
        //displays
        displayName: "Taunt",
        displayDesc: "Makes the unit a higher priority target",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 3, posY: 7 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.TARGETING_MOD_TAUNT, timing:CARD_KEYWORD_EFFECT_TIMING.CONSTANT, isPurgable:false }
        ]
    },
    //sets unit to lowest targeting layer (hides)
    {
        id: CARD_KEYWORD_ID.TARGETING_MOD_STEALTH,
        //displays
        displayName: "Stealth",
        displayDesc: "Makes the unit a lower priority target",
        //display 2D
        iconColour: Color4.White(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 6, posY: 6 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.TARGETING_MOD_STEALTH, timing:CARD_KEYWORD_EFFECT_TIMING.CONSTANT, isPurgable:false }
        ]
    },


    //### DEATH MODIFIERS
    //when the unit is defeated its card is added back to the player's hand
    {
        id: CARD_KEYWORD_ID.DEATH_MOD_TO_HAND,
        //displays
        displayName: "Reshuffle",
        displayDesc: "On death this card will be reset and added back to the player's hand",
        //display 2D
        iconColour: Color4.Red(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 2, posY: 5 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.DEATH_MOD_TO_HAND, timing:CARD_KEYWORD_EFFECT_TIMING.CONSTANT, isPurgable:false }
        ]
    },
    //when the unit is defeated its card is added back to the player's deck
    {
        id: CARD_KEYWORD_ID.DEATH_MOD_TO_DECK,
        //displays
        displayName: "Withdraw",
        displayDesc: "On death this card will be reset and added back to the player's deck",
        //display 2D
        iconColour: Color4.Red(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 2, posY: 5 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.DEATH_MOD_TO_DECK, timing:CARD_KEYWORD_EFFECT_TIMING.CONSTANT, isPurgable:false }
        ]
    },
    //when the unit is defeated its card is removed from the game
    {
        id: CARD_KEYWORD_ID.DEATH_MOD_DESTROY,
        //displays
        displayName: "Annihilate",
        displayDesc: "On death this card will be removed from the game",
        //display 2D
        iconColour: Color4.Red(),
        sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX: 2, posY: 5 },
        //gameplay
        playEffects: [
            { id:STATUS_EFFECT_ID.DEATH_MOD_DESTROY, timing:CARD_KEYWORD_EFFECT_TIMING.CONSTANT, isPurgable:false }
        ]
    },
];