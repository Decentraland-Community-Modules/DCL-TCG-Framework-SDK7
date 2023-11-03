/*      TRADING CARD GAME - CONFIG
    this contains the overhead enums, settings, and configuration of the TCG
    framework. this includes the networking mode, standardized card
    sets, and more

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/

/** determines all possible card owners */
export enum CARD_OBJECT_OWNER_TYPE {
    GAME_TABLE_HAND = 0, //used by an active game table
    GAME_TABLE_DECK = 1, //
    DECK_MANAGER = 2, //used by deck manager
    SHOWCASE = 3, //set on display in scene
}

/** all possible game states for a card table */
export enum TABLE_GAME_STATE {
    IDLE, //no game has started
    ACTIVE, //game is on-going
    OVER, //game has finished (displaying results)
} 

/** team types for table/who can register for table */
export enum TABLE_TEAM_TYPE {
    HUMAN, //human player
    AI, //AI/PvE player
}

/** table team's turn state */
export enum TABLE_TURN_TYPE {
    ACTIVE,
    INACTIVE,
}

/** max number of cards of the same instance allowed to be added to a deck */
export const MAX_CARD_COUNT_PER_TYPE:number[] = [
    3, //spell
    5, //character
    1, //terrain
];