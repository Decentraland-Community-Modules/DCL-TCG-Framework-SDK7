/**     CARD KEYWORDS
 * all definitions relavent to the function and display 
 * details (name, effect, etc.) of card keywords
 */

/** defines when application type of  */
enum CARD_KEYWORD_TRIGGER_TYPE {
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
}
/** data interface for defining a trigger type */
interface CardKeywordTriggerDataObject {
    //type of trigger
    type:CARD_KEYWORD_TARGET_TYPE;
    //defines additional function of type
    //  delay: number of turns before effect happens
    //  reoccuring: number of turns between effect occuring 
    value:Number;
}

/** defines what targets are valid/required for the effect */
enum CARD_KEYWORD_TARGET_TYPE {
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
enum CARD_KEYWORD_TARGET_COUNT_TYPE {
    //targets no units on the board
    NONE,
    //targets N number of targets
    COUNT,
    //targets all units on the board
    ALL,
}
/** data interface for defining a target type */
interface CardKeywordTargetDataObject {
    //
    type:CARD_KEYWORD_TARGET_TYPE;
    //
    count:CARD_KEYWORD_TARGET_COUNT_TYPE;
}

/** all possible effects tied to a keyword (like causing damage to health) */
enum CARD_KEYWORD_EFFECT_TYPE {
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

    //### HEALING
    //
    RESTORE_HEALTH,
    RESTORE_ARMOUR,
    RESTORE_SHIELD,

}

/** listing of all card keywords, official keywords are 'tcg' */
const CardKeywordData = [
    //### DAMAGE
    //damage enemy target overflow
    {
        id:"tcg-damage-overflow",
        name: "Strike",
        desc: "Causes damage to the enemy target",

    }
    //damage enemy target health

    //### HEAL

];