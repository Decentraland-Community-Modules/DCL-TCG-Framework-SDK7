import { Billboard, ColliderLayer, Entity, Font, GltfContainer, InputAction, MeshCollider, MeshRenderer, PointerEventType, PointerEvents, Schemas, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { Dictionary, List } from "../utilities/collections";
import { CardData, CardDataObject } from "./data/tcg-card-data";
import { PlayCard } from "./tcg-play-card";

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

    /** scale for parental view toggles */
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };

    /** transforms for displayed card element */
    const DISAPLAY_OFFSET_ON:Vector3 = { x:0, y:0.425, z:0 };
    const DISAPLAY_OFFSET_OFF:Vector3 = { x:0, y:-10, z:0 };
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
    export function GetKeyFromObject(data:TableCardSlotObject):string { return data.TableID+"-"+data.TeamID+"-"+data.SlotID; };
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
        tableID:Schemas.String,
        teamID:Schemas.String,
        slotID:Schemas.String,
    }
	/** define component, adding it to the engine as a managed behaviour */
    export const TableCardSlotComponent = engine.defineComponent("TableCardSlotComponentData", TableCardSlotComponentData);

	/** object interface used to define all data required to create a team card slot */
	export interface TableCardSlotCreationData {
        //indexing
        tableID: string,
        teamID: string,
        slotID: string,
        //position
        parent: undefined|Entity, //entity to parent object under 
		position: { x:number; y:number; z:number; }; //new position for object
	}

    /** represents a single card slot within a card field team */
    export class TableCardSlotObject {
        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** represents the unique index of this slot's table, req for networking */
        private tableID:string = "";
        public get TableID():string { return this.tableID; };

        /** represents the unique index of this slot's team, req for networking */
        private teamID:string = "";
        public get TeamID():string { return this.teamID; };

        /** represents the unique index of this slot, req for networking */
        private slotID:string = "";
        public get SlotID():string { return this.slotID; };
        
        /** id of the currently slotted card playdata */
        private slottedCard:undefined|string = undefined;
        public get SlottedCard():undefined|string { return this.slottedCard; }

        /** parental position */
        private entityParent:Entity;
        /** interaction area for the card */
        private entityInteraction:Entity;
        /** selection preview (shows if slot is selected) */
        private entitySelection:Entity;
        /** active character display object (actual character in this slot) */
        private entityCharacter:Entity;

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

            //create display object
            this.entityCharacter = engine.addEntity();
            Transform.create(this.entityCharacter, {
                parent: this.entityParent,
                position: DISAPLAY_OFFSET_ON,
                scale: DISAPLAY_SCALE,
                rotation: Quaternion.fromEulerDegrees(DISAPLAY_ROTATION.x, DISAPLAY_ROTATION.y, DISAPLAY_ROTATION.z)
            });

            //create selection object
            this.entitySelection = engine.addEntity();
            Transform.create(this.entitySelection, {
                parent: this.entityParent,
                position: SELECTION_OFFSET,
                scale: SELECTION_SCALE,
                rotation: Quaternion.fromEulerDegrees(SELECTION_ROTATION.x, SELECTION_ROTATION.y, SELECTION_ROTATION.z)
            });
            //  add model
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
            //  add model
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
            //name
            this.statsName = engine.addEntity();
            Transform.create(this.statsName, { parent: this.statsParent, position: {x:0,y:0.25,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsName);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 12;
            textShape.text = "<CHARACTER_NAME>";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
            //action
            this.statsAction = engine.addEntity();
            Transform.create(this.statsAction, { parent: this.statsParent, position: {x:0,y:0,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsAction);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.1;
            textShape.textColor = Color4.White(); textShape.fontSize = 6;
            textShape.text = "<ACTION REMAINING>";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
            //health
            this.statsHealth = engine.addEntity();
            Transform.create(this.statsHealth, { parent: this.statsParent, position: {x:0,y:-0.2,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsHealth);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.2;
            textShape.textColor = Color4.Red(); textShape.fontSize = 8;
            textShape.text = "###";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
            //attack
            this.statsAttack = engine.addEntity();
            Transform.create(this.statsAttack, { parent: this.statsParent, position: {x:-0.6,y:-0.2,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsAttack);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.2;
            textShape.textColor = Color4.Yellow(); textShape.fontSize = 8;
            textShape.text = "###";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
            //armour
            this.statsArmour = engine.addEntity();
            Transform.create(this.statsArmour, { parent: this.statsParent, position: {x:0.6,y:-0.2,z:0}, scale: {x:0.2,y:0.2,z:0.2} });
            var textShape = TextShape.create(this.statsArmour);
            textShape.outlineColor = Color4.Black(); textShape.outlineWidth = 0.2;
            textShape.textColor = Color4.Blue(); textShape.fontSize = 8;
            textShape.text = "###";
            textShape.textAlign = TextAlignMode.TAM_MIDDLE_CENTER;
        }

        /** prepares the card slot for use by a table team */
        public Initialize(data:TableCardSlotCreationData) {
            this.isActive = true;
            //indexing
            this.tableID = data.tableID;
            this.teamID = data.teamID;
            this.slotID = data.slotID;
            //transform
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.parent = data.parent;
            transformParent.position = data.position;
            //transformParent.scale = INTERACTION_SCALE;
            //transformParent.rotation = Quaternion.fromEulerDegrees(INTERACTION_ROTATION.x, INTERACTION_ROTATION.y, INTERACTION_ROTATION.z);
            //component
            TableCardSlotComponent.createOrReplace(this.entityInteraction, {
                tableID:data.tableID,
                teamID:data.teamID,
                slotID:data.slotID,
            });
            //  pointer event system
            PointerEvents.createOrReplace(this.entityInteraction, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "Select Card Slot "+TableCardSlot.GetKeyFromObject(this) }
                  },
                ]
            });
            //hide selection obj
            this.SetSelectionState(false);
            //show character stats
            Transform.getMutable(this.statsParent).scale = PARENT_SCALE_OFF;
        }

        /** */
        public SetSelectionState(state:boolean) {
            if(state) Transform.getMutable(this.entitySelection).scale = SELECTION_SCALE;
            else Transform.getMutable(this.entitySelection).scale = PARENT_SCALE_OFF;
        }

        /** applies a card to this card slot (displaying character or effect) */
        public ApplyCard(data:PlayCard.PlayCardDataObject) {
            this.slottedCard = data.Key;
            //enable card parent
            const transformParent = Transform.getMutable(this.entityParent);
            transformParent.scale = PARENT_SCALE_ON;
            //display card character
            const transformCharacter = Transform.getMutable(this.entityCharacter);
            transformCharacter.position = DISAPLAY_OFFSET_ON;
            transformCharacter.scale = DISAPLAY_SCALE;
            //update card character model
            GltfContainer.createOrReplace(this.entityCharacter, {
                src: data.DefData.objPath,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            //show character stats
            Transform.getMutable(this.statsParent).scale = STATS_SCALE;
            this.UpdateStatDisplay(data);
        }

        public UpdateStatDisplay(data:PlayCard.PlayCardDataObject) {
            TextShape.getMutable(this.statsName).text = data.DefData.name;
            TextShape.getMutable(this.statsAction).text = "ACTIVE: "+"TRUE";
            TextShape.getMutable(this.statsHealth).text = "HP: "+data.Health.toString();
            TextShape.getMutable(this.statsAttack).text = "ATK: "+data.Attack.toString();
            TextShape.getMutable(this.statsArmour).text = "DEF: "+data.Armour.toString();
        }

        /** clears an existing card from this card slot */
        public ClearCard() {
            //hide card character
            const transformCharacter = Transform.getMutable(this.entityCharacter);
            transformCharacter.position = DISAPLAY_OFFSET_OFF;
            transformCharacter.scale = Vector3.Zero();
            //hide character stats
            Transform.getMutable(this.statsParent).scale = PARENT_SCALE_OFF;
        }

        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.isActive = false;
            this.ClearCard();
            //hide card parent
            const transformParent = Transform.getMutable(this.entityParent);
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
    export function Destroy(object:TableCardSlotObject) {
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