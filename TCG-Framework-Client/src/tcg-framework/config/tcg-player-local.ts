import { getUserData } from "~system/UserIdentity"
import { PlayCardDeck } from "../tcg-play-card-deck";
import { CARD_DATA_ID } from "../data/tcg-card-data";
import { PLAYER_ACCOUNT_TYPE, PLAYER_ACCOUNT_TYPE_STRINGS, PLAYER_CONNECTIVITY_STATE } from "./tcg-config";
import { NFTLinkageRegistry } from "../data/tcg-nft-linkage-registry";
import { MenuElementManager2D } from "../../utilities/menu-group-2D.ui";
import { Color4 } from "@dcl/sdk/math";
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
    export function GetConnectivityState():PLAYER_CONNECTIVITY_STATE { return connectivityState; }

    /** local player's account type */
    var accountType:PLAYER_ACCOUNT_TYPE = PLAYER_ACCOUNT_TYPE.UNINITIALIZED;
    export function GetAccountType():PLAYER_ACCOUNT_TYPE { return accountType; }
    export function SetAccountType(value:PLAYER_ACCOUNT_TYPE) {
        //set value
        accountType = value;
        //update display
        uiTextLoginValue.TextValue = PLAYER_ACCOUNT_TYPE_STRINGS[accountType];
    }

    /** local player's web3 state */
    var isWeb3:boolean = false;
    export function IsWeb3():boolean { return isWeb3;}

    /** local player's uid */
    var userID:string;
    export function GetUserID():string { return userID;}

    /** local player's display name */
    var displayName:string;
    export function GetDisplayName():string { return displayName;}

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

    /** sets the default decks for the player (occurs for new player/unregistered account) */
    function PopulateDeckPlayer() {
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
    }

    /** deck used for pve enemy */
    export const DeckPVE:PlayCardDeck.PlayCardDeckObject = PlayCardDeck.Create({key:"PvE", type:PlayCardDeck.DECK_TYPE.PLAYER_LOCAL});
    
    /** sets the default deck for the pve enemy */
    function PopulateDeckPvE() {
        //  add fire spells
        for(let i:number = 0; i<3; i++) { DeckPVE.AddCard(CARD_DATA_ID.SPELL_FIREBOLT); }
        //  add fire golems
        for(let i:number = 0; i<5; i++) { DeckPVE.AddCard(CARD_DATA_ID.CHARACTER_FIRE_GOLEM); }
        //  add fire terrain
        for(let i:number = 0; i<1; i++) { DeckPVE.AddCard(CARD_DATA_ID.TERRAIN_FIRE); }
    }
    

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
            SetAccountType(PLAYER_ACCOUNT_TYPE.GUEST);
        } 
        //public key is found, player logged in through web3 wallet 
        else {
            if(isDebugging) console.log(debugTag+"player is a logged account (has web3 key)");
            SetAccountType(PLAYER_ACCOUNT_TYPE.STANDARD);
        } 

        //determined to be at least standard account
        //populate user data
        isWeb3 = userData.data.hasConnectedWeb3;
        userID = userData.data.userId;
        displayName = userData.data.displayName;

        //local: recalculate what cards the player owns/has access to
        NFTLinkageRegistry.Instance.userID = userID;
        await NFTLinkageRegistry.Instance.CalculateCardProvisionCounts();

        //if player is web3 account
        if(isWeb3) {
            //get player's core stats
            const playerStats = "";
            //zero-out 
            SetExperience(0);

            //if stats were found, load player's account
            if(playerStats == "") {

            }
            //if no stats, populate player's account with defaults
            else {
                //provide the player with default deck configuration
                PopulateDeckPlayer();
            }
        } 
        //if player is guest account
        else {
            //zero-out 
            SetExperience(0);

            //provide the player with default deck configuration
            PopulateDeckPlayer();
        }

        //setup pve deck
        PopulateDeckPvE();

        //update the player's connectivity state
        connectivityState = PLAYER_CONNECTIVITY_STATE.CONNECTED;
        if(isDebugging) console.log(debugTag+"loaded player data!"+
            "\n\taccountType="+PLAYER_ACCOUNT_TYPE_STRINGS[accountType]+
            "\n\tisWeb3="+isWeb3+
            "\n\tuserID="+userID+
            "\n\tdisplayName="+displayName
        );
    };

    //set up ui elements for player display
    //  parent container
    const uiParent = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pd");
    uiParent.PosTop = 2;
    uiParent.Width = 130; uiParent.Heigth = 70;
    uiParent.BackgroundColour = Color4.create(0.3, 0.3, 0.3, 1);
    //  parent background
    const uiParentBackground = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pdb", ["pd"]);
    uiParentBackground.PosTop = '2.5%';
    uiParentBackground.Width = '97.5%'; uiParentBackground.Heigth = '95%';
    uiParentBackground.BackgroundColour = Color4.create(0.45, 0.45, 0.45, 1);
    //  login state display
    //      display background
    const uiTextLoginBackground = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-0-b", ["pd","pdb"]);
    uiTextLoginBackground.PosTop = 5; uiTextLoginBackground.PosLeft = 5;
    uiTextLoginBackground.Width = 0; uiTextLoginBackground.Heigth = 0;
    uiTextLoginBackground.BackgroundColour = Color4.create(0.65, 0.0, 0.0, 1);
    uiTextLoginBackground.PosType = 'absolute';
    //      ui text for login state label
    const uiTextLoginLabel = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-0-l", ["pd","pdb","pi-0-b"]);
    uiTextLoginLabel.Width = 0; uiTextLoginLabel.Heigth = 0;
    uiTextLoginLabel.TextValue = "LOGIN:";
    uiTextLoginLabel.TextAlign = "middle-left";
    //      ui text for login state value
    const uiTextLoginValue = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-0-v", ["pd","pdb","pi-0-b"]);
    uiTextLoginValue.PosLeft = 43;
    uiTextLoginValue.Width = 0; uiTextLoginValue.Heigth = 0;
    uiTextLoginValue.TextValue = PLAYER_ACCOUNT_TYPE_STRINGS[0];
    uiTextLoginValue.TextAlign = "middle-left";
    //  level display
    //      display background
    const uiTextLevelBackground = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-1-b", ["pd","pdb"]);
    uiTextLevelBackground.PosTop = 25; uiTextLevelBackground.PosLeft = 5;
    uiTextLevelBackground.Width = 0; uiTextLevelBackground.Heigth = 0;
    uiTextLevelBackground.BackgroundColour = Color4.create(0.0, 0.65, 0.0, 1);
    uiTextLevelBackground.PosType = 'absolute';
    //      ui text for level label
    const uiTextLevelLabel = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-1-l", ["pd","pdb","pi-1-b",]);
    uiTextLevelLabel.Width = 0; uiTextLevelLabel.Heigth = 0;
    uiTextLevelLabel.TextValue = "LEVEL:";
    uiTextLevelLabel.TextAlign = "middle-left";
    //      ui text for level value
    const uiTextLevelValue = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-1-v", ["pd","pdb","pi-1-b",]);
    uiTextLevelValue.PosLeft = 42;
    uiTextLevelValue.Width = 0; uiTextLevelValue.Heigth = 0;
    uiTextLevelValue.TextValue = "LOADING...";
    uiTextLevelValue.TextAlign = "middle-left";
    //  experience display
    //      display background
    const uiTextExperienceBackground = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-2-b", ["pd","pdb"]);
    uiTextExperienceBackground.PosTop = 45; uiTextExperienceBackground.PosLeft = 5;
    uiTextExperienceBackground.Width = 0; uiTextExperienceBackground.Heigth = 0;
    uiTextExperienceBackground.BackgroundColour = Color4.create(0.0, 0.65, 0.0, 1);
    uiTextExperienceBackground.PosType = 'absolute';
    //      ui text for experience label
    const uiTextExperienceLabel = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-2-l", ["pd","pdb","pi-2-b"]);
    uiTextExperienceLabel.Width = 0; uiTextExperienceLabel.Heigth = 0;
    uiTextExperienceLabel.TextValue = "EXP:";
    uiTextExperienceLabel.TextAlign = "middle-left";
    //      ui text for experience value
    const uiTextExperienceValue = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-2-v", ["pd","pdb","pi-2-b"]);
    uiTextExperienceValue.PosLeft = 28;
    uiTextExperienceValue.Width = 0; uiTextExperienceValue.Heigth = 0;
    uiTextExperienceValue.TextValue = "LOADING...";
    uiTextExperienceValue.TextAlign = "middle-left";


    //TODO: split to seperate module (vroomway open-sourced some stuff that )
    /** player's current experience */
    let experience:number = 0;
    export function GetExperience():number { return experience; }
    export function SetExperience(val:number) {
        //set value
        experience = val;
        //update ui draw
        uiTextExperienceValue.TextValue = (experience%1000).toString();
        //calculate new level
        SetLevel(experience/1000);
    }
    /** player's current level */
    let level:number = 0;
    export function GetLevel():number { return level; }
    export function SetLevel(val:number) {
        //set value
        level = val;
        //update ui draw
        uiTextLevelValue.TextValue = level.toString();
    }
}