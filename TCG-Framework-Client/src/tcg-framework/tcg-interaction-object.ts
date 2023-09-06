import { Color4, Quaternion, Scalar, Vector3 } from "@dcl/sdk/math";
import Dictionary, { List } from "../utilities/collections";
import { Entity, InputAction, MeshCollider, MeshRenderer, PointerEventType, PointerEvents, Schemas, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";

/*      TRADING CARD GAME - INTERACTION OBJECT
    objects used to act as interaction points for the player throughout the scene

    ex: deck manager, card field

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module InteractionObject
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Interaction Object: ";

    /** object model location */
    const MODEL_FRAME:string = 'models/tcg-framework/card-core/tcg-card-prototype.glb';

    /** determines all possible card owners */
    export enum INTERACTION_TYPE {
        DECK_MANAGER_FILTER = 0, //modifying view filters
        DECK_MANAGER_MODIFY = 1, //de/increasing cards in deck 
        GAME_TABLE = 10, //call from table button
        GAME_TEAM = 20, //call from table team button
    }
    
    /** transform defaults - parental enabled */
    const PARENT_POSITION_ON:Vector3 = { x:0, y:0, z:0 };
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_ROTATION_ON:Vector3 = { x:0, y:0, z:0 };

    /** transform defaults - parental disabled */
    const PARENT_POSITION_OFF:Vector3 = { x:0, y:0, z:0 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };

    /** transform defaults - textshape */
    const TEXT_POSITION:Vector3 = { x:0, y:0, z:-0.51 };
    const TEXT_SCALE:Vector3 = { x:1, y:1, z:1 };

    /** indexing key */
    var index:number = 0;
    function NextIndex():number { return index++; }

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<InteractionObject> = new List<InteractionObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<InteractionObject> = new List<InteractionObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<InteractionObject> = new List<InteractionObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<InteractionObject> = new Dictionary<InteractionObject>();

    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|InteractionObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }

    /** component for on-click interactions */
    export const InteractionObjectComponentData = {
        //what type of display this card is tied to
        //  0=table, 1=deck manager
        ownerType:Schemas.Number,
        //targeting
        target:Schemas.String,
        action:Schemas.Number,
    }
	/** define component, adding it to the engine as a managed behaviour */
    export const InteractionObjectComponent = engine.defineComponent("InteractionObjectComponentData", InteractionObjectComponentData);
    
	/** object interface used to define all data required to create a new object */
	export interface InteractionObjectCreationData {
        //display type
        ownerType: INTERACTION_TYPE;
        //targeting
        target:string;
        action?:number;
        //text
        displayText?:string;
        interactionText?:string;
		textPosition?: { x:number; y:number; z:number; }; //new position for object
		textScale?: { x:number; y:number; z:number; }; //new scale for object
        //position
        parent?: Entity; //entity to parent object under 
		position?: { x:number; y:number; z:number; }; //new position for object
		scale?: { x:number; y:number; z:number; }; //new scale for object
		rotation?: { x:number; y:number; z:number; }; //new rotation for object (in eular degrees)
	}

    /** contains all pieces that make up a card object  */
    export class InteractionObject { 
        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** unique key used for access */
        private key:string;
        public get Key():string { return this.key; };
        
        /** parental entity */
        public entity:Entity;
        /** display object */
        public entityShape:Entity;
        /** display text */
        public entityText:Entity;

        /** builds out the card, ensuring all required components exist and positioned correctly */
        constructor() {
            this.key = NextIndex().toString();

            //create parental object
            //  create entity
            this.entity = engine.addEntity();
            Transform.create(this.entity);
            
            //create parental object
            //  create entity
            this.entityShape = engine.addEntity();
            Transform.create(this.entityShape, { parent:this.entity });
            //  add custom model
            MeshRenderer.setBox(this.entityShape);
            MeshCollider.setBox(this.entityShape);
            /*GltfContainer.create(this.entityFrame, {
                src: MODEL_CARD_FRAME,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });*/
            
            //create text
            this.entityText = engine.addEntity();
            Transform.create(this.entityText, { 
                parent: this.entity,
            });
            TextShape.create(this.entityText, { text: "99", 
                textColor: Color4.Black(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
            });
        }

        /** initializes the  */
        public Initialize(data: InteractionObjectCreationData) {
            this.isActive = true;
            //transform parent
            const transform = Transform.getMutable(this.entity);
            transform.parent = data.parent;
            transform.position = data.position??PARENT_POSITION_ON;
            transform.scale = data.scale??PARENT_SCALE_ON;
            const rot = data.rotation??PARENT_ROTATION_ON;
            transform.rotation = Quaternion.fromEulerDegrees(rot.x,rot.y,rot.z);
            //transform text
            const transformText = Transform.getMutable(this.entityText);
            transformText.position = data.textPosition??TEXT_POSITION;
            transformText.scale = data.textScale??TEXT_SCALE;
            //text
            TextShape.getMutable(this.entityText).text = data.displayText??"";
            //component
            InteractionObjectComponent.createOrReplace(this.entityShape, {
                ownerType:data.ownerType,
                target:data.target,
                action:data.action??-1,
            });
            
            //pointer event system
            PointerEvents.createOrReplace(this.entityShape, {
                pointerEvents: [
                  {
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: data.interactionText??"" }
                  },
                ]
            });
        }

        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.isActive = false;
            //hide card parent
            const transformParent = Transform.getMutable(this.entityShape);
            transformParent.position = PARENT_POSITION_OFF;
            transformParent.scale = PARENT_SCALE_OFF;
        }

        /** removes objects from game scene and engine */
        public Destroy() {
            //destroy game object
            engine.removeEntity(this.entityShape);
        }
    }
    
    /** provides a new interaction object (either pre-existing & un-used or entirely new) */
    export function Create(data:InteractionObjectCreationData):InteractionObject {
        var object:undefined|InteractionObject = undefined;
        if(isDebugging) console.log(debugTag+"attempting to create new object, ownerType="+data.ownerType+"...");
        
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
            object = new InteractionObject();
            //  add to overhead collection
            pooledObjectsAll.addItem(object);
        }

        //initialize object
        object.Initialize(data);

        //add object to active collection (ensure only 1 entry)
        var posX = pooledObjectsActive.getItemPos(object);
        if(posX == -1) pooledObjectsActive.addItem(object);
        //add to registry under given key
        pooledObjectsRegistry.addItem(object.Key, object);

        if(isDebugging) console.log(debugTag+"created new object, ownerType="+data.ownerType+", key='"+object.Key+"'!");
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
    export function Disable(object:InteractionObject) {
        const key:string = object.Key;
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
    export function Destroy(object:InteractionObject) {
        const key:string = object.Key;
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