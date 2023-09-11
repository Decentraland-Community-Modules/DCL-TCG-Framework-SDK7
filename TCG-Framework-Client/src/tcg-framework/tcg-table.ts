import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import Dictionary, { List } from "../utilities/collections";
import { Animator, Billboard, ColliderLayer, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PointerEventType, PointerEvents, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { TableTeam } from "./tcg-table-team";
import { CardSubjectObject } from "./tcg-card-subject-object";
import { PlayerLocal } from "./config/tcg-player-local";
import { PlayCardDeck } from "./tcg-play-card-deck";
import { CARD_TYPE, CardData } from "./data/tcg-card-data";
import { PlayCard } from "./tcg-play-card";
import { TABLE_GAME_STATE, TABLE_TEAM_TYPE, TABLE_TURN_TYPE } from "./config/tcg-config";
import { Networking } from "./config/tcg-networking";


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
    export function GetKeyFromData(data:TableTeamCreationData):string { return data.tableID.toString(); };
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

	/** object interface used to define all data required to create a team */
	export interface TableTeamCreationData {
        //indexing
        tableID: number;
        //type
        teamTypes: [TABLE_TEAM_TYPE, TABLE_TEAM_TYPE];
        //position
        parent: undefined|Entity, //entity to parent object under 
		position: { x:number; y:number; z:number; }; //new position for object
		rotation: { x:number; y:number; z:number; }; //new rotation for object
	} 

    /** represents a team on a card field */
    export class TableObject {
        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** represents the unique index of this slot's table, req for networking */
        private tableID:number = -1;
        public get TableID():string { return this.tableID.toString(); };

        /** id of the currently slotted card playdata */
        private slottedCard:undefined|string = undefined;
        public get SlottedCard():undefined|string { return this.slottedCard; }

        /** current game state of the table */
        private curState:TABLE_GAME_STATE = TABLE_GAME_STATE.IDLE;
        public get CurState():TABLE_GAME_STATE { return this.curState; };

        /** table owner */
        private tableOwner:string = "";
        public get TableOwner():string { return this.tableOwner; }

        /** current player's turn */
        private curTurn:number = -1;
        public get CurTurn():number { return this.curTurn; };
        private curRound:number = -1;
        public get CurRound():number { return this.curRound; };
        /** currently selected card object*/
        private selectedCardObject:undefined|string;
        /** currently selected card slot */
        private selectedCardSlotTeam:undefined|number;
        private selectedCardSlotIndex:undefined|number;
        /** parental position */
        private entityParent:Entity;

        //lobby objects
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

        //pve npc enemy entity
        private characterNPC: CardSubjectObject.CardSubjectObject;

        /** all team objects */
        public teamObjects: TableTeam.TableTeamObject[] = [];

        /** returns the table's player state string */
        public GetPlayerString():string {
            //TODO: fix for #v#
            var str:string = "";
            //team 0
            if(this.teamObjects[0].RegisteredPlayer) str += this.teamObjects[0].RegisteredPlayer;
            else str += "<WAITING>";
            str += " VS ";
            //team 1
            if(this.teamObjects[1].RegisteredPlayer) str += this.teamObjects[1].RegisteredPlayer;
            else str += "<WAITING>";
        
            return str;
        }
        /** updates the table's player state display */
        public UpdatePlayerDisplay() {
            TextShape.getMutable(this.entityLobbyPlayers).text = this.GetPlayerString();
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
                position: {x:0,y:1.25,z:0},
                scale: {x:1,y:1,z:1},
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
                scale: {x:1,y:1,z:1},
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
                position: {x:0,y:-0.75,z:0},
                scale: {x:0.5,y:0.5,z:0.5},
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
        }

        /** prepares the card slot for use by a table team */
        public Initialize(data:TableTeamCreationData) {
            this.isActive = true;
            //indexing
            this.tableID = data.tableID;
            //play
            this.curTurn = -1;
            this.curRound = -1;
            this.selectedCardObject = undefined;
            this.selectedCardSlotTeam = undefined;
            this.selectedCardSlotIndex = undefined;
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
                    this.teamObjects[i].RegisteredPlayer = "Golemancer (lvl 1)";
                    this.teamObjects[i].TeamType = TABLE_TEAM_TYPE.AI;
                    this.teamObjects[i].RegisteredDeck = PlayerLocal.DeckPVE;
                }
            }
            
            //set default lobby state
            this.SetLobbyState(TABLE_GAME_STATE.IDLE);
            this.UpdatePlayerDisplay();
            //update team buttons
            for(let i:number=0; i<this.teamObjects.length; i++) {
                this.teamObjects[i].UpdateButtonStates();
            }
        }

        /** sets the lobby display state */
        public SetLobbyState(state:TABLE_GAME_STATE) {
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
                    //show team displays
                    this.entityStateDisplays[0].SetState(true);
                    this.entityStateDisplays[1].SetState(true);
                break;
                case TABLE_GAME_STATE.OVER:
                    //update text
                    textShape.text = "<GAME_RESULT>";
                    //show team displays
                    this.entityStateDisplays[0].SetState(true);
                    this.entityStateDisplays[1].SetState(true);
                break;
            }
            //clear turn display
            TextShape.getMutable(this.entityLobbyTurn).text = "";
            if(isDebugging) console.log(debugTag+"table="+this.TableID+" state set to "+state);
        }

        /** redraws team display objects */
        public RedrawTeamDisplays() {
            for(let i:number=0; i<this.teamObjects.length; i++) {
                //update team view
                this.entityStateDisplays[i].UpdateView(this.teamObjects[i]);
            }
        }

        //## ADD PLAYER TO TABLE
        /** local call from interaction made to all connected players, to add a player to this table */
        public LocalAddPlayerToTeam(team:number, player:string) {
            if(isDebugging) console.log(debugTag+"<LOCAL> adding player="+player+" to team="+team+"...");
            //only allow changes if game is not in session
            if(this.curState != TABLE_GAME_STATE.IDLE) return;

            //send networking call
            Table.EmitAddPlayerToTeam(this.TableID, team, player);
        }
        /** remote call from a connected player, to add a player to this table */
        public RemoteAddPlayerToTeam(team:number, player:string) {
            if(isDebugging) console.log(debugTag+"<REMOTE> adding player="+player+" to team="+team+"...");

            //if local player already belongs to a table 
            if(PlayerLocal.DisplayName() == player && PlayerLocal.CurTableID != undefined && PlayerLocal.CurTeamID != undefined) {
                if(isDebugging) console.log(debugTag+"<REMOTE> player is already registered to table="+PlayerLocal.CurTableID+" to team="+PlayerLocal.CurTeamID);
                //remove player from previous table/team
                GetByKey(PlayerLocal.CurTableID.toString())?.LocalRemovePlayerFromTeam(PlayerLocal.CurTeamID);
            }
            
            //if both teams are unoccupied, give processing ownership to newly registered player 
            if((this.teamObjects[0].RegisteredPlayer == undefined || this.teamObjects[0].TeamType == TABLE_TEAM_TYPE.AI) && 
                (this.teamObjects[1].RegisteredPlayer == undefined || this.teamObjects[1].TeamType == TABLE_TEAM_TYPE.AI)) {
                if(isDebugging) console.log(debugTag+"<REMOTE> setting owner for table="+this.TableID+" to player="+player);
                this.tableOwner = player;
            }

            //add player to team
            this.teamObjects[team].RegisteredPlayer = player;
            
            //if player is local player
            if(PlayerLocal.DisplayName() == player) {
                //link this table to local player's data
                PlayerLocal.CurTableID = this.tableID;
                PlayerLocal.CurTeamID = team;
            } 
            //if player is remote player
            else {
            }

            //set team display object states
            if(PlayerLocal.DisplayName() == this.teamObjects[0].RegisteredPlayer) {
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
            else if(PlayerLocal.DisplayName() == this.teamObjects[1].RegisteredPlayer) {
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
            else {
                //hand displays
                this.teamObjects[1].SetHandState(false);
                this.teamObjects[0].SetHandState(false);
                //team displays
                this.entityStateDisplays[0].SetState(false);
                this.entityStateDisplays[1].SetState(false);
            }

            //update team buttons
            this.teamObjects[team].UpdateButtonStates();
            //update players tied to table
            this.UpdatePlayerDisplay();
            if(isDebugging) console.log(debugTag+"<REMOTE> added player="+this.teamObjects[team].RegisteredPlayer+" to team="+team+"!");
        }

        //## REMOVE PLAYER FROM TABLE
        /** local call from interaction made to all connected players, removes a player from the game */
        public LocalRemovePlayerFromTeam(team:number) {
            if(isDebugging) console.log(debugTag+"<LOCAL> removing player from team="+team+"...");
            //only allow changes if game is not in session
            if(this.curState != TABLE_GAME_STATE.IDLE) return;
            
            //send networking call
            Table.EmitRemovePlayerFromTeam(this.TableID, team);
        }
        /**remote call from a connected player, removes a player from the game */
        public RemoteRemovePlayerFromTeam(team:number) {
            if(isDebugging) console.log(debugTag+"<REMOTE> removing player from team="+team+"...");

            //if player is local player
            if(PlayerLocal.DisplayName() == this.teamObjects[team].RegisteredPlayer) {
                //unlink table from local player
                PlayerLocal.CurTableID = undefined;
                PlayerLocal.CurTeamID = undefined;
                //hide team display object states
                this.teamObjects[team].SetHandState(false);
                this.entityStateDisplays[0].SetState(false);
                this.entityStateDisplays[1].SetState(false);
            }

            //reset ready state
            this.LocalSetPlayerReadyState(team, false);

            //remove player from team
            this.teamObjects[team].RegisteredPlayer = undefined;

            //clear deck
            const deck = this.teamObjects[team].RegisteredDeck;
            if(deck != undefined) {
                deck.Clean();
            } else {
                console.log("<ERROR>: table="+this.tableID+", team="+team+" does not have a valid deck, likely mismanaged table states");
                return;
            }

            //update players tied to table
            this.UpdatePlayerDisplay();
            //update team buttons
            this.teamObjects[team].UpdateButtonStates();
            if(isDebugging) console.log(debugTag+"<REMOTE> removed player from team="+team+"!");
        }

        //## SET READY STATE OF TEAM ON TABLE
        /** local call from interaction made to all connected players, sets the given team's ready state 
         *      when a player sets their ready state to true their deck is passed to the table
        */
        public LocalSetPlayerReadyState(team:number, state:boolean) {
            if(isDebugging) console.log(debugTag+"<LOCAL> setting ready state table="+this.TableID+" team="+team+" to "+state+"...");
            
            //ensure local player has the authority to change ready state
            if(PlayerLocal.DisplayName() != this.teamObjects[team].RegisteredPlayer) return;
            
            //if player is readying, send deck for master
            var serial = "";
            if(state) serial = PlayerLocal.GetPlayerDeck().Serialize();

            //send networking call
            Table.EmitSetPlayerReadyState(this.TableID, team, state, serial);
        }
        /** remote call from a connected player, sets the given team's ready state */
        public RemoteSetPlayerReadyState(team:number, state:boolean, serial:string) {
            if(isDebugging) console.log(debugTag+"<REMOTE> setting ready state table="+this.TableID+" team="+team+" to "+state+"...");
            
            //update team's state
            this.teamObjects[team].ReadyState = state;
            this.teamObjects[team].UpdateButtonStates();

            //deserialize team's deck (if team is de-readying, deck will be cleared)
            const deck = this.teamObjects[team].RegisteredDeck;
            if(deck != undefined) {
                deck.Deserial(serial);
            } else {
                console.log("<ERROR>: table="+this.tableID+", team="+team+" does not have a valid deck, likely mismanaged table states");
                return;
            }

            //if local player is table owner
            if(PlayerLocal.DisplayName() == this.TableOwner) {
                //if both of player are ready, start game
                for(let i:number=0; i<this.teamObjects.length; i++) {
                    if(!this.teamObjects[i].ReadyState) return;
                }
                this.LocalStartGame();
            }
            if(isDebugging) console.log(debugTag+"<REMOTE> set ready state table="+this.TableID+" team="+team+" to "+state+"!");
        }

        //## STARTS GAME
        /** local call from interaction made to all connected players, starts game */
        public LocalStartGame() {
            if(isDebugging) console.log(debugTag+"<LOCAL> starting game on table="+this.TableID+"...");

            //send networking call
            Table.EmitStartGame(this.TableID);
        }
        /** remote call from a connected player, starts game */
        public RemoteStartGame() {
            if(isDebugging) console.log(debugTag+"<REMOTE> starting game on table="+this.TableID+"...");

            //set entry table state
            this.curTurn = this.teamObjects.length-1;
            this.curRound = 0;
            this.selectedCardObject = undefined;
            this.selectedCardSlotTeam = undefined;
            this.selectedCardSlotIndex = undefined;
            this.SetLobbyState(TABLE_GAME_STATE.ACTIVE);

            //process each team
            for(let i:number=0; i<this.teamObjects.length; i++) {
                //reset team
                this.teamObjects[i].Reset();

                //if local player belongs to team OR (local player owns table and team's type is AI)
                if(PlayerLocal.DisplayName() == this.teamObjects[i].RegisteredPlayer ||
                    (PlayerLocal.DisplayName() == this.TableOwner && this.teamObjects[i].TeamType == TABLE_TEAM_TYPE.AI)) {
                    //provide team with initial hand cards
                    for(let j:number=0; j<STARTING_CARD_COUNT; j++) {
                        this.teamObjects[i].DrawCard();
                    }
                }
            }

            //if player is table owner
            if(PlayerLocal.DisplayName() == this.TableOwner) {
                //start next turn
                this.LocalNextTurn();
            }

            if(isDebugging) console.log(debugTag+"<REMOTE> started game on table="+this.TableID+"!");
        }
        
        //## STARTS NEXT TURN
        /** begins the next turn  */
        public LocalNextTurn() {
            if(isDebugging) console.log(debugTag+"<LOCAL> table="+this.TableID+" starting new turn...");
            //push to next player's turn
            this.teamObjects[this.curTurn].TurnState = TABLE_TURN_TYPE.INACTIVE;
            this.curTurn++;
            if(this.curTurn >= this.teamObjects.length) {
                this.curTurn = 0;
                this.curRound++;
            }
            this.teamObjects[this.curTurn].TurnState = TABLE_TURN_TYPE.ACTIVE;

            //add energy to team's pool
            this.teamObjects[this.curTurn].EnergyCur += this.teamObjects[this.curTurn].EnergyGain;
            //add cards to team's hand
            this.teamObjects[this.curTurn].DrawCard();

            //update team displays
            this.RedrawTeamDisplays();
            //update turn display
            TextShape.getMutable(this.entityLobbyTurn).text = this.teamObjects[this.curTurn].RegisteredPlayer +"'S TURN (ROUND: "+this.curRound+")";

            //if ai's turn, start processing
            if(this.teamObjects[this.curTurn].TeamType == TABLE_TEAM_TYPE.AI) {
                SetAIState(true, this);
            }

            //update team buttons
            this.teamObjects[this.curTurn].UpdateButtonStates();
            if(isDebugging) console.log(debugTag+"<LOCAL> table="+this.TableID+" started new turn="+this.curTurn+", round="+this.curRound+"!");
        }
        public RemoteNextTurn() {
            
        }
        
        /** called when a selection attempt is made by the player */
        public InteractionCardObjectSelection(team:number, cardID:string, aiPVE:boolean=false) {
            if(isDebugging) console.log(debugTag+"local player interacted with card="+cardID);
            
            //ensure team has a player (might be viewing the end of a game)
            if(this.teamObjects[team].RegisteredPlayer == undefined) return;

            //ensure caller is part of the team or the local AI
            if(!aiPVE && this.teamObjects[team].RegisteredPlayer != PlayerLocal.DisplayName()) {
                if(isDebugging) console.log(debugTag+"local player="+PlayerLocal.DisplayName+" did not belong to required team="+team
                    +", owner="+this.teamObjects[team].RegisteredPlayer);
                return;
            }

            //if a card is already selected
            if(this.selectedCardObject != undefined) {
                //if selected card is the same as given card
                if(this.selectedCardObject === cardID) {
                    //attempt to play the card
                    this.DeselectCard();
                    return;
                } 
                //if selected card is not the same as given card
                else {
                    this.DeselectCard();
                }

            }
            //select given card
            this.SelectCard(cardID);
        }
        
        /** called when an activation attempt is made by the player */
        public InteractionCardObjectActivate(team:number, cardID:string, aiPVE:boolean=false) {
            if(isDebugging) console.log(debugTag+"local player activated card="+cardID);
            
            //ensure team has a player (might be viewing the end of a game)
            if(this.teamObjects[team].RegisteredPlayer == undefined) return;

            //ensure caller is part of the team or the local AI
            if(!aiPVE && this.teamObjects[team].RegisteredPlayer != PlayerLocal.DisplayName()) {
                if(isDebugging) console.log(debugTag+"local player="+PlayerLocal.DisplayName+" did not belong to required team="+team
                    +", owner="+this.teamObjects[team].RegisteredPlayer);
                return;
            }

            //ensure card being activated is the selected card
            if(this.selectedCardObject != cardID) {
                if(isDebugging) console.log(debugTag+"card="+cardID+" being activated was not currently selected card="+this.selectedCardObject);
                return;
            }

            //select given card
            this.PlaySelectedCard();
        }

        /** selects a card from the player's hand */
        public SelectCard(key:string) {
            if(isDebugging) console.log(debugTag+"selecting card="+key+"...");
            
            //set key
            this.selectedCardObject = key;
            //update object display
            this.teamObjects[this.curTurn].UpdateCardObjectDisplay(key);

            if(isDebugging) console.log(debugTag+"selected card="+this.selectedCardObject+"!");
        }

        /** deselects the currently selected card */
        public DeselectCard() {
            if(isDebugging) console.log(debugTag+"deselecting card="+this.selectedCardObject+"...");

            //ensure selected card exists
            if(this.selectedCardObject == undefined) return;

            //set key
            this.selectedCardObject = undefined;
            //update object display
            this.teamObjects[this.curTurn].UpdateCardObjectDisplay("");

            if(isDebugging) console.log(debugTag+"deselected card="+this.selectedCardObject+"!");
        }
        
        /** called when a card is interacted with by the player */
        public InteractionCardSlot(team:number, slotID:number) {
            if(isDebugging) console.log(debugTag+"local player interacted with slot="+slotID);

            //if a card is already selected
            if(this.selectedCardSlotTeam != undefined) {
                if(this.selectedCardSlotTeam == team && this.selectedCardSlotIndex == slotID) {
                    this.DeselectSlot();
                } else {
                    this.SelectSlot(team, slotID);
                } 
            }
            else {
                this.SelectSlot(team, slotID);
            }
        }

        /** selects a card from the player's hand */
        public SelectSlot(team:number, slotID:number) {
            if(isDebugging) console.log(debugTag+"selecting slot{team="+team+", slot="+slotID+"}...");
            
            //set slot
            this.selectedCardSlotTeam = team;
            this.selectedCardSlotIndex = slotID;
            //update object display
            this.teamObjects[0].UpdateCardSlotDisplay();
            this.teamObjects[1].UpdateCardSlotDisplay();
            this.teamObjects[this.selectedCardSlotTeam].UpdateCardSlotDisplay(this.selectedCardSlotIndex);

            if(isDebugging) console.log(debugTag+"selected slot{team="+this.selectedCardSlotTeam+", slot="+this.selectedCardSlotIndex+"}!");
        }

        /** deselects the currently selected card */
        public DeselectSlot() {
            if(isDebugging) console.log(debugTag+"deselecting slot{team="+this.selectedCardSlotTeam+", slot="+this.selectedCardSlotIndex+"}...");

            //update object display
            this.teamObjects[0].UpdateCardSlotDisplay();
            this.teamObjects[1].UpdateCardSlotDisplay();
            //set slot
            this.selectedCardSlotTeam = undefined;
            this.selectedCardSlotIndex = undefined;

            if(isDebugging) console.log(debugTag+"deselected slot{team="+this.selectedCardSlotTeam+", slot="+this.selectedCardSlotIndex+"}!");
        }

        /** attempts to play the currently selected card */
        public PlaySelectedCard() {
            if(isDebugging) console.log(debugTag+"playing card="+this.selectedCardObject
                +", slot{team="+this.selectedCardSlotTeam+", slot="+this.selectedCardSlotIndex+"}...");

            //ensure card is selected
            if(this.selectedCardObject == undefined) {
                if(isDebugging) console.log(debugTag+"<FAILED> no selected card");
                return;
            }

            //get team
            const team = this.teamObjects[this.curTurn];
            //get selected card data 
            const cardData = PlayCard.GetByKey(this.selectedCardObject);
            if(!cardData)  {
                if(isDebugging) console.log(debugTag+"<FAILED> could not find card data (key="+this.selectedCardObject+")");
                return;
            }
            //ensure player has enough energy
            if(cardData.Cost > team.EnergyCur) {
                if(isDebugging) console.log(debugTag+"<FAILED> player does not have enough energy to play card");
                return;
            }

            //process by card type
            switch(cardData.DefData.type) {
                case CARD_TYPE.SPELL:

                break;
                case CARD_TYPE.CHARACTER:
                    //ensure slot is selected
                    if(this.selectedCardSlotIndex == undefined || this.selectedCardSlotIndex == undefined) {
                        if(isDebugging) console.log(debugTag+"<FAILED> no selected slot");
                        return;
                    }
                    //ensure slot belongs to current team (cannot place characters into other team's slots) 
                    if(this.curTurn != this.selectedCardSlotTeam) {
                        if(isDebugging) console.log(debugTag+"<FAILED> targeted slot="+this.curTurn+" does not belong to current team="+this.selectedCardSlotTeam);
                        return;
                    }
                    //ensure slot does not already have a character
                    if(team.IsCardSlotOccupied(this.selectedCardSlotIndex)) {
                        if(isDebugging) console.log(debugTag+"<FAILED> targeted slot="+this.curTurn+" is currently occupied");
                        return;
                    }

                    //move card from hand to field
                    team.MoveCardBetweenCollections(cardData, 
                        PlayCardDeck.DECK_CARD_STATES.HAND,
                        PlayCardDeck.DECK_CARD_STATES.FIELD
                    );
                    //remove card object
                    team.RemoveHandObject(cardData);
                    //display character on slot
                    team.SetSlotObject(cardData, this.selectedCardSlotIndex);
                break;
                case CARD_TYPE.TERRAIN:
                    //move card from hand to field
                    team.MoveCardBetweenCollections(cardData, 
                        PlayCardDeck.DECK_CARD_STATES.HAND,
                        PlayCardDeck.DECK_CARD_STATES.TERRAIN
                    );
                    //remove card object
                    team.RemoveHandObject(cardData);
                    //set new terrain card
                    team.SetTerrainCard(cardData);
                break;
            }

            //remove energy from player
            team.EnergyCur -= cardData.Cost;

            //redraw stats
            this.RedrawTeamDisplays();

            if(isDebugging) console.log(debugTag+"played card="+this.selectedCardObject
                +", slot{team="+this.selectedCardSlotTeam+", slot="+this.selectedCardSlotIndex+"}!");
            //deselect card
            this.DeselectCard();
            //deselect slot
            this.DeselectSlot();
        }

        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.isActive = false;
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
            //destroy all attached table teams
            while(this.teamObjects.length > 0) {
                const teamObject = this.teamObjects.pop();
                if(teamObject) teamObject.Destroy();
            }

            //destroy game object
            engine.removeEntity(this.entityParent);
        }
    }
    
    /** provides a new object (either pre-existing & un-used or entirely new) */
    export function Create(data:TableTeamCreationData):TableObject {
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
    
    //### NETWORKING PIPELINE
    //## ADD PLAYER TO TABLE
    //  send
    export function EmitAddPlayerToTeam(table:string, team:number, player:string) {
        if(isDebugging) console.log(debugTag+"<EMIT> adding player="+player+" to table="+table+", team="+team);
        Networking.MESSAGE_BUS.emit('txTableAddPlayer', {table, team, player});
    }
    //  recieve 
    Networking.MESSAGE_BUS.on('txTableAddPlayer', (data: {table:string, team:number, player:string}) => {
        //get table
        const table = GetByKey(data.table);
        if(table == undefined) return;
        table.RemoteAddPlayerToTeam(data.team, data.player);
    });
    //## REMOVE TABLE FROM PLAYER
    //  send
    export function EmitRemovePlayerFromTeam(table:string, team:number) {
        if(isDebugging) console.log(debugTag+"<EMIT> removing player from table="+table+", team="+team);
        Networking.MESSAGE_BUS.emit('txTableRemovePlayer', {table, team});
    }
    //  recieve 
    Networking.MESSAGE_BUS.on('txTableRemovePlayer', (data: {table:string, team:number}) => {
        //get table
        const table = GetByKey(data.table);
        if(table == undefined) return;
        table.RemoteRemovePlayerFromTeam(data.team);
    });
    //## SET READY STATE FOR TEAM
    //  send
    export function EmitSetPlayerReadyState(table:string, team:number, state:boolean, serial:string) {
        if(isDebugging) console.log(debugTag+"<EMIT> setting player ready state for table="+table+", team="+team+" to state="+state);
        Networking.MESSAGE_BUS.emit('txSetPlayerReadyState', {table, team, state, serial});
    }
    //  recieve
    Networking.MESSAGE_BUS.on('txSetPlayerReadyState', (data: {table:string, team:number, state:boolean, serial:string}) => {
        //get table
        const table = GetByKey(data.table);
        if(table == undefined) return;
        table.RemoteSetPlayerReadyState(data.team, data.state, data.serial);
    });
    //## STARTS GAME FOR TABLE
    //  send
    export function EmitStartGame(table:string) {
        if(isDebugging) console.log(debugTag+"<EMIT> starting game for table="+table);
        Networking.MESSAGE_BUS.emit('txStartGame', {table});
    }
    //  recieve
    Networking.MESSAGE_BUS.on('txStartGame', (data: {table:string}) => {
        //get table
        const table = GetByKey(data.table);
        if(table == undefined) return;
        table.RemoteStartGame();
    });

    //### AI CARD PLAYER (TODO: move into seperate namespace)
    /** current display state of ai */
    var aiDisplayState:boolean = false;
    /** current processing state of ai (playing card/attacking) */
    var aiProcessingState:number = 0;
    /** time delay between actions made by AI (ex: playing card) */
    const timeDelay:number = 1.5;
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
            aiProcessingState = 0;
            engine.addSystem(processingTurnAI);
        } else {
            engine.removeSystem(processingTurnAI);
        }
    }

    /** system used to act as a non-player card player at a card table */
    function processingTurnAI(dt: number) {
        //process time change
        timeCounter -= dt;
        //check if new action should be taken
        if(timeCounter > 0) return;
        timeCounter += timeDelay;
        //ensure table exists
        if(aiTable == undefined) {
            if(isDebugging) console.log(debugTag+"<ERROR> aiPlayer is processing but aiTable is undefined");
            SetAIState(false);
            return;
        } 
        var aiTeam = aiTable.teamObjects[aiTable.CurTurn];
        //ensure table has deck equipped
        var aiDeck = aiTeam.RegisteredDeck;
        if(aiDeck == undefined) {
            if(isDebugging) console.log(debugTag+"<ERROR> aiPlayer is processing but aiDeck is undefined");
            SetAIState(false);
            return;
        } 

        //attempt to play all cards
        if(aiProcessingState == 0) {
            if(isDebugging) console.log(debugTag+"aiPlayer selecting card...");
            //process all cards in NPC's hand to find next action
            for(let i:number=0; i<aiDeck.CardsPerState[PlayCardDeck.DECK_CARD_STATES.HAND].size(); i++) {
                var card = aiDeck.CardsPerState[PlayCardDeck.DECK_CARD_STATES.HAND].getItem(i);
                //if NPC does not have enough energy to play card, skip
                if(aiTeam.EnergyCur < card.Cost) continue;
                //process card based on type
                switch(card.DefData.type) {
                    case CARD_TYPE.CHARACTER:
                        //process every slot 
                        for(let j:number=0; j<aiTeam.cardSlotObjects.length; j++) {
                            //if slot is occupied, skip
                            if(aiTeam.IsCardSlotOccupied(j)) continue;
                            if(isDebugging) console.log(debugTag+"aiPlayer playing character card="+card.Key+" to slot="+j);
                            //select card & slot
                            aiTable.SelectCard(card.Key);
                            aiTable.SelectSlot(aiTable.CurTurn, j);
                            //play card
                            aiTable.PlaySelectedCard();
                            return;
                        }
                    break;
                    case CARD_TYPE.SPELL:
                        //if valid enemy unit is on field, cast at that unit
                        continue;
                    break;
                    case CARD_TYPE.TERRAIN:
                        //play card to field
                        continue;
                    break;
                }
            }
            //if no card was played, push state forward
            if(isDebugging) console.log(debugTag+"aiPlayer no viable cards remain");
            aiProcessingState++;
        }
        //attempt to make all units attack enemy units
        if(aiProcessingState == 1) {
            //process all units in NCP's field
                //if unit has not attacked yet
                    //select unit
                    //determine target
                    //send attack command
            //if no unit was given an attack command, push state forward
            if(isDebugging) console.log(debugTag+"aiPlayer no viable unit attacks remain");
            aiProcessingState++;
        }
        //end processing
        if(aiProcessingState == 2) {
            //end turn and remove system
            aiTable.LocalNextTurn();
            SetAIState(false);
        }
    }
}