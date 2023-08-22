import { executeTask } from "@dcl/sdk/ecs"
import { getUserData } from "~system/UserIdentity"
import { PlayCardDeck } from "../tcg-play-card-deck";

/** defines all possible connectivity/load states */
enum PLAYER_CONNECTIVITY_STATE {
    UNINITIALIZED, //no attempt has been made to load player data
    CONNECTING, //actively attempting connection
    CONNECTED, //successfully established connection 
    FAILED, //failed to establish connection (likely guest wallet)
}
/** defines all possible account types */
enum PLAYER_ACCOUNT_TYPE {
    UNINITIALIZED,
    GUEST, //guest/not logged in with a wallet
    STANDARD, //logged in with a web3 wallet
    PREMIUM, //logged in and confirmed to own cards
}
/*      TRADING CARD GAME - PLAYER INSTANCE
    contains properties and configurations regarding the local player's
    instance, such as if they are logged in via web3, their display name, and wallet.

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module Player {
    /** when true generates debugging logs for this module */
    const isDebugging:boolean = true;

    /** local player's connectivity state */
    var connectivityState:PLAYER_CONNECTIVITY_STATE = PLAYER_CONNECTIVITY_STATE.UNINITIALIZED;
    export function ConnectivityState():PLAYER_CONNECTIVITY_STATE { return connectivityState; }

    /** local player's account type */
    var accountType:PLAYER_ACCOUNT_TYPE = PLAYER_ACCOUNT_TYPE.UNINITIALIZED;
    export function AccountType():PLAYER_ACCOUNT_TYPE { return accountType; }

    /** local player's web3 state */
    var isWeb3:boolean = false;
    export function IsWeb3():boolean { return isWeb3;}

    /** local player's uid */
    var userID:string;
    export function UserID():string { return userID;}

    /** local player's display name */
    var displayName:string;
    export function DisplayName():string { return displayName;}

    /** local player's available decks */
    export const PlayerDecks:PlayCardDeck.PlayCardDeckObject[] = [
        PlayCardDeck.Create({key:"P0", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
        PlayCardDeck.Create({key:"P1", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
        PlayCardDeck.Create({key:"P2", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
        PlayCardDeck.Create({key:"P3", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
        PlayCardDeck.Create({key:"P4", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
    ];

    /** attempts to load the local player's data */
    export async function LoadPlayerData() {
        //ensure this is the first connection attempt
        if(connectivityState != PLAYER_CONNECTIVITY_STATE.UNINITIALIZED)
            return;

        if(isDebugging) console.log("Player: loading player data...");
        connectivityState = PLAYER_CONNECTIVITY_STATE.CONNECTING;

        //attempt to get player data
        let userData = await getUserData({});
        
        //ensure user data exists
        if(!userData) {
            if(isDebugging) console.log("Player: failed to load player data");
            connectivityState = PLAYER_CONNECTIVITY_STATE.FAILED;
            return;
        }    
        
        //check for guest account
        if(!userData.data?.publicKey) {
            if(isDebugging) console.log("Player: player is a guest account (no web3 key)");
            connectivityState = PLAYER_CONNECTIVITY_STATE.CONNECTED;
            accountType = PLAYER_ACCOUNT_TYPE.GUEST;
            return;
        }

        //determined to be at least standard account
        accountType = PLAYER_ACCOUNT_TYPE.STANDARD
        //populate user data
        isWeb3 = userData.data.hasConnectedWeb3;
        userID = userData.data.userId;
        displayName = userData.data.displayName;

        //TODO: run ownership checks to determine if user is a premium account

        connectivityState = PLAYER_CONNECTIVITY_STATE.CONNECTED;
        if(isDebugging) console.log("Player: loaded player data!");
    };
}