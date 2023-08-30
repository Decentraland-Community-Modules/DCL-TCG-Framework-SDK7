import { Animator, ColliderLayer, Entity, GltfContainer, MeshCollider, MeshRenderer, Transform, engine } from "@dcl/sdk/ecs";
import Dictionary, { List } from "../utilities/collections";
import { Quaternion } from "@dcl/sdk/math";

/*      TRADING CARD GAME - CARD CHARACTER OBJECT
    contains all the functionality for the framework's card character objects. these are display
    objects that provide a visual representation of the given card's character. the framework keys
    each character, use this for linking characters to specific cards.

    TODO: break this down to be more module for spells/field (not just characters)

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module CardCharacterObject
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Card Character Object: ";

    /** listing for all animation keys */
    export enum ANIM_KEY_NAMES {
        NONE = -1,
        SPAWN = 0,
        IDLE = 1,
        ATTACK = 2,
        FLINCH = 3,
        ACTION = 4,
        DEATH = 5
    } 

    /** animation key tags (FOR CARD) */
    const ANIM_KEYS_CHARACTER:string[] = [
        "anim_spawn", // first created from card
        "anim_idle", // standing/no order
        "anim_attack", // attacks enemy
        "anim_flinch", // struck/takes damage
        "anim_action", // activatable effects/abilities
        "anim_death", // when unit is killed
    ];

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<CardCharacterObject> = new List<CardCharacterObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<CardCharacterObject> = new List<CardCharacterObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<CardCharacterObject> = new List<CardCharacterObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<CardCharacterObject> = new Dictionary<CardCharacterObject>();

	/** object interface used to define all data required to create a new object */
	export interface CardCharacterObjectCreationData {
        //indexing
        key: string; //key to register this object at (overwrites if key already exists)
		//targeting
        model: string; //type of object to create (linkage to def)
        //position
        parent: undefined|Entity, //entity to parent object under 
		position: { x:number; y:number; z:number; }; //new position for object
		scale: { x:number; y:number; z:number; }; //new scale for object
		rotation: { x:number; y:number; z:number; }; //new rotation for object (in eular degrees)
	}

    /** contains all pieces that make up a card character object  */
    export class CardCharacterObject { 
        /** true when this object is rendered in the scene */
        isActive:boolean = true; 

        /** uid of object (used to tie back to cards/owner) */
        key: string = "";

        /** card character entity */
        entity:Entity = engine.addEntity();

        /** initializes the  */
        public Intialize(data: CardCharacterObjectCreationData) {
            //update object
            this.isActive = true;
            //  key
            this.key = data.key;
            //  transform 
            const transform = Transform.getOrCreateMutable(this.entity);
            transform.parent = data.parent;
            transform.position = data.position;
            transform.scale = data.scale;
            transform.rotation = Quaternion.fromEulerDegrees(data.rotation.x,data.rotation.y,data.rotation.z);
            //  debugging mesh
            //MeshRenderer.setBox(this.entity);
            //  custom model
            GltfContainer.createOrReplace(this.entity, {
                src: data.model,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            //  animations (must be reasserted whenever model is replaced)
            Animator.createOrReplace(this.entity, {
                states:[
                    {name: ANIM_KEYS_CHARACTER[0], clip: ANIM_KEYS_CHARACTER[0], playing: false, loop: true},
                    {name: ANIM_KEYS_CHARACTER[1], clip: ANIM_KEYS_CHARACTER[1], playing: false, loop: true},
                    {name: ANIM_KEYS_CHARACTER[2], clip: ANIM_KEYS_CHARACTER[2], playing: false, loop: false},
                    {name: ANIM_KEYS_CHARACTER[3], clip: ANIM_KEYS_CHARACTER[3], playing: false, loop: false},
                    {name: ANIM_KEYS_CHARACTER[4], clip: ANIM_KEYS_CHARACTER[4], playing: false, loop: false},
                    {name: ANIM_KEYS_CHARACTER[5], clip: ANIM_KEYS_CHARACTER[5], playing: false, loop: false},
                ]
            });
            //halt any animations
            this.SetAnimation(ANIM_KEY_NAMES.NONE);
        }

        /** plays the given animation on the character */
        public SetAnimation(animation:ANIM_KEY_NAMES) {
            //turn off all animations
            for(let i = 0; i < ANIM_KEYS_CHARACTER.length; i++) {
                Animator.getClip(this.entity, ANIM_KEYS_CHARACTER[i]).playing = false;
            }
            //turn on targeted animation
            if(animation != ANIM_KEY_NAMES.NONE) Animator.getClip(this.entity, ANIM_KEYS_CHARACTER[animation]).playing = true;
        }

        /** sets the speed of the given animation */
        public SetAnimationSpeed(animation:ANIM_KEY_NAMES, speed:number) {
            Animator.getClip(this.entity, ANIM_KEYS_CHARACTER[animation]).speed = speed;
        }
    }

    /** provides a new card character object (either pre-existing & un-used or entirely new)
     * 
     *  @param data initialization details for object 
     *  @param key unique id of card object, used for access
     *  @returns: reference to card character object
     */
    export function Create(data:CardCharacterObjectCreationData):CardCharacterObject {
        if(isDebugging) console.log(debugTag+"attempting to create object, key="+data.key);
        
        var object:undefined|CardCharacterObject = undefined;
        
        //if an object under the requested key is already active, hand that back
        if(pooledObjectsRegistry.containsKey(data.key)) {
            console.log(debugTag+"<WARNING> requesting pre-existing object (use get instead), key="+data.key);
            object = pooledObjectsRegistry.getItem(data.key);
        } 
        //  attempt to find an existing unused object
        if(object == undefined && pooledObjectsInactive.size() > 0) {
            //grab entity from (grabbing from back is a slight opt)
            object = pooledObjectsInactive.getItem(pooledObjectsInactive.size()-1);
            //  remove from inactive listing
            pooledObjectsInactive.removeItem(object);
        }
        //  if not recycling unused object
        if(object == undefined) {
            //create new object
            object = new CardCharacterObject();
            //  add to overhead collection
            pooledObjectsAll.addItem(object);
        }

        //prepare object for use
        object.Intialize(data);

        //add object to active collection (ensure only 1 entry)
        var posX = pooledObjectsActive.getItemPos(object);
        if(posX == -1) pooledObjectsActive.addItem(object);
        //add to registry under given key
        pooledObjectsRegistry.addItem(data.key, object);
        
        if(isDebugging) console.log(debugTag+"created new object, key="+data.key+
            ", total="+pooledObjectsAll.size()+", active="+pooledObjectsActive.size()+", inactive="+pooledObjectsInactive.size());
        //provide object reference
        return object;
    }

    /** attmepts to find an object of the given key. if no object is registered under the
     *  given key then 'undefined' is returned.
     * 
     * use create to initialize a card object (send it def, rarity, etc.)
     */
    export function GetByKey(key:string):undefined|CardCharacterObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
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
    export function Disable(object:CardCharacterObject) {
        //adjust collections
        //  add to inactive listing (ensure add is required)
        var posX = pooledObjectsInactive.getItemPos(object);
        if(posX == -1) pooledObjectsInactive.addItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(object.key)) pooledObjectsRegistry.removeItem(object.key);

        //disable via component
        object.isActive = false;
        
        //hide object (soft remove work-around)
        Transform.getMutable(object.entity).scale = { x:0, y:0, z:0 }; 
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
    export function Destroy(object:CardCharacterObject) {
        //adjust collections
        //  remove from overhead listing
        pooledObjectsAll.removeItem(object);
        //  remove from inactive listing
        pooledObjectsInactive.removeItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(object.key)) pooledObjectsRegistry.removeItem(object.key);

        //destroy game object
        engine.removeEntity(object.entity);
        //TODO: atm we rely on DCL to clean up object data class. so far it hasn't been an issue due to how
        //  object data is pooled, but we should look into how we can explicitly set data classes for removal
    }
}