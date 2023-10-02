/**     TRADING CARD GAME - CARD STATUS EFFECTS
    all definitions relavent to status effects in the game; this includes an effects's id,
    display details, and types. status effects are the data element processed against a card's data
    when a keyword is activated; the can be applied instantly/constantly/repeatedly against a card.

    think of the keywords as the visual representation/on-card view of what a card does,
    card status effects as what is being done to a unit/card in the game

    an advanced use of this system is the keyword cauterize (applies an instant heal to the target, but also an over time burn), 
    it makes use of 2 status effects while the concept only requires a single keyword to convay what is happening

    effects represent a status that has been applied to a unit/character that modifies their existance
    in some way. status effects can have identical processing/things that happen in the code but different
    ids/flavours for their effects.
    ex:
        both burning and wither share the same processing effect (decrease the target's max health) but are
        technically different status effects to create 2 different channels
 */

    import { Color4 } from "@dcl/sdk/math";
    import { TEXTURE_SHEET_CARD_KEYWORD } from "./tcg-keyword-texture-data";
    
    /** defines affinity types for status effects 
     *      this impacts when an effect is processed and is also used for a filter during purges
     */
    export enum STATUS_EFFECT_AFFINITY {
        //an effect that benefits the unit it is attached to
        //processed at the start of a turn
        //  ex: heals a unit or increases unit's attack damage
        HELPFUL,    
        //an effect that hinders the unit it is attached to
        //processed at the end of a turn
        //  ex: removes armour from the unit or causes damage
        HARMFUL,
    }

    /** defines how a status effect is processed by code when played/the actual thing that happens */
    export enum STATUS_EFFECT_PROCESSING_TYPE {
        //### CORE
        //  deals damage to the unit using the standard process (reduced by armour, applied to health)
        DAMAGE,
    
        //### HEALTH
        //  increases current health, up to the max
        HEALTH_RECOVER,
        //  decreases current health (skips armour calc)
        HEALTH_DAMAGE,
        //  increases max health (current health also increases by amount)
        HEALTH_INCREASE,
        //  decreases max health (current health is not reduced by amount, but is leashed to max health)
        HEALTH_DECREASE,
        
        //### ATTACK
        //  increases attack
        ATTACK_INCREASE,
        //  decreases attack
        ATTACK_DECREASE,

        //### ARMOUR
        //  increases armour
        ARMOUR_INCREASE,
        //  decreases armour
        ARMOUR_DECREASE,

        //### ACTIVITY MODIFIERS
        //  resets the action state of the unit (allowing them to attack again)
        ACTIVITY_MOD_ACTION_ENABLE,
        //  disables the action for the targeted unit (stops them from attacking)
        ACTIVITY_MOD_ACTION_DISABLE,
        
        //### TARGETING MODIFIERS
        //all units on the field have 'targeting layers' that define whether they can be targeted or not
        //if a unit exists in a higher targeting layer than others, it must be targeted first (certain effects
        //like target-all spells ignore this)
        //  sets unit to highest targeting layer (taunts)
        TARGETING_MOD_HIGH,
        //  sets unit to lowest targeting layer (hides)
        TARGETING_MOD_LOW,

        //### DEATH MODIFIERS
        //  when the unit is defeated its card is added back to the player's hand
        DEATH_MOD_TO_HAND,
        //  when the unit is defeated its card is added back to the player's deck
        DEATH_MOD_TO_DECK,
        //  when the unit is defeated its card is removed from the game
        DEATH_MOD_DESTROY,
    }

    /** data interface for defining a card keyword's splice sheet draw details */
    export interface CardKeywordSheetDataObject {
        id:TEXTURE_SHEET_CARD_KEYWORD; //reference to sheet
        posX:number; //x position of character on sheet 
        posY:number; //y position of character on sheet
    }
    
    /** data interface for defining a trigger type */
    export interface StatusEffectDataObject {
        id:STATUS_EFFECT_ID;
        type:STATUS_EFFECT_PROCESSING_TYPE;
        affinity:STATUS_EFFECT_AFFINITY;
        //displays
        displayName:string;
        displayDesc:string;
        //display 2D
        iconColour:Color4,
        sheetData:CardKeywordSheetDataObject;
    }
    
    /** unique ids for every possible status effect */
    export enum STATUS_EFFECT_ID {
        //### DAMAGING
        //  deals damage to the unit using the standard process (reduced by armour, applied to health)
        DAMAGE, //instant
        DAMAGE_RECOILING, //over time

        //### HEALTH
        //  increases current health, up to the max
        HEALTH_HEAL, //instant
        HEALTH_MENDING, //over time
        //  decreases current health (skips armour calc)
        HEALTH_PUNCTURE, //instant
        HEALTH_BLEEDING, //over time
        //  increases max health (current health also increases by amount)
        HEALTH_GIGANTAZIE, //instant
        HEALTH_GROWING, //over time
        //  decreases max health (current health is not reduced by amount, but is leashed to max health)
        HEALTH_SHRINK, //instant
        HEALTH_DECAY, //instant
        HEALTH_BURNING, //over time
        HEALTH_WITHERING, //over time
        
        //### ATTACK
        //  increases attack
        ATTACK_SHARPEN, //instant
        ATTACK_ASCENDING, //over time
        //  decreases attack
        ATTACK_BLUNT, //instant
        ATTACK_WEAKENING, //over time

        //### ARMOUR
        //  increases armour
        ARMOUR_REINFORCE, //instant
        ARMOUR_FORTIFYING, //over time
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
    export const CardKeywordData:StatusEffectDataObject[] = [
        //### CORE
        //  deals damage to the unit using the standard process (reduced by armour, applied to health)
        {   //instant damage
            id: STATUS_EFFECT_ID.DAMAGE,
            type: STATUS_EFFECT_PROCESSING_TYPE.DAMAGE,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Damage",
            displayDesc: "Deals @P damage to the unit, reduced by armour",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //repeating damage
            id: STATUS_EFFECT_ID.DAMAGE_RECOILING,
            type: STATUS_EFFECT_PROCESSING_TYPE.DAMAGE,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Recoiling",
            displayDesc: "Deals @P damage to the unit each round, reduced by armour",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
    
        //### HEALTH
        //  increases current health, up to the max
        {   //heal
            id: STATUS_EFFECT_ID.HEALTH_HEAL,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_RECOVER,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Heal",
            displayDesc: "Restores @P health to the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //mending
            id: STATUS_EFFECT_ID.HEALTH_MENDING,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_RECOVER,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Mending",
            displayDesc: "Restores @P health to the unit each round",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        //  decreases current health (skips armour calc)
        {   //puncture
            id: STATUS_EFFECT_ID.HEALTH_PUNCTURE,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DAMAGE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Puncture",
            displayDesc: "Removes @P health from the unit, ignores armour",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //bleeding
            id: STATUS_EFFECT_ID.HEALTH_BLEEDING,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DAMAGE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Bleeding",
            displayDesc: "Removes @P health from the unit each round, ignores armour",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        //  increases max health (current health also increases by amount)
        {   //gigantazie
            id: STATUS_EFFECT_ID.HEALTH_GIGANTAZIE,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_INCREASE,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Gigantazie",
            displayDesc: "Adds @P max health to the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //growing
            id: STATUS_EFFECT_ID.HEALTH_GROWING,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_INCREASE,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Growing",
            displayDesc: "Adds @P max health to the unit each round",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        //  decreases max health (current health is not reduced by amount, but is leashed to max health)
        {   //shrink
            id: STATUS_EFFECT_ID.HEALTH_SHRINK,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DECREASE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Shrink",
            displayDesc: "Removes @P max health from the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //decay
            id: STATUS_EFFECT_ID.HEALTH_DECAY,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DECREASE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Decay",
            displayDesc: "Removes @P max health from the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //burning
            id: STATUS_EFFECT_ID.HEALTH_BURNING,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DECREASE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Burning",
            displayDesc: "Removes @P max health from the unit each round",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //withering
            id: STATUS_EFFECT_ID.HEALTH_WITHERING,
            type: STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DECREASE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Wither",
            displayDesc: "Removes @P max health from the unit each round",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        
        //### ATTACK
        //  increases attack
        {   //sharpen
            id: STATUS_EFFECT_ID.ATTACK_SHARPEN,
            type: STATUS_EFFECT_PROCESSING_TYPE.ATTACK_INCREASE,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Sharpen",
            displayDesc: "Adds @P attack damage to the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //ascending
            id: STATUS_EFFECT_ID.ATTACK_ASCENDING,
            type: STATUS_EFFECT_PROCESSING_TYPE.ATTACK_INCREASE,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Ascending",
            displayDesc: "Adds @P attack damage to the unit each round",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        //  decreases attack
        {   //blunt
            id: STATUS_EFFECT_ID.ATTACK_BLUNT,
            type: STATUS_EFFECT_PROCESSING_TYPE.ATTACK_DECREASE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Blunt",
            displayDesc: "Removes @P attack damage from the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //weakening
            id: STATUS_EFFECT_ID.ATTACK_WEAKENING,
            type: STATUS_EFFECT_PROCESSING_TYPE.ATTACK_DECREASE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Weakening",
            displayDesc: "Removes @P attack damage from the unit each round",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },

        //### ARMOUR
        //  increases armour
        {   //reinforce
            id: STATUS_EFFECT_ID.ARMOUR_REINFORCE,
            type: STATUS_EFFECT_PROCESSING_TYPE.ARMOUR_INCREASE,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Reinforce",
            displayDesc: "Adds @P armour to the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //foritying
            id: STATUS_EFFECT_ID.ARMOUR_FORTIFYING,
            type: STATUS_EFFECT_PROCESSING_TYPE.ARMOUR_INCREASE,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Fortifying",
            displayDesc: "Adds @P armour to the unit each round",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        //  decreases armour
        {   //shear
            id: STATUS_EFFECT_ID.ARMOUR_SHEAR,
            type: STATUS_EFFECT_PROCESSING_TYPE.ARMOUR_DECREASE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Shear",
            displayDesc: "Removes @P armour from the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        {   //melting
            id: STATUS_EFFECT_ID.ARMOUR_MELTING,
            type: STATUS_EFFECT_PROCESSING_TYPE.ARMOUR_DECREASE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Melting",
            displayDesc: "Removes @P armour from the unit each round",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },

        //### ACTIVITY MODIFIERS
        //  resets the action state of the unit (allowing them to attack again)
        {   //refresh
            id: STATUS_EFFECT_ID.ACTIVITY_MOD_REFRESH,
            type: STATUS_EFFECT_PROCESSING_TYPE.ACTIVITY_MOD_ACTION_ENABLE,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Refresh",
            displayDesc: "Restores an action to the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        //  disables the action for the targeted unit (stops them from attacking)
        {   //exhaust
            id: STATUS_EFFECT_ID.ACTIVITY_MOD_EXHAUST,
            type: STATUS_EFFECT_PROCESSING_TYPE.ACTIVITY_MOD_ACTION_DISABLE,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Exhaust",
            displayDesc: "Removes an action from the unit",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        
        //### TARGETING MODIFIERS
        //all units on the field have 'targeting layers' that define whether they can be targeted or not
        //if a unit exists in a higher targeting layer than others, it must be targeted first (certain effects
        //like target-all spells ignore this)
        //  sets unit to highest targeting layer (taunts)
        {   //taunt
            id: STATUS_EFFECT_ID.TARGETING_MOD_TAUNT,
            type: STATUS_EFFECT_PROCESSING_TYPE.TARGETING_MOD_HIGH,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Taunt",
            displayDesc: "Makes the unit a higher priority target",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        //  sets unit to lowest targeting layer (hides)
        {   //stealth
            id: STATUS_EFFECT_ID.TARGETING_MOD_STEALTH,
            type: STATUS_EFFECT_PROCESSING_TYPE.TARGETING_MOD_LOW,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Stealth",
            displayDesc: "Makes the unit a lower priority target",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },

        //### DEATH MODIFIERS
        //  when the unit is defeated its card is added back to the player's hand
        {   //death to hand
            id: STATUS_EFFECT_ID.DEATH_MOD_TO_HAND,
            type: STATUS_EFFECT_PROCESSING_TYPE.DEATH_MOD_TO_HAND,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Reshuffle",
            displayDesc: "On death this card will be reset and added back to the player's hand",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        //  when the unit is defeated its card is added back to the player's deck
        {   //death to deck 
            id: STATUS_EFFECT_ID.DEATH_MOD_TO_DECK,
            type: STATUS_EFFECT_PROCESSING_TYPE.DEATH_MOD_TO_DECK,
            affinity:STATUS_EFFECT_AFFINITY.HELPFUL,
            //displays
            displayName: "Withdraw",
            displayDesc: "On death this card will be reset and added back to the player's deck",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
        //  when the unit is defeated its card is removed from the game
        {   //death to destroy
            id: STATUS_EFFECT_ID.DEATH_MOD_DESTROY,
            type: STATUS_EFFECT_PROCESSING_TYPE.DEATH_MOD_DESTROY,
            affinity:STATUS_EFFECT_AFFINITY.HARMFUL,
            //displays
            displayName: "Cower",
            displayDesc: "On death this card will be removed from the game",
            //display 2D
            iconColour: Color4.White(),
            sheetData:{ id:TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO, posX:0, posY:0 },
        },
    ];