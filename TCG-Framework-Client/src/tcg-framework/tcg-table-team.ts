import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { Dictionary, List } from "../utilities/collections";
import { ColliderLayer, Entity, GltfContainer, Schemas, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { TableCardSlot } from "./tcg-table-card-slot";
import { PlayCardDeck } from "./tcg-play-card-deck";
import { CardDisplayObject } from "./tcg-card-object";
import { PlayCard } from "./tcg-play-card";
import { CardData, CardDataObject } from "./data/tcg-card-data";

/*      TRADING CARD GAME - TABLE CARD TEAM
    represents team on a table

    TODO:
    - add player registration controls

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module TableTeam {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Table Team: ";

    /** all possible team types */
    export enum TEAM_TYPE {
        LOCAL,  //local player
        AI, //local ai
        REMOTE, //remote auth
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

    /** transform - card holder */
    const CARD_HOLDER_OFFSET:Vector3 = { x:0, y:1.5, z:4.75 };
    const CARD_HOLDER_SCALE:Vector3 = { x:0.5, y:0.5, z:0.5 };
    const CARD_HOLDER_ROTATION:Vector3 = { x:30, y:180, z:0 };

    /** positions for card slots on field */
    const CARD_SLOT_POSITIONS:Vector3[] = [
        { x:0, y:0, z:1.5 },
        { x:2, y:0, z:1.5 },
        { x:-2, y:0, z:1.5 },
        { x:4, y:0, z:1.5 },
        { x:-4, y:0, z:1.5 },
    ];

    /** indexing key */
    export function GetKeyFromObject(data:TableTeamObject):string { return data.TableID+"-"+data.TeamID; };
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
        tableID:Schemas.String,
        teamID:Schemas.String,
        //targeting (per button, ex: join/leave button)
        action:Schemas.String,
    }
	/** define component, adding it to the engine as a managed behaviour */
    export const TableTeamSlotComponent = engine.defineComponent("TableTeamComponentData", TableTeamComponentData);

	/** object interface used to define all data required to create a team */
	export interface TableTeamCreationData {
        //indexing
        tableID: string,
        teamID: string,
        //position
        parent: undefined|Entity, //entity to parent object under 
		position: { x:number; y:number; z:number; }; //new position for object
		rotation: { x:number; y:number; z:number; }; //new rotation for object
	}

    /** contains all 3D objects required to display a team's current state (name,hp,etc.) */
    export class TeamDisplayObject {
        //parent/pivot
        private entityParent:Entity;
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
            //name
            this.entityName = engine.addEntity();
            Transform.create(this.entityName, { parent: this.entityParent, position: {x:0,y:0,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityName);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "<PLAYER_NAME>";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
            //health
            this.entityHealth = engine.addEntity();
            Transform.create(this.entityHealth, { parent: this.entityParent, position: {x:0,y:-0.25,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityHealth);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "HEALTH: ###";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
            //energy
            this.entityEnergy = engine.addEntity();
            Transform.create(this.entityEnergy, { parent: this.entityParent, position: {x:0,y:-0.5,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityEnergy);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "ENERGY: ##";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
            //deck
            this.entityDeck = engine.addEntity();
            Transform.create(this.entityDeck, { parent: this.entityParent, position: {x:0,y:-0.75,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityDeck);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "DECK: ##";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
            //hand
            this.entityHand = engine.addEntity();
            Transform.create(this.entityHand, { parent: this.entityParent, position: {x:0,y:-1.0,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.entityHand);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 8;
            textShape.text = "HAND: ##";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_LEFT;
            //discard
            this.entityDiscard = engine.addEntity();
            Transform.create(this.entityDiscard, { parent: this.entityParent, position: {x:0,y:-1.25,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
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
        public UpdateView(team:TableTeamObject) {
            TextShape.getMutable(this.entityName).text = team.Player??"<ERROR: NO PLAYER>";
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
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** represents the unique index of this slot's table, req for networking */
        private tableID:string = "";
        public get TableID():string { return this.tableID; };

        /** represents the unique index of this slot's team, req for networking */
        private teamID:string = "";
        public get TeamID():string { return this.teamID; };

        /** type of user registered to this table */
        public TeamType: TEAM_TYPE = TEAM_TYPE.LOCAL;

        /** current player's display name */
        public Player:undefined|string;
        /** player's currently selected deck (where cards are pulled from) */
        public PlayerDeck:undefined|PlayCardDeck.PlayCardDeckObject;
        /** returns card count per targeted collection */
        public GetCardCount(target:PlayCardDeck.DECK_CARD_STATES) {
            if(!this.PlayerDeck) return 0;
            return this.PlayerDeck.CardsPerState[target].size();
        }
        /** returns card's play data based on given index */
        public GetCardData(target:PlayCardDeck.DECK_CARD_STATES, index:number) {
            return this.PlayerDeck?.CardsPerState[target].getItem(index);
        }

        /** team's current health (at zero the lose) */
        public HealthCur:number = 0;

        /** resource for playing new cards to the field */
        public EnergyCur:number = 0;
        /** amount of energy gained at the start of the next turn */
        public EnergyGain:number = 0;

        /** parental position */
        private entityParent:Entity;

        /** battlefield's border */
        private entityBorder:Entity;
        /** battlefield's central terrain */
        private entityTerrain:Entity;

        /** card display parent (where player cards are stored) */
        private handCardParent:Entity;
        private handCards:List<CardDisplayObject.CardDisplayObject> = new List<CardDisplayObject.CardDisplayObject>();
        public GetHandCard(ID:string):undefined|CardDisplayObject.CardDisplayObject {
            for(let i:number=0; i<this.handCards.size(); i++) {
                if(this.handCards.getItem(i).SlotID == ID) return this.handCards.getItem(i);
            }
            return undefined;
        }

        /** current terrain card */
        public TerrainCard:undefined|string = undefined;
        public SetTerrainCard(card:undefined|PlayCard.PlayCardDataObject) {
            var terrainModel:string = "";
            if(card) { terrainModel = card.DefData.objPath; }
            else { terrainModel = MODEL_DEFAULT_TERRAIN; }
            
            //set
            GltfContainer.createOrReplace(this.entityTerrain, {
                src: terrainModel,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
        }

        /** all card slot objects (used for displaying card characters) */
        public cardSlotObjects:TableCardSlot.TableCardSlotObject[] = [];
        public IsCardSlotOccupied(index:number):boolean {
            if(this.cardSlotObjects[index].SlottedCard != undefined) return true;
            else return false;
        }

        /** prepares field team for use */
        constructor() {
            //create parent object
            this.entityParent = engine.addEntity();
            Transform.create(this.entityParent, {
                position: PARENT_OFFSET_ON,
                scale: PARENT_SCALE_ON,
            });

            //create border object
            this.entityBorder = engine.addEntity();
            Transform.create(this.entityBorder, { parent: this.entityParent });
            //  add model
            GltfContainer.create(this.entityBorder, {
                src: MODEL_DEFAULT_BORDER,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });

            //create terrain object (with default terrain)
            this.entityTerrain = engine.addEntity();
            Transform.create(this.entityTerrain, { parent: this.entityParent });
            //  add model
            GltfContainer.create(this.entityTerrain, {
                src: MODEL_DEFAULT_TERRAIN,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            
            //create card holder
            this.handCardParent = engine.addEntity();
            Transform.create(this.handCardParent, {
                parent: this.entityParent,
                position: CARD_HOLDER_OFFSET,
                scale: CARD_HOLDER_SCALE,
                rotation: Quaternion.fromEulerDegrees(CARD_HOLDER_ROTATION.x, CARD_HOLDER_ROTATION.y, CARD_HOLDER_ROTATION.z)
            });
        }

        /** prepares the card slot for use by a table team */
        public Initialize(data:TableTeamCreationData) {
            this.isActive = true;
            //indexing
            this.tableID = data.tableID;
            this.teamID = data.teamID;
            //player details
            this.Player = undefined;
            this.PlayerDeck = undefined;
            //transform
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.parent = data.parent;
            transformParent.position = PARENT_OFFSET_ON;
            transformParent.scale = PARENT_SCALE_ON;
            transformParent.rotation = Quaternion.fromEulerDegrees(data.rotation.x, data.rotation.y, data.rotation.z);
        
            //clear previous terrain card
            this.TerrainCard = undefined;
            //clear previous card slot objects
            while(this.cardSlotObjects.length > 0) {
                const teamObject = this.cardSlotObjects.pop();
                if(teamObject) teamObject.Disable();
            }

            //create team objects
            for(let i:number=0; i<CARD_SLOT_POSITIONS.length; i++) {/**/
                const teamObject:TableCardSlot.TableCardSlotObject = TableCardSlot.Create({
                    tableID: data.tableID,
                    teamID: data.teamID,
                    slotID: i.toString(),
                    parent: this.entityParent,
                    position: CARD_SLOT_POSITIONS[i]
                });
                this.cardSlotObjects.push(teamObject);
            }
        }

        /** resets the team, setting it to the starting state for a table */
        public Reset() {
            //reset values
            this.HealthCur = 60;
            this.EnergyCur = 3;
            this.EnergyGain = 1;
            //remove any hand cards
            while(this.handCards.size() > 0) {
                const card = this.handCards.getItem(0);
                this.handCards.removeItem(card);
                CardDisplayObject.Disable(card);
            }
            //shuffle decks
            this.PlayerDeck?.ShuffleCards();
            //reset all card slots
            this.UpdateCardSlotDisplay();
        }

        /** updates the positions of all cards in the player's hand */
        public UpdateCardObjectDisplay(selected:string="") {
            //
            for(let i:number=0; i<this.handCards.size(); i++) {
                //calc position, anchored at middle
                var pos = {x:(1.15*Math.round(i/2)),y:0,z:0};
                if(i%2 == 1) pos.x = pos.x*-1
                //calc selection offset
                if(this.handCards.getItem(i).SlotID == selected) {
                    pos.y = 0.225;
                    pos.z = -0.2;
                }
                //set pos
                this.handCards.getItem(i).SetPosition(pos);
            }
        }

        /** updates the display of card slot */
        public UpdateCardSlotDisplay(selected:number=-1) {
            //
            for(let i:number=0; i<this.cardSlotObjects.length; i++) {
                if(i == selected) this.cardSlotObjects[i].SetSelectionState(true);
                else this.cardSlotObjects[i].SetSelectionState(false);
            }
        }

        /** draws a card from the player's deck and places it in their hand, generating the required  */
        public DrawCard() {
            //ensure deck exists
            if(!this.PlayerDeck) {
                if(isDebugging) console.log(debugTag+"no player deck found!");
                return undefined;
            }
            //ensure targeted state collection has cards left
            if(this.PlayerDeck.CardsPerState[PlayCardDeck.DECK_CARD_STATES.DECK].size() == 0) {
                if(isDebugging) console.log(debugTag+"no cards remaining in targeted collection!");
                return undefined;
            }

            //get top card from deck
            const card = this.PlayerDeck.CardsPerState[PlayCardDeck.DECK_CARD_STATES.DECK].getItem(0);
            //move card to collection
            this.MoveCardBetweenCollections(card, PlayCardDeck.DECK_CARD_STATES.DECK, PlayCardDeck.DECK_CARD_STATES.HAND);
            //create card display object for hand 
            this.AddHandObject(card);
            //
            this.UpdateCardObjectDisplay();
        }

        /** moves a card within the deck from one collection to another */
        public MoveCardBetweenCollections(card:PlayCard.PlayCardDataObject, origin:PlayCardDeck.DECK_CARD_STATES, target:PlayCardDeck.DECK_CARD_STATES) {
            if(isDebugging) console.log(debugTag+"moving card="+card.Key+" from origin="+origin+" ("+this.PlayerDeck?.CardsPerState[origin].size()
                +") to target="+target+"("+this.PlayerDeck?.CardsPerState[target].size()+")...");

            //ensure deck exists
            if(!this.PlayerDeck) {
                if(isDebugging) console.log(debugTag+"no player deck found!");
                return undefined;
            }
            //ensure targeted state collection has cards left
            if(this.PlayerDeck.CardsPerState[origin].size() == 0) {
                if(isDebugging) console.log(debugTag+"no cards remaining in targeted collection!");
                return undefined;
            }

            //remove card from origin collection
            this.PlayerDeck.CardsPerState[origin].removeItem(card);
            //add card to target collection
            this.PlayerDeck.CardsPerState[target].addItem(card);

            if(isDebugging) console.log(debugTag+"moved card="+card.Key+" from origin="+origin+" ("+this.PlayerDeck?.CardsPerState[origin].size()
                +") to target="+target+"("+this.PlayerDeck?.CardsPerState[target].size()+")!");
        }

        /** adds given card's object to hand */
        public AddHandObject(card:PlayCard.PlayCardDataObject):CardDisplayObject.CardDisplayObject {
            if(isDebugging) console.log(debugTag+"adding card="+card.Key+" into hand");
            //create new card display object
            const cardObject = CardDisplayObject.Create({
                //display type
                ownerType: CardDisplayObject.CARD_OBJECT_OWNER_TYPE.GAME_TABLE_HAND,
                //indexing
                tableID: this.TableID,
                teamID: this.TeamID,
                slotID: card.Key,
                //target
                def: card.DefData,
                counter: false,
                //position
                parent: this.handCardParent,
                scale: { x:0.4, y:0.4, z:0.4 },
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
        public SetSlotObject(card:PlayCard.PlayCardDataObject, slot:number) {
            if(isDebugging) console.log(debugTag+"setting card="+card.Key+" in slot="+slot);
            //apply given card to slot
            this.cardSlotObjects[slot].ApplyCard(card);
        }

        /** clears slot display object from slot based on card */
        public ClearSlotObjectByCard(card:PlayCard.PlayCardDataObject) {
            if(isDebugging) console.log(debugTag+"clearing display object based on card="+card.Key);
            //apply charcter display object to slot
            for(let i:number = 0; i<this.cardSlotObjects.length; i++) {
                if(this.cardSlotObjects[i].SlottedCard == card.Key) {
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

        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.isActive = false;
            //disable all attached table teams
            while(this.cardSlotObjects.length > 0) {
                const teamObject = this.cardSlotObjects.pop();
                if(teamObject) teamObject.Disable();
            }

            //hide card parent
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.position = PARENT_OFFSET_OFF;
            transformParent.scale = PARENT_SCALE_OFF;
        }

        /** removes objects from game scene and engine */
        public Destroy() {
            //destroy all attached table teams
            while(this.cardSlotObjects.length > 0) {
                const teamObject = this.cardSlotObjects.pop();
                if(teamObject) teamObject.Destroy();
            }

            //destroy game object
            engine.removeEntity(this.entityParent);
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
    export function Destroy(object:TableTeamObject) {
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
}