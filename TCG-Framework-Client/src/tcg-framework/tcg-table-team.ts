import { Quaternion, Vector3 } from "@dcl/sdk/math";
import Dictionary, { List } from "../utilities/collections";
import { ColliderLayer, Entity, GltfContainer, Schemas, Transform, engine } from "@dcl/sdk/ecs";
import { TableCardSlot } from "./tcg-table-card-slot";

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

    /** model location for a card table team */
    const MODEL_TABLE_TEAM:string = 'models/tcg-framework/battle-field/field-prototype.glb';

    /** scale for parental view toggles */
    const PARENT_OFFSET_ON:Vector3 = { x:0, y:0, z:0 };
    const PARENT_OFFSET_OFF:Vector3 = { x:0, y:-10, z:0 };
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };

    /** positions of field team's card slots */
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
        
        /** id of the currently slotted card playdata */
        private slottedCard:undefined|string = undefined;
        public get SlottedCard():undefined|string { return this.slottedCard; }

        /** parental position */
        private parentEntity: Entity;

        /** all card slot objects */
        private cardSlotObjects:TableCardSlot.TableCardSlotObject[] = [];

        /** prepares field team for use */
        constructor() {
            //create display object
            this.parentEntity = engine.addEntity();
            Transform.create(this.parentEntity, {
                position: PARENT_OFFSET_ON,
                scale: PARENT_SCALE_ON,
            });
            //  add custom model
            GltfContainer.create(this.parentEntity, {
                src: MODEL_TABLE_TEAM,
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
            //transform
            const transformParent = Transform.getMutable(this.parentEntity);
            transformParent.parent = data.parent; console.log("entity="+this.parentEntity+", parent="+data.parent);
            transformParent.position = PARENT_OFFSET_ON;
            transformParent.scale = PARENT_SCALE_ON;
            transformParent.rotation = Quaternion.fromEulerDegrees(data.rotation.x, data.rotation.y, data.rotation.z);
        
            //clear previous team objects
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
                    parent: this.parentEntity,
                    position: CARD_SLOT_POSITIONS[i]
                });
                this.cardSlotObjects.push(teamObject);
            }
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
            const transformParent = Transform.getMutable(this.parentEntity);
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
            engine.removeEntity(this.parentEntity);
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