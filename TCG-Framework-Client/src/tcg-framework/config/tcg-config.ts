/*      TRADING CARD GAME - CONFIG
    this controls the overall settings and configuration of the TCG
    framework. this includes the networking mode, standardized card
    sets, and more

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/

export enum GAME_CONNECTIVITY_TYPE {
    //full server experience, with mechanics mirroring/anti-cheat
    //  player can level-up
    SERVER_MIRRORED, 
    //initial connection to server to load account, but no anti-cheat
    //  player cannot level-up
    SERVER_ACCOUNTS,
    //no account or ownership verification, locks the scene as though
    //  it was the player was playing on a demo account 
    PEER_TO_PEER_LOCKED,
    //no account or ownership verification, enables all functions/deck
    //  options in the game as if player was logged in on an admin account
}

/** represents the current state of the instance's connectivity,
 *  this follows a fail-through approach: if the game cannot connect
 *  to the server it will automatically fallback to peer-to-peer connectivity
 */
export var ConnectivityState:GAME_CONNECTIVITY_TYPE;