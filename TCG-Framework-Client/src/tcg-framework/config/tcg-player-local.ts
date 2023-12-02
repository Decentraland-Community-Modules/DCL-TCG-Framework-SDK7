import { getUserData } from "~system/UserIdentity"
import { PlayCardDeck } from "../tcg-play-card-deck";
import { CARD_DATA_ID } from "../data/tcg-card-data";
import { ContractUnlockRegistry } from "../data/tcg-contract-unlocks-registry";
import { MenuElementManager2D } from "../../utilities/menu-group-2D.ui";
import { Color4 } from "@dcl/sdk/math";
import { Networking } from "./tcg-networking";
import { signedFetch } from "~system/SignedFetch";
import { LevelManager } from "../tcg-level-manager";
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
    var connectivityState:Networking.PLAYER_CONNECTIVITY_STATE = Networking.PLAYER_CONNECTIVITY_STATE.UNINITIALIZED;
    export function GetConnectivityState():Networking.PLAYER_CONNECTIVITY_STATE { return connectivityState; }

    /** local player's account type */
    var accountType:Networking.PLAYER_ACCOUNT_TYPE = Networking.PLAYER_ACCOUNT_TYPE.UNINITIALIZED;
    export function GetAccountType():Networking.PLAYER_ACCOUNT_TYPE { return accountType; }
    export function SetAccountType(value:Networking.PLAYER_ACCOUNT_TYPE) {
        //set value
        accountType = value;
        //update display
        uiTextLoginValue.TextValue = Networking.PLAYER_ACCOUNT_TYPE_STRINGS[accountType];
    }

    /** local player's web3 state */
    var isWeb3:boolean = false;
    export function IsWeb3():boolean { return isWeb3; }

    /** local player's uid */
    var userID:string;
    export function GetUserID():string { return userID; }

    /** local player's display name */
    var userName:string;
    export function GetUserName():string { return userName; }

    /** id of local player's current table */
    export var CurTableID:undefined|number = undefined;
    /** id of local player's current team */
    export var CurTeamID:undefined|number = undefined;

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
        PlayerDecks[3].AddCard(CARD_DATA_ID.TERRAIN_ELECTRIC);
        //  neutral deck
        for(let i:number=0; i<2; i++) { PlayerDecks[4].AddCard(CARD_DATA_ID.SPELL_VOIDBOLT); }
        for(let i:number=0; i<5; i++) { PlayerDecks[4].AddCard(CARD_DATA_ID.CHARACTER_VOID_GOLEM); }
        PlayerDecks[4].AddCard(CARD_DATA_ID.TERRAIN_VOID);
    }

    /** attempts to save the a player deck to the server */
    export async function SavePlayerDeckToServer(index:number) {
        try {
            //ensure scene is using server connection and player is logged in
            if(!Networking.PLAYER_CONNECTIVITY_STATE.CONNECTED || !IsWeb3() 
                || (GetAccountType() != Networking.PLAYER_ACCOUNT_TYPE.STANDARD && GetAccountType() != Networking.PLAYER_ACCOUNT_TYPE.ADMIN)) return;
            
            //prepare url
            const url:string = Networking.SERVER_URL+Networking.SERVER_API.DECK_SET;
            if(isDebugging) console.log(debugTag+"attempting to set player deck...");

            //attempt to get response
            let response = await signedFetch({ 
                url: url, 
                init: {
                    headers: { "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({
                        "playerID": userID,
                        "deckID": index,
                        "deckSerial": PlayerDecks[index].Serialize()
                    })
                }
            });

            //send response
            console.log("response: "+response.statusText);
        } catch(error) {
            console.log(error);
        }
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
        if(isDebugging) console.log(debugTag+"loading player data {connectivity="+Networking.PROFILE_CONNECTIVITY+"}...");
        //setup pve deck
        PopulateDeckPvE();

        //halt if this is not the first attempt (if connectivity fails, player will need to reload scene to start again)
        //TODO: add a reconnect button in-scene
        if(connectivityState != Networking.PLAYER_CONNECTIVITY_STATE.UNINITIALIZED) {
            if(isDebugging) console.log(debugTag+"player data has already been loaded!");
            return;
        }
        
        //update connectivity state
        connectivityState = Networking.PLAYER_CONNECTIVITY_STATE.CONNECTING;

        //attempt to get player's decentraland profile data
        let userData = await getUserData({});
        //halt if player has no decentraland profile data
        if(!userData || !userData.data) {
            if(isDebugging) console.log(debugTag+"failed to load player's decentraland profile data");
            connectivityState = Networking.PLAYER_CONNECTIVITY_STATE.FAILED;
            return;
        }
        
        //if player's public key is not found, player is not logged in using web3
        if(userData.data.publicKey) {
            if(isDebugging) console.log(debugTag+"player is a logged account (has web3 key)");
            SetAccountType(Networking.PLAYER_ACCOUNT_TYPE.STANDARD);
        } 
        //public key is found, player logged in through web3 wallet 
        else {
            if(isDebugging) console.log(debugTag+"player is a guest account (no web3 key)");
            SetAccountType(Networking.PLAYER_ACCOUNT_TYPE.GUEST);
        } 

        //populate user data
        isWeb3 = userData.data.hasConnectedWeb3;
        userID = userData.data.userId;
        userName = userData.data.displayName;

        //provide the player with default deck configuration
        PopulateDeckPlayer();
        //initialize leveling system (controls card provisions based from levels)
        LevelManager.Initialize(0);

        //attempt server interactions based on connectivity type
        //  if networking override or sandbox (test mode)
        if(Networking.DEBUG_OVERRIDE) {
            //spoof connectivity
            isWeb3 = true;
            SetAccountType(Networking.PLAYER_ACCOUNT_TYPE.ADMIN);
            //set demo credentials
            userID = "0x0DEMO";
            userName = "DEMO_USER";//+Math.round(Math.random()*10000);
            //attempt to load experience from the server
            await SyncExperienceFromServer();
        }
        //  if profile is server-based
        else if(Networking.PROFILE_CONNECTIVITY == Networking.PROFILE_CONNECTIVITY_TYPE.SERVER_STRICT 
            || Networking.PROFILE_CONNECTIVITY == Networking.PROFILE_CONNECTIVITY_TYPE.SERVER_LOAD
            || Networking.PROFILE_CONNECTIVITY == Networking.PROFILE_CONNECTIVITY_TYPE.SANDBOX) {

            //ensure player is connected with web3 (only real players can interact with the server)
            if(isWeb3) {
                const url:string = Networking.SERVER_URL+Networking.SERVER_API.PROFILE_GET+userID;
                if(isDebugging) console.log(debugTag+"attempting to get player account...\n\t"+url);

                //processing variable, used as flag to ensure we can complete the process of loading the player's account
                let fail:boolean = false;

                //attempt to get player's profile from server via url
                const playerProfile = await fetch(url);
                if(!playerProfile) {
                    if(isDebugging) console.log(debugTag+"<ERROR> failed to get player's account");
                    fail = true;
                }

                //attempt to convert url's data to json
                let playerProfileJSON = undefined;
                if(!fail) {
                    playerProfileJSON = await playerProfile.json();
                    if(!playerProfileJSON) {
                        if(isDebugging) console.log(debugTag+"<ERROR> failed to process fetch into json output");
                        fail = true;
                    }
                }

                //if recieved player profile, load player's account
                if(!fail && playerProfileJSON) {
                    if(isDebugging) console.log(debugTag+"successfully found player profile {experience="+playerProfileJSON["Experience"]+"}!");
                    //update player's account state
                    SetAccountType(Networking.PLAYER_ACCOUNT_TYPE.STANDARD);
                    
                    //load player's profile
                    //  experience
                    LevelManager.SetExperience(playerProfileJSON["Experience"]);
                    //  decks
                    for(let i:number=0; i<5; i++) {
                        //if a deck was found/previously saved, load deck
                        if(playerProfileJSON["Deck"+i] !== "") PlayerDecks[i].Deserial(playerProfileJSON["Deck"+i]);
                    }
                }
                //if no profile recieved, populate player's account with defaults
                else {
                    if(isDebugging) console.log(debugTag+"failed to find player profile, setting to guest");
                    //update player's account state
                    SetAccountType(Networking.PLAYER_ACCOUNT_TYPE.GUEST);
                }
            } 
            //if player is guest account
            else {
                if(isDebugging) console.log(debugTag+"failed to find player profile, setting to guest");
                //update player's account state
                SetAccountType(Networking.PLAYER_ACCOUNT_TYPE.GUEST);
            }
        }
        //  if profile is local guest
        else if(Networking.PROFILE_CONNECTIVITY == Networking.PROFILE_CONNECTIVITY_TYPE.GUEST) {
            //update player's account state
            SetAccountType(Networking.PLAYER_ACCOUNT_TYPE.GUEST);
        }

        //recalculate what cards the player owns/has access to based on contracts
        ContractUnlockRegistry.Instance.IsWeb3 = PlayerLocal.IsWeb3;
        ContractUnlockRegistry.Instance.GetUserID = PlayerLocal.GetUserID;
        await ContractUnlockRegistry.Instance.CalculateCardProvisionCounts();

        //update user name
        uiTextNameValue.TextValue = userName;

        //update the player's connectivity state
        connectivityState = Networking.PLAYER_CONNECTIVITY_STATE.CONNECTED;
        if(isDebugging) console.log(debugTag+"loaded player data!"+
            "\n\taccountType="+Networking.PLAYER_ACCOUNT_TYPE_STRINGS[accountType]+
            "\n\tisWeb3="+isWeb3+
            "\n\tuserID="+userID+
            "\n\tdisplayName="+userName
        );
    };

    export async function SyncExperienceFromServer() {
        try {
            const url:string = Networking.SERVER_URL+Networking.SERVER_API.EXPERIENCE_GET+userID;
            if(isDebugging) console.log(debugTag+"attempting to get player experience...\n\t"+url);

            //attempt to get player's profile from server via url
            const playerProfile = await fetch(url);
            if(!playerProfile) {
                if(isDebugging) console.log(debugTag+"<ERROR> failed to get player's experience");
                return;
            }

            //attempt to convert url's data to json
            let playerProfileJSON = await playerProfile.json();
            if(!playerProfileJSON) {
                if(isDebugging) console.log(debugTag+"<ERROR> failed to process fetch into json output");
                return;
            }

            //set experience value
            LevelManager.SetExperience(playerProfileJSON["Experience"]);
            if(isDebugging) console.log(debugTag+"successfully found player profile {experience="+playerProfileJSON["Experience"]+"}!");
        } catch(error) {
            console.log(error);
        }
    }

    //set up ui elements for player display
    //  parent container
    const uiParent = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pd");
    uiParent.PosTop = 2;
    uiParent.Width = 165; uiParent.Heigth = 90;
    uiParent.BackgroundColour = Color4.create(0.3, 0.3, 0.3, 1);
    //  parent background
    const uiParentBackground = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pdb", ["pd"]);
    uiParentBackground.PosTop = '2.5%';
    uiParentBackground.Width = '97.5%'; uiParentBackground.Heigth = '95%';
    uiParentBackground.BackgroundColour = Color4.create(0.45, 0.45, 0.45, 1);
    //  player name display
    //      display background
    const uiTextNameBackground = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-0-b", ["pd","pdb"]);
    uiTextNameBackground.PosTop = 5; uiTextNameBackground.PosLeft = 5;
    uiTextNameBackground.Width = 0; uiTextNameBackground.Heigth = 0;
    uiTextNameBackground.BackgroundColour = Color4.create(0.65, 0.0, 0.0, 1);
    uiTextNameBackground.PosType = 'absolute';
    //      ui text for player's name label
    const uiTextNameLabel = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-0-l", ["pd","pdb","pi-0-b"]);
    uiTextNameLabel.Width = 0; uiTextNameLabel.Heigth = 0;
    uiTextNameLabel.TextValue = "PLAYER:";
    uiTextNameLabel.TextAlign = "middle-left";
    //      ui text for player's name value
    const uiTextNameValue = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-0-v", ["pd","pdb","pi-0-b"]);
    uiTextNameValue.PosLeft = 50;
    uiTextNameValue.Width = 0; uiTextNameValue.Heigth = 0;
    uiTextNameValue.TextValue = "[PLAYER_NAME]";
    uiTextNameValue.TextAlign = "middle-left";
    //  login state display
    //      display background
    const uiTextLoginBackground = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-0-b", ["pd","pdb"]);
    uiTextLoginBackground.PosTop = 25; uiTextLoginBackground.PosLeft = 5;
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
    uiTextLoginValue.TextValue = Networking.PLAYER_ACCOUNT_TYPE_STRINGS[0];
    uiTextLoginValue.TextAlign = "middle-left";
    //  level display
    //      display background
    const uiTextLevelBackground = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-1-b", ["pd","pdb"]);
    uiTextLevelBackground.PosTop = 45; uiTextLevelBackground.PosLeft = 5;
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
    LevelManager.LevelText = uiTextLevelValue;
    uiTextLevelValue.PosLeft = 42;
    uiTextLevelValue.Width = 0; uiTextLevelValue.Heigth = 0;
    uiTextLevelValue.TextValue = "LOADING...";
    uiTextLevelValue.TextAlign = "middle-left";
    //  experience display
    //      display background
    const uiTextExperienceBackground = MenuElementManager2D.AddMenuObject(MenuElementManager2D.MENU_ELEMENT_TYPE.MENU_ENTITY, "pi-2-b", ["pd","pdb"]);
    uiTextExperienceBackground.PosTop = 65; uiTextExperienceBackground.PosLeft = 5;
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
    LevelManager.ExperienceText = uiTextExperienceValue;
    uiTextExperienceValue.PosLeft = 28;
    uiTextExperienceValue.Width = 0; uiTextExperienceValue.Heigth = 0;
    uiTextExperienceValue.TextValue = "LOADING...";
    uiTextExperienceValue.TextAlign = "middle-left";
}