import { Quaternion, Vector3 } from "@dcl/sdk/math";
import Dictionary, { List } from "../utilities/collections";
import { Entity, Transform, engine } from "@dcl/sdk/ecs";
import { TableTeam } from "./tcg-table-team";


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

    /** indexing key */
    export function GetKeyFromObject(data:TableObject):string { return data.TableID; };
    export function GetKeyFromData(data:TableTeamCreationData):string { return data.tableID; };

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
        tableID: string,
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
        private tableID:string = "";
        public get TableID():string { return this.tableID; };
        
        /** id of the currently slotted card playdata */
        private slottedCard:undefined|string = undefined;
        public get SlottedCard():undefined|string { return this.slottedCard; }

        /** parental position */
        private parentEntity: Entity;

        /** all team objects */
        private teamObjects: TableTeam.TableTeamObject[] = [];

        /** prepares field team for use */
        constructor() {
            //create parental object
            this.parentEntity = engine.addEntity();
            Transform.create(this.parentEntity, {
                parent: this.parentEntity,
                scale: PARENT_SCALE_ON,
            });
        }

        /** prepares the card slot for use by a table team */
        public Initialize(data:TableTeamCreationData) {
            this.isActive = true;
            //indexing
            this.tableID = data.tableID;
            //transform
            const transformParent = Transform.getMutable(this.parentEntity);
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
            for(let i:number=0; i<1; i++) {
                const teamObject:TableTeam.TableTeamObject = TableTeam.Create({
                    tableID: data.tableID,
                    teamID: i.toString(),
                    parent: this.parentEntity,
                    position: FIELD_TEAM_OFFSET[i],
                    rotation: FIELD_TEAM_ROTATION[i]
                });
                this.teamObjects.push(teamObject);
            }
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
            const transformParent = Transform.getMutable(this.parentEntity);
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
            engine.removeEntity(this.parentEntity);
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
}