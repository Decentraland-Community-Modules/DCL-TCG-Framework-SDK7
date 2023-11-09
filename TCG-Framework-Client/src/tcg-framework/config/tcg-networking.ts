import { MessageBus } from '@dcl/sdk/message-bus';
/** all networking interfaces and settings */
export module Networking {
    //global message bus
    export const MESSAGE_BUS = new MessageBus();

    //### SERVER ###
    /** when true will interact with the server using debug credentials */
    export const DEBUG_OVERRIDE:boolean = false;
    /** server url base for remote calls */
    export const SERVER_URL:string = "https://us-central1-decentraland-tcg-server.cloudfunctions.net/app/"
    /** server url api pieces for remote calls */
    export enum SERVER_API {
        //profile calls
        PROFILE_GET = "api/get-profile/",
        EXPERIENCE_GET = "api/get-exp/",
        DECK_SET = "api/set-deck",
        //table calls
        TABLE_GET_DATA = "api/get-table",
        TABLE_SET_DATA = "api/set-table",
        TABLE_JOIN_GAME = "api/join-table",
        TABLE_LEAVE_GAME = "api/leave-table",
        TABLE_READY_STATE = "api/set-ready-state",
        TABLE_START_GAME = "api/start-game",
        TABLE_NEXT_TURN = "api/next-turn",
        TABLE_END_GAME = "api/end-game",
    }

    //### PLAYER PROFILE ###
    /** all connectivity types for player profiles */
    export enum PROFILE_CONNECTIVITY_TYPE {
        //no account or ownership verification
        //  enables all cards/deck
        SANDBOX,
        //no account or ownership verification
        //  automatically defines all users as guests 
        GUEST,
        //initial load from server upon scene start
        //  use to get player profile (exp/decks) on scene start
        //  player cannot make any changes or progression on their account
        SERVER_LOAD,
        //full interaction with server throughout scene processing
        //  allows player to make changes and earn progression on their account
        //  player can modify their decks and winning games provides experience
        SERVER_STRICT, 
    }
    /** determines the connectivity type of the local player's profile */
    export const PROFILE_CONNECTIVITY:PROFILE_CONNECTIVITY_TYPE = PROFILE_CONNECTIVITY_TYPE.SERVER_STRICT;

    /** all possible connectivity/load states for a player */
    export enum PLAYER_CONNECTIVITY_STATE {
        UNINITIALIZED, //no attempt has been made to load player data
        CONNECTING, //actively attempting connection
        CONNECTED, //successfully established connection 
        FAILED, //failed to establish connection (likely guest wallet)
    }
    /** all possible account states for a player */
    export enum PLAYER_ACCOUNT_TYPE {
        UNINITIALIZED, //player's account has not loaded yet
        GUEST, //guest/not logged in with a wallet
        STANDARD, //logged in with a web3 wallet
        ADMIN, //full access to everything, overriding server profile
    }
    /** display strings for player accounts */
    export const PLAYER_ACCOUNT_TYPE_STRINGS:string[] = [
        "Loading...",
        "Guest",
        "Standard",
        "Admin",
    ];

    //### CARD TABLES ###
    /** all connectivity types for card tables */
    export enum TABLE_CONNECTIVITY_TYPE {
        //no server or peer to peer communications
        //  this is only viable for PVE experiences 
        LOCAL,
        //table state and processing is handled by players in scene
        PEER_TO_PEER,
        //table state and processing is handled by server, passed down to players 
        SERVER_STRICT, 
    }
}