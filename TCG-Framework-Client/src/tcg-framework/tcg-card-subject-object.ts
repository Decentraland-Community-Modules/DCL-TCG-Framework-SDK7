import { Animator, ColliderLayer, Entity, GltfContainer, Transform, engine } from "@dcl/sdk/ecs";
import Dictionary, { List } from "../utilities/collections";
import { Quaternion } from "@dcl/sdk/math";
import { CARD_TYPE } from "./data/tcg-card-data";
import * as utils from '@dcl-sdk/utils';

/*      TRADING CARD GAME - CARD SUBJECT OBJECT
    contains all the functionality for displaying a card's subject via display object (character, 
    spell, terrain).

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module CardSubjectObject
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Card Character Object: ";

    /** listing for all animation keys for character objects */
    export enum ANIM_KEY_SPELL {
        NONE = -1,
        PLAY = 0,
    } 

    /** animation key tags (FOR CARD) */
    const ANIM_KEYS_SPELL:string[] = [
        "anim_spawn", //
    ];

    /** listing for all animation keys for character objects */
    export enum ANIM_KEY_CHARACTER {
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
        "anim_spawn", //first created from card
        "anim_idle", //standing/no order
        "anim_attack", //attacks enemy
        "anim_flinch", //struck/takes damage
        "anim_action", //activatable effects/abilities
        "anim_death", //when unit is killed
    ];

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<CardSubjectObject> = new List<CardSubjectObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<CardSubjectObject> = new List<CardSubjectObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<CardSubjectObject> = new List<CardSubjectObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<CardSubjectObject> = new Dictionary<CardSubjectObject>();

	/** object interface used to define all data required to create a new object */
	export interface CardSubjectObjectCreationData {
        //indexing
        key:string; //key to register this object at (overwrites if key already exists)
		//targeting
        type:CARD_TYPE; //type of card subject being displayed
        model:string; //model to be displayed
        animStart?:ANIM_KEY_SPELL|ANIM_KEY_CHARACTER,
        animSpeed?:number,
        forceRepeat?:boolean; //when true, all animations will be forced to repeat
        //position
        parent:undefined|Entity, //entity to parent object under 
		position: { x:number; y:number; z:number; }; //new position for object
		scale: { x:number; y:number; z:number; }; //new scale for object
		rotation: { x:number; y:number; z:number; }; //new rotation for object (in eular degrees)
	}

    /** contains all pieces that make up a card's subject object  */
    export class CardSubjectObject { 
        /** true when this object is rendered in the scene */
        isActive:boolean = true; 

        animationIndex = 0;

        /** uid of object (used to tie back to cards/owner) */
        key:string = "";

        /** type of subject being displayed */
        type:undefined|CARD_TYPE;

        /** card character entity */
        entity:Entity = engine.addEntity();

        /** initializes the  */
        public Intialize(data: CardSubjectObjectCreationData) {
            //update object
            this.isActive = true;
            this.type = data.type;
            //  key
            this.key = data.key;
            //  transform 
            const transform = Transform.getOrCreateMutable(this.entity);
            transform.parent = data.parent;
            transform.position = data.position;
            transform.scale = data.scale;
            transform.rotation = Quaternion.fromEulerDegrees(data.rotation.x,data.rotation.y,data.rotation.z);
            //  custom model
            GltfContainer.createOrReplace(this.entity, {
                src: data.model,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            //  animations (must be reasserted whenever model is replaced)
            switch(data.type) {
                case CARD_TYPE.SPELL:
                    Animator.createOrReplace(this.entity, {
                        states:[
                            {clip:ANIM_KEYS_SPELL[0], playing:false, speed:data.animSpeed??1, loop:data.forceRepeat??false},
                        ]
                    });
                break;
                case CARD_TYPE.CHARACTER:
                    Animator.createOrReplace(this.entity, {
                        states:[
                            {clip:ANIM_KEYS_CHARACTER[0], playing:false, speed:data.animSpeed??1, shouldReset:true, loop:data.forceRepeat??false},
                            {clip:ANIM_KEYS_CHARACTER[1], playing:false, speed:data.animSpeed??1, shouldReset:false, loop:data.forceRepeat??true},
                            {clip:ANIM_KEYS_CHARACTER[2], playing:false, speed:data.animSpeed??1, shouldReset:true, loop:data.forceRepeat??false},
                            {clip:ANIM_KEYS_CHARACTER[3], playing:false, speed:data.animSpeed??1, shouldReset:true, loop:data.forceRepeat??false},
                            {clip:ANIM_KEYS_CHARACTER[4], playing:false, speed:data.animSpeed??1, shouldReset:true, loop:data.forceRepeat??false},
                            {clip:ANIM_KEYS_CHARACTER[5], playing:false, speed:data.animSpeed??1, shouldReset:false, loop:data.forceRepeat??false},
                        ]
                    });
                break;
                case CARD_TYPE.TERRAIN:
                break;
            }
            //set initial animations
            this.SetAnimation(data.animStart??ANIM_KEY_CHARACTER.NONE);
        }

        /** plays a single animation, then restarts the previous animation */
        public PlaySingleAnimation(animation:ANIM_KEY_SPELL|ANIM_KEY_CHARACTER, autoHide:boolean) {
            //prepare upper send data
            const key = this.key;
            const preAnim = this.animationIndex;
            //play next animation
            this.SetAnimation(animation);
            utils.timers.setTimeout(
                function() {
                    //console.log("playing animation:"+preAnim+" hide="+autoHide);
                    SetAnimation(key, preAnim, autoHide);
                },
                1900
            );
        }

        public SetScale(scale:number){
            Transform.getMutable(this.entity).scale = {x:scale,y:scale,z:scale};
        }

        /** plays the given animation on the character */
        public SetAnimation(animation:ANIM_KEY_SPELL|ANIM_KEY_CHARACTER, autoHide:boolean=false) {
            this.animationIndex = animation;
            switch(this.type) {
                case CARD_TYPE.SPELL:
                    //turn off all animations
                    for(let i = 0; i < ANIM_KEYS_SPELL.length; i++) {
                        Animator.getClip(this.entity, ANIM_KEYS_SPELL[i]).playing = false;
                    }
                    //turn on targeted animation
                    if(animation != ANIM_KEY_SPELL.NONE) Animator.getClip(this.entity, ANIM_KEYS_SPELL[animation]).playing = true;
                break;
                case CARD_TYPE.CHARACTER:
                    //turn off all animations
                    for(let i = 0; i < ANIM_KEYS_CHARACTER.length; i++) {
                        Animator.getClip(this.entity, ANIM_KEYS_CHARACTER[i]).playing = false;
                    }
                    //turn on targeted animation
                    if(animation != ANIM_KEY_CHARACTER.NONE) Animator.getClip(this.entity, ANIM_KEYS_CHARACTER[animation]).playing = true;
                break;
                case CARD_TYPE.TERRAIN:
                break;
            }
        }

        /** sets the speed of the given animation */
        public SetAnimationSpeed(animation:ANIM_KEY_SPELL|ANIM_KEY_CHARACTER, speed:number) {
            switch(this.type) {
                case CARD_TYPE.SPELL:
                    Animator.getClip(this.entity, ANIM_KEYS_SPELL[animation]).speed = speed;
                break;
                case CARD_TYPE.CHARACTER:
                    Animator.getClip(this.entity, ANIM_KEYS_CHARACTER[animation]).speed = speed;
                break;
                case CARD_TYPE.TERRAIN:
                break;
            }
        }
    }

    //TODO: change this a bit to rely on new 'reset state' animation trigger
    export function SetAnimation(key:string, anim:ANIM_KEY_SPELL|ANIM_KEY_CHARACTER, autoHide:boolean) {
        const object = GetByKey(key);
        if(object != undefined) {
            if(autoHide) object.SetScale(0); 
            else object.SetAnimation(anim);
        }
    }

    /** provides a new card character object (either pre-existing & un-used or entirely new)
     * 
     *  @param data initialization details for object 
     *  @param key unique id of card object, used for access
     *  @returns: reference to card character object
     */
    export function Create(data:CardSubjectObjectCreationData):CardSubjectObject {
        if(isDebugging) console.log(debugTag+"attempting to create object, key="+data.key);
        
        var object:undefined|CardSubjectObject = undefined;
        
        //if an object under the requested key is already active, hand that back
        if(pooledObjectsRegistry.containsKey(data.key)) {
            //console.log(debugTag+"<WARNING> requesting pre-existing object (use get instead), key="+data.key);
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
            object = new CardSubjectObject();
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
    export function GetByKey(key:string):undefined|CardSubjectObject {
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
    export function Disable(object:CardSubjectObject) {
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
    export function Destroy(object:CardSubjectObject) {
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