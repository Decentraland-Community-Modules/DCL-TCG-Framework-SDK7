import { ColliderLayer, Entity, GltfContainer, InputAction, MeshCollider, MeshRenderer, PointerEventType, PointerEvents, Schemas, Transform, engine } from "@dcl/sdk/ecs";
import { Quaternion, Vector3 } from "@dcl/sdk/math";
import { Dictionary, List } from "../utilities/collections";
import { CardDataObject } from "./data/tcg-card-data";

/*      TRADING CARD GAME - TABLE CARD SLOT
    represents a single card slot on a team's side of a table

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module TableCardSlot {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Table Card Slot: ";

    /** scale for parental view toggles */
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };

    /** transform details for displayed card element */
    const DISAPLAY_OFFSET_ON:Vector3 = { x:0, y:1.5, z:0 };
    const DISAPLAY_OFFSET_OFF:Vector3 = { x:0, y:-10, z:0 };
    const DISAPLAY_SCALE:Vector3 = { x:1, y:1, z:1 };
    const DISAPLAY_ROTATION:Vector3 = { x:0, y:0, z:0 };

    /** transform details for interaction element */
    const INTERACTION_OFFSET:Vector3 = { x:0, y:0, z:0 };
    const INTERACTION_SCALE:Vector3 = { x:1.8, y:0.5, z:1.8 };
    const INTERACTION_ROTATION:Vector3 = { x:0, y:0, z:0 };

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
        private parentEntity: Entity;

        /** interaction area for the card */
        private interactionEntity: Entity;

        /** active character display object (actual character in this slot) */
        private characterEntity: Entity;

        /** prepares field team for use */
        constructor() {
            //create interaction object
            this.parentEntity = engine.addEntity();
            Transform.create(this.parentEntity);

            //create display object
            this.characterEntity = engine.addEntity();
            Transform.create(this.characterEntity, {
                parent: this.parentEntity,
                position: DISAPLAY_OFFSET_ON,
                scale: DISAPLAY_SCALE,
                rotation: Quaternion.fromEulerDegrees(DISAPLAY_ROTATION.x, DISAPLAY_ROTATION.y, DISAPLAY_ROTATION.z)
            });

            //create interaction object
            this.interactionEntity = engine.addEntity();
            Transform.create(this.interactionEntity, {
                parent: this.parentEntity,
                position: INTERACTION_OFFSET,
                scale: INTERACTION_SCALE,
                rotation: Quaternion.fromEulerDegrees(INTERACTION_ROTATION.x, INTERACTION_ROTATION.y, INTERACTION_ROTATION.z)
            });
            //  add model
            MeshRenderer.setBox(this.interactionEntity);
            MeshCollider.setBox(this.interactionEntity, ColliderLayer.CL_POINTER);
        }

        /** prepares the card slot for use by a table team */
        public Initialize(data:TableCardSlotCreationData) {
            this.isActive = true;
            //indexing
            this.tableID = data.tableID;
            this.teamID = data.teamID;
            this.slotID = data.slotID;
            //transform
            const transformParent = Transform.getMutable(this.parentEntity);
            transformParent.parent = data.parent;
            transformParent.position = data.position;
            //transformParent.scale = INTERACTION_SCALE;
            //transformParent.rotation = Quaternion.fromEulerDegrees(INTERACTION_ROTATION.x, INTERACTION_ROTATION.y, INTERACTION_ROTATION.z);
            //component
            TableCardSlotComponent.createOrReplace(this.interactionEntity, {
                tableID:data.tableID,
                teamID:data.teamID,
                slotID:data.slotID,
            });
            //  pointer event system
            PointerEvents.createOrReplace(this.interactionEntity, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "Select Card Slot "+TableCardSlot.GetKeyFromObject(this) }
                  },
                ]
            });
        }

        /** applies a card to this card slot (displaying character or effect) */
        public ApplyCard(data:CardDataObject) {
            this.slottedCard = data.id.toString();
            //enable card parent
            const transformParent = Transform.getMutable(this.parentEntity);
            transformParent.scale = PARENT_SCALE_ON;
            //display card character
            const transformCharacter = Transform.getMutable(this.characterEntity);
            transformCharacter.position = DISAPLAY_OFFSET_ON;
            transformCharacter.scale = DISAPLAY_SCALE;
            //update card character model
            GltfContainer.createOrReplace(this.characterEntity, {
                src: data.objPath,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
        }

        /** clears an existing card from this card slot */
        public ClearCard() {
            //hide card character
            const transformCharacter = Transform.getMutable(this.characterEntity);
            transformCharacter.position = DISAPLAY_OFFSET_OFF;
            transformCharacter.scale = Vector3.Zero();
        }

        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.isActive = false;
            this.ClearCard();
            //hide card parent
            const transformParent = Transform.getMutable(this.parentEntity);
            transformParent.scale = PARENT_SCALE_OFF;
        }

        /** removes objects from game scene and engine */
        public Destroy() {
            //destroy game object
            engine.removeEntity(this.parentEntity);
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