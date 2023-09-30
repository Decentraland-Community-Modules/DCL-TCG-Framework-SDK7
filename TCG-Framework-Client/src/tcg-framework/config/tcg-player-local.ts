import { getUserData } from "~system/UserIdentity"
import { PlayCardDeck } from "../tcg-play-card-deck";
import { CARD_DATA_ID } from "../data/tcg-card-data";
import { PLAYER_ACCOUNT_TYPE, PLAYER_ACCOUNT_TYPE_STRINGS, PLAYER_CONNECTIVITY_STATE } from "./tcg-config";
import { NFTLinkageRegistry } from "../data/tcg-nft-linkage-registry";
import { executeTask } from "@dcl/sdk/ecs";
/*      TRADING CARD GAME - LOCAL PLAYER
    contains properties and configurations regarding the local player's
    instance, such as if they are logged in via web3, their display name, and wallet.

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module PlayerLocal {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "Player Local: ";

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

    /** id of local player's current table */
    export var CurTableID:undefined|number;
    /** id of local player's current team */
    export var CurTeamID:undefined|number;

    /** player's currently selected deck (used for playing at card tables) */
    var curDeck:number = 3;
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
    //  neutral deck
    for(let i:number=0; i<3; i++) { PlayerDecks[0].AddCard(CARD_DATA_ID.SPELL_HEAL); }
    for(let i:number=0; i<5; i++) { PlayerDecks[0].AddCard(CARD_DATA_ID.CHARACTER_NEUTRAL_GOLEM); }
    //  neutral deck
    for(let i:number=0; i<2; i++) { PlayerDecks[1].AddCard(CARD_DATA_ID.SPELL_FIREBOLT); }
    for(let i:number=0; i<5; i++) { PlayerDecks[1].AddCard(CARD_DATA_ID.CHARACTER_FIRE_GOLEM); }
    PlayerDecks[1].AddCard(CARD_DATA_ID.TERRAIN_FIRE);
    //  neutral deck
    for(let i:number=0; i<2; i++) { PlayerDecks[2].AddCard(CARD_DATA_ID.SPELL_ICEBOLT); }
    for(let i:number=0; i<5; i++) { PlayerDecks[2].AddCard(CARD_DATA_ID.CHARACTER_ICE_GOLEM); }
    PlayerDecks[2].AddCard(CARD_DATA_ID.TERRAIN_ICE);
    //  neutral deck
    for(let i:number=0; i<2; i++) { PlayerDecks[3].AddCard(CARD_DATA_ID.SPELL_LIGHTNINGBOLT); }
    for(let i:number=0; i<5; i++) { PlayerDecks[3].AddCard(CARD_DATA_ID.CHARACTER_ELECTRIC_GOLEM); }
    PlayerDecks[3].AddCard(CARD_DATA_ID.SPELL_LIGHTNINGBOLT);
    //  neutral deck
    for(let i:number=0; i<2; i++) { PlayerDecks[4].AddCard(CARD_DATA_ID.SPELL_VOIDBOLT); }
    for(let i:number=0; i<5; i++) { PlayerDecks[4].AddCard(CARD_DATA_ID.CHARACTER_VOID_GOLEM); }
    PlayerDecks[4].AddCard(CARD_DATA_ID.TERRAIN_VOID);

    //TODO: move this to an external pve segment
    /** deck used for pve enemy */
    export const DeckPVE:PlayCardDeck.PlayCardDeckObject = PlayCardDeck.Create({key:"PvE", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL});
    //  add fire spells
    for(let i:number = 0; i<3; i++) { DeckPVE.AddCard(CARD_DATA_ID.SPELL_FIREBOLT); }
    //  add fire golems
    for(let i:number = 0; i<5; i++) { DeckPVE.AddCard(CARD_DATA_ID.CHARACTER_FIRE_GOLEM); }
    //  add fire terrain
    for(let i:number = 0; i<1; i++) { DeckPVE.AddCard(CARD_DATA_ID.TERRAIN_FIRE); }

    /** attempts to load the local player's data, processes their owned contracts, and */
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
            if(isDebugging) console.log(debugTag+"player is a logged account (has web3 key)");
            accountType = PLAYER_ACCOUNT_TYPE.STANDARD;
        } 

        //determined to be at least standard account
        //populate user data
        isWeb3 = userData.data.hasConnectedWeb3;
        userID = userData.data.userId;
        displayName = userData.data.displayName;

        //recalculate what cards the player owns/has access to
        await NFTLinkageRegistry.Instance.CalculateCardProvisionCounts();

        //update the player's connectivity state
        connectivityState = PLAYER_CONNECTIVITY_STATE.CONNECTED;
        if(isDebugging) console.log(debugTag+"loaded player data!"+
            "\n\taccountType="+PLAYER_ACCOUNT_TYPE_STRINGS[accountType]+
            "\n\tisWeb3="+isWeb3+
            "\n\tuserID="+userID+
            "\n\tdisplayName="+displayName
        );
    };
}