import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { Dictionary, List } from "../utilities/collections";
import { Billboard, ColliderLayer, Entity, Font, GltfContainer, InputAction, MeshCollider, MeshRenderer, PointerEventType, PointerEvents, Schemas, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { TableCardSlot } from "./tcg-table-card-slot";
import { PlayCardDeck } from "./tcg-play-card-deck";
import { CardDisplayObject } from "./tcg-card-object";
import { PlayCard } from "./tcg-play-card";
import { InteractionObject } from "./tcg-interaction-object";
import { CARD_OBJECT_OWNER_TYPE, TABLE_GAME_STATE, TABLE_TEAM_TYPE, TABLE_TURN_TYPE } from "./config/tcg-config";
import { PlayerLocal } from "./config/tcg-player-local";
import { STATUS_EFFECT_AFFINITY } from "./data/tcg-status-effect-data";
import { CARD_KEYWORD_EFFECT_EXECUTION } from "./data/tcg-keyword-data";

/*      TRADING CARD GAME - TABLE CARD TEAM
    represents team on a table

    TODO:
    - display deck selection options

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module TableTeam {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Table Team: ";

    /** all lobby buttons */
    export enum LOBBY_BUTTONS {
        TEAM_JOIN,
        TEAM_LEAVE,
        TEAM_READY,
        TEAM_UNREADY,
        TEAM_TARGET,
        GAME_END_TURN,
        GAME_LEAVE,
    }

    /** model location for this team's boarder*/
    const MODEL_DEFAULT_BORDER:string = 'models/tcg-framework/card-table/terrain-border.glb';
    /** model location for this team's terrain */
    const MODEL_DEFAULT_TERRAIN:string = 'models/tcg-framework/card-terrain/terrain-neutral.glb';

    /** transform - parent */
    const PARENT_OFFSET_ON:Vector3 = { x:0, y:0, z:0 };
    const PARENT_OFFSET_OFF:Vector3 = { x:0, y:-10, z:0 };
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };

    /** transform - team selector */
    const SELECTOR_SCALE_ON:Vector3 = { x:3, y:3, z:0 };

    /** transform - card holder */
    const CARD_HOLDER_OFFSET:Vector3 = { x:0, y:1.5, z:4.75 };
    const CARD_HOLDER_SCALE:Vector3 = { x:0.95, y:0.95, z:0.95 };
    const CARD_HOLDER_ROTATION:Vector3 = { x:50, y:180, z:0 };
    const CARD_SCALE:Vector3 = { x:0.125, y:0.125, z:0.125 };

    /** transform - buttons */
    const BUTTON_SCALE_NORMAL:Vector3 = { x:0.5, y:0.5, z:0.5 };
    const BUTTON_SCALE_SMALL:Vector3 = { x:0.25, y:0.25, z:0.25 };
    const BUTTON_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };

    /** positions for card slots on field */
    const CARD_SLOT_POSITIONS:Vector3[] = [
        { x:0, y:0, z:1.5 },
        { x:2, y:0, z:1.5 },
        { x:-2, y:0, z:1.5 },
        { x:4, y:0, z:1.5 },
        { x:-4, y:0, z:1.5 },
    ];

    /** indexing key */
    export function GetKeyFromData(data:TableTeamCreationData):string { return data.tableID+"-"+data.teamID; };

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<TableTeamObject> = new List<TableTeamObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<TableTeamObject> = new List<TableTeamObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<TableTeamObject> = new List<TableTeamObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<TableTeamObject> = new Dictionary<TableTeamObject>();
    
    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|TableTeamObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }

    /** component for on-click interactions */
    export const TableTeamComponentData = {
        //indexing
        tableID:Schemas.Number,
        teamID:Schemas.Number,
        //targeting (per button, ex: join/leave button)
        action:Schemas.String,
    }
	/** define component, adding it to the engine as a managed behaviour */
    export const TableTeamSlotComponent = engine.defineComponent("TableTeamComponentData", TableTeamComponentData);

	/** object interface used to define all data required to create a team */
	export interface TableTeamCreationData {
        //indexing
        tableID: number,
        teamID: number,
        //callbacks
        callbackTable?: (key:string) => TABLE_GAME_STATE,
        //position
        parent: undefined|Entity, //entity to parent object under 
		position: { x:number; y:number; z:number; }; //new position for object
		rotation: { x:number; y:number; z:number; }; //new rotation for object
	}

    /** represents a team, packed to be passed over the network */
    export interface TeamSerialData {
        //state
        playerID:string;
        playerName:string;
        readyState:boolean;
        healthCur:number;
        energyCur:number;
        energyGain:number;
        //defines starting deck state
        deckRegistered:string;
        //defines the location of all cards owned by this team
        deckSession:PlayCard.CardSerialData[][];
        slotCards:string[];
        terrainCard:string;
    }

    /** contains all 3D objects required to display a team's current state (name,hp,etc.) */
    export class TeamDisplayObject {
        //parent/pivot
        private entityParent:Entity;
        private entityModel:Entity;
        private entityName:Entity;
        private entityHealth:Entity;
        private entityEnergy:Entity;
        private entityDeck:Entity;
        private entityHand:Entity;
        private entityDiscard:Entity;

        /**  */
        constructor(parent:Entity) {
            //parent
            this.entityParent = engine.addEntity();
            Transform.create(this.entityParent, { parent: parent, rotation: Quaternion.fromEulerDegrees(0,-90,0) });
            //model
            this.entityModel = engine.addEntity();
            Transform.create(this.entityModel, { parent: this.entityParent, scale: {x:1.2,y:1.2,z:1.2}, rotation: Quaternion.fromEulerDegrees(0,180,0) });
            GltfContainer.create(this.entityModel, {
                src: 'models/tcg-framework/menu-displays/display-frame-wide.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            //name
            this.entityName = engine.addEntity();
            Transform.create(this.entityName, { parent: this.entityParent, position: {x:0,y:0.525,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityName);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "<PLAYER_NAME>";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
            //health
            this.entityHealth = engine.addEntity();
            Transform.create(this.entityHealth, { parent: this.entityParent, position: {x:-1.15,y:0.25,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityHealth);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "HEALTH: ###";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
            //energy
            this.entityEnergy = engine.addEntity();
            Transform.create(this.entityEnergy, { parent: this.entityParent, position: {x:-1.15,y:0.0,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityEnergy);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "ENERGY: ##";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
            //deck
            this.entityDeck = engine.addEntity();
            Transform.create(this.entityDeck, { parent: this.entityParent, position: {x:0.225,y:0.25,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityDeck);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "DECK: ##";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
            //hand
            this.entityHand = engine.addEntity();
            Transform.create(this.entityHand, { parent: this.entityParent, position: {x:0.225,y:0,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityHand);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "HAND: ##";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
            //discard
            this.entityDiscard = engine.addEntity();
            Transform.create(this.entityDiscard, { parent: this.entityParent, position: {x:0.225,y:-0.25,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityDiscard);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "DISCARD: ##";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
        }

        public SetPosition(pos:Vector3) {
            Transform.getMutable(this.entityParent).position = pos;
        }
        public SetRotation(rot:Vector3) {
            Transform.getMutable(this.entityParent).rotation = Quaternion.fromEulerDegrees(rot.x, rot.y, rot.z);
        }

        /** updates the display view based on the given team */
        public ResetView(team:TableTeamObject) {
            TextShape.getMutable(this.entityName).text = team.RegisteredPlayerName??"<ERROR: NO PLAYER>";
            TextShape.getMutable(this.entityHealth).text = "HEALTH: --";
            TextShape.getMutable(this.entityEnergy).text = "ENERGY: --";
            TextShape.getMutable(this.entityDeck).text = "DECK: --";
            TextShape.getMutable(this.entityHand).text = "HAND: --";
            TextShape.getMutable(this.entityDiscard).text = "DISCARD: --";
        }

        /** updates the display view based on the given team */
        public UpdateView(team:TableTeamObject) {
            TextShape.getMutable(this.entityName).text = team.RegisteredPlayerName??"<ERROR: NO PLAYER>";
            TextShape.getMutable(this.entityHealth).text = "HEALTH: "+team.HealthCur;
            TextShape.getMutable(this.entityEnergy).text = "ENERGY: "+team.EnergyCur+" ("+team.EnergyGain+")";
            TextShape.getMutable(this.entityDeck).text = "DECK: "+team.GetCardCount(PlayCardDeck.DECK_CARD_STATES.DECK);
            TextShape.getMutable(this.entityHand).text = "HAND: "+team.GetCardCount(PlayCardDeck.DECK_CARD_STATES.HAND);
            TextShape.getMutable(this.entityDiscard).text = "DISCARD: "+team.GetCardCount(PlayCardDeck.DECK_CARD_STATES.DISCARD);
        }

        /** sets the display state of the object */
        public SetState(state:boolean) {
            if(state) Transform.getMutable(this.entityParent).scale = Vector3.One();
            else Transform.getMutable(this.entityParent).scale = Vector3.Zero();
        }
    }

    /** represents a team on a card field */
    export class TableTeamObject {
        /** when true this object is reserved in-scene */
        private isActive:boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** unique index of this slot's table */
        private tableID:number = -1;
        public get TableID():string { return this.tableID.toString(); };

        /** unique index of this slot's team */
        private teamID:number = -1;
        public get TeamID():string { return this.teamID.toString(); };

        /** unique key of this slot */
        public get Key():string { return this.TableID+"-"+this.TeamID; };

        /** type of user registered to this table */
        public TeamType:TABLE_TEAM_TYPE = TABLE_TEAM_TYPE.HUMAN;

        /** callback to get game state of table */
        private getGameState(key:string) {
            if(isDebugging) console.log(debugTag+"<WARNING> using default callback");
            return TABLE_GAME_STATE.IDLE;
        }
        public callbackGetGameState:(key:string) => TABLE_GAME_STATE = this.getGameState;

        /** this team's current game state */
        public TurnState:TABLE_TURN_TYPE = TABLE_TURN_TYPE.INACTIVE;

        /** current player's ID */
        public RegisteredPlayerID:undefined|string;
        /** current player's name */
        public RegisteredPlayerName:undefined|string;
        
        /** initial set of cards (on start) */
        public DeckRegistered:undefined|PlayCardDeck.PlayCardDeckObject;
        /** set of cards currently actively being used */
        public DeckSession:undefined|PlayCardDeck.PlayCardDeckObject;
        /** prepares session deck */
        public PrepareSessionDeck() {
            //ensure both required deck instances exist
            if(this.DeckRegistered && this.DeckSession) {
                //repopulate session deck
                this.DeckSession.Clone(this.DeckRegistered);
                //shuffle decks
                this.DeckSession.ShuffleCards();
            }
        }

        /** returns card count per targeted collection */
        public GetCardCount(target:PlayCardDeck.DECK_CARD_STATES) {
            if(!this.DeckSession) return 0;
            return this.DeckSession.CardsPerState[target].size();
        }
        /** returns card's play data based on given index */
        public GetCardData(target:PlayCardDeck.DECK_CARD_STATES, index:number) {
            return this.DeckSession?.CardsPerState[target].getItem(index);
        }

        /** when true, this team is ready to start the game */
        private readyState:boolean = false;
        public get ReadyState():boolean {
            if(this.TeamType == TABLE_TEAM_TYPE.AI) return true;
            return this.readyState;
        }
        public set ReadyState(value:boolean) { this.readyState = value; }

        /** team's current health (at zero the lose) */
        private healthCur:number = 0;
        public get HealthCur():number { return this.healthCur; }
        public set HealthCur(value:number) { 
            this.healthCur = value;
            TextShape.getMutable(this.entityDisplayHealth).text = "HEALTH: "+this.healthCur;
        }

        /** resource for playing new cards to the field */
        private energyCur:number = 0;
        public get EnergyCur():number { return this.energyCur; }
        public set EnergyCur(value:number) { 
            this.energyCur = value;
            TextShape.getMutable(this.entityDisplayEnergy).text = "ENERGY: "+this.energyCur+" ("+this.energyGain+")";
        }
        /** amount of energy gained at the start of the next turn */
        private energyGain:number = 0;
        public get EnergyGain():number { return this.energyGain; }
        public set EnergyGain(value:number) { 
            this.energyGain = value;
            TextShape.getMutable(this.entityDisplayEnergy).text = "ENERGY: "+this.energyCur+" ("+this.energyGain+")";
        }

        /** parental position */
        private entityParent:Entity;

        /** team selection object, for other teams targeting this */
        private entityTeamTargetorInteraction:Entity;
        private entityTeamTargetorView:Entity;
        public SetTeamTargetState(state:boolean) {
            if(state) Transform.getMutable(this.entityTeamTargetorView).scale = PARENT_SCALE_ON;
            else Transform.getMutable(this.entityTeamTargetorView).scale = PARENT_SCALE_OFF;
        }

        //## PLAYER STATE DISPLAYS
        /** display parent */
        private entityDisplayParent:Entity
        /** displays player's current health */
        private entityDisplayHealth:Entity;
        /** displays player's current health */
        private entityDisplayEnergy:Entity;
        public UpdateStatsDisplay() {
            TextShape.getMutable(this.entityDisplayHealth).text = "HEALTH: "+this.healthCur;
            TextShape.getMutable(this.entityDisplayEnergy).text = "ENERGY: "+this.energyCur+" ("+this.energyGain+")";
        }

        //## FIELD DISPLAY OBJECTS
        /** battlefield's border */
        private entityBorder:Entity;
        /** battlefield's central terrain */
        private entityTerrain:Entity;

        //## LOBBY/STATE BUTTONS
        /** interaction object to join team */
        public entityJoinTeam:Entity;
        /** interaction object to leave team */
        public entityLeaveTeam:Entity;
        /** interaction object to ready */
        public entityReadyGame:Entity;
        /** interaction object to ready */
        public entityUnreadyGame:Entity;
        /** interaction object to end turn */
        public entityEndTurn:Entity;
        /** interaction object to leaving the game/forfeiting */
        public entityForfeit:Entity;

        //## HAND CARDS
        /** card display parent (where player cards are stored) */
        private handCardParent:Entity;
        private handCardObject:Entity;
        private handCards:List<CardDisplayObject.CardDisplayObject> = new List<CardDisplayObject.CardDisplayObject>();
        public GetHandCard(ID:string):undefined|CardDisplayObject.CardDisplayObject {
            for(let i:number=0; i<this.handCards.size(); i++) {
                if(this.handCards.getItem(i).SlotID == ID) return this.handCards.getItem(i);
            }
            return undefined;
        }
        public SetHandState(state:boolean) {
            if(state) Transform.getMutable(this.handCardParent).scale = CARD_HOLDER_SCALE;
            else Transform.getMutable(this.handCardParent).scale = PARENT_SCALE_OFF;
        }

        /** current terrain card */
        public TerrainCard:string = "";
        public SetTerrainCard(card:undefined|PlayCard.PlayCardDataObject) {
            //determine model string
            var terrainModel:string = "";
            if(card != undefined) { 
                this.TerrainCard = card.Key;
                terrainModel = card.DefData.objPath; 
            } else { 
                this.TerrainCard = "";
                terrainModel = MODEL_DEFAULT_TERRAIN; 
            }
            
            //set custom model
            GltfContainer.createOrReplace(this.entityTerrain, {
                src: terrainModel,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            if(isDebugging) console.log(debugTag+"table="+this.tableID+", team="+this.teamID+" setting terrain to src="+card?.DefData.objPath);
        }

        /** all card slot objects (used for displaying card characters) */
        public cardSlotObjects:TableCardSlot.TableCardSlotObject[] = [];
        public IsCardSlotOccupied(index:number):boolean { return this.cardSlotObjects[index].IsCardSlotOccupied() }

        /** prepares field team for use */
        constructor() {
            //create parent object
            this.entityParent = engine.addEntity();
            Transform.create(this.entityParent, {
                position: PARENT_OFFSET_ON,
                scale: PARENT_SCALE_ON,
            });
            //quick fix: collision buffer to stop player from getting trapped by the hand display object
            //TODO: cage player only when game is on-going
            const handBuffer = engine.addEntity();
            Transform.create(handBuffer, {
                parent: this.entityParent,
                position: CARD_HOLDER_OFFSET,
                scale: {x:2,y:0.75,z:1},
            });
            //MeshRenderer.setBox(handBuffer);
            MeshCollider.setBox(handBuffer,ColliderLayer.CL_PHYSICS);

            //create team targeter
            //  interaction object
            this.entityTeamTargetorInteraction = engine.addEntity();
            Transform.create(this.entityTeamTargetorInteraction, {
                parent: this.entityParent,
                position: {x:0,y:2.5,z:2.3},
                scale: {x:4,y:4,z:2},
            });
            PointerEvents.createOrReplace(this.entityTeamTargetorInteraction, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "SELECT ENEMY TEAM" }
                  },
                ]
            });
            MeshCollider.setBox(this.entityTeamTargetorInteraction);
            //MeshRenderer.setBox(this.entityTeamTargetInteraction);
            //  view object
            this.entityTeamTargetorView = engine.addEntity();
            Transform.create(this.entityTeamTargetorView, {
                parent: this.entityParent,
                position: {x:0,y:2.0,z:5.3},
                scale: PARENT_SCALE_OFF,
                rotation: Quaternion.fromEulerDegrees(0,0,0)
            });
            GltfContainer.create(this.entityTeamTargetorView, {
                src: 'models/tcg-framework/card-table/team-selection-indicator.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });

            //create team selection slot 
            //  parent object
            this.entityDisplayParent = engine.addEntity();
            Transform.create(this.entityDisplayParent, {
                parent: this.entityParent,
                position: {x:0,y:5,z:6.5},
                scale: {x:1,y:1,z:1},
            });
            Billboard.create(this.entityDisplayParent);
            //  health
            this.entityDisplayHealth = engine.addEntity();
            Transform.create(this.entityDisplayHealth, {
                parent: this.entityDisplayParent,
                position: {x:0,y:0.3,z:0},
                scale: {x:0.5,y:0.5,z:0.5},
            });
            TextShape.create(this.entityDisplayHealth, {
                text:"HEALTH: ###",
                fontSize: 12, 
                outlineWidth:0.1,
                outlineColor:Color4.Black(),
                textColor:Color4.Red()
            });
            //  energy
            this.entityDisplayEnergy = engine.addEntity();
            Transform.create(this.entityDisplayEnergy, {
                parent: this.entityDisplayParent,
                position: {x:0,y:-0.3,z:0},
                scale: {x:0.5,y:0.5,z:0.5},
            });
            TextShape.create(this.entityDisplayEnergy, {
                text:"ENERGY: ###",
                fontSize: 12, 
                outlineWidth:0.1,
                outlineColor:Color4.Black(),
                textColor:Color4.Teal()
            });

            //create field display objects
            //  border object
            this.entityBorder = engine.addEntity();
            Transform.create(this.entityBorder, { parent: this.entityParent });
            //  add model
            GltfContainer.create(this.entityBorder, {
                src: MODEL_DEFAULT_BORDER,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            //  terrain object (with default terrain)
            this.entityTerrain = engine.addEntity();
            Transform.create(this.entityTerrain, { parent: this.entityParent });
            //  add model
            GltfContainer.create(this.entityTerrain, {
                src: MODEL_DEFAULT_TERRAIN,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });

            //create interaction buttons
            //  join team
            this.entityJoinTeam = engine.addEntity();
            Transform.create(this.entityJoinTeam, {
                parent: this.entityParent,
                position: {x:0,y:2.5,z:5.25},
                scale: BUTTON_SCALE_NORMAL
            });
            GltfContainer.create(this.entityJoinTeam, {
                src: 'models/tcg-framework/card-table/text-join.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityJoinTeam, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "JOIN GAME" }
                  },
                ]
            });
            //  leave team
            this.entityLeaveTeam = engine.addEntity();
            Transform.create(this.entityLeaveTeam, {
                parent: this.entityParent,
                position: {x:-0.55,y:2.5,z:5.25},
                scale: BUTTON_SCALE_SMALL,
            });
            GltfContainer.create(this.entityLeaveTeam, {
                src: 'models/tcg-framework/card-table/text-leave.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityLeaveTeam, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "LEAVE GAME" }
                  },
                ]
            });
            //  ready
            this.entityReadyGame = engine.addEntity();
            Transform.create(this.entityReadyGame, {
                parent: this.entityParent,
                position: {x:0.55,y:2.5,z:5.25},
                scale: BUTTON_SCALE_SMALL,
            });
            GltfContainer.create(this.entityReadyGame, {
                src: 'models/tcg-framework/card-table/text-ready.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityReadyGame, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "READY" }
                  },
                ]
            });
            //  unready
            this.entityUnreadyGame = engine.addEntity();
            Transform.create(this.entityUnreadyGame, {
                parent: this.entityParent,
                position: {x:0.55,y:2.5,z:5.25},
                scale: BUTTON_SCALE_SMALL,
            });
            GltfContainer.create(this.entityUnreadyGame, {
                src: 'models/tcg-framework/card-table/text-unready.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityUnreadyGame, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "UNREADY" }
                  },
                ]
            });
            //  end turn
            this.entityEndTurn = engine.addEntity();
            Transform.create(this.entityEndTurn, {
                parent: this.entityParent,
                position: {x:0,y:5.75,z:0},
                scale: BUTTON_SCALE_NORMAL,
            });
            GltfContainer.create(this.entityEndTurn, {
                src: 'models/tcg-framework/card-table/text-end-turn.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityEndTurn, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "END TURN" }
                  },
                ]
            });
            //  forfeit game (exits game as loss)
            this.entityForfeit = engine.addEntity();
            Transform.create(this.entityForfeit, {
                parent: this.entityParent,
                position: {x:0,y:6.25,z:0},
                scale: BUTTON_SCALE_NORMAL,
            });
            GltfContainer.create(this.entityForfeit, {
                src: 'models/tcg-framework/card-table/text-leave.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            PointerEvents.createOrReplace(this.entityForfeit, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "FORFEIT GAME" }
                  },
                ]
            });
            
            //card holder
            //  parental object
            this.handCardParent = engine.addEntity();
            Transform.create(this.handCardParent, {
                parent: this.entityParent,
                position: CARD_HOLDER_OFFSET,
                scale: CARD_HOLDER_SCALE,
                rotation: Quaternion.fromEulerDegrees(CARD_HOLDER_ROTATION.x, CARD_HOLDER_ROTATION.y, CARD_HOLDER_ROTATION.z)
            });
            //  display object
            this.handCardObject = engine.addEntity();
            Transform.create(this.handCardObject, {
                parent: this.handCardParent,
                position: {x:0,y:0,z:0},
                scale: {x:1,y:1,z:1},
                rotation: Quaternion.fromEulerDegrees(0, 180, 0)
            });
            GltfContainer.create(this.handCardObject, {
                src: 'models/tcg-framework/menu-displays/display-frame-wide.glb',
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
        }

        /** prepares the card slot for use by a table team */
        public Initialize(data:TableTeamCreationData) {
            this.isActive = true;
            //indexing
            this.tableID = data.tableID;
            this.teamID = data.teamID;
            //player details
            if(data.callbackTable != undefined) this.callbackGetGameState = data.callbackTable;
            this.readyState = false;
            this.RegisteredPlayerID = undefined;
            this.RegisteredPlayerName = undefined;
            //prepare required decks
            this.DeckRegistered = PlayCardDeck.Create({
                key: this.Key+"-r",
                type: PlayCardDeck.DECK_TYPE.PLAYER_LOCAL
            });
            this.DeckSession = PlayCardDeck.Create({
                key: this.Key+"-s",
                type: PlayCardDeck.DECK_TYPE.PLAYER_LOCAL
            });
            //hand displays
            this.SetHandState(false);
            //transform
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.parent = data.parent;
            transformParent.position = PARENT_OFFSET_ON;
            transformParent.scale = PARENT_SCALE_ON;
            transformParent.rotation = Quaternion.fromEulerDegrees(data.rotation.x, data.rotation.y, data.rotation.z);
            
            //disable team selector
            Transform.getMutable(this.entityTeamTargetorInteraction).scale = PARENT_SCALE_OFF;

            //disable stats display
            Transform.getMutable(this.entityDisplayParent).scale = PARENT_SCALE_OFF;

            //update team selection interaction
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityTeamTargetorInteraction, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                target: this.Key,
                action: LOBBY_BUTTONS.TEAM_TARGET,
            });

            //update state/lobby button interactions
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityJoinTeam, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                target: this.Key,
                action: LOBBY_BUTTONS.TEAM_JOIN,
            });
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityLeaveTeam, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                target: this.Key,
                action: LOBBY_BUTTONS.TEAM_LEAVE,
            });
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityReadyGame, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                target: this.Key,
                action: LOBBY_BUTTONS.TEAM_READY,
            });
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityUnreadyGame, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                target: this.Key,
                action: LOBBY_BUTTONS.TEAM_UNREADY,
            });
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityEndTurn, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                target: this.Key,
                action: LOBBY_BUTTONS.GAME_END_TURN,
            });
            InteractionObject.InteractionObjectComponent.createOrReplace(this.entityForfeit, {
                ownerType: InteractionObject.INTERACTION_TYPE.GAME_TABLE,
                target: this.Key,
                action: LOBBY_BUTTONS.GAME_LEAVE,
            });

            //reset terrain card
            this.SetTerrainCard(undefined);
            
            //clear previous card slot objects
            while(this.cardSlotObjects.length > 0) {
                const teamObject = this.cardSlotObjects.pop();
                if(teamObject) teamObject.Disable();
            }

            //create card slot objects
            for(let i:number=0; i<CARD_SLOT_POSITIONS.length; i++) {
                const teamObject:TableCardSlot.TableCardSlotObject = TableCardSlot.Create({
                    tableID: data.tableID,
                    teamID: data.teamID,
                    slotID: i,
                    parent: this.entityParent,
                    position: CARD_SLOT_POSITIONS[i]
                });
                this.cardSlotObjects.push(teamObject);
            }
        }

        /** resets the team, setting it to the starting state for a table */
        public Reset() {
            //reset values
            this.healthCur = 24;
            this.energyCur = 3;
            this.energyGain = 1;
            //update stats display
            this.UpdateStatsDisplay();
            this.SetTeamTargetState(false);

            //remove any hand cards
            while(this.handCards.size() > 0) {
                const card = this.handCards.getItem(0);
                this.handCards.removeItem(card);
                CardDisplayObject.Disable(card);
            }

            //prepare session deck
            this.PrepareSessionDeck();

            //reset all card slots
            for(let i:number=0; i<this.cardSlotObjects.length; i++) {
                this.cardSlotObjects[i].SetSelectionState(false);
                this.cardSlotObjects[i].ClearCard();
            }

            //if player is registered to table
            if(PlayerLocal.GetUserID() == this.RegisteredPlayerID) {
                //disable team selector & display
                Transform.getMutable(this.entityTeamTargetorInteraction).scale = PARENT_SCALE_OFF;
                Transform.getMutable(this.entityDisplayParent).scale = PARENT_SCALE_OFF;
            } else {
                //enable team selector & display
                Transform.getMutable(this.entityTeamTargetorInteraction).scale = SELECTOR_SCALE_ON;
                Transform.getMutable(this.entityDisplayParent).scale = PARENT_SCALE_ON;
            }

            //reset terrain card
            this.SetTerrainCard(undefined);
        }

        /** updates buttons display based on the current state */
        public UpdateButtonStates() {
            //process based on operator of this team
            switch(this.TeamType) {
                //human player
                case TABLE_TEAM_TYPE.HUMAN:
                    //process based on current state of table 
                    switch(this.callbackGetGameState(this.TableID)) {
                        //game is not started
                        case TABLE_GAME_STATE.IDLE:
                            //if a player is registered to this team
                            if(this.RegisteredPlayerID != undefined) {
                                //hide join button
                                Transform.getMutable(this.entityJoinTeam).scale = BUTTON_SCALE_OFF;
                                
                                //if local player owns table
                                if(this.RegisteredPlayerID == PlayerLocal.GetUserID()) {
                                    //enable leave button
                                    Transform.getMutable(this.entityLeaveTeam).scale = BUTTON_SCALE_SMALL;
                                    //ready state toggling
                                    if(this.ReadyState) {
                                        Transform.getMutable(this.entityReadyGame).scale = BUTTON_SCALE_OFF;
                                        Transform.getMutable(this.entityUnreadyGame).scale = BUTTON_SCALE_SMALL;
                                    } else {
                                        Transform.getMutable(this.entityReadyGame).scale = BUTTON_SCALE_SMALL;
                                        Transform.getMutable(this.entityUnreadyGame).scale = BUTTON_SCALE_OFF;
                                    }
                                }
                                else {
                                    //disable team's buttons
                                    Transform.getMutable(this.entityLeaveTeam).scale = BUTTON_SCALE_OFF;
                                    Transform.getMutable(this.entityReadyGame).scale = BUTTON_SCALE_OFF;
                                    Transform.getMutable(this.entityUnreadyGame).scale = BUTTON_SCALE_OFF;
                                }
                            } 
                            //if no player is registered to this team
                            else {
                                Transform.getMutable(this.entityJoinTeam).scale = BUTTON_SCALE_NORMAL;
                                Transform.getMutable(this.entityLeaveTeam).scale = BUTTON_SCALE_OFF;
                                Transform.getMutable(this.entityReadyGame).scale = BUTTON_SCALE_OFF;
                                Transform.getMutable(this.entityUnreadyGame).scale = BUTTON_SCALE_OFF;
                            }
                            Transform.getMutable(this.entityEndTurn).scale = BUTTON_SCALE_OFF;
                            Transform.getMutable(this.entityForfeit).scale = BUTTON_SCALE_OFF; 
                        break;
                        //game is on-going
                        case TABLE_GAME_STATE.ACTIVE:
                            //if team has a player
                            Transform.getMutable(this.entityJoinTeam).scale = BUTTON_SCALE_OFF;
                            Transform.getMutable(this.entityLeaveTeam).scale = BUTTON_SCALE_OFF;
                            Transform.getMutable(this.entityReadyGame).scale = BUTTON_SCALE_OFF;
                            Transform.getMutable(this.entityUnreadyGame).scale = BUTTON_SCALE_OFF;
                            //if local player's turn
                            if(this.RegisteredPlayerID == PlayerLocal.GetUserName() && this.TurnState == TABLE_TURN_TYPE.ACTIVE) {
                                Transform.getMutable(this.entityEndTurn).scale = BUTTON_SCALE_SMALL; 
                                Transform.getMutable(this.entityForfeit).scale = BUTTON_SCALE_SMALL; 
                            } 
                            else {
                                Transform.getMutable(this.entityEndTurn).scale = BUTTON_SCALE_OFF;
                                Transform.getMutable(this.entityForfeit).scale = BUTTON_SCALE_OFF; 
                            }
                        break;
                        //game has finished
                        case TABLE_GAME_STATE.OVER:
                            //if team has a player
                            Transform.getMutable(this.entityJoinTeam).scale = BUTTON_SCALE_OFF;
                            Transform.getMutable(this.entityLeaveTeam).scale = BUTTON_SCALE_OFF;
                            Transform.getMutable(this.entityReadyGame).scale = BUTTON_SCALE_OFF;
                            Transform.getMutable(this.entityUnreadyGame).scale = BUTTON_SCALE_OFF;
                            Transform.getMutable(this.entityEndTurn).scale = BUTTON_SCALE_OFF;
                            Transform.getMutable(this.entityForfeit).scale = BUTTON_SCALE_OFF; 
                        break;
                    }
                break;
                //AI player
                case TABLE_TEAM_TYPE.AI:
                    //never show buttons if team is operated by AI
                    Transform.getMutable(this.entityJoinTeam).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityLeaveTeam).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityReadyGame).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityUnreadyGame).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityEndTurn).scale = BUTTON_SCALE_OFF;
                    Transform.getMutable(this.entityForfeit).scale = BUTTON_SCALE_OFF; 
                break;
            }
        }

        /** called when a turn starts */
        public TurnStart() {
            if(isDebugging) console.log(debugTag+"table="+this.tableID+", team="+this.teamID+" turn started");

            //add energy to team's pool
            this.energyCur += this.energyGain;
            //add cards to team's hand
            this.DrawCard();
            //new team's start turn effects
            for(let i:number=0; i<this.cardSlotObjects.length; i++) {
                //if there is a card tied to the slot
                const slot = this.cardSlotObjects[i];
                if(slot.SlottedCard != undefined) {
                    //process card's start turn effects
                    slot.SlottedCard.ProcessEffectsByAffinity(STATUS_EFFECT_AFFINITY.HELPFUL);
                    //update display
                    slot.UpdateStatDisplay();
                }
            }
        }

        /** called when a turn ends */
        public TurnEnd() { 
            if(isDebugging) console.log(debugTag+"table="+this.tableID+", team="+this.teamID+" turn ended");

            //process previous team's end turn effects
            for(let i:number=0; i<this.cardSlotObjects.length; i++) {
                //if there is a card tied to the slot
                const slot = this.cardSlotObjects[i];
                if(slot.SlottedCard != undefined) {
                    //re-enable card's action (we do this at the end of the turn so enemy has a chance to stun the character)
                    slot.SlottedCard.ActionRemaining = true;
                    //process card's end turn effects
                    slot.SlottedCard.ProcessEffectsByAffinity(STATUS_EFFECT_AFFINITY.HARMFUL);
                    //update display
                    slot.UpdateStatDisplay();
                }
            }
        }

        /** updates the positions of all cards in the player's hand */
        public UpdateCardObjectDisplay(selected:string="") {
            var posY = [0,0];
            if(this.handCards.size() > 5) posY = [0.25,-0.25];
            //process every card in the player's hand
            for(let i:number=0; i<this.handCards.size(); i++) {
                //calc position #math it bro :sip:
                var index = i%5;
                var cardsInRow = this.handCards.size()%5;
                if(i<(this.handCards.size()-cardsInRow)) cardsInRow = 5;
                var posX = index-((cardsInRow-1)*0.5);
                var pos = {
                    x:0.4*posX,
                    y:posY[Math.floor(i/5)],
                    z:0
                };
                //calc selection offset
                if(this.handCards.getItem(i).SlotID == selected) {
                    pos.y += 0.1125;
                    pos.z += -0.1;
                }
                //set pos
                this.handCards.getItem(i).SetPosition(pos);
            }
        }

        /** draws a card from the player's deck and places it in their hand, generating the required  */
        public DrawCard() {
            if(isDebugging) console.log(debugTag+"table="+this.tableID+", team="+this.teamID+" is drawing card...");
            //ensure deck exists
            if(!this.DeckSession) {
                if(isDebugging) console.log(debugTag+"no player deck found!");
                return undefined;
            }
            //ensure targeted state collection has cards left
            if(this.DeckSession.CardsPerState[PlayCardDeck.DECK_CARD_STATES.DECK].size() == 0) {
                if(isDebugging) console.log(debugTag+"no cards remaining in targeted collection!");
                return undefined;
            }

            //get top card from deck
            const card = this.DeckSession.CardsPerState[PlayCardDeck.DECK_CARD_STATES.DECK].getItem(0);
            //move card to collection
            this.MoveCardBetweenCollections(card, PlayCardDeck.DECK_CARD_STATES.DECK, PlayCardDeck.DECK_CARD_STATES.HAND);
            //create card display object for hand 
            this.AddHandObject(card);
            //redraw card locations
            this.UpdateCardObjectDisplay();
            if(isDebugging) console.log(debugTag+"table="+this.tableID+", team="+this.teamID+" has drawn card="+card.Key+"!");
        }

        /** moves a card within the deck from one collection to another */
        public MoveCardBetweenCollections(card:PlayCard.PlayCardDataObject, origin:PlayCardDeck.DECK_CARD_STATES, target:PlayCardDeck.DECK_CARD_STATES) {
            if(isDebugging) console.log(debugTag+"moving card="+card.Key+" from origin="+origin+" ("+this.DeckSession?.CardsPerState[origin].size()
                +") to target="+target+"("+this.DeckSession?.CardsPerState[target].size()+")...");

            //ensure deck exists
            if(!this.DeckSession) {
                if(isDebugging) console.log(debugTag+"no player deck found!");
                return undefined;
            }
            //ensure targeted state collection has cards left
            if(this.DeckSession.CardsPerState[origin].size() == 0) {
                if(isDebugging) console.log(debugTag+"no cards remaining in targeted collection!");
                return undefined;
            }

            //remove card from origin collection
            this.DeckSession.CardsPerState[origin].removeItem(card);
            //add card to target collection
            this.DeckSession.CardsPerState[target].addItem(card);

            if(isDebugging) console.log(debugTag+"moved card="+card.Key+" from origin="+origin+" ("+this.DeckSession?.CardsPerState[origin].size()
                +") to target="+target+"("+this.DeckSession?.CardsPerState[target].size()+")!");
        }

        /** adds given card's object to hand */
        public AddHandObject(card:PlayCard.PlayCardDataObject):CardDisplayObject.CardDisplayObject {
            if(isDebugging) console.log(debugTag+"adding card="+card.Key+" into hand");
            //create new card display object
            const cardObject = CardDisplayObject.Create({
                //display type
                ownerType: CARD_OBJECT_OWNER_TYPE.GAME_TABLE_HAND,
                //indexing
                tableID: this.TableID,
                teamID: this.TeamID,
                slotID: card.Key,
                //target
                def: card.DefData,
                hasCounter: false,
                //position
                parent: this.handCardParent,
                scale: CARD_SCALE,
            });
            //add display object to hand collection
            this.handCards.addItem(cardObject);
            return cardObject;
        }

        /** removes given card's object from hand */
        public RemoveHandObject(card:PlayCard.PlayCardDataObject) {
            if(isDebugging) console.log(debugTag+"removing card="+card.Key+" from hand");
            //apply charcter display object to slot
            for(let i:number = 0; i<this.handCards.size(); i++) {
                if(this.handCards.getItem(i).SlotID == card.Key) {
                    const card = this.handCards.getItem(i);
                    this.handCards.removeItem(card);
                    CardDisplayObject.Disable(card);
                    return;
                }
            }
        }

        /** sets slot display object */
        public SetSlotCharacterObject(slot:number, card:PlayCard.PlayCardDataObject) {
            if(isDebugging) console.log(debugTag+"setting card="+card.Key+" in slot="+slot);
            //apply given card to slot
            this.cardSlotObjects[slot].ApplyCard(card);
        }

        /** clears slot display object from slot based on card */
        public ClearSlotObjectByCard(card:PlayCard.PlayCardDataObject) {
            if(isDebugging) console.log(debugTag+"clearing display object based on card="+card.Key);
            //apply charcter display object to slot
            for(let i:number = 0; i<this.cardSlotObjects.length; i++) {
                if(this.cardSlotObjects[i].SlottedCard == card) {
                    this.cardSlotObjects[i].ClearCard();
                    return;
                }
            }
        }
        
        /** clears slot display object from slot based on index */
        public ClearSlotObjectByIndex(index:number) {
            if(isDebugging) console.log(debugTag+"clearing display object based on slot="+index);
            //clear character display object from slot
            this.cardSlotObjects[index].ClearCard();
        }

        /** releases all cards controlled by this team */
        public ReleaseCards() {
            //disable all card object
            while(this.handCards.size() > 0) {
                const cardObject = this.handCards.getItem(0);
                this.handCards.removeItem(cardObject);
                CardDisplayObject.Disable(cardObject);
            }
        }

        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.isActive = false;
            //disable all card object
            this.ReleaseCards();
            //disable all slot object
            while(this.cardSlotObjects.length > 0) {
                const slotObject = this.cardSlotObjects.pop();
                if(slotObject) TableCardSlot.Disable(slotObject);
            }

            //hide card parent
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.position = PARENT_OFFSET_OFF;
            transformParent.scale = PARENT_SCALE_OFF;
        }

        /** removes objects from game scene and engine */
        public Destroy() {
            //disable all card object
            this.ReleaseCards();
            //disable all slot object
            while(this.cardSlotObjects.length > 0) {
                const slotObject = this.cardSlotObjects.pop();
                if(slotObject) TableCardSlot.Disable(slotObject);
            }

            //destroy game object
            engine.removeEntity(this.entityParent);
        }

        /** serializeds the team into transferable data */
        public SerializeData():TeamSerialData {
            //if(isDebugging) 
            console.log(debugTag+"serializing team {tableID="+this.TableID+", team="+this.TeamID+", playerID="+this.RegisteredPlayerID+", playerName="+this.RegisteredPlayerName+"}");
            let serial:TeamSerialData = {
                playerID: this.RegisteredPlayerID??"",
                playerName: this.RegisteredPlayerName??"",
                readyState: this.ReadyState,
                healthCur:this.healthCur,
                energyCur:this.energyCur,
                energyGain:this.energyGain,
                deckRegistered:"",
                deckSession:[],
                slotCards:[],
                terrainCard:this.TerrainCard??""
            }

            //process card decks
            if(this.DeckRegistered) serial.deckRegistered = this.DeckRegistered.Serialize();
            if(this.DeckSession) {
                for (let i = 0; i < this.DeckSession.CardsPerState.length; i++) {
                    serial.deckSession[i] = [];
                    for (let j = 0; j < this.DeckSession.CardsPerState[i].size(); j++) {
                        const card = this.DeckSession.CardsPerState[i].getItem(j).SerializeData();
                        serial.deckSession[i].push(card);
                    }
                }
            }
            //process card slots
            serial.slotCards = [];
            for (let i = 0; i < this.cardSlotObjects.length; i++) {
                serial.slotCards.push(this.cardSlotObjects[i].SlottedCard?.Key??"");
            }

            console.log(debugTag+"serialized team {tableID="+this.TableID+", team="+this.TeamID+", playerID="+this.RegisteredPlayerID+", playerName="+this.RegisteredPlayerName+"}");
            //provide serial
            return serial;
        }

        /** initializes the team based on the provided serial string */
        public DeserializeData(serial:TeamSerialData) {
            console.log(debugTag+"deserializing team {tableID="+this.TableID+", team="+this.TeamID+", playerID="+this.RegisteredPlayerID+", playerName="+this.RegisteredPlayerName+"}");
            //slot player
            if(serial.playerID != "") this.RegisteredPlayerID = serial.playerID;
            else this.RegisteredPlayerID = undefined;
            if(serial.playerName != "") this.RegisteredPlayerName = serial.playerName;
            else this.RegisteredPlayerName = undefined;
            this.readyState = serial.readyState;
            this.healthCur = serial.healthCur;
            this.energyCur = serial.energyCur;
            this.energyGain = serial.energyGain;

            //populate all cards
            //  set decks
            if(this.DeckRegistered) this.DeckRegistered.Deserial(serial.deckRegistered);
            if(this.DeckSession) {
                this.DeckSession.Clean();
                for (let i = 0; i < serial.deckSession.length; i++) {
                    for (let j = 0; j < serial.deckSession[i].length; j++) {
                        const cardSerial = serial.deckSession[i][j];
                        this.DeckSession.AddCardBySerial(i, cardSerial);
                    }
                }
            }
            //  set slots
            for (let i = 0; i < serial.slotCards.length; i++) {
                const card = PlayCard.GetByKey(serial.slotCards[i]);
                if(card) this.cardSlotObjects[i].ApplyCard(card);
            }
            //  set terrain
            this.SetTerrainCard(PlayCard.GetByKey(serial.terrainCard));
            console.log("terrain card key="+serial.terrainCard);

            //redraw display
            this.UpdateButtonStates();
            this.UpdateCardObjectDisplay();

            console.log(debugTag+"deserialized team {tableID="+this.TableID+", team="+this.TeamID+", playerID="+this.RegisteredPlayerID+", playerName="+this.RegisteredPlayerName+"}");
        }
    }
    
    /** provides a new object (either pre-existing & un-used or entirely new) */
    export function Create(data:TableTeamCreationData):TableTeamObject {
        const key:string = GetKeyFromData(data);
        var object:undefined|TableTeamObject = undefined;
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
            object = new TableTeamObject();
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
    export function Disable(object:TableTeamObject) {
        //adjust collections
        //  add to inactive listing (ensure add is required)
        var posX = pooledObjectsInactive.getItemPos(object);
        if(posX == -1) pooledObjectsInactive.addItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(object.Key)) pooledObjectsRegistry.removeItem(object.Key);

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
    export function Destroy(object:TableTeamObject) {
        //adjust collections
        //  remove from overhead listing
        pooledObjectsAll.removeItem(object);
        //  remove from inactive listing
        pooledObjectsInactive.removeItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(object.Key)) pooledObjectsRegistry.removeItem(object.Key);

        //send destroy command
        object.Destroy();
        //TODO: atm we rely on DCL to clean up object data class. so far it hasn't been an issue due to how
        //  object data is pooled, but we should look into how we can explicitly set data classes for removal
    }
}