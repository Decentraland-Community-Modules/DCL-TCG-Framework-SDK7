import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import Dictionary, { List } from "../utilities/collections";
import { Animator, Billboard, ColliderLayer, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PointerEventType, PointerEvents, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { TableTeam } from "./tcg-table-team";
import { InteractionObject } from "./tcg-interaction-object";
import { CardSubjectObject } from "./tcg-card-subject-object";
import { Player } from "./config/tcg-player";
import { PlayCardDeck } from "./tcg-play-card-deck";
import { CardDisplayObject } from "./tcg-card-object";
import { CARD_TYPE, CardData } from "./data/tcg-card-data";
import { PlayCard } from "./tcg-play-card";


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

    /** all possible lobby states */
    export enum LOBBY_STATE {
        IDLE,   //no game has started
        ACTIVE, //game is on-going
        OVER,   //game has finished (displaying results)
    } 

    /** */
    export enum LOBBY_BUTTONS {
        JOIN,
        START,
        LEAVE,
        END_TURN
    }

    /** model location for this team's boarder*/
    const MODEL_DEFAULT_BORDER:string = 'models/tcg-framework/card-table/card-table-arena.glb';
    /** model location for this default terrain */
    const MODEL_TERRAIN_DEFAULT:string = 'models/tcg-framework/card-terrain/terrain-neutral.glb';

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
    
    /** transform - lobby buttons */
    const BUTTON_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const BUTTON_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };

    /** indexing key */
    export function GetKeyFromObject(data:TableObject):string { return data.TableID; };
    export function GetKeyFromData(data:TableTeamCreationData):string { return data.tableID.toString(); };

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
        tableID: number,
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

        private curState:LOBBY_STATE = LOBBY_STATE.IDLE;
        public get CurState():LOBBY_STATE { return this.curState; };

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
        /** interaction object to join game */
        private entityLobbyJoin:Entity;
        /** interaction object to start game */
        private entityLobbyStart:Entity;
        /** interaction object to leave lobby */
        private entityLobbyLeave:Entity;
        /** interaction object to end turn */
        private entityLobbyEndTurn:Entity;

        //state display objects
        private entityStateDisplays:TableTeam.TeamDisplayObject[];

        //pve npc enemy entity
        private characterNPC: CardSubjectObject.CardSubjectObject;

        /** all team objects */
        public teamObjects: TableTeam.TableTeamObject[] = [];

        /**  */
        public GetPlayerString():string {
            //TODO: fix for #v#
            var str:string = "";
            //team 0
            if(this.teamObjects[0].Player) str += this.teamObjects[0].Player;
            else str += "<WAITING>";
            str += " VS ";
            //team 1
            if(this.teamObjects[1].Player) str += this.teamObjects[1].Player;
            else str += "<WAITING>";
        
            return str;
        }
        /**  */
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
            //  join button
            this.entityLobbyJoin = engine.addEntity();
            Transform.create(this.entityLobbyJoin, {
                parent: this.entityLobbyParent,
                position: {x:0,y:-1.25,z:0},
                scale: {x:1,y:1,z:1},
            });
            GltfContainer.create(this.entityLobbyJoin, {
                src: 'models/tcg-framework/card-table/text-join.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityLobbyJoin, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "JOIN GAME" }
                  },
                ]
            });
            //  start button
            this.entityLobbyStart = engine.addEntity();
            Transform.create(this.entityLobbyStart, {
                parent: this.entityLobbyParent,
                position: {x:-2,y:-1.25,z:0},
                scale: {x:1,y:1,z:1},
            });
            GltfContainer.create(this.entityLobbyStart, {
                src: 'models/tcg-framework/card-table/text-start.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityLobbyStart, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "START GAME" }
                  },
                ]
            });
            //  leave button
            this.entityLobbyLeave = engine.addEntity();
            Transform.create(this.entityLobbyLeave, {
                parent: this.entityLobbyParent,
                position: {x:2,y:-1.25,z:0},
                scale: {x:1,y:1,z:1},
            });
            GltfContainer.create(this.entityLobbyLeave, {
                src: 'models/tcg-framework/card-table/text-leave.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityLobbyLeave, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "LEAVE GAME" }
                  },
                ]
            });
            //  end turn button
            this.entityLobbyEndTurn = engine.addEntity();
            Transform.create(this.entityLobbyEndTurn, {
                parent: this.entityLobbyParent,
                position: {x:0,y:-1.65,z:0},
                scale: {x:1,y:1,z:1},
            });
            GltfContainer.create(this.entityLobbyEndTurn, {
                src: 'models/tcg-framework/card-table/text-end-turn.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityLobbyEndTurn, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "END TURN" }
                  },
                ]
            });

            //create and set position for team displays
            this.entityStateDisplays = [];
            for(let i:number=0; i<2; i++) {
                this.entityStateDisplays.push(new TableTeam.TeamDisplayObject(this.entityParent));
            }
            this.entityStateDisplays[0].SetPosition({x:4, y:3.2, z:-3.5});
            this.entityStateDisplays[0].SetRotation({x:0,y:240,z:0});
            this.entityStateDisplays[1].SetPosition({x:3.5, y:3.2, z:2.25});
            this.entityStateDisplays[1].SetRotation({x:0,y:300,z:0});

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
                    tableID: this.TableID,
                    teamID: i.toString(),
                    parent: this.entityParent,
                    position: FIELD_TEAM_OFFSET[i],
                    rotation: FIELD_TEAM_ROTATION[i]
                });
                this.teamObjects.push(teamObject);
            }
            
            //update button interactions
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityLobbyJoin, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                actionPrimary: this.tableID,
                actionSecondary: LOBBY_BUTTONS.JOIN,
            });
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityLobbyStart, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                actionPrimary: this.tableID,
                actionSecondary: LOBBY_BUTTONS.START,
            });
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityLobbyLeave, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                actionPrimary: this.tableID,
                actionSecondary: LOBBY_BUTTONS.LEAVE,
            });
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityLobbyEndTurn, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                actionPrimary: this.tableID,
                actionSecondary: LOBBY_BUTTONS.END_TURN,
            });
            
            //(DEMO ONLY)add NPC for combat
            this.teamObjects[1].Player = "Golemancer (lvl 1)";
            this.teamObjects[1].TeamType = TableTeam.TEAM_TYPE.AI;
            this.teamObjects[1].PlayerDeck = Player.DeckPVE;

            //set default lobby state
            this.SetLobbyState(LOBBY_STATE.IDLE);
            this.UpdatePlayerDisplay();
        }

        /** adds a player to the game */
        public AddPlayerToTeam(player:string) {
            if(isDebugging) console.log(debugTag+"adding player="+player+" to game...");
            //only allow changes if game is not in session
            if(this.curState != LOBBY_STATE.IDLE) return;
            //TODO: check if this player already exists

            //attempt to get open slot
            var teamPos:number = -1;
            for(let i:number=0; i<this.teamObjects.length; i++) {
                if(this.teamObjects[i].Player != undefined) continue;
                teamPos = i;
                break;
            }
            if(teamPos == -1) return;

            //add player to team
            this.teamObjects[teamPos].Player = player;
            this.teamObjects[teamPos].PlayerDeck = Player.GetPlayerDeck();

            //update players tied to table
            this.UpdatePlayerDisplay();

            //TODO: expand past single player experience
            //manage buttons
            Transform.getMutable(this.entityLobbyJoin).scale = BUTTON_SCALE_OFF;
            Transform.getMutable(this.entityLobbyStart).scale = BUTTON_SCALE_ON;
            Transform.getMutable(this.entityLobbyLeave).scale = BUTTON_SCALE_ON;
            if(isDebugging) console.log(debugTag+"added player="+player+" to game (team="+teamPos+")!");
        }

        /** removes a player from the game */
        public RemovePlayerFromTeam(player:string) {
            if(isDebugging) console.log(debugTag+"removing player="+player+" from game...");
            //only allow changes if game is not in session
            if(this.curState != LOBBY_STATE.IDLE) return;

            //attempt to find requested player
            var teamPos:number = -1;
            for(let i:number=0; i<this.teamObjects.length; i++) {
                if(this.teamObjects[i].Player != player) continue;
                teamPos = i;
                break;
            }
            if(teamPos == -1) return;

            //add player to team
            this.teamObjects[teamPos].Player = undefined;
            this.teamObjects[teamPos].PlayerDeck = undefined;

            //update players tied to table
            this.UpdatePlayerDisplay();
            
            //TODO: expand past single player experience
            //manage buttons
            Transform.getMutable(this.entityLobbyJoin).scale = BUTTON_SCALE_ON;
            Transform.getMutable(this.entityLobbyStart).scale = BUTTON_SCALE_OFF;
            Transform.getMutable(this.entityLobbyLeave).scale = BUTTON_SCALE_OFF;
            if(isDebugging) console.log(debugTag+"removed player="+player+" from game (team="+teamPos+")!");
        }

        //TODO: localize button controls based on which player has entered/is included in the game
        /** sets the lobby display state */
        public SetLobbyState(state:LOBBY_STATE) {
            this.curState = state;
            const textShape = TextShape.getMutable(this.entityLobbyState);
            switch(state) {
                case LOBBY_STATE.IDLE:
                    //update text
                    textShape.text = "JOIN TO PLAY";
                    //set button states
                    Transform.getMutable(this.entityLobbyJoin).scale = BUTTON_SCALE_ON;
                    Transform.getMutable(this.entityLobbyStart).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityLobbyLeave).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityLobbyEndTurn).scale = BUTTON_SCALE_OFF;
                    //hide team displays
                    this.entityStateDisplays[0].SetState(false);
                    this.entityStateDisplays[1].SetState(false);
                break;
                case LOBBY_STATE.ACTIVE:
                    //update text
                    textShape.text = "IN SESSION";
                    //set button states
                    Transform.getMutable(this.entityLobbyJoin).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityLobbyStart).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityLobbyLeave).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityLobbyEndTurn).scale = BUTTON_SCALE_ON;
                    //show team displays
                    this.entityStateDisplays[0].SetState(true);
                    this.entityStateDisplays[1].SetState(true);
                break;
                case LOBBY_STATE.OVER:
                    //update text
                    textShape.text = "<GAME_RESULT>";//TODO: display who won the match
                    //set button states
                    Transform.getMutable(this.entityLobbyJoin).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityLobbyStart).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityLobbyLeave).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityLobbyEndTurn).scale = BUTTON_SCALE_OFF;
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

        /** prepares both sides and starts the game */
        public StartGame() {
            if(isDebugging) console.log(debugTag+"table="+this.TableID+" starting game...");

            //set initial states
            this.curTurn = -1;
            this.curRound = 0;
            this.selectedCardObject = undefined;
            this.selectedCardSlotTeam = undefined;
            this.selectedCardSlotIndex = undefined;
            this.SetLobbyState(LOBBY_STATE.ACTIVE);

            //process each team
            for(let i:number=0; i<this.teamObjects.length; i++) {
                //reset team
                this.teamObjects[i].Reset();

                //add cards to hand
                for(let j:number=0; j<STARTING_CARD_COUNT; j++) {
                    this.teamObjects[i].DrawCard();
                }
            }

            this.NextTurn();
            if(isDebugging) console.log(debugTag+"table="+this.TableID+" started game!");
        }
        
        /** begins the next turn  */
        public NextTurn() {
            if(isDebugging) console.log(debugTag+"table="+this.TableID+" starting new turn...");
            //push to next player's turn
            this.curTurn++;
            if(this.curTurn >= this.teamObjects.length) {
                this.curTurn = 0;
                this.curRound++;
            }

            //TODO: move down to team obj level
            //add energy to team's pool
            this.teamObjects[this.curTurn].EnergyCur += this.teamObjects[this.curTurn].EnergyGain;
            //add cards to team's hand
            this.teamObjects[this.curTurn].DrawCard();

            //update team displays
            this.RedrawTeamDisplays();
            //update turn display
            TextShape.getMutable(this.entityLobbyTurn).text = this.teamObjects[this.curTurn].Player +"'S TURN (ROUND: "+this.curRound+")";

            //if ai's turn, start processing
            if(this.teamObjects[this.curTurn].TeamType == TableTeam.TEAM_TYPE.AI) {
                SetAIState(true, this);
            }

            if(isDebugging) console.log(debugTag+"table="+this.TableID+" started new turn="+this.curTurn+", round="+this.curRound+"!");
        }
        
        /** called when a selection attempt is made by the player */
        public InteractionCardObjectSelection(team:number, cardID:string, aiPVE:boolean=false) {
            if(isDebugging) console.log(debugTag+"local player interacted with card="+cardID);
            
            //ensure team has a player (might be viewing the end of a game)
            if(this.teamObjects[team].Player == undefined) return;

            //ensure caller is part of the team or the local AI
            if(!aiPVE && this.teamObjects[team].Player != Player.DisplayName()) {
                if(isDebugging) console.log(debugTag+"local player="+Player.DisplayName+" did not belong to required team="+team
                    +", owner="+this.teamObjects[team].Player);
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
            if(this.teamObjects[team].Player == undefined) return;

            //ensure caller is part of the team or the local AI
            if(!aiPVE && this.teamObjects[team].Player != Player.DisplayName()) {
                if(isDebugging) console.log(debugTag+"local player="+Player.DisplayName+" did not belong to required team="+team
                    +", owner="+this.teamObjects[team].Player);
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
        const key:string = GetKeyFromObject(object);
        //adjust collections
        //  add to inactive listing (ensure add is required)
        var posX = pooledObjectsInactive.getItemPos(object);
        if(posX == -1) pooledObjectsInactive.addItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(key)) pooledObjectsRegistry.removeItem(key);

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
        const key:string = GetKeyFromObject(object);
        //adjust collections
        //  remove from overhead listing
        pooledObjectsAll.removeItem(object);
        //  remove from inactive listing
        pooledObjectsInactive.removeItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(key)) pooledObjectsRegistry.removeItem(key);

        //send destroy command
        object.Destroy();
        //TODO: atm we rely on DCL to clean up object data class. so far it hasn't been an issue due to how
        //  object data is pooled, but we should look into how we can explicitly set data classes for removal
    }
    
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
        var aiDeck = aiTeam.PlayerDeck;
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
            aiTable.NextTurn();
            SetAIState(false);
        }
    }
}