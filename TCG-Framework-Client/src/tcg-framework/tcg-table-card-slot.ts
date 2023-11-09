import { Billboard, ColliderLayer, Entity, GltfContainer, InputAction, PointerEventType, PointerEvents, Schemas, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { Dictionary, List } from "../utilities/collections";
import { PlayCard } from "./tcg-play-card";
import { CardSubjectObject } from "./tcg-card-subject-object";

/*      TRADING CARD GAME - TABLE CARD SLOT
    represents a single card slot on a team's side of a table

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module TableCardSlot {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Table Card Slot: ";

    /** model location for this team's boarder*/
    const MODEL_CARD_SLOT:string = 'models/tcg-framework/card-table/card-table-slot-prototype.glb';
    const MODEL_CARD_SLOT_SELECTOR:string = 'models/tcg-framework/card-table/card-table-slot-prototype-selector.glb';

    /** transform - parent defaults */
    const PARENT_OFFSET_ON:Vector3 = { x:0, y:0, z:0 };
    const PARENT_OFFSET_OFF:Vector3 = { x:4, y:-10, z:4 };
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };
    const PARENT_ROTATION_ON:Vector3 = { x:0, y:0, z:0 };

    /** transforms for displayed card element */
    const DISAPLAY_OFFSET_ON:Vector3 = { x:0, y:0.425, z:0 };
    const DISAPLAY_SCALE:Vector3 = { x:0.45, y:0.45, z:0.45 };
    const DISAPLAY_ROTATION:Vector3 = { x:0, y:0, z:0 };

    /** transforms for interaction element */
    const INTERACTION_OFFSET:Vector3 = { x:0, y:0, z:0 };
    const INTERACTION_SCALE:Vector3 = { x:1.0, y:2, z:1.0 };
    const INTERACTION_ROTATION:Vector3 = { x:0, y:0, z:0 };

    /** transforms for interaction element */
    const SELECTION_OFFSET:Vector3 = { x:0, y:0.4, z:0 };
    const SELECTION_SCALE:Vector3 = { x:1.5, y:0.1, z:1.5 };
    const SELECTION_ROTATION:Vector3 = { x:0, y:0, z:0 };

    /** transforms  */
    const STATS_OFFSET = { x:0, y:1.75, z:0 };
    const STATS_SCALE = { x:0.75, y:0.75, z:0.75 };
    const STATS_ROTATION = { x:0, y:0, z:0 };

    /** indexing key */
    export function GetKeyFromData(data:TableCardSlotCreationData):string { return data.tableID+"-"+data.teamID+"-"+data.slotID; };

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<TableCardSlotObject> = new List<TableCardSlotObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<TableCardSlotObject> = new List<TableCardSlotObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<TableCardSlotObject> = new List<TableCardSlotObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<TableCardSlotObject> = new Dictionary<TableCardSlotObject>();
    
    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|TableCardSlotObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }

    /** component for on-click interactions */
    export const TableCardSlotComponentData = {
        //indexing
        tableID:Schemas.Number,
        teamID:Schemas.Number,
        slotID:Schemas.Number,
    }
	/** define component, adding it to the engine as a managed behaviour */
    export const TableCardSlotComponent = engine.defineComponent("TableCardSlotComponentData", TableCardSlotComponentData);

    /** defines all parameters for creating a new table card slot */
	export interface TableCardSlotCreationData {
        //indexing
        tableID: number,
        teamID: number,
        slotID: number,
        //position
        parent?: undefined|Entity, //new parent for object
		position?: { x:number; y:number; z:number; }; //new position
        scale?: { x:number; y:number; z:number; }; //new scale
		rotation?: { x:number; y:number; z:number; }; //new rotation (eular degrees)
	}

    /** represents a single card slot within a card field team */
    export class TableCardSlotObject {
        /** when true this object is reserved in-scene */
        public IsActive: boolean = true;

        /** unique index of this slot's table */
        private tableID:number = -1;
        public get TableID():string { return this.tableID.toString(); };

        /** unique index of this slot's team */
        private teamID:number = -1;
        public get TeamID():string { return this.teamID.toString(); };

        /** unique index of this slot */
        private slotID:number = -1;
        public get SlotID():string { return this.slotID.toString(); };
        
        /** unique key of this slot */
        public get Key():string { return this.TableID+"-"+this.TeamID+"-"+this.SlotID; };

        /** id of the currently slotted card playdata */
        private slottedCard:undefined|PlayCard.PlayCardDataObject = undefined;
        public get SlottedCard():undefined|PlayCard.PlayCardDataObject { return this.slottedCard; }

        /** returns true if slot has a card slotted */
        public IsCardSlotOccupied():boolean {
            if(this.SlottedCard != undefined) return true;
            else return false;
        }

        /** parental position */
        public entityParent:Entity;
        /** interaction area for the card */
        private entityInteraction:Entity;
        /** selection preview (shows if slot is selected) */
        private entitySelection:Entity;
        /** active character display object (actual character in this slot) */
        public entityCharacter:undefined|CardSubjectObject.CardSubjectObject;

        //character stats display portions
        /** character display pivot point */
        private statsParent:Entity;
        /** active character action */
        private statsName:Entity;
        /** active character action */
        private statsAction:Entity;
        /** attack display */
        private statsAttack:Entity;
        /** health display */
        private statsHealth:Entity;
        /** armour display */
        private statsArmour:Entity;
        
        /** prepares field team for use */
        constructor() {
            //create interaction object
            this.entityParent = engine.addEntity();
            Transform.create(this.entityParent);

            //create selection object
            this.entitySelection = engine.addEntity();
            Transform.create(this.entitySelection, {
                parent: this.entityParent,
                position: SELECTION_OFFSET,
                scale: SELECTION_SCALE,
                rotation: Quaternion.fromEulerDegrees(SELECTION_ROTATION.x, SELECTION_ROTATION.y, SELECTION_ROTATION.z)
            });
            //  add custom model
            GltfContainer.create(this.entitySelection, {
                src: MODEL_CARD_SLOT_SELECTOR,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });

            //create interaction object
            this.entityInteraction = engine.addEntity();
            Transform.create(this.entityInteraction, {
                parent: this.entityParent,
                position: INTERACTION_OFFSET,
                scale: INTERACTION_SCALE,
                rotation: Quaternion.fromEulerDegrees(INTERACTION_ROTATION.x, INTERACTION_ROTATION.y, INTERACTION_ROTATION.z)
            });
            //  add custom model
            GltfContainer.create(this.entityInteraction, {
                src: MODEL_CARD_SLOT,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });

            //stats
            //  parent
            this.statsParent = engine.addEntity();
            Transform.create(this.statsParent, { parent: this.entityParent, position:STATS_OFFSET, scale:STATS_SCALE, rotation: Quaternion.fromEulerDegrees(STATS_ROTATION.x,STATS_ROTATION.y,STATS_ROTATION.z) });
            Billboard.create(this.statsParent);
            //  name
            this.statsName = engine.addEntity();
            Transform.create(this.statsName, { parent: this.statsParent, position: {x:0,y:0.25,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsName);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 12;
            textShape.text = "<CHARACTER_NAME>";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
            //  action
            this.statsAction = engine.addEntity();
            Transform.create(this.statsAction, { parent: this.statsParent, position: {x:0,y:0,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsAction);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 6;
            textShape.text = "<ACTION REMAINING>";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
            //  health
            this.statsHealth = engine.addEntity();
            Transform.create(this.statsHealth, { parent: this.statsParent, position: {x:0,y:-0.2,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsHealth);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.2;
            textShape.textColor = Color4.Red(); textShape.fontSize = 8;
            textShape.text = "###";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
            //  attack
            this.statsAttack = engine.addEntity();
            Transform.create(this.statsAttack, { parent: this.statsParent, position: {x:-0.6,y:-0.2,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsAttack);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.2;
            textShape.textColor = Color4.Yellow(); textShape.fontSize = 8;
            textShape.text = "###";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
            //  armour
            this.statsArmour = engine.addEntity();
            Transform.create(this.statsArmour, { parent: this.statsParent, position: {x:0.6,y:-0.2,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsArmour);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.2;
            textShape.textColor = Color4.Teal(); textShape.fontSize = 8;
            textShape.text = "###";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
        }

        /** prepares the card slot for use by a table team */
        public Initialize(data:TableCardSlotCreationData) {
            this.IsActive = true;
            //indexing
            this.tableID = data.tableID;
            this.teamID = data.teamID;
            this.slotID = data.slotID;
            //transform
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.parent = data.parent;
            transformParent.position = data.position??PARENT_OFFSET_ON;
            transformParent.scale = data.scale??PARENT_SCALE_ON;
            const rot = data.rotation??PARENT_ROTATION_ON;
            transformParent.rotation = Quaternion.fromEulerDegrees(rot.x,rot.y,rot.z);
            //component
            TableCardSlotComponent.createOrReplace(this.entityInteraction, {
                tableID:data.tableID,
                teamID:data.teamID,
                slotID:data.slotID,
            });
            //pointer event system
            PointerEvents.createOrReplace(this.entityInteraction, {
                pointerEvents: [
                    { //primary mouse -> select card slot
                        eventType: PointerEventType.PET_DOWN,
                        eventInfo: { button: InputAction.IA_POINTER, hoverText: "SELECT "+this.Key }
                    },
                    { //primary key -> attempt select
                        eventType: PointerEventType.PET_DOWN,
                        eventInfo: { button: InputAction.IA_PRIMARY, hoverText: "SELECT "+this.Key }
                    },
                    { //secondary key -> attempt action
                        eventType: PointerEventType.PET_DOWN,
                        eventInfo: { button: InputAction.IA_SECONDARY, hoverText: "ACTIVATE "+this.Key }
                    },
                ]
            });

            //hide selection obj
            this.SetSelectionState(false);
            //show character stats
            Transform.getMutable(this.statsParent).scale = PARENT_SCALE_OFF;
        }

        /** sets the state of the selection object  */
        public SetSelectionState(state:boolean) {
            if(state) Transform.getMutable(this.entitySelection).scale = SELECTION_SCALE;
            else Transform.getMutable(this.entitySelection).scale = PARENT_SCALE_OFF;
        }

        /** applies a card to this card slot (displaying character or effect) */
        public ApplyCard(data:PlayCard.PlayCardDataObject) {
            this.slottedCard = data;
            //enable card parent
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.scale = PARENT_SCALE_ON;
            //display card character
            this.entityCharacter = CardSubjectObject.Create({
                key:"char-"+this.Key,
                //targeting
                type: this.slottedCard.DefData.type,
                model: this.slottedCard.DefData.objPath,
                animStart: CardSubjectObject.ANIM_KEY_CHARACTER.IDLE,
                animSpeed: 0.8,
                //position
                parent: this.entityParent, 
                position: DISAPLAY_OFFSET_ON,
                scale: DISAPLAY_SCALE,
                rotation: Quaternion.fromEulerDegrees(DISAPLAY_ROTATION.x, DISAPLAY_ROTATION.y, DISAPLAY_ROTATION.z)
            });
            //show character stats
            Transform.getMutable(this.statsParent).scale = STATS_SCALE;
            this.UpdateStatDisplay();
        }

        /** redraws stats */
        public UpdateStatDisplay() {
            if(this.slottedCard == undefined) return;

            TextShape.getMutable(this.statsName).text = this.slottedCard.DefData.name;
            TextShape.getMutable(this.statsAction).text = "ACTIVE: "+this.slottedCard.ActionRemaining;
            TextShape.getMutable(this.statsHealth).text = "HP: "+this.slottedCard.HealthCur.toString();
            TextShape.getMutable(this.statsAttack).text = "ATK: "+this.slottedCard.Attack.toString();
            TextShape.getMutable(this.statsArmour).text = "DEF: "+this.slottedCard.Armour.toString();
        }

        /** clears an existing card from this card slot */
        public ClearCard() {
            this.slottedCard = undefined;
            //hide card character
            if(this.entityCharacter != undefined) {
                CardSubjectObject.Disable(this.entityCharacter);
                this.entityCharacter = undefined;
            }
            //hide character stats
            Transform.getMutable(this.statsParent).scale = PARENT_SCALE_OFF;
        }

        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.IsActive = false;
            this.ClearCard();
            //hide card parent
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.position = PARENT_OFFSET_OFF;
            transformParent.scale = PARENT_SCALE_OFF;
        }

        /** removes objects from game scene and engine */
        public Destroy() {
            //destroy game object
            engine.removeEntity(this.entityParent);
        }
    }
    
    /** provides a new object (either pre-existing & un-used or entirely new) */
    export function Create(data:TableCardSlotCreationData):TableCardSlotObject {
        const key:string = GetKeyFromData(data);
        var object:undefined|TableCardSlotObject = undefined;
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
            object = new TableCardSlotObject();
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
    export function Disable(object:TableCardSlotObject) {
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
    export function Destroy(object:TableCardSlotObject) {
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