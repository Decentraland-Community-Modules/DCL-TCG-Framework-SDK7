import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import Dictionary, { List } from "../utilities/collections";
import { Billboard, ColliderLayer, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PointerEventType, PointerEvents, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { TableTeam } from "./tcg-table-team";
import { CardSubjectObject } from "./tcg-card-subject-object";
import { PlayerLocal } from "./config/tcg-player-local";
import { PlayCardDeck } from "./tcg-play-card-deck";
import { CARD_TARGETING_OWNER, CARD_TARGETING_TYPE, CARD_TYPE, CardData } from "./data/tcg-card-data";
import { PlayCard } from "./tcg-play-card";
import { TABLE_GAME_STATE, TABLE_TEAM_TYPE, TABLE_TURN_TYPE } from "./config/tcg-config";
import { Networking } from "./config/tcg-networking";
import * as utils from '@dcl-sdk/utils';
import { signedFetch } from "~system/SignedFetch";
import { STATUS_EFFECT_AFFINITY } from "./data/tcg-status-effect-data";


/*      TRADING CARD GAME - CARD TABLE
    used to define the current state of tcg table. tables contain
    2 players, a deck, a discard, and several card slots (in-hand & on-field).
    the state of the table is synced between the current player via the current
    network settings and propigated to other players in-scene via peer-to-peer to
    save on resources.
    
    the first player in the registered pair that connected to the table before the game
    started is marked as the 'authorized source' for that table during a peer-to-peer
    session, handling all the game's checks and syncing.

    players will not be synced to a board when they first joing the scene, instead an 
    sync request is sent when to the board when they first approach it, subscribing to
    stay updated on that board's state. when that local player moves away from the board
    the game stops syncing for them. this is meant as a handler for scenes that may have
    many card tables in-play in a single instance. this mechanism can be customized, but
    be careful not to sync too many card tables at one time, as it can cause players to lag
    or waste scene resources on irrelevent games.

    all players in the scene have copies of the decks/players registered to the table, but the table 
    owner is treated as the authority for the main factors of the table (ex: what cards are drawn). this
    lets us skip some sync details for the audience (ex: when a card is drawn the audience does not need to 
    know what that card is, they only need updates to the deck/hand/discard counts).

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module Table {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Table: ";

    /** model location for this team's boarder*/
    const MODEL_DEFAULT_BORDER:string = 'models/tcg-framework/card-table/card-table-arena.glb';

    /** number of cards players start */
    const STARTING_CARD_COUNT:number = 3;

    /** scale for parental view toggles */
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };
    
    /** position for card field team objects */
    const FIELD_TEAM_OFFSET:Vector3[] = [
        { x:0, y:0, z:0 },
        { x:0, y:0, z:0 }
    ];
    /** rotation for card field team objects */
    const FIELD_TEAM_ROTATION:Vector3[] = [
        { x:0, y:90, z:0 },
        { x:0, y:270, z:0 }
    ];
    
    /** transform - lobby parent (join, leave, state) */
    const LOBBY_OFFSET:Vector3 = { x:0, y:8, z:0 };

    /** indexing key */
    export function GetKeyFromData(data:TableCreationData):string { return data.tableID.toString(); };
    /** table state callback */
    export function CallbackGetTableState(key:string):TABLE_GAME_STATE {
        const table = Table.GetByKey(key);
        if(table != undefined) return table.CurState;
        else return TABLE_GAME_STATE.IDLE;
    }

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<TableObject> = new List<TableObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<TableObject> = new List<TableObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<TableObject> = new List<TableObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<TableObject> = new Dictionary<TableObject>();
    
    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|TableObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }

    /** location of selected card */
    enum CARD_SELECTION_LOCATION {
        HAND_SLOT,
        FIELD_SLOT,
        TERRAIN_SLOT,
    }

    /** type of selected slot */
    enum SLOT_SELECTION_TYPE {
        //team selected
        TEAM = -1,
        //slot selected
        SLOT_0 = 0,
        SLOT_1 = 1,
        SLOT_2 = 2,
        SLOT_3 = 3,
        SLOT_4 = 4,
    }

    /** defines a target that has been selected on the table */
    interface TableSelectionTarget {
        team:number;
        id:SLOT_SELECTION_TYPE;
    }

    /** represents a table, packed to be passed over the network */
    interface TableSerialData {
        id:number;
        //owner of table
        owner:string;
        //game state of table
        state:number;
        //current turn
        turn:number;
        round:number;
        //current state of teams registered to table
        teams:TableTeam.TeamSerialData[];
    }

	/** object interface used to define all data required to create a team */
	export interface TableCreationData {
        //indexing
        tableID:number;
        //
        networkingType:Networking.TABLE_CONNECTIVITY_TYPE;
        //type
        teamTypes:[TABLE_TEAM_TYPE, TABLE_TEAM_TYPE];
        //position
        parent:undefined|Entity, //entity to parent object under 
		position: { x:number; y:number; z:number; }; //new position for object
		rotation: { x:number; y:number; z:number; }; //new rotation for object
	}

    /** represents a team on a card field */
    export class TableObject {
        /** when true this object is reserved in-scene */
        private isActive:boolean = true;
        public get IsActive():boolean { return this.isActive; };
        
        /** when true this object has been fully initialized, usually locked when sync is in-progress */
        private isInitialized:boolean = false;
        public get IsInitialized():boolean { return this.isInitialized; };

        /** networking type */
        private networkingType:Networking.TABLE_CONNECTIVITY_TYPE = Networking.TABLE_CONNECTIVITY_TYPE.LOCAL;
        public get NetworkingType():Networking.TABLE_CONNECTIVITY_TYPE { return this.networkingType; };

        /** represents the unique index of this slot's table, req for networking */
        private tableID:number = -1;
        public get TableID():string { return this.tableID.toString(); };

        /** id of the currently slotted card playdata */
        private slottedCard:undefined|string = undefined;
        public get SlottedCard():undefined|string { return this.slottedCard; }

        /** current game state of the table */
        private curState:TABLE_GAME_STATE = TABLE_GAME_STATE.IDLE;
        public get CurState():TABLE_GAME_STATE { return this.curState; };

        /** sets the lobby display state */
        public SetGameState(state:TABLE_GAME_STATE) {
            //clear turn display
            const textTurn = TextShape.getMutable(this.entityLobbyTurn);
            textTurn.text = "";
            //set state
            this.curState = state;
            const textShape = TextShape.getMutable(this.entityLobbyState);
            switch(state) {
                case TABLE_GAME_STATE.IDLE:
                    //update text
                    textShape.text = "JOIN TO PLAY";
                    //hide team displays
                    this.entityStateDisplays[0].SetState(false);
                    this.entityStateDisplays[1].SetState(false);
                break;
                case TABLE_GAME_STATE.ACTIVE:
                    //update text
                    textShape.text = "IN SESSION";
                    textTurn.text = this.teamObjects[this.curTurn].RegisteredPlayerName +"'S TURN (ROUND: "+this.curRound+")";
                    //show team displays
                    this.entityStateDisplays[0].SetState(true);
                    this.entityStateDisplays[1].SetState(true);
                break;
                case TABLE_GAME_STATE.OVER:
                    //update text
                    textShape.text = "GAME OVER";
                    //show team displays
                    this.entityStateDisplays[0].SetState(true);
                    this.entityStateDisplays[1].SetState(true);
                break;
            }
            if(isDebugging) console.log(debugTag+"table="+this.TableID+" state set to state="+state);
        }

        /** table owner */
        private tableOwnerID:string = "";
        public get TableOwnerID():string { return this.tableOwnerID; }

        /** current player's turn */
        private curTurn:number = -1;
        public get CurTurn():number { return this.curTurn; };
        private curRound:number = -1;
        public get CurRound():number { return this.curRound; };

        /** returns true if the given team is friendly to the current team (mainly here for 2v2/teams expansion) */
        public IsTeamFriendly(team:number):boolean {
            if(team == this.curTurn) return true;
            else return false;
        }

        //## CARD SELECTION
        /** currently selected card's playdata */
        private selectedCard:undefined|PlayCard.PlayCardDataObject;
        /** currently selected card's location */
        private selectedCardLocation:undefined|CARD_SELECTION_LOCATION

        //## CARD TARGETING
        /** targeting filter, allowed owners */
        private targetingOwner:undefined|CARD_TARGETING_OWNER;
        /** targeting filter, allowed type*/
        private targetingType:undefined|CARD_TARGETING_TYPE;
        /** targeting filter, number of targets */
        private targetingCount:number = 0;
        /** currently selected targets */
        private selectionTargets:TableSelectionTarget[] = [];
        public get SelectionTargets():TableSelectionTarget[] { return this.selectionTargets; } 

        /** parental position */
        private entityParent:Entity;

        //## LOBBY OBJECTS
        /** lobby parent/pivot */
        private entityLobbyParent:Entity;
        /** display object, showing current state of the table */
        private entityLobbyState:Entity;
        /** display object, showing current players */
        private entityLobbyPlayers:Entity;
        /** display object, showing current turn state */
        private entityLobbyTurn:Entity;

        //state display objects
        private entityStateDisplays:TableTeam.TeamDisplayObject[];

        //object used for displaying spells (trying this out for now, might need a new system if we need to show more than 1 spell)
        private spellViewObj:CardSubjectObject.CardSubjectObject = CardSubjectObject.Create({
            key:"spv-"+this.TableID,
            //targeting
            type: CARD_TYPE.SPELL,
            model: CardData[0].objPath,
            //position
            parent: undefined, 
            position: { x:0, y:0, z:0 },
            scale: { x:0, y:0, z:0 },
            rotation: { x:0, y:0, z:0 }
        });
        
        //pve npc enemy entity
        private characterNPC:undefined|CardSubjectObject.CardSubjectObject;

        /** all team objects */
        public teamObjects:TableTeam.TableTeamObject[] = [];

        /** returns the table's player state string */
        public GetPlayerString():string {
            //TODO: fix for 2v2
            var str:string = "";
            //team 0
            if(this.teamObjects[0].RegisteredPlayerID) str += this.teamObjects[0].RegisteredPlayerName;
            else str += "<WAITING>";
            str += " VS ";
            //team 1
            if(this.teamObjects[1].RegisteredPlayerID) str += this.teamObjects[1].RegisteredPlayerName;
            else str += "<WAITING>";
        
            return str;
        }
        /** updates the table's player state display */
        public UpdatePlayerDisplay() {
            TextShape.getMutable(this.entityLobbyPlayers).text = this.GetPlayerString();
        }

        /** redraws team display objects */
        public RedrawTeamDisplays() {
            for(let i:number=0; i<this.teamObjects.length; i++) {
                //update team view
                this.entityStateDisplays[i].UpdateView(this.teamObjects[i]);
            }
        }

        /** repositions team display objects */
        public RepositionTeamDisplays() {
            //set team display object states
            //  player belongs to team 1
            if(this.teamObjects[0].RegisteredPlayerID == PlayerLocal.GetUserName()) {
                //hand displays
                this.teamObjects[0].SetHandState(true);
                this.teamObjects[1].SetHandState(false);
                //team displays
                this.entityStateDisplays[0].SetState(true);
                this.entityStateDisplays[0].ResetView(this.teamObjects[0]);
                this.entityStateDisplays[0].SetPosition({x:5, y:2.5, z:-2.75});
                this.entityStateDisplays[0].SetRotation({x:0,y:200,z:0});
                this.entityStateDisplays[1].SetState(true);
                this.entityStateDisplays[1].ResetView(this.teamObjects[1]);
                this.entityStateDisplays[1].SetPosition({x:5, y:2.5, z:2.75});
                this.entityStateDisplays[1].SetRotation({x:0,y:340,z:0});
            }
            //  player belongs to team 2
            else if(this.teamObjects[1].RegisteredPlayerID == PlayerLocal.GetUserName()) {
                //hand displays
                this.teamObjects[1].SetHandState(true);
                this.teamObjects[0].SetHandState(false);
                //team displays
                this.entityStateDisplays[0].SetState(true);
                this.entityStateDisplays[0].SetPosition({x:-5, y:2.5, z:2.75});
                this.entityStateDisplays[0].SetRotation({x:0,y:20,z:0});
                this.entityStateDisplays[1].SetState(true);
                this.entityStateDisplays[1].SetPosition({x:-5, y:2.5, z:-2.75});
                this.entityStateDisplays[1].SetRotation({x:0,y:160,z:0});

            }
            //  player belongs to no team
            else {
                //hand displays
                this.teamObjects[1].SetHandState(false);
                this.teamObjects[0].SetHandState(false);
                //team displays
                this.entityStateDisplays[0].SetState(false);
                this.entityStateDisplays[1].SetState(false);
            }
        }

        /** prepares field team for use */
        constructor() {
            //create parental object
            this.entityParent = engine.addEntity();
            Transform.create(this.entityParent, {
                parent: this.entityParent,
                scale: PARENT_SCALE_ON,
            });
            //  add model
            GltfContainer.create(this.entityParent, {
                src: MODEL_DEFAULT_BORDER,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });

            //lobby objects
            //  parent object
            this.entityLobbyParent = engine.addEntity();
            Transform.create(this.entityLobbyParent, {
                parent: this.entityParent,
                position: LOBBY_OFFSET,
            });
            Billboard.create(this.entityLobbyParent);
            //  lobby state text
            this.entityLobbyState = engine.addEntity();
            Transform.create(this.entityLobbyState, {
                parent: this.entityLobbyParent,
                position: {x:0,y:0.75,z:0},
                scale: {x:0.5,y:0.5,z:0.5},
            });
            var textShape = TextShape.create(this.entityLobbyState);
            textShape.outlineColor = Color4.Black();
            textShape.outlineWidth = 0.1;
            textShape.fontSize = 16;
            textShape.text = "<GAME-STATE>";
            //  lobby player text
            this.entityLobbyPlayers = engine.addEntity();
            Transform.create(this.entityLobbyPlayers, {
                parent: this.entityLobbyParent,
                position: {x:0,y:0,z:0},
                scale: {x:0.5,y:0.5,z:0.5},
            });
            textShape = TextShape.create(this.entityLobbyPlayers);
            textShape.outlineColor = Color4.Black();
            textShape.outlineWidth = 0.1;
            textShape.fontSize = 8;
            textShape.text = "<UNDEFINED> VS <UNDEFINED>";
            //  lobby turn state text
            this.entityLobbyTurn = engine.addEntity();
            Transform.create(this.entityLobbyTurn, {
                parent: this.entityLobbyParent,
                position: {x:0,y:-0.55,z:0},
                scale: {x:0.45,y:0.45,z:0.45},
            });
            textShape = TextShape.create(this.entityLobbyTurn);
            textShape.outlineColor = Color4.Black();
            textShape.outlineWidth = 0.1;
            textShape.fontSize = 8;
            textShape.text = "<UNDEFINED>'S TURN (ROUND ##)";

            //create and set position for team displays
            this.entityStateDisplays = [];
            for(let i:number=0; i<2; i++) {
                this.entityStateDisplays.push(new TableTeam.TeamDisplayObject(this.entityParent));
            }
        }

        /** prepares the card slot for use by a table team */
        public Initialize(data:TableCreationData) {
            this.isActive = true;
            this.isInitialized = false;
            this.networkingType = data.networkingType;
            //indexing
            this.tableID = data.tableID;
            //processing
            this.curTurn = -1;
            this.curRound = -1;
            //card selections
            this.selectedCard = undefined;
            this.selectedCardLocation = undefined;
            //selection target
            this.selectionTargets = [];
            //transform
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.parent = data.parent;
            transformParent.position = data.position;
            transformParent.scale = PARENT_SCALE_ON;
            transformParent.rotation = Quaternion.fromEulerDegrees(data.rotation.x, data.rotation.y, data.rotation.z);
        
            //clear previous team objects
            while(this.teamObjects.length > 0) {
                const teamObject = this.teamObjects.pop();
                if(teamObject) teamObject.Disable();
            }
            
            //create team objects
            for(let i:number=0; i<2; i++) {
                const teamObject:TableTeam.TableTeamObject = TableTeam.Create({
                    tableID: this.tableID,
                    teamID: i,
                    callbackTable: CallbackGetTableState,
                    parent: this.entityParent,
                    position: FIELD_TEAM_OFFSET[i],
                    rotation: FIELD_TEAM_ROTATION[i]
                });
                this.teamObjects.push(teamObject);

                //if table is a PvE table, set ai 
                if(data.teamTypes[i] == TABLE_TEAM_TYPE.AI) {
                    //(DEMO ONLY)add NPC for combat
                    this.characterNPC = CardSubjectObject.Create({
                        key: 'npc-'+this.TableID,
                        type: CARD_TYPE.CHARACTER,
                        model: "models/tcg-framework/card-characters/pve-golemancer.glb",
                        forceRepeat: true,
                        parent: this.entityParent, 
                        position: { x:-6.5, y:1.75, z:0 },
                        scale: { x:2, y:2, z:2 },
                        rotation: { x:0, y:90, z:0 }
                    });
                    this.characterNPC.SetAnimation(CardSubjectObject.ANIM_KEY_CHARACTER.IDLE);
                    this.characterNPC.SetAnimationSpeed(CardSubjectObject.ANIM_KEY_CHARACTER.IDLE, 0.2);

                    this.teamObjects[i].RegisteredPlayerID = "[PVE]";
                    this.teamObjects[i].RegisteredPlayerName = "Golemancer (lvl 1)";
                    this.teamObjects[i].TeamType = TABLE_TEAM_TYPE.AI;
                    this.teamObjects[i].DeckRegistered = PlayerLocal.DeckPVE;
                }
            }

            //create spell display object
            this.spellViewObj = CardSubjectObject.Create({
                key:"spv-"+this.TableID,
                //targeting
                type: CARD_TYPE.SPELL,
                model: CardData[0].objPath,
                //position
                parent: undefined, 
                position: { x:0, y:0, z:0 },
                scale: { x:0, y:0, z:0 },
                rotation: { x:0, y:0, z:0 }
            });
            
            //set default lobby state
            this.SetGameState(TABLE_GAME_STATE.IDLE);
            this.UpdatePlayerDisplay();
            //update team buttons
            for(let i:number=0; i<this.teamObjects.length; i++) {
                this.teamObjects[i].UpdateButtonStates();
            }
        }

        //## ADD PLAYER TO TABLE
        public EmitAddPlayerToTeam:(table:string, team:number, playerID:string, playerName:string) => void = this.RemoteAddPlayerToTeam;
        /** local call from interaction made to all connected players, to add a player to this table */
        public LocalAddPlayerToTeam(team:number, playerID:string, playerName:string) {
            if(isDebugging) console.log(debugTag+"<LOCAL> adding playerID="+playerID+" playerName="+playerName+" to team="+team+"...");

            //halt if local player already belongs to a table 
            /*if(PlayerLocal.CurTableID != undefined && PlayerLocal.CurTeamID != undefined) {
                if(isDebugging) console.log(debugTag+"<LOCAL> player is already registered to table="+PlayerLocal.CurTableID+" to team="+PlayerLocal.CurTeamID);
                return;
            }*/

            //halt if team slot is already occupied by another player
            if(this.teamObjects[team].RegisteredPlayerID != undefined) {
                if(isDebugging) console.log(debugTag+"<LOCAL> team is already occupied by player, playerID="+this.teamObjects[team].RegisteredPlayerID
                    +", playerName="+this.teamObjects[team].RegisteredPlayerName);
                return;
            }

            //halt if table is not in the idle state
            if(this.curState != TABLE_GAME_STATE.IDLE) {
                if(isDebugging) console.log(debugTag+"<LOCAL> table is not in idle state, curState="+this.curState);
                return;
            }

            //send networking call
            this.EmitAddPlayerToTeam(this.TableID, team, playerID, playerName);
        }
        /** remote call from a connected player, to add a player to this table */
        public RemoteAddPlayerToTeam(table:string, team:number, playerID:string, playerName:string) {
            if(isDebugging) console.log(debugTag+"<REMOTE> adding playerID="+playerID+" playerName="+playerName+" to team="+team+"...");
            
            //if both teams are unoccupied, give processing ownership to newly registered player
            if((this.teamObjects[0].RegisteredPlayerID == undefined || this.teamObjects[0].TeamType == TABLE_TEAM_TYPE.AI) && 
                (this.teamObjects[1].RegisteredPlayerID == undefined || this.teamObjects[1].TeamType == TABLE_TEAM_TYPE.AI)) {
                if(isDebugging) console.log(debugTag+"<REMOTE> setting owner for table="+this.TableID+" to playerID="+playerID);
                this.tableOwnerID = playerID;
            }

            //add player to team
            this.teamObjects[team].RegisteredPlayerID = playerID;
            this.teamObjects[team].RegisteredPlayerName = playerName;
            
            //if player is local player
            if(PlayerLocal.GetUserID() == playerID) {
                //link this table to local player's data
                PlayerLocal.CurTableID = this.tableID;
                PlayerLocal.CurTeamID = team;
            } 

            //update team display object's position
            this.RepositionTeamDisplays();
            //update team's buttons
            this.teamObjects[team].UpdateButtonStates();
            //update players tied to table
            this.UpdatePlayerDisplay();
            if(isDebugging) console.log(debugTag+"<REMOTE> added player="+this.teamObjects[team].RegisteredPlayerID+" to team="+team+"!");
        }

        //## REMOVE PLAYER FROM TABLE
        public EmitRemovePlayerFromTeam:(table:string, team:number) => void = this.RemoteRemovePlayerFromTeam;
        /** local call from interaction made to all connected players, removes a player from the game */
        public LocalRemovePlayerFromTeam(team:number) {
            if(isDebugging) console.log(debugTag+"<LOCAL> removing player from team="+team+"...");
            
            //halt if targeted team slot is not occupied by the local player
            if(this.teamObjects[team].RegisteredPlayerID != PlayerLocal.GetUserID()) {
                if(isDebugging) console.log(debugTag+"<LOCAL> team is not occupied by local player, playerID="+this.teamObjects[team].RegisteredPlayerID
                    +", playerName="+this.teamObjects[team].RegisteredPlayerName);
                return;
            }

            //halt if table is not in the idle state
            if(this.curState != TABLE_GAME_STATE.IDLE) {
                if(isDebugging) console.log(debugTag+"<LOCAL> table is not in idle state, curState="+this.curState);
                return;
            }

            //send networking call
            this.EmitRemovePlayerFromTeam(this.TableID, team);
        }
        /**remote call from a connected player, removes a player from the game */
        public RemoteRemovePlayerFromTeam(table:string, team:number) {
            if(isDebugging) console.log(debugTag+"<REMOTE> removing player from team="+team+"...");

            //if player is local player
            if(this.teamObjects[team].RegisteredPlayerID == PlayerLocal.GetUserID()) {
                //unlink table from local player
                PlayerLocal.CurTableID = undefined;
                PlayerLocal.CurTeamID = undefined;
                //hide team display object states
                this.teamObjects[team].SetHandState(false);
                this.entityStateDisplays[0].SetState(false);
                this.entityStateDisplays[1].SetState(false);
            }

            //remove player from team
            this.teamObjects[team].RegisteredPlayerID = undefined;
            //reset team's ready state
            this.teamObjects[team].ReadyState = false;

            //clear deck
            const deck = this.teamObjects[team].DeckRegistered;
            if(deck) {
                deck.Clean();
                console.log("<ERROR>: table="+this.tableID+", team="+team+" does not have a valid deck, likely mismanaged table states");
            }

            //update players tied to table
            this.UpdatePlayerDisplay();
            //update team buttons
            this.teamObjects[team].UpdateButtonStates();
            if(isDebugging) console.log(debugTag+"<REMOTE> removed player from team="+team+"!");
        }

        //## SET READY STATE OF TEAM ON TABLE
        public EmitSetPlayerReadyState:(table:string, team:number, state:boolean, deckSerial:string) => void = this.RemoteSetPlayerReadyState;
        /** local call from interaction made to all connected players, sets the given team's ready state 
         *      when a player sets their ready state to true their deck is passed to the table
        */
        public LocalSetPlayerReadyState(team:number, state:boolean) {
            if(isDebugging) console.log(debugTag+"<LOCAL> setting ready state table="+this.TableID+" team="+team+" to "+state+"...");
            
            //halt if targeted team slot is not occupied by the local player
            if(this.teamObjects[team].RegisteredPlayerID != PlayerLocal.GetUserID()) {
                if(isDebugging) console.log(debugTag+"<LOCAL> team is not occupied by local player, playerID="+this.teamObjects[team].RegisteredPlayerID
                    +", playerName="+this.teamObjects[team].RegisteredPlayerName);
                return;
            }

            //halt if table is not in the idle state
            if(this.curState != TABLE_GAME_STATE.IDLE) {
                if(isDebugging) console.log(debugTag+"<LOCAL> table is not in idle state, curState="+this.curState);
                return;
            }
            
            //if player is readying, send deck for master~
            var serial = "";
            if(state) serial = PlayerLocal.GetPlayerDeck().Serialize();

            //send networking call
            this.EmitSetPlayerReadyState(this.TableID, team, state, serial);
        }
        /** remote call from a connected player, sets the given team's ready state */
        public RemoteSetPlayerReadyState(table:string, team:number, state:boolean, deckSerial:string) {
            if(isDebugging) console.log(debugTag+"<REMOTE> setting ready state table="+this.TableID+" team="+team+" to "+state+"...");
            
            //update team's state
            this.teamObjects[team].ReadyState = state;
            this.teamObjects[team].UpdateButtonStates();

            //deserialize team's deck (if team is de-readying, deck will be cleared)
            const deck = this.teamObjects[team].DeckRegistered;
            if(!deck) {
                console.log("<ERROR>: table="+this.tableID+", team="+team+" does not have a valid deck, likely mismanaged table states");
                return;
            }
            deck.Deserial(deckSerial);

            //if local player is table owner
            if(this.TableOwnerID == PlayerLocal.GetUserID()) {
                //if both of player are ready, start game
                for(let i:number=0; i<this.teamObjects.length; i++) {
                    if(!this.teamObjects[i].ReadyState) return;
                }
                this.LocalStartGame();
            }
            if(isDebugging) console.log(debugTag+"<REMOTE> set ready state table="+this.TableID+" team="+team+" to "+state+"!");
        }

        //## START GAME
        public EmitStartGame:(table:string) => void = this.RemoteStartGame;
        /** local call from interaction made to all connected players, starts game */
        public LocalStartGame() {
            if(isDebugging) console.log(debugTag+"<LOCAL> starting game on table="+this.TableID+"...");

            //halt if local player is not the table owner
            if(this.TableOwnerID != PlayerLocal.GetUserID()) {
                if(isDebugging) console.log(debugTag+"<LOCAL> local playerID="+PlayerLocal.GetUserID()+" is not tableOwnerID="+this.tableOwnerID);
                return;
            }

            //send networking call
            this.EmitStartGame(this.TableID);
        }
        /** remote call from a connected player, starts game */
        public RemoteStartGame(table:string) {
            if(isDebugging) console.log(debugTag+"<REMOTE> starting game on table="+this.TableID+"...");

            //set entry table state
            this.curTurn = this.teamObjects.length-1;
            this.curRound = 0;
            //set lobby state
            this.SetGameState(TABLE_GAME_STATE.ACTIVE);

            //process each team
            for(let i:number=0; i<this.teamObjects.length; i++) {
                //reset team
                this.teamObjects[i].Reset();
                
                //provide teams with initial hand cards
                for(let j:number=0; j<STARTING_CARD_COUNT; j++) {
                    this.teamObjects[i].DrawCard();
                }
            }

            //if player is table owner
            if(PlayerLocal.GetUserName() == this.TableOwnerID) {
                //start next turn
                this.LocalNextTurn();
            }

            if(isDebugging) console.log(debugTag+"<REMOTE> started game on table="+this.TableID+", curState="+this.CurState+"!");
        }
        
        //## END GAME
        public EmitEndGame:(table:string, defeated:number) => void = this.RemoteEndGame;
        /** local call from interaction made to all connected players, ends the game */
        public LocalEndGame(defeated:number) {
            if(isDebugging) console.log(debugTag+"<LOCAL> ending game on table="+this.TableID+"...");

            //ensure local player is current turn owner
            if(PlayerLocal.GetUserName() != this.TableOwnerID) return;
            
            //send networking call
            this.EmitEndGame(this.TableID, defeated);
        }
        /** local call from interaction made to all connected players, forfeits the game making the local player lose */
        public LocalForfeitGame() {
            if(isDebugging) console.log(debugTag+"<LOCAL> ending game on table="+this.TableID+"...");

            //ensure local player is current turn owner
            if(PlayerLocal.GetUserName() != this.teamObjects[this.curTurn].RegisteredPlayerID) return;
            
            //send networking call
            this.EmitEndGame(this.TableID, this.curTurn);
        }
        /** remote call from a connected player, ends the game with the given loser */
        public RemoteEndGame(table:string, defeated:number) {
            if(isDebugging) console.log(debugTag+"<REMOTE> ending game on table="+this.TableID+", loserTeam="+defeated+"...");

            //set game state
            this.SetGameState(TABLE_GAME_STATE.IDLE);

            //force any players out of teams
            for(let i:number = 0; i<this.teamObjects.length; i++) {
                if(this.teamObjects[i].TeamType != TABLE_TEAM_TYPE.AI) {
                    this.RemoteRemovePlayerFromTeam(this.TableID, i);
                    this.teamObjects[i].ReleaseCards();
                }
            }

            //update display text
            if(defeated == 0) TextShape.getMutable(this.entityLobbyPlayers).text = this.teamObjects[1].RegisteredPlayerID + " WAS VICTORIOUS!";
            if(defeated == 1) TextShape.getMutable(this.entityLobbyPlayers).text = this.teamObjects[0].RegisteredPlayerID + " WAS VICTORIOUS!";

            //update team buttons
            this.teamObjects[0].UpdateButtonStates();
            this.teamObjects[1].UpdateButtonStates();
        }

        //## STARTS NEXT TURN
        //NOTE: all players in scene manage decks tied to a table (draws, energy, etc.) for display
        // peer-to-peer: card authority lies with the team's owner
        // server: card authority lies with server
        //TODO: server authority -> server call will define what card is drawn, create call for drawning specific card
        public EmitNextTurn:(table:string) => void = this.RemoteNextTurn;
        /** local call from interaction made to all connected players, begins the next turn  */
        public LocalNextTurn() {
            if(isDebugging) console.log(debugTag+"<LOCAL> table="+this.TableID+" starting new turn...");

            //send networking call
            this.EmitNextTurn(this.TableID);
        }
        /** remote call from a connected player, begins the next turn */
        public RemoteNextTurn(table:string) {
            if(isDebugging) console.log(debugTag+"<REMOTE> table="+this.TableID+" starting new turn...");
            //process previous team's turn end
            if(this.CurRound != 0) this.teamObjects[this.curTurn].TurnEnd();
            
            //push to next player's turn
            this.teamObjects[this.curTurn].TurnState = TABLE_TURN_TYPE.INACTIVE;
            this.curTurn++;
            if(this.curTurn >= this.teamObjects.length) {
                this.curTurn = 0;
                this.curRound++;
            }
            this.teamObjects[this.curTurn].TurnState = TABLE_TURN_TYPE.ACTIVE;

            //process current team's turn start
            this.teamObjects[this.curTurn].TurnStart();

            //update team displays
            this.RedrawTeamDisplays();
            //update turn display
            TextShape.getMutable(this.entityLobbyTurn).text = this.teamObjects[this.curTurn].RegisteredPlayerID +"'S TURN (ROUND: "+this.curRound+")";

            //if table owner and ai's turn, start processing
            if(PlayerLocal.GetUserName() == this.TableOwnerID && this.teamObjects[this.curTurn].TeamType == TABLE_TEAM_TYPE.AI) {
                SetAIState(true, this);
            }

            //remove all selections
            this.DeselectAllTargets();

            //update team buttons
            this.teamObjects[0].UpdateButtonStates();
            this.teamObjects[1].UpdateButtonStates();
            if(isDebugging) console.log(debugTag+"<REMOTE> table="+this.TableID+" started new turn="+this.curTurn+", round="+this.curRound+"!");
        }
        
        //## INTERACTIONS - TEAMS
        /** called when a team is selected */
        public InteractionTeamSelection(team:number, aiPVE:boolean=false) {
            if(isDebugging) console.log(debugTag+"local player interacted with team="+team);
            
            //halt if game is not in-session 
            if(this.curState != TABLE_GAME_STATE.ACTIVE) {
                if(isDebugging) console.log(debugTag+"<FAILED> game is not in session");
                return;
            }

            //targeting filter checks
            //  type
            if(this.targetingType != CARD_TARGETING_TYPE.ANY && this.targetingType != CARD_TARGETING_TYPE.TEAM_PLAYER)  {
                if(isDebugging) console.log(debugTag+"<FAILED> wrong filter mode, type="+this.targetingType);
                return;
            }
            //  owner
            switch(this.targetingOwner) {
                //target must be ally
                case CARD_TARGETING_OWNER.ALLY:
                    //ensure targeted team belongs to current team
                    if(this.CurTurn != team)  {
                        if(isDebugging) console.log(debugTag+"<FAILED> wrong filter mode, owner="+this.targetingOwner);
                        return;
                    }
                break;
                //target must be enemy
                case CARD_TARGETING_OWNER.ENEMY:
                    //ensure targeted team belongs to other team
                    if(this.CurTurn == team)  {
                        if(isDebugging) console.log(debugTag+"<FAILED> wrong filter mode, owner="+this.targetingOwner);
                        return;
                    }
                break;
            }

            //if team is already selected, deselect targets
            if(this.selectionTargets.length >= 2 && this.selectionTargets[1].id == SLOT_SELECTION_TYPE.TEAM) {
                this.DeselectAllTargets();
                if(isDebugging) console.log(debugTag+"team was already selected, deselected team="+team+"!");
            }
            //else select team
            else {
                this.selectionTargets.push({team:team,id:SLOT_SELECTION_TYPE.TEAM})
                this.teamObjects[team].SetTeamTargetState(true);
                if(isDebugging) console.log(debugTag+"team was already selected, deselected team="+team+"!");
            }
        }

        //## INTERACTIONS - HAND CARDS
        /** called when a selection attempt is made by the player */
        public InteractionCardSelection(team:number, cardID:string, aiPVE:boolean=false) {
            if(isDebugging) console.log(debugTag+"local player interacted with card="+cardID);
            
            //halt if game is not in-session 
            if(this.curState != TABLE_GAME_STATE.ACTIVE) {
                if(isDebugging) console.log(debugTag+"<FAILED> game is not in session");
                return;
            }
            //halt if local player is not the current team owner and not an ai
            if(PlayerLocal.GetUserName() != this.teamObjects[this.curTurn].RegisteredPlayerID && !aiPVE) {
                if(isDebugging) console.log(debugTag+"<FAILED> current team is not owned by local player, non-ai command");
                return;
            }

            //if no card is selected
            if(this.selectedCard == undefined) {
                this.SelectCard(cardID);
            }
            //if a card is already selected
            else {
                //if selected card is the same as given card
                if(this.selectedCard.Key === cardID) {
                    this.DeselectCard();
                } 
                //if selected card is not the same as given card
                else {
                    this.DeselectCard();
                    this.SelectCard(cardID);
                }
            }
        }

        /** selects a card from the player's hand */
        public SelectCard(key:string) {
            if(isDebugging) console.log(debugTag+"selecting card="+key+"...");

            //ensure card exists
            const card = PlayCard.GetByKey(key);
            if(card == undefined) {
                if(isDebugging) console.log(debugTag+"<FAILED> could not find card data (key="+key+")");
                return;
            }

            //set key
            this.selectedCard = card;
            this.selectedCardLocation = CARD_SELECTION_LOCATION.HAND_SLOT;
            //update hand display
            this.teamObjects[this.curTurn].UpdateCardObjectDisplay(key);
            
            //set filtering based on card type
            switch(card.DefData.cardAttributes.type) {
                //spells -> load specific settings
                case CARD_TYPE.SPELL:
                    this.targetingCount = card.DefData.cardAttributes.targetCount??1;
                    this.targetingOwner = card.DefData.cardAttributes.targetOwner;
                    this.targetingType = card.DefData.cardAttributes.targetType; 
                break;
                //characters -> only allow friendly unoccupied slot
                case CARD_TYPE.CHARACTER:
                    this.targetingCount = 1;
                    this.targetingOwner = CARD_TARGETING_OWNER.ALLY;
                    this.targetingType = CARD_TARGETING_TYPE.SLOT_UNOCCUPIED;
                break;
                //terrain -> does not have any targets
                case CARD_TYPE.TERRAIN:
                    this.targetingCount = 0;
                    this.targetingOwner = undefined;
                    this.targetingType = undefined;
                break;
            }

            if(isDebugging) console.log(debugTag+"selected card="+this.selectedCard.Key+", target={owner="+this.targetingOwner+",type="+this.targetingType+",count="+this.targetingCount+"}!");
        }

        /** deselects the currently selected card */
        public DeselectCard() {
            if(isDebugging) console.log(debugTag+"deselecting current card="+this.selectedCard?.Key+"...");

            //halt if selected card is undefined
            if(this.selectedCard == undefined) {
                if(isDebugging) console.log(debugTag+"<FAILED> player has no card selected");
                return;
            }

            //clear all previous targets
            this.DeselectAllTargets();

            //remove selected card
            this.selectedCard = undefined;
            this.selectedCardLocation = CARD_SELECTION_LOCATION.FIELD_SLOT
            //remove targeting filters
            this.targetingCount = 0;
            this.targetingOwner = undefined;
            this.targetingType = undefined;

            //update object display
            this.teamObjects[this.curTurn].UpdateCardObjectDisplay("");

            if(isDebugging) console.log(debugTag+"deselected current card!");
        }
        
        //## INTERACTIONS - FIELD SLOTS
        /** called when a field slot is interacted with by the player */
        public InteractionSlotSelection(team:number, slotID:number, aiPVE:boolean=false) {
            if(isDebugging) console.log(debugTag+"local player interacted with slot belonging to team="+team+", slot="+slotID);
            
            //halt if game is not in-session 
            if(this.curState != TABLE_GAME_STATE.ACTIVE) {
                if(isDebugging) console.log(debugTag+"<FAILED> game is not in session");
                return;
            }
            //halt if local player is not the current team owner and not an ai
            if(PlayerLocal.GetUserName() != this.teamObjects[this.curTurn].RegisteredPlayerID && !aiPVE) {
                if(isDebugging) console.log(debugTag+"<FAILED> current team is not owned by local player, non-ai command");
                return;
            }

            //if targeting is not active, selecting unit
            if(this.targetingType == undefined && this.targetingOwner == undefined) {
                if(isDebugging) console.log(debugTag+"targeting type is not defined, attempting selection");
                //halt if slot does not belong to current player
                if(this.curTurn != team) {
                    if(isDebugging) console.log(debugTag+"<FAILED> player attempted to select foriegn unit");
                    return;
                }
                //halt if slot is unoccupied
                if(!this.teamObjects[team].cardSlotObjects[slotID].IsCardSlotOccupied()) {
                    if(isDebugging) console.log(debugTag+"<FAILED> targeted slot is not occupied by unit (cant fresh select empty tile)");
                    return;
                }
                //halt if unit in slot has no action
                if(this.teamObjects[team].cardSlotObjects[slotID].SlottedCard?.ActionRemaining == false) {
                    if(isDebugging) console.log(debugTag+"<FAILED> targeted slot's unit has no action");
                    return;
                }

                //set selected card to the current 
                this.selectedCardLocation = CARD_SELECTION_LOCATION.FIELD_SLOT;
                this.selectedCard = this.teamObjects[team].cardSlotObjects[slotID].SlottedCard;
                //set targeting to ally when selecting my unit (unit that will be attacking)
                this.targetingCount = 2;
                this.targetingOwner = CARD_TARGETING_OWNER.ALLY;
                this.targetingType = CARD_TARGETING_TYPE.SLOT_OCCUPIED;
                //select first slot
                this.SelectSlot(team, slotID);
                //set targeting to enemy for selecting unit (unit that will be attacked)
                this.targetingType = CARD_TARGETING_TYPE.ANY;
                this.targetingOwner = CARD_TARGETING_OWNER.ENEMY;
            }
            //if targeting active, ensure slot conforms to requirements
            else {
                if(isDebugging) console.log(debugTag+"targeting type is defined {type="+this.targetingType+",owner="+this.targetingOwner+"}, attempting interaction");
                //check if given slot is already selected
                for(let i:number=0; i<this.selectionTargets.length; i++) {
                    //if slot matches, deselect and return
                    if(this.selectionTargets[i].team == team && this.selectionTargets[i].id == slotID) {
                        this.DeselectTarget(i);
                        return;
                    }
                }
                //select target slot
                this.SelectSlot(team, slotID);
            }
        }

        /** selects a slot on the card field */
        public SelectSlot(team:number, slotID:number) {
            if(isDebugging) console.log(debugTag+"selecting slot{team="+team+", slot="+slotID+"}...");

            //halt if the current target count is at max targets
            if(this.selectionTargets.length >= this.targetingCount) {
                if(isDebugging) console.log(debugTag+"<FAILED> too many slots already selected {count="+this.targetingCount+",limit="+this.selectionTargets.length+"}");
                return;
            }

            //targeting filter checks
            //  type
            switch(this.targetingType) {
                //targeting team -> halt
                case CARD_TARGETING_TYPE.TEAM_PLAYER:
                    if(isDebugging) console.log(debugTag+"<FAILED> targeting is set to team, not allowed to select slot");
                    return;
                //targeting occupied slot -> ensure slot is occupied
                case CARD_TARGETING_TYPE.SLOT_OCCUPIED:
                    if(!this.teamObjects[team].IsCardSlotOccupied(slotID)) {
                        if(isDebugging) console.log(debugTag+"<FAILED> slot is not occupied");
                        return;
                    }
                break;
                //targeting unoccupied slot -> ensure slot is unoccupied
                case CARD_TARGETING_TYPE.SLOT_UNOCCUPIED:
                    if(this.teamObjects[team].IsCardSlotOccupied(slotID)) {
                        if(isDebugging) console.log(debugTag+"<FAILED> slot is occupied");
                        return;
                    }
                break;
            }
            //  owner
            switch(this.targetingOwner) {
                //targeting ally -> ensure target is ally 
                case CARD_TARGETING_OWNER.ALLY:
                    if(this.CurTurn != team) {
                        if(isDebugging) console.log(debugTag+"<FAILED> target is not an ally");
                        return;
                    }
                break;
                //targeting enemy -> ensure target is enemy 
                case CARD_TARGETING_OWNER.ENEMY:
                    if(this.CurTurn == team) {
                        if(isDebugging) console.log(debugTag+"<FAILED> target is not an enemy");
                        return;
                    }
                break;
            }

            //add slot to data & set display
            this.selectionTargets.push({team:team, id:slotID});
            this.teamObjects[team].cardSlotObjects[slotID].SetSelectionState(true);

            if(isDebugging) console.log(debugTag+"selected slot, targetCount="+this.selectionTargets.length+"!");
        }

        //## DESELECTION
        /** deselects the target at the given index */
        public DeselectTarget(index:number) {
            //if swap is required to place targeted index at end of targets array
            if(this.selectionTargets.length > 1 && index != this.selectionTargets.length-1) {
                //preform swap
                const swap = this.selectionTargets[this.selectionTargets.length-1];
                this.selectionTargets[this.selectionTargets.length-1] = this.selectionTargets[index];
                this.selectionTargets[index] = swap;
            }

            //get next target
            const target = this.selectionTargets.pop();
            if(target == undefined) return;

            //update target's view based on type
            switch(target.id) {
                //team
                case SLOT_SELECTION_TYPE.TEAM:
                    this.teamObjects[target.team].SetTeamTargetState(false);
                break;
                //slots
                default:
                    this.teamObjects[target.team].cardSlotObjects[target.id].SetSelectionState(false);
                break;
            }
        }
        /** deselects the currently selected targets */
        public DeselectAllTargets() {
            if(isDebugging) console.log(debugTag+"deselecting targets, length="+this.selectionTargets.length+"...");

            //remove selected card
            this.selectedCard = undefined;
            this.selectedCardLocation = undefined;
            //remove targeting filters
            this.targetingCount = 0;
            this.targetingOwner = undefined;
            this.targetingType = undefined;

            //deactivate all targets
            while(this.selectionTargets.length > 0) {
                //deactivate last target
                this.DeselectTarget(this.selectionTargets.length-1); 
            }

            if(isDebugging) console.log(debugTag+"deselected targets, length="+this.selectionTargets.length+"!");
        }
        
        //## ACTIVATION/START CARD PROCESSING
        /** called when an activation attempt is made by the local player */
        public InteractionAttemptActivation(aiPVE:boolean=false) {
            if(isDebugging) console.log(debugTag+"local player attempted to activate card="+this.selectedCard?.Key);
            
            //halt if game is not in-session
            if(this.curState != TABLE_GAME_STATE.ACTIVE) {
                if(isDebugging) console.log(debugTag+"<FAILED> game is not in session");
                return;
            }
            //halt if local player is not the current team owner and not an ai
            if(PlayerLocal.GetUserName() != this.teamObjects[this.curTurn].RegisteredPlayerID && !aiPVE) {
                if(isDebugging) console.log(debugTag+"<FAILED> current team is not owned by local player, non-ai command");
                return;
            }
            //halt if selected card is undefined
            if(this.selectedCard == undefined) {
                if(isDebugging) console.log(debugTag+"<FAILED> player has no card selected");
                return;
            }

            //process activation based on card type
            switch(this.selectedCard.DefData.type) {
                case CARD_TYPE.SPELL:
                    this.LocalPlayCard();
                break;
                case CARD_TYPE.CHARACTER:
                    switch(this.selectedCardLocation) {
                        //if unit is hand, attempt to play unit to field
                        case CARD_SELECTION_LOCATION.HAND_SLOT:
                            this.LocalPlayCard();
                        break;
                        //if unit is on field, attempt to have unit attack target
                        case CARD_SELECTION_LOCATION.FIELD_SLOT:
                            this.LocalUnitAttack();
                        break;
                    }
                break;
                case CARD_TYPE.TERRAIN:
                    this.LocalPlayCard();
                break;
            }
        }

        //## PLAY CARD FROM HAND (SPELLS AND UNITS TO FIELD)
        //TODO: server authority -> server call will outsource local call to server
        public EmitPlayCard:(table:string, cardKey:string, targets:TableSelectionTarget[]) => void = this.RemotePlayCard;
        /** local call from interaction made to all connected players, begins the next turn
         *  NOTE: currently it is assumed selections are correct, additional checks can be added later
         *      ex: when placing a character we only check the number of slots, not verifying quality
        */
        public LocalPlayCard() {
            if(isDebugging) console.log(debugTag+"<LOCAL> table="+this.TableID+" playing card="+this.selectedCard?.Key+"...");
            //preform localized team checks
            const team = this.teamObjects[this.curTurn];
            //  ensure local player is owner of the current team, excluding AI
            if(PlayerLocal.GetUserName() != team.RegisteredPlayerID && team.TeamType != TABLE_TEAM_TYPE.AI) {
                if(isDebugging) console.log(debugTag+"<FAILED> local player is not the current player");
                return;
            }
            
            //preform localized card checks
            //  ensure card is selected
            if(this.selectedCard == undefined) {
                if(isDebugging) console.log(debugTag+"<FAILED> no selected card");
                return;
            }
            //  ensure player has enough energy to play card
            if(this.selectedCard.Cost > team.EnergyCur) {
                if(isDebugging) console.log(debugTag+"<FAILED> player does not have enough energy to play card");
                return;
            }

            //preform localized targeting checks
            switch(this.selectedCard.DefData.type) {
                case CARD_TYPE.SPELL:
                    //ensure a slot is selected for the current team
                    if(this.selectionTargets.length == 0) {
                        if(isDebugging) console.log(debugTag+"<FAILED> no targets selected");
                        return;
                    }
                break;
                case CARD_TYPE.CHARACTER:
                    //ensure a slot is selected for the current team
                    if(this.selectionTargets.length == 0) {
                        if(isDebugging) console.log(debugTag+"<FAILED> no slot is selected for current team");
                        return;
                    }
                break;
                case CARD_TYPE.TERRAIN:

                break;
			}

            //prepare send data
            const data:TableSelectionTarget[] = [];
            //skip send for certain targeting types
            for(let i:number=0; i<this.selectionTargets.length; i++) {
                data.push(this.selectionTargets[i]);
            }

            //send networking call
            this.EmitPlayCard(this.TableID, this.selectedCard.Key, data);

            //deselect card cards and targets
            this.DeselectCard();
            this.DeselectAllTargets();
        }
        /** remote call from a connected player, plays card to the table */
        public RemotePlayCard(table:string, cardKey:string, targets:TableSelectionTarget[]) {
            if(isDebugging) console.log(debugTag+"<REMOTE> playing card on table="+this.TableID+" playing card="+cardKey+", targets="+targets.length+"...");
            //attempt to get card
            const card = PlayCard.GetByKey(cardKey);
            const team = this.teamObjects[this.curTurn];
            //  ensure selected card exists
            if(card == undefined)  {
                if(isDebugging) console.log(debugTag+"<FAILED> could not find card data (key="+cardKey+")");
                return;
            }

            //process by card type
            switch(card.DefData.type) {
                case CARD_TYPE.SPELL:
                    //move card from hand to discard
                    team.MoveCardBetweenCollections(card, 
                        PlayCardDeck.DECK_CARD_STATES.HAND,
                        PlayCardDeck.DECK_CARD_STATES.DISCARD
                    );
                    this.RemoteActionSpell(card.Key, targets)
                    if(isDebugging) console.log(debugTag+"<REMOTE> played card on table="+this.TableID+" card="+card.DefData.type+
                        ", new spell has been played!");
                break;
                case CARD_TYPE.CHARACTER:
                    //move card from hand to field
                    team.MoveCardBetweenCollections(card, 
                        PlayCardDeck.DECK_CARD_STATES.HAND,
                        PlayCardDeck.DECK_CARD_STATES.FIELD
                    );
                    //display character on slot
                    team.SetSlotCharacterObject(targets[0].id, card);
                    if(isDebugging) console.log(debugTag+"<REMOTE> played card on table="+this.TableID+" card="+card.DefData.type+
                        ", new character has been placed on slot="+targets[0].id+"!");
                break;
                case CARD_TYPE.TERRAIN:
                    //move card from hand to field
                    team.MoveCardBetweenCollections(card, 
                        PlayCardDeck.DECK_CARD_STATES.HAND,
                        PlayCardDeck.DECK_CARD_STATES.TERRAIN
                    );
                    //set new terrain card
                    team.SetTerrainCard(card);
                    if(isDebugging) console.log(debugTag+"<REMOTE> played card on table="+this.TableID+" card="+card.DefData.type+
                        ", new terrain has been set!");
                break;
            }

            //remove energy from player
            team.EnergyCur -= card.Cost;

            //remove card object
            team.RemoveHandObject(card);
            this.teamObjects[this.curTurn].UpdateCardObjectDisplay();
            //deselect slots
            this.DeselectAllTargets();
            //redraw stats
            this.RedrawTeamDisplays();
        }
        /** remote call from a connected player, executes a spell from one card to a unit */
        public RemoteActionSpell(cardKey:string, targets:TableSelectionTarget[]) {
            const key = this.TableID;
            if(isDebugging) console.log(debugTag+"<REMOTE> playing spell card="+cardKey+" targetCount="+targets.length+"...");
            //get card
            const card = PlayCard.GetByKey(cardKey);
            //  ensure selected card exists
            if(card == undefined)  {
                if(isDebugging) console.log(debugTag+"<FAILED> could not find card data (key="+cardKey+")");
                return;
            }

            //get targeted slots
            const targetSlot = this.teamObjects[targets[0].team].cardSlotObjects[targets[0].id];
            //ensure slots contain cards
            if(targetSlot.SlottedCard == undefined)  {
                if(isDebugging) console.log(debugTag+"<FAILED> provided slot has no character");
                return;
            }
            const team = this.teamObjects[targets[0].team];

            //play spell object at location 
            this.spellViewObj = CardSubjectObject.Create({
                key:"spv-"+this.TableID,
                //targeting
                type: CARD_TYPE.SPELL,
                model: card.DefData.objPath,
                //position
                parent: targetSlot.entityParent, 
                position: { x:0, y:0.4, z:0 },
                scale: { x:0.8, y:0.8, z:0.8 },
                rotation: { x:0, y:0, z:0 }
            });
            //this.spellViewObj.SetAnimation(CardSubjectObject.ANIM_KEY_SPELL.NONE);
            this.spellViewObj.PlaySingleAnimation(CardSubjectObject.ANIM_KEY_SPELL.PLAY, true);

            //process effect from card's spell
            targetSlot.SlottedCard.UnitImpactedBySpell(card);

            //TODO: set up a real callbacks system when a unit has been killed, stop this stupid shit
            //if character was killed
            if(targetSlot.SlottedCard?.HealthCur <= 0) {

                //play death animation
                targetSlot.entityCharacter?.PlaySingleAnimation(CardSubjectObject.ANIM_KEY_CHARACTER.DEATH, false);

                //delay cleaning up unit until death animation has played
                utils.timers.setTimeout(
                    function() {
                        //ensure defender and attacker slots are both occupied
                        if(targetSlot.SlottedCard == undefined) {
                            return;
                        }

                        //move card to discard pile
                        team.MoveCardBetweenCollections(targetSlot.SlottedCard, PlayCardDeck.DECK_CARD_STATES.FIELD, PlayCardDeck.DECK_CARD_STATES.DISCARD);
                        //clear card from slot 
                        targetSlot.ClearCard();
                        //redraw stats
                        CalldownRedrawTeamDisplays(key);
                    },
                    1900
                );
            } else {
                //play flinch animation after time
                utils.timers.setTimeout(
                    function() {
                        targetSlot.entityCharacter?.PlaySingleAnimation(CardSubjectObject.ANIM_KEY_CHARACTER.FLINCH, false);
                        //update card slot's display
                        targetSlot.UpdateStatDisplay();
                    },
                    1000
                );
            }

            //update card slot's display
            targetSlot.UpdateStatDisplay();
            if(isDebugging) console.log(debugTag+"<REMOTE> played spell card="+cardKey+" targetCount="+targets.length+"!");
        }

        //## UNIT ON FIELD ATTACKS
        public EmitUnitAttack:(table:string, attacker:TableSelectionTarget, defender:TableSelectionTarget) => void = this.RemoteUnitAttack;
        /** local call from interaction made to all connected players, attempts an attack from one unit to another */
        public LocalUnitAttack() {
            //halt if the incorrect number of units are selected
            if(this.selectionTargets.length != 2) {
                if(isDebugging) console.log(debugTag+"<FAILED> incorrect number of units selected (needs=2, has="+this.selectionTargets.length+")");
                return;
            }

            //ensure targets are slots
            /*for(let i:number=0; i<this.selectionTargets.length; i++) {
                if(this.selectionTargets[i].id == SELECTION_SLOT_TYPE.TEAM) {
                    if(isDebugging) console.log(debugTag+"<REMOTE> unit attack failed for team="+i+", target="+this.selectionTargets[i]+" is not a slot");
                    return;
                }
            }*/

            //get attacker
            var attackerSlot = this.teamObjects[this.selectionTargets[0].team].cardSlotObjects[this.selectionTargets[0].id];
            //attacker filters
            if(attackerSlot.SlottedCard == undefined) {
                if(isDebugging) console.log(debugTag+"<FAILED> attacker slots does not contain card characters");
                return;
            }
            //ensure attacking unit has an action remaining
            if(!attackerSlot.SlottedCard.ActionRemaining) {
                if(isDebugging) console.log(debugTag+"<FAILED> attacker characters does not have an available action");
                return;
            }

            //process attack on team
            if(this.selectionTargets[1].id == SLOT_SELECTION_TYPE.TEAM) {
            }
            //process attack on unit
            else {
                var defenderSlot = this.teamObjects[this.selectionTargets[1].team].cardSlotObjects[this.selectionTargets[1].id];

                //ensure call is coming from player of the same team or an ai team 
                if(PlayerLocal.GetUserName() != this.teamObjects[this.curTurn].RegisteredPlayerID && 
                    this.teamObjects[this.curTurn].TeamType != TABLE_TEAM_TYPE.AI) {
                    if(isDebugging) console.log(debugTag+"<FAILED> unit failed to attack on table="+PlayerLocal.CurTableID+
                        " b.c current player is on wrong team="+PlayerLocal.CurTeamID);
                    return;
                }
                //ensure both targeted slots contain characters characters
                if(defenderSlot.SlottedCard == undefined) {
                    if(isDebugging) console.log(debugTag+"<FAILED> defender slot does not contain card characters");
                    return;
                }
            }

            //send networking call
            Table.EmitUnitAttack(this.TableID, this.selectionTargets[0], this.selectionTargets[1]);
        }
        /** remote call from a connected player, executes an attack from one unit to another */
        public RemoteUnitAttack(table:string, attacker:TableSelectionTarget, defender:TableSelectionTarget) {
            const key = this.TableID;
            //get attacker team
            const attackerTeam = this.teamObjects[attacker.team];
            //get attacker slot
            const attackerSlot = attackerTeam.cardSlotObjects[attacker.id];
            //ensure attacker has card slotted
            if(attackerSlot.SlottedCard == undefined) return;
            //get defender team
            const defenderTeam = this.teamObjects[defender.team];

            //play attack animation
            attackerSlot.entityCharacter?.PlaySingleAnimation(CardSubjectObject.ANIM_KEY_CHARACTER.ATTACK, false);
            
            //process attack on team
            if(defender.id == SLOT_SELECTION_TYPE.TEAM) {
                //delay processing until unit strikes
                if(attackerSlot.SlottedCard == undefined) {
                    return;
                }

                //remove action from attacker
                attackerSlot.SlottedCard.ActionRemaining = false;

                //delay defender animation and ui updates until the attack hits
                utils.timers.setTimeout(
                    function() {
                        //ensure defender and attacker slots are both occupied
                        if(attackerSlot.SlottedCard == undefined) {
                            return;
                        }
                        //deal damage to enemy team
                        defenderTeam.HealthCur -= attackerSlot.SlottedCard.Attack;
                        //if enemy team was defeated
                        if(defenderTeam.HealthCur <= 0) {
                            //end game in defeat
                            CalldownEndGame(key, defender.team);
                            //redraw stats
                            CalldownRedrawTeamDisplays(key);
                        }
                        //update card slot's display
                        defenderTeam.UpdateStatsDisplay();
                        attackerSlot.UpdateStatDisplay();
                    },
                    1000
                );
            }
            //process attack on unit
            else {
                //get defender slot
                const defenderSlot = defenderTeam.cardSlotObjects[defender.id];

                //ensure defender and attacker slots are both occupied
                if(defenderSlot.SlottedCard == undefined) {
                    return;
                }

                //process card character attacks
                defenderSlot.SlottedCard.UnitImpactedByUnit(attackerSlot.SlottedCard);

                //remove action from attacker
                attackerSlot.SlottedCard.ActionRemaining = false;

                //delay defender animation and ui updates until the attack hits
                utils.timers.setTimeout(
                    function() {
                        //ensure defender and attacker slots are both occupied
                        if(attackerSlot.SlottedCard == undefined || defenderSlot.SlottedCard == undefined) {
                            return;
                        }
                        
                        //if character was killed
                        if(defenderSlot.SlottedCard.HealthCur <= 0) {
                            //play death animation
                            defenderSlot.entityCharacter?.PlaySingleAnimation(CardSubjectObject.ANIM_KEY_CHARACTER.DEATH, false);

                            //delay cleaning up unit until death animation has played
                            utils.timers.setTimeout(
                                function() {
                                    //ensure defender and attacker slots are both occupied
                                    if(attackerSlot.SlottedCard == undefined || defenderSlot.SlottedCard == undefined) {
                                        return;
                                    }

                                    //move card to discard pile
                                    defenderTeam.MoveCardBetweenCollections(defenderSlot.SlottedCard,PlayCardDeck.DECK_CARD_STATES.FIELD,PlayCardDeck.DECK_CARD_STATES.DISCARD);
                                    //clear card from slot 
                                    defenderSlot.ClearCard();
                                    //redraw stats
                                    CalldownRedrawTeamDisplays(key);
                                },
                                1950
                            );
                        } else {
                            //play death animation
                            defenderSlot.entityCharacter?.PlaySingleAnimation(CardSubjectObject.ANIM_KEY_CHARACTER.FLINCH, false);
                        }
                        //update card slot's display
                        attackerSlot.UpdateStatDisplay();
                        defenderSlot.UpdateStatDisplay();
                    },
                    1000
                );
            }

            //deselect slots
            this.DeselectAllTargets();
        }

        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.isActive = false;
            if(this.characterNPC) CardSubjectObject.Disable(this.characterNPC);
            //disable all attached table teams
            while(this.teamObjects.length > 0) {
                const teamObject = this.teamObjects.pop();
                if(teamObject) teamObject.Disable();
            }

            //hide card parent
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.scale = PARENT_SCALE_OFF;
        }

        /** removes objects from game scene and engine */
        public Destroy() {
            if(this.characterNPC) CardSubjectObject.Disable(this.characterNPC);
            //destroy all attached table teams
            while(this.teamObjects.length > 0) {
                const teamObject = this.teamObjects.pop();
                if(teamObject) teamObject.Destroy();
            }

            //destroy game object
            engine.removeEntity(this.entityParent);
        }

        /** attempts to synce the table based on it's networking type */
        public async RequestNetworkedSync() {
            if(isDebugging) console.log(debugTag+"attempting to sync table="+this.tableID+", networking type="+this.networkingType);

            //freeze table interactions
            this.isInitialized = false;

            TextShape.getMutable(this.entityLobbyState).text = "<ATTEMPTING SYNC>";
            
            //process based on networking type
            switch(this.networkingType) {
                case Networking.TABLE_CONNECTIVITY_TYPE.SERVER_STRICT:
                    if(isDebugging) console.log(debugTag+"<SERVER> requesting table data from server...");
                    try {
                        //ensure scene is using server connection and player is logged in
                        if(!Networking.PLAYER_CONNECTIVITY_STATE.CONNECTED || !PlayerLocal.IsWeb3()) return;
                        
                        //prepare url
                        const url:string = Networking.SERVER_URL+Networking.SERVER_API.TABLE_GET;
                        if(isDebugging) console.log(debugTag+"<SERVER> generated request url: "+url);

                        //attempt to get response
                        let response = await signedFetch({
                            url: url, 
                            init: {
                                headers: { "Content-Type": "application/json" },
                                method: "POST",
                                body: JSON.stringify({
                                    "realmID": "<TEST-REALM>",
                                    "tableID": this.TableID,
                                })
                            }
                        });
                        if(!response) {
                            if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                            TextShape.getMutable(this.entityLobbyState).text = "<SYNC FAILED: BAD RESPONSE>";
                            return;
                        }

                        //attempt to convert url's data to json
                        let responseText = await response.body;
                        if(!responseText) {
                            if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                            TextShape.getMutable(this.entityLobbyState).text = "<SYNC FAILED: BAD DATA TEXT>";
                            return;
                        }
                        if(isDebugging) console.log(debugTag+"<SERVER> got response: "+responseText);

                        //check result of response
                        let responseJSON = JSON.parse(responseText);
                        if(!responseJSON) {
                            if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no JSON data");
                            TextShape.getMutable(this.entityLobbyState).text = "<SYNC FAILED: BAD DATA JSON>";
                            return;
                        }

                        //deserialize table
                        this.DeserializeData(responseJSON as TableSerialData);
                    } catch(error) {
                        if(isDebugging) console.log(debugTag+"<SERVER> failed to get table data");
                        console.log(error);
                        TextShape.getMutable(this.entityLobbyState).text = "<SYNC FAILED>";
                    }
                break;
                case Networking.TABLE_CONNECTIVITY_TYPE.PEER_TO_PEER:
                    if(isDebugging) console.log(debugTag+"requesting table data from peers...");

                    //send sync request
                    Networking.MESSAGE_BUS.emit('txTableGetData', {"invoker":PlayerLocal.GetUserName(), "table":this.tableID});

                    //delay timeout check function
                    const tableKey = this.TableID;
                    utils.timers.setTimeout(function() { Table.CalldownCompleteNetworkSync(tableKey) }, 5000)
                break;
                case Networking.TABLE_CONNECTIVITY_TYPE.LOCAL:
                    if(isDebugging) console.log(debugTag+"table authority is local, skipping sync request");
                    //unlock table
                    this.isInitialized = true;
                    this.SetGameState(TABLE_GAME_STATE.IDLE);
                break;
            }
        }

        //delayed function for catching peer-to-peer network sync attempt (if no player owns a p2p table, then the user will never get a resposne)
        public CompleteNetworkSync() {
            if(this.tableOwnerID != "") return;
            if(isDebugging) console.log(debugTag+"peer-to-peer request for table="+this.tableID+" timed out (likely no game in session, unlocking table)");

            //unlock table
            this.isInitialized = true;
            this.SetGameState(TABLE_GAME_STATE.IDLE);
            this.UpdatePlayerDisplay();
        }

        /** serializeds the table into transferable data */
        public SerializeData():TableSerialData {
            if(isDebugging) console.log(debugTag+"serializing table {tableID="+this.TableID+", owner="+this.TableOwnerID+"}");
            let serial:TableSerialData = {
                //indexing
                id:this.tableID,
                owner:this.tableOwnerID,
                //live data
                state:this.curState,
                turn:this.curTurn,
                round:this.curRound,
                teams:[],
            };

            //process team serials
            for (let i = 0; i < this.teamObjects.length; i++) {
                const team = this.teamObjects[i].SerializeData();
                serial.teams.push(team);
            }

            //provide serial
            if(isDebugging) console.log(debugTag+"serialized table {tableID="+serial.id+", owner="+serial.owner+"}");
            return serial;
        }

        /** initializes the team based on the provided serial string */
        public DeserializeData(serial:TableSerialData) {
            if(isDebugging) console.log(debugTag+"deserializing table {tableID="+serial.id+", owner="+serial.owner+"}");
            //indexing
            this.tableID = serial.id;
            this.tableOwnerID = serial.owner;
            //live data
            this.curTurn = serial.turn;
            this.curRound = serial.round;
            
            //populate all teams
            for (let i = 0; i < serial.teams.length; i++) {
                this.teamObjects[i].DeserializeData(serial.teams[i]);
                this.teamObjects[i].UpdateButtonStates();
            }

            //set game state
            this.SetGameState(serial.state);
            
            //update team display object's position
            this.RepositionTeamDisplays();
            //redraw display
            this.RedrawTeamDisplays();
            this.UpdatePlayerDisplay();
            if(isDebugging) console.log(debugTag+"deserialized table {tableID="+this.TableID+", owner="+this.TableOwnerID+"}");
        }
    }

    export function CalldownRedrawTeamDisplays(key:string) {
        const table = GetByKey(key);
        if(table != undefined) {
            table.RedrawTeamDisplays();
        }
    }
    export function CalldownCompleteNetworkSync(key:string) {
        const table = GetByKey(key);
        if(table != undefined) {
            table.CompleteNetworkSync();
        }
    }
    export function CalldownEndGame(key:string, defeated:number) {
        const table = GetByKey(key);
        if(table != undefined) {
            table.LocalEndGame(defeated);
        }
    }

    /** provides a new object (either pre-existing & un-used or entirely new) */
    export function Create(data:TableCreationData):TableObject {
        const key:string = GetKeyFromData(data);
        var object:undefined|TableObject = undefined;
        if(isDebugging) console.log(debugTag+"attempting to create new object, key="+key+"...");
        
        //if an object under the requested key is already active, hand that back
        if(pooledObjectsRegistry.containsKey(key)) {
            console.log(debugTag+"<WARNING> requesting pre-existing object (use get instead), key="+key);
            object = pooledObjectsRegistry.getItem(key);
        } 
        //  attempt to find an existing unused object
        if(pooledObjectsInactive.size() > 0) {
            //grab entity from (grabbing from back is a slight opt)
            object = pooledObjectsInactive.getItem(pooledObjectsInactive.size()-1);
            //  remove from inactive listing
            pooledObjectsInactive.removeItem(object);
        }
        //  if not recycling unused object
        if(object == undefined) {
            //create card object frame
            //  create data object (initializes all sub-components)
            object = new TableObject();
            //  add to overhead collection
            pooledObjectsAll.addItem(object);
        }

        //initialize object
        object.Initialize(data);

        //add object to active collection (ensure only 1 entry)
        var posX = pooledObjectsActive.getItemPos(object);
        if(posX == -1) pooledObjectsActive.addItem(object);
        //add to registry under given key
        pooledObjectsRegistry.addItem(key, object);

        //hook up processing callbacks based on table's networking type
        switch(object.NetworkingType) {
            case Networking.TABLE_CONNECTIVITY_TYPE.SERVER_STRICT:
                object.EmitAddPlayerToTeam = Table.CallbackServerAddPlayerToTeam;
                object.EmitRemovePlayerFromTeam = Table.CallbackServerRemovePlayerFromTeam;
                object.EmitSetPlayerReadyState = Table.CallbackServerSetPlayerReadyState;
                object.EmitStartGame = Table.CallbackServerStartGame;
                object.EmitEndGame = Table.CallbackServerEndGame;
                object.EmitNextTurn = Table.CallbackServerNextTurn;
                object.EmitPlayCard = Table.CallbackServerPlayCard;
                object.EmitUnitAttack = Table.CallbackServerUnitAttack;
            break;
            case Networking.TABLE_CONNECTIVITY_TYPE.PEER_TO_PEER:
                object.EmitAddPlayerToTeam = Table.CallbackEmitAddPlayerToTeam;
                object.EmitRemovePlayerFromTeam = Table.CallbackEmitRemovePlayerFromTeam;
                object.EmitSetPlayerReadyState = Table.CallbackEmitSetPlayerReadyState;
                object.EmitStartGame = Table.CallbackEmitStartGame;
                object.EmitEndGame = Table.CallbackEmitEndGame;
                object.EmitNextTurn = Table.CallbackEmitNextTurn;
                object.EmitPlayCard = Table.CallbackEmitPlayCard;
                object.EmitUnitAttack = Table.CallbackEmitUnitAttack;
            break;
            case Networking.TABLE_CONNECTIVITY_TYPE.LOCAL:
                object.EmitAddPlayerToTeam = object.RemoteAddPlayerToTeam;
                object.EmitRemovePlayerFromTeam = object.RemoteRemovePlayerFromTeam;
                object.EmitSetPlayerReadyState = object.RemoteSetPlayerReadyState;
                object.EmitStartGame = object.RemoteStartGame;
                object.EmitEndGame = object.RemoteEndGame;
                object.EmitNextTurn = object.EmitNextTurn;
                object.EmitPlayCard = object.RemotePlayCard;
                object.EmitUnitAttack = object.RemoteUnitAttack;
            break;
        }

        //attempt to sync table's data
        object.RequestNetworkedSync();

        if(isDebugging) console.log(debugTag+"created new object, key='"+key+"'!");
        //provide entity reference
        return object;
    }

    /** disables all objects, hiding them from the scene but retaining them in data & pooling */
    export function DisableAll() {
        if(isDebugging) console.log(debugTag+"removing all objects...");
        //ensure all objects are parsed
        while(pooledObjectsActive.size() > 0) { 
            //small opt by starting at the back b.c of how list is implemented (list keeps order by swapping next item up)
            Disable(pooledObjectsActive.getItem(pooledObjectsActive.size()-1));
        }
        if(isDebugging) console.log(debugTag+"removed all objects!");
    }

    /** disables the given object, hiding it from the scene but retaining it in data & pooling */
    export function Disable(object:TableObject) {
        //adjust collections
        //  add to inactive listing (ensure add is required)
        var posX = pooledObjectsInactive.getItemPos(object);
        if(posX == -1) pooledObjectsInactive.addItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(object.TableID)) pooledObjectsRegistry.removeItem(object.TableID);

        //send disable command
        object.Disable();
    }

    /** removes all objects from the game */
    export function DestroyAll() {
        if(isDebugging) console.log(debugTag+"destroying all objects...");
        //ensure all objects are parsed
        while(pooledObjectsAll.size() > 0) { 
            //small opt by starting at the back b.c of how list is implemented (list keeps order by swapping next item up)
            Destroy(pooledObjectsAll.getItem(pooledObjectsAll.size()-1));
        }
        if(isDebugging) console.log(debugTag+"destroyed all objects!");
    }

    /** removes given object from game scene and engine */
    export function Destroy(object:TableObject) {
        //adjust collections
        //  remove from overhead listing
        pooledObjectsAll.removeItem(object);
        //  remove from inactive listing
        pooledObjectsInactive.removeItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(object.TableID)) pooledObjectsRegistry.removeItem(object.TableID);

        //send destroy command
        object.Destroy();
        //TODO: atm we rely on DCL to clean up object data class. so far it hasn't been an issue due to how
        //  object data is pooled, but we should look into how we can explicitly set data classes for removal
    }
    
    //### NETWORKING PIPELINE ###
    //  all functions below are used to define processing for p2p/server networking. these functions are set during 
    //  a table's initialization, setting callbacks based on the table's type.

    //peer-to-peer recieve (table owner get sync request, sends serial to invoker)
    Networking.MESSAGE_BUS.on('txTableGetData', (data: {invoker:string, table:string, team:number, player:string}) => {
        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject == undefined) return;

        //halt if reciever does not own table
        if(tableObject.TableOwnerID != PlayerLocal.GetUserName()) return;
        if(isDebugging) console.log(debugTag+"<EMIT> table sync request recieved, sending table serial {invoker="+data.invoker+", tableID="+data.table+"}");

        //send table serial
        const tableSerial:TableSerialData = tableObject.SerializeData();
        Networking.MESSAGE_BUS.emit('txTableSendData', {"invoker":data.invoker, "table":data.table, "serial":tableSerial});
    });
    //peer-to-peer recieve (invoker gets table serial data from table owner)
    Networking.MESSAGE_BUS.on('txTableSendData', (data: {invoker:string, table:string, serial:TableSerialData}) => {
        //halt if local player is not player who requested sync
        if(PlayerLocal.GetUserName() != data.invoker) return;

        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject == undefined) return;
        if(isDebugging) console.log(debugTag+"<EMIT> table serial recieved, deserializing table");

        //deserialize table
        tableObject.DeserializeData(data.serial);
    });

    //## ADD PLAYER TO TABLE
    //server routine
    export function CallbackServerAddPlayerToTeam(table:string, team:number, playerID:string, playerName:string) { Table.ServerAddPlayerToTeam(table, team, playerID, playerName); }
    export async function ServerAddPlayerToTeam(table:string, team:number, playerID:string, playerName:string) {
        //create url
        try {
            if(isDebugging) console.log(debugTag+"<SERVER> adding playerID="+playerID+" playerName="+playerName+" to table="+table+", team="+team+"...");
            //ensure scene is using server connection and player is logged in
            if(!Networking.PLAYER_CONNECTIVITY_STATE.CONNECTED || !PlayerLocal.IsWeb3()) return;
            

            //prepare url
            const url:string = Networking.SERVER_URL+Networking.SERVER_API.TABLE_JOIN;
            if(isDebugging) console.log(debugTag+"<SERVER> generated request url: "+url);

            //attempt to get response
            let response = await signedFetch({ 
                url: url, 
                init: {
                    headers: { "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({
                        "realmID": "<TEST-REALM>",
                        "tableID": table,
                        "teamID": team,
                        "playerID": playerID,
                        "playerName": playerName
                    })
                }
            });
            if(!response) {
                if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                return;
            }

            //attempt to convert url's data to json
            let responseText = await response.body;
            if(!responseText) {
                if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                return;
            }
            if(isDebugging) console.log(debugTag+"<SERVER> got response: "+responseText);

            //check result of response
            let responseJSON = JSON.parse(responseText);
            if(responseJSON["result"]) {
                if(isDebugging) console.log(debugTag+"<SERVER> added playerID="+playerID+" playerName="+playerName+" to table="+table+", team="+team+"!");
                EmitAddPlayerToTeam(table, team, playerID, playerName);
            } else {
                if(isDebugging) console.log(debugTag+"<SERVER> failed to add player to table="+table+", team="+team);
            }
        } catch(error) {
            console.log(error);
        }
    }
    //peer-to-peer send
    export function CallbackEmitAddPlayerToTeam(table:string, team:number, playerID:string, playerName:string) { Table.EmitAddPlayerToTeam(table, team, playerID, playerName); }
    export function EmitAddPlayerToTeam(table:string, team:number, playerID:string, playerName:string) {
        if(isDebugging) console.log(debugTag+"<EMIT> adding playerID="+playerID+" playerName="+playerName+" to table="+table+", team="+team);
        Networking.MESSAGE_BUS.emit('txTableAddPlayer', {table, team, playerID, playerName});
    }
    //peer-to-peer recieve
    Networking.MESSAGE_BUS.on('txTableAddPlayer', (data: {table:string, team:number, playerID:string, playerName:string}) => {
        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject != undefined) tableObject.RemoteAddPlayerToTeam(data.table, data.team, data.playerID, data.playerName);
    });

    //## REMOVE TABLE FROM PLAYER
    //server routine
    export function CallbackServerRemovePlayerFromTeam(table:string, team:number) { Table.ServerRemovePlayerFromTeam(table, team); }
    export async function ServerRemovePlayerFromTeam(table:string, team:number) {
        //create url
        try {
            if(isDebugging) console.log(debugTag+"<SERVER> removing player from table="+table+", team="+team+"...");
            //ensure scene is using server connection and player is logged in
            if(!Networking.PLAYER_CONNECTIVITY_STATE.CONNECTED || !PlayerLocal.IsWeb3()) return;
            
            //prepare url
            const url:string = Networking.SERVER_URL+Networking.SERVER_API.TABLE_LEAVE;
            if(isDebugging) console.log(debugTag+"<SERVER> generated request url: "+url);

            //attempt to get response
            let response = await signedFetch({ 
                url: url,
                init: {
                    headers: { "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({
                        "realmID": "<TEST-REALM>",
                        "tableID": table,
                        "teamID": team,
                    })
                }
            });
            if(!response) {
                if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                return;
            }

            //attempt to convert url's data to json
            let responseText = await response.body;
            if(!responseText) {
                if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                return;
            }
            if(isDebugging) console.log(debugTag+"<SERVER> got response: "+responseText);

            //check result of response
            let responseJSON = JSON.parse(responseText);
            if(responseJSON["result"]) {
                if(isDebugging) console.log(debugTag+"<SERVER> removed player from table="+table+", team="+team+"!");
                EmitRemovePlayerFromTeam(table, team);
            } else {
                if(isDebugging) console.log(debugTag+"<SERVER> failed to remove player from table="+table+", team="+team);
            }

        } catch(error) {
            console.log(error);
        }
    }
    //peer-to-peer send
    export function CallbackEmitRemovePlayerFromTeam(table:string, team:number) { Table.EmitRemovePlayerFromTeam(table, team); }
    export function EmitRemovePlayerFromTeam(table:string, team:number) {
        if(isDebugging) console.log(debugTag+"<EMIT> removing player from table="+table+", team="+team);
        Networking.MESSAGE_BUS.emit('txTableRemovePlayer', {table, team});
    }
    //peer-to-peer recieve
    Networking.MESSAGE_BUS.on('txTableRemovePlayer', (data: {table:string, team:number}) => {
        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject != undefined) tableObject.RemoteRemovePlayerFromTeam(data.table, data.team);
    });

    //## SET PLAYER READY STATE
    //server routine
    export function CallbackServerSetPlayerReadyState(table:string, team:number, state:boolean, deckSerial:string) { Table.ServerSetPlayerReadyState(table, team, state, deckSerial); }
    export async function ServerSetPlayerReadyState(table:string, team:number, state:boolean, deckSerial:string) {
        //create url
        try {
            if(isDebugging) console.log(debugTag+"<SERVER> setting player ready state="+state+" for table="+table+", team="+team+"...");
            //ensure scene is using server connection and player is logged in
            if(!Networking.PLAYER_CONNECTIVITY_STATE.CONNECTED || !PlayerLocal.IsWeb3()) return;
            
            //prepare url
            const url:string = Networking.SERVER_URL+Networking.SERVER_API.TABLE_READY_STATE;
            if(isDebugging) console.log(debugTag+"<SERVER> generated request url: "+url);

            //attempt to get response
            let response = await signedFetch({ 
                url: url,
                init: {
                    headers: { "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({
                        "realmID": "<TEST-REALM>",
                        "tableID": table,
                        "teamID": team,
                        "state":state,
                        "deckSerial":deckSerial
                    })
                }
            });
            if(!response) {
                if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                return;
            }

            //attempt to convert url's data to json
            let responseText = await response.body;
            if(!responseText) {
                if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                return;
            }
            if(isDebugging) console.log(debugTag+"<SERVER> got response: "+responseText);

            //check result of response
            let responseJSON = JSON.parse(responseText);
            if(responseJSON["result"]) {
                if(isDebugging) console.log(debugTag+"<SERVER> set player ready state="+state+" for table="+table+", team="+team+"!");
                EmitSetPlayerReadyState(table, team, state, deckSerial);
            } else {
                if(isDebugging) console.log(debugTag+"<SERVER> failed to set player ready state="+state+" for table="+table+", team="+team);
            }

        } catch(error) {
            console.log(error);
        }
    }
    //peer-to-peer send
    export function CallbackEmitSetPlayerReadyState(table:string, team:number, state:boolean, deckSerial:string) { Table.EmitSetPlayerReadyState(table, team, state, deckSerial); }
    export function EmitSetPlayerReadyState(table:string, team:number, state:boolean, deckSerial:string) {
        if(isDebugging) console.log(debugTag+"<EMIT> setting player ready state for table="+table+", team="+team+" to state="+state);
        Networking.MESSAGE_BUS.emit('txSetPlayerReadyState', {table, team, state, serial: deckSerial});
    }
    //peer-to-peer recieve
    Networking.MESSAGE_BUS.on('txSetPlayerReadyState', (data: {table:string, team:number, state:boolean, deckSerial:string}) => {
        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject != undefined) tableObject.RemoteSetPlayerReadyState(data.table, data.team, data.state, data.deckSerial);
    });

    //## START GAME ON TABLE
    //server routine
    export function CallbackServerStartGame(table:string) { Table.ServerStartGame(table); }
    export async function ServerStartGame(table:string) {
        //create url
        try {
            if(isDebugging) console.log(debugTag+"<SERVER> starting game on table="+table+"...");
            //ensure scene is using server connection and player is logged in
            if(!Networking.PLAYER_CONNECTIVITY_STATE.CONNECTED || !PlayerLocal.IsWeb3()) return;
            
            //prepare url
            const url:string = Networking.SERVER_URL+Networking.SERVER_API.TABLE_READY_STATE;
            if(isDebugging) console.log(debugTag+"<SERVER> generated request url: "+url);

            //attempt to get response
            let response = await signedFetch({ 
                url: url,
                init: {
                    headers: { "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({
                        "realmID": "<TEST-REALM>",
                        "tableID": table,
                    })
                }
            });
            if(!response) {
                if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                return;
            }

            //attempt to convert url's data to json
            let responseText = await response.body;
            if(!responseText) {
                if(isDebugging) console.log(debugTag+"<SERVER> ERROR - no response data");
                return;
            }
            if(isDebugging) console.log(debugTag+"<SERVER> got response: "+responseText);

            //check result of response
            let responseJSON = JSON.parse(responseText);
            if(responseJSON["result"]) {
                if(isDebugging) console.log(debugTag+"<SERVER> started game on table="+table+"!");
                EmitStartGame(table);
            } else {
                if(isDebugging) console.log(debugTag+"<SERVER> failed to start game on table="+table);
            }

        } catch(error) {
            console.log(error);
        }
    }
    //peer-to-peer send
    export function CallbackEmitStartGame(table:string) { Table.EmitStartGame(table); }
    export function EmitStartGame(table:string) {
        if(isDebugging) console.log(debugTag+"<EMIT> starting game for table="+table);
        Networking.MESSAGE_BUS.emit('txStartGame', {table});
    }
    //peer-to-peer recieve
    Networking.MESSAGE_BUS.on('txStartGame', (data: {table:string}) => {
        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject != undefined) tableObject.RemoteStartGame(data.table);
    });

    //## END GAME ON TABLE
    //server routine
    export function CallbackServerEndGame(table:string) { Table.ServerEndGame(table); }
    export async function ServerEndGame(table:string) {

    }
    //peer-to-peer send
    export function CallbackEmitEndGame(table:string, defeated:number) { Table.EmitEndGame(table, defeated); }
    export function EmitEndGame(table:string, defeated:number) {
        if(isDebugging) console.log(debugTag+"<EMIT> ending game for table="+table+", defeatedTeam="+defeated);
        Networking.MESSAGE_BUS.emit('txEndGame', {table, defeated});
    }
    //peer-to-peer recieve
    Networking.MESSAGE_BUS.on('txEndGame', (data: {table:string, defeated:number}) => {
        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject != undefined) tableObject.RemoteEndGame(data.table, data.defeated);
    });

    //## START NEXT TURN FOR TABLE
    //server routine
    export function CallbackServerNextTurn(table:string) { Table.ServerNextTurn(table); }
    export async function ServerNextTurn(table:string) {

    }
    //peer-to-peer send
    export function CallbackEmitNextTurn(table:string) { Table.EmitNextTurn(table); }
    export function EmitNextTurn(table:string) {
        if(isDebugging) console.log(debugTag+"<EMIT> starting next turn for table="+table);
        Networking.MESSAGE_BUS.emit('txNextTurn', {table});
    }
    //peer-to-peer recieve
    Networking.MESSAGE_BUS.on('txNextTurn', (data: {table:string}) => {
        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject != undefined) tableObject.RemoteNextTurn(data.table);
    });

    //## PLAY CARD
    //server routine
    export function CallbackServerPlayCard(table:string) { Table.ServerPlayCard(table); }
    export async function ServerPlayCard(table:string) {

    }
    //peer-to-peer send
    export function CallbackEmitPlayCard(table:string, key:string, targets:TableSelectionTarget[]) { Table.EmitPlayCard(table, key, targets); }
    export function EmitPlayCard(table:string, key:string, targets:TableSelectionTarget[]) {
        if(isDebugging) console.log(debugTag+"<EMIT> starting next turn for table="+table+" playing card="+key+", targets="+targets.length);
        Networking.MESSAGE_BUS.emit('txPlayCard', {table, key, targets});
    }
    //peer-to-peer recieve
    Networking.MESSAGE_BUS.on('txPlayCard', (data: {table:string, key:string, targets:TableSelectionTarget[]}) => {
        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject != undefined) tableObject.RemotePlayCard(data.table, data.key, data.targets);
    });

    //## UNIT ATTACK
    //server routine
    export function CallbackServerUnitAttack(table:string) { Table.ServerUnitAttack(table); }
    export async function ServerUnitAttack(table:string) {

    }
    //peer-to-peer send
    export function CallbackEmitUnitAttack(table:string, attacker:TableSelectionTarget, defender:TableSelectionTarget) { Table.EmitUnitAttack(table, attacker, defender); }
    export function EmitUnitAttack(table:string, attacker:TableSelectionTarget, defender:TableSelectionTarget){
        if(isDebugging) console.log(debugTag+"<EMIT> unit on table="+table+" attacking based on {attacker="+attacker.id+", defender="+defender.id+"}");
        Networking.MESSAGE_BUS.emit('txUnitAttack', {table, attacker, defender});
    }
    //peer-to-peer recieve
    Networking.MESSAGE_BUS.on('txUnitAttack', (data: {table:string, attacker:TableSelectionTarget, defender:TableSelectionTarget}) => {
        //get table
        const tableObject = GetByKey(data.table);
        if(tableObject != undefined) tableObject.RemoteUnitAttack(data.table, data.attacker, data.defender);
    });

    //### AI CARD PLAYER (TODO: move into seperate namespace)
    enum AI_PROCESSING_STATES { PLAY_CARD, UNIT_ATTACK, END_TURN }
    const isDebuggingAI = true;
    /** current display state of ai */
    var aiDisplayState:boolean = false;
    /** current processing state of ai (playing card/attacking) */
    var aiProcessingState:AI_PROCESSING_STATES = 0;
    /** time delay between actions made by AI (ex: playing card) */
    const timeDelay:number[] = [0.5, 3, 0.5];
    /** current time counter */
    var timeCounter:number = 0;
    /** currently targeted table */
    var aiTable:undefined|TableObject = undefined;
    /** sets state of ai card player */
    function SetAIState(state:boolean, table:undefined|TableObject=undefined) {
        //ensure state needs to change
        if(aiDisplayState == state) return;
        aiDisplayState = state;
        aiTable = table;
        if(aiDisplayState) {
            aiProcessingState = AI_PROCESSING_STATES.PLAY_CARD;
            engine.addSystem(processingTurnAI);
        } else {
            engine.removeSystem(processingTurnAI);
        }
    }

    /** system used to act as a non-player card player at a card table */
    function processingTurnAI(dt: number) {
        //ensure ai is running
        if(!aiDisplayState) {
            SetAIState(false);
            return;
        }

        //process time change
        timeCounter -= dt;
        //check if new action should be taken
        if(timeCounter > 0) return;
        timeCounter += timeDelay[aiProcessingState];
        //ensure table exists
        if(aiTable == undefined) {
            if(isDebuggingAI) console.log(debugTag+"<ERROR> aiPlayer is processing but aiTable is undefined");
            SetAIState(false);
            return;
        } 
        //clear any previous target selections
        aiTable.DeselectAllTargets();

        const teamIndexAI = aiTable.CurTurn;
        const teamAI = aiTable.teamObjects[teamIndexAI];
        const teamIndexOther = aiTable.CurTurn === 0 ? 1 : 0;
        const teamOther = aiTable.teamObjects[teamIndexOther];
        //ensure table has deck equipped
        const aiDeck = teamAI.DeckSession;
        if(aiDeck == undefined) {
            if(isDebuggingAI) console.log(debugTag+"<ERROR> aiPlayer is processing but aiDeck is undefined");
            SetAIState(false);
            return;
        } 

        //process
        switch(aiProcessingState) {
            //attempt to play card
            case AI_PROCESSING_STATES.PLAY_CARD:
                if(isDebuggingAI) console.log(debugTag+"aiPlayer selecting card...");
                //process all cards in NPC's hand to find next action
                for(let i:number=0; i<aiDeck.CardsPerState[PlayCardDeck.DECK_CARD_STATES.HAND].size(); i++) {
                    //select card
                    var card = aiDeck.CardsPerState[PlayCardDeck.DECK_CARD_STATES.HAND].getItem(i);
                    aiTable.SelectCard(card.Key);
                    //if NPC does not have enough energy to play card, skip
                    if(teamAI.EnergyCur < card.Cost) continue;
                    //process card based on type
                    switch(card.DefData.type) {
                        case CARD_TYPE.CHARACTER:
                            //process every slot 
                            for(let j:number=0; j<teamAI.cardSlotObjects.length; j++) {
                                //if slot is occupied, skip
                                if(teamAI.IsCardSlotOccupied(j)) continue;
                                if(isDebuggingAI) console.log(debugTag+"aiPlayer playing character card="+card.Key+" to slot="+j);
                                //select free field slot
                                aiTable.SelectSlot(aiTable.CurTurn, j);
                                //play unit to field, process based on table's networking type
                                switch(aiTable.NetworkingType) {
                                    //push changes to all peers
                                    case Networking.TABLE_CONNECTIVITY_TYPE.PEER_TO_PEER:
                                        aiTable.LocalPlayCard();
                                    break;
                                    //keep all changes local
                                    case Networking.TABLE_CONNECTIVITY_TYPE.LOCAL:
                                        aiTable.RemotePlayCard(aiTable.TableID, card.Key, aiTable.SelectionTargets);
                                    break;
                                }
                                return;
                            }
                        break;
                        case CARD_TYPE.SPELL:
                            //if valid enemy unit is on field, cast at that unit
                        break;
                        case CARD_TYPE.TERRAIN:
                            if(isDebuggingAI) console.log(debugTag+"aiPlayer playing field card="+card.Key);
                            //play card, process based on table's networking type
                            switch(aiTable.NetworkingType) {
                                //push changes to all peers
                                case Networking.TABLE_CONNECTIVITY_TYPE.PEER_TO_PEER:
                                    aiTable.LocalPlayCard();
                                break;
                                //keep all changes local
                                case Networking.TABLE_CONNECTIVITY_TYPE.LOCAL:
                                    aiTable.RemotePlayCard(aiTable.TableID, card.Key, aiTable.SelectionTargets);
                                break;
                            }
                        return;
                    }
                }
                //if no card was played, push state forward
                if(isDebuggingAI) console.log(debugTag+"aiPlayer no viable cards remain");
                aiProcessingState = AI_PROCESSING_STATES.UNIT_ATTACK;
            break;
            //attempt to make unit attack
            case AI_PROCESSING_STATES.UNIT_ATTACK:
                //process all units in NCP's field
                if(isDebuggingAI) console.log(debugTag+"aiPlayer selecting unit to use as attacker...");
                //process all cards in NPC's field to find the next 
                for(let i:number=0; i<teamAI.cardSlotObjects.length; i++) {
                    const slot = teamAI.cardSlotObjects[i];
                    //ensure slot has a unit
                    if(!slot.SlottedCard) continue;
                    //ensure slot's unit has actions remaining
                    if(!slot.SlottedCard.ActionRemaining) continue;
                    //select attacker slot
                    aiTable.InteractionSlotSelection(teamIndexAI, i, true);
                    //attempt attack on other units -> process all cards on the other team's field
                    for(let j:number=0; j<teamOther.cardSlotObjects.length; j++) {
                        //ensure an enemy unit exists in targeted slot
                        if(!teamOther.IsCardSlotOccupied(j)) continue;
                        //select enemy unit as defender & begin attack
                        aiTable.InteractionSlotSelection(teamIndexOther, j, true);

                        if(isDebuggingAI) console.log(debugTag+"aiPlayer unit in slot="+i+" is attacking unit in slot="+j);
                        //call action based on table's networking type
                        switch(aiTable.NetworkingType) {
                            //push changes to all peers
                            case Networking.TABLE_CONNECTIVITY_TYPE.PEER_TO_PEER:
                                aiTable.LocalUnitAttack();
                            break;
                            //keep all changes local
                            case Networking.TABLE_CONNECTIVITY_TYPE.LOCAL:
                                //select defender as enemy unit & begin attack
                                aiTable.RemoteUnitAttack(aiTable.TableID, aiTable.SelectionTargets[0], aiTable.SelectionTargets[1]);
                            break;
                        }
                        return;
                    }
                    //select enemy team as defender & begin attack
                    aiTable.InteractionTeamSelection(teamIndexOther, true);
                    //call action based on table's networking type
                    switch(aiTable.NetworkingType) {
                        //push changes to all peers
                        case Networking.TABLE_CONNECTIVITY_TYPE.PEER_TO_PEER:
                            aiTable.LocalUnitAttack();
                        break;
                        //keep all changes local
                        case Networking.TABLE_CONNECTIVITY_TYPE.LOCAL:
                            //select defender as enemy unit & begin attack
                            aiTable.RemoteUnitAttack(aiTable.TableID, aiTable.SelectionTargets[0], aiTable.SelectionTargets[1]);
                        break;
                    }
                    return;
                }
                //if no unit was given an attack command, push state forward
                if(isDebuggingAI) console.log(debugTag+"aiPlayer no viable unit attacks remain");
                aiProcessingState = AI_PROCESSING_STATES.END_TURN;
            break;
            //end turn
            case AI_PROCESSING_STATES.END_TURN:
                //end turn and remove system
                //call action based on table's networking type
                switch(aiTable.NetworkingType) {
                    //push changes to all peers
                    case Networking.TABLE_CONNECTIVITY_TYPE.PEER_TO_PEER:
                        aiTable.LocalNextTurn();
                    break;
                    //keep all changes local
                    case Networking.TABLE_CONNECTIVITY_TYPE.LOCAL:
                        //select defender as enemy unit & begin attack
                        aiTable.RemoteNextTurn(aiTable.TableID);
                    break;
                }
                SetAIState(false);
            break;
        }
    }
}