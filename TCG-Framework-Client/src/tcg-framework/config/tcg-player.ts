import { executeTask } from "@dcl/sdk/ecs"
import { getUserData } from "~system/UserIdentity"
import { PlayCardDeck } from "../tcg-play-card-deck";
import { CARD_DATA_ID } from "../data/tcg-card-data";

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
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "Player: ";

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

    var curDeck:number = 0;
    export function GetPlayerDeckIndex():number { return curDeck; }
    export function GetPlayerDeck():PlayCardDeck.PlayCardDeckObject { return PlayerDecks[curDeck]; }
    export function SetPlayerDeck(value:number) { return curDeck = value; }
    /** local player's available decks */
    export const PlayerDecks:PlayCardDeck.PlayCardDeckObject[] = [
        PlayCardDeck.Create({key:"P0", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
        PlayCardDeck.Create({key:"P1", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
        PlayCardDeck.Create({key:"P2", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
        PlayCardDeck.Create({key:"P3", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
        PlayCardDeck.Create({key:"P4", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL}),
    ];

    //provide default decks
    for(let j:number=0; j<5; j++){
        for(let i:number=0; i<3; i++) { PlayerDecks[j].AddCard(CARD_DATA_ID.SPELL_ICEBOLT); }
        for(let i:number=0; i<5; i++) { PlayerDecks[j].AddCard(CARD_DATA_ID.CHARACTER_ICE_GOLEM); }
    }

    //TODO: move this to an external pve segment
    /** deck used for pve enemy */
    export const DeckPVE:PlayCardDeck.PlayCardDeckObject = PlayCardDeck.Create({key:"PvE", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL});
    //  add spells
    for(let i:number = 0; i<3; i++) {
        DeckPVE.AddCard(CARD_DATA_ID.SPELL_FIREBOLT);
    }
    //  add fire golems
    for(let i:number = 0; i<5; i++) {
        DeckPVE.AddCard(CARD_DATA_ID.CHARACTER_FIRE_GOLEM);
    }

    /** attempts to load the local player's data */
    export async function LoadPlayerData() {
        if(isDebugging) console.log(debugTag+"loading player data...");

        //ensure this is the first connection attempt
        if(connectivityState != PLAYER_CONNECTIVITY_STATE.UNINITIALIZED) {
            if(isDebugging) console.log(debugTag+"player data has already been loaded!");
            return;
        }
        
        connectivityState = PLAYER_CONNECTIVITY_STATE.CONNECTING;

        //attempt to get player data
        let userData = await getUserData({});
        
        //ensure user data exists
        if(!userData || !userData.data) {
            if(isDebugging) console.log(debugTag+"failed to load player data");
            connectivityState = PLAYER_CONNECTIVITY_STATE.FAILED;
            return;
        }    
        
        //public key is not found, player is not logged in
        if(!userData.data.publicKey) {
            if(isDebugging) console.log(debugTag+"player is a guest account (no web3 key)");
            accountType = PLAYER_ACCOUNT_TYPE.GUEST;
        } 
        //public key is found, player logged in through web3 wallet 
        else {
            accountType = PLAYER_ACCOUNT_TYPE.STANDARD;

            //TODO: check for NFT ownership
        } 

        //determined to be at least standard account
        //populate user data
        isWeb3 = userData.data.hasConnectedWeb3;
        userID = userData.data.userId;
        displayName = userData.data.displayName;

        //TODO: run ownership checks to determine if user is a premium account

        connectivityState = PLAYER_CONNECTIVITY_STATE.CONNECTED;
        if(isDebugging) console.log(debugTag+"loaded player data!"+
            "\n\taccountType="+accountType+
            "\n\tisWeb3="+isWeb3+
            "\n\tuserID="+userID+
            "\n\tdisplayName="+displayName
        );
    };
}