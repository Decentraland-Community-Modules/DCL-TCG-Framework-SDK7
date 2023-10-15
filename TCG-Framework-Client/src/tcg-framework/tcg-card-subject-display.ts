import { Animator, ColliderLayer, Entity, GltfContainer, MeshRenderer, Schemas, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { Quaternion, Vector3 } from "@dcl/sdk/math";
import { CardDataRegistry } from "./data/tcg-card-registry";
import { CARD_TYPE, CardDataObject } from "./data/tcg-card-data";
import { CARD_OBJECT_OWNER_TYPE } from "./config/tcg-config";
import Dictionary, { List } from "../utilities/collections";
import { CardKeywordDisplayObject } from "./tcg-card-keyword-object";
import { PlayCard } from "./tcg-play-card";

/*      TRADING CARD GAME FRAMEWORK - CARD SUBJECT DISPLAY PANEL

    Overhead diplay panel for a units stats

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder), Jacko
    TeamContact: thecryptotrader69@gmail.com
*/

export module CardSubjectDisplayPanel {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG unit status Object: ";
    
    /** core display object model location */
    const MODEL_CORE:string = 'models/tcg-framework/card-table/card-subject-display.glb';
    
    /** determines all possible card interaction types */
    export enum STAT_DISPLAY_INTERACTION_TYPE {
        INTERACT = 0,
    }
    /** transform - parent */
    const PARENT_POSITION:Vector3 = { x:0, y:0, z:0 };
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };
    const PARENT_ROTATION:Vector3 = { x:0, y:0, z:0 };

    /** animation key tags (FOR CHARACTER) */
    const ANIM_KEYS_CARD:string[] = [
        "anim_state_on", //character state on
        "anim_state_off", //character state off
    ];

    /** default frame object size */
    const CARD_CORE_SCALE = {x:0.25, y:0.25, z:0.25};
    const CARD_CORE_POS = {x:0.0, y:0.0, z:0.0};
    /** health text transform */
    const characterStatTextHealthPos = { x:0, y:-0.04, z:-0.1,};
    const characterStatTextHealthScale = {x:0.3, y:0.3, z:0.3};
    /** attack text transform */
    const characterStatTextAttackPos = {x:-1.0, y:-0.04, z:-0.1};
    const characterStatTextAttackScale = {x:0.25, y:0.25, z:0.25};
    /** armour text transform */
    const characterStatTextArmourPos = { x:1, y:-0.04, z:-0.1};
    const characterStatTextArmourScale = {x:0.25, y:0.25, z:0.25};
    
    /** indexing key */
    export function GetKeyFromObject(data:StatDisplayObject):string { return data.OwnerType+"-"+(data.TableID??"0")+"-"+(data.TeamID??"0")+"-"+data.SlotID; };
    export function GetKeyFromData(data:StatDisplayObjectCreationData):string { return data.ownerType+"-"+(data.tableID??"0")+"-"+(data.teamID??"0")+"-"+data.slotID; };

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<StatDisplayObject> = new List<StatDisplayObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<StatDisplayObject> = new List<StatDisplayObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<StatDisplayObject> = new List<StatDisplayObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<StatDisplayObject> = new Dictionary<StatDisplayObject>();

    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|StatDisplayObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }
    /** component for on-click interactions */
    export const CardObjectComponentData = {
        //what type of display this card is tied to
        //  0=table, 1=deck manager
        ownerType:Schemas.Number,
        //indexing
        tableID:Schemas.String,
        teamID:Schemas.String,
        slotID:Schemas.String,
        //targeting
        request:Schemas.Number,
    }
	/** define component, adding it to the engine as a managed behaviour */
    export const CardObjectComponent = engine.defineComponent("CardObjectComponentData", CardObjectComponentData);
    
    //TODO: migrate to creation data system (pass all details to create a card in a single data object)
	/** object interface used to define all data required to create a new object */
	export interface StatDisplayObjectCreationData {
        //display type
        ownerType: CARD_OBJECT_OWNER_TYPE,
        //indexing
        tableID?: string,
        teamID?: string,
        slotID: string,
        //details
        def: CardDataObject,
        hasInteractions?:boolean
        hasCounter?: boolean,
        //position
        parent?: Entity, //entity to parent object under 
		position?: { x:number; y:number; z:number; }; //new position for object
		scale?: { x:number; y:number; z:number; }; //new scale for object
		rotation?: { x:number; y:number; z:number; }; //new rotation for object (in eular degrees)
	}

    /** contains all pieces that make up a stat display object  */
    export class StatDisplayObject {

        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };
        
        /** true when this object can be interacted with */
        IsInteractable:boolean = false; 

        /** type of owner/how this object should be interacted with */
        private ownerType:number = 0;
        public get OwnerType():number { return this.ownerType; };

        public get Key():string { return GetKeyFromObject(this); }

        /** represents the unique index of this slot's table, req for networking */
        private tableID:string = "";
        public get TableID():string { return this.tableID; };

        /** represents the unique index of this slot's team, req for networking */
        private teamID:string = "";
        public get TeamID():string { return this.teamID; };

        /** represents the unique index of this slot, req for networking */
        private slotID:string = "";
        public get SlotID():string { return this.slotID; };

        /** core definition for this stat display (this should be expanded to target play data) */
        private defIndex:number = 0;
        public get DefIndex():number { return this.defIndex; };

        /** parental entity */
        private entityParent:Entity;
        public SetPosition(pos:Vector3) { Transform.getMutable(this.entityParent).position = pos; }
        public SetRotation(rot:Vector3) { Transform.getMutable(this.entityParent).rotation = Quaternion.fromEulerDegrees(rot.x,rot.y,rot.z); }
        /** stat display core background */
        private StatDisplayPanel:Entity;
        /** card health text */
        private healthText:Entity;
        /** card attack text */
        private attackPowerText:Entity;
        /** card armour text */
        private armorText:Entity;

        /** card effect/keyword pieces */
        private keywordObjects:CardKeywordDisplayObject.CardKeywordDisplayObject[] = [];

        
        /** builds out the display panel, ensuring all required components exist and positioned correctly */
        constructor() {
            //create parent
            this.entityParent = engine.addEntity();
            Transform.create(this.entityParent, {
                scale: PARENT_SCALE_ON
            });

            /** card subjet stat display background */
            this.StatDisplayPanel = engine.addEntity();
            Transform.create(this.StatDisplayPanel,{
                parent:undefined,
                scale: { x:0.3, y:0.3, z:0.3,},
            });
            GltfContainer.create(this.StatDisplayPanel, {
                src: MODEL_CORE,
                visibleMeshesCollisionMask: undefined,
                invisibleMeshesCollisionMask: undefined
            });
            
            /** info attack display*/
            this.attackPowerText = engine.addEntity();
            Transform.create(this.attackPowerText,{
                parent:this.entityParent,
                position: characterStatTextAttackPos,
                scale: characterStatTextAttackScale,
            });
            TextShape.create(this.attackPowerText, { 
                text: "99",
                fontSize: 16,
            })

            /** info health display*/
            this.healthText = engine.addEntity();
            Transform.create(this.healthText,{
                parent:this.entityParent,
                position: characterStatTextHealthPos,
                scale: characterStatTextHealthScale,
            });
            TextShape.create(this.healthText, { 
                text: "99",
                fontSize: 16,
            })

            /** armor stat display*/
            this.armorText = engine.addEntity();
            Transform.create(this.armorText,{
                parent:this.entityParent,
                position: characterStatTextArmourPos,
                scale: characterStatTextArmourScale,
            });
            TextShape.create(this.armorText, { 
                text: "99",
                fontSize: 16,
            })

            /** status effect icons */
            const entityEffectIcons:Entity[] = [];
            for(let i = 0; i < 6; i++)
            {
                entityEffectIcons[i] = engine.addEntity();
                Transform.create(entityEffectIcons[i],{
                    parent:this.entityParent,
                    position: { x:-1.02+(i*0.41), y:-0.7, z:-0.1,},
                    scale: { x:0.37, y:0.37, z:0.3,},
                });
                MeshRenderer.setPlane(entityEffectIcons[i])
                
            }
        }
    

        /** initializes the  */
        public Initilize(data: StatDisplayObjectCreationData) {
            this.isActive = true;
            this.IsInteractable = false;
            //indexing
            this.ownerType = data.ownerType;
            this.tableID = data.tableID??"0";
            this.teamID = data.teamID??"0";
            this.slotID = data.slotID;
            //parent 
            const transform = Transform.getOrCreateMutable(this.entityParent);
            transform.parent = data.parent;
            transform.position = data.position??PARENT_POSITION;
            const rot = data.rotation??PARENT_ROTATION;
            transform.rotation = Quaternion.fromEulerDegrees(rot.x,rot.y,rot.z);
            //core background
            Transform.getOrCreateMutable(this.StatDisplayPanel).scale = data.scale??CARD_CORE_SCALE;
            //core component
            CardObjectComponent.createOrReplace(this.StatDisplayPanel, {
                ownerType:data.ownerType,
                tableID:data.tableID??"0",
                teamID:data.teamID??"0",
                slotID:data.slotID,
                request:STAT_DISPLAY_INTERACTION_TYPE.INTERACT,
            });
        }

        public UpdateStats(def:PlayCard.PlayCardDataObject, hasInteractions:boolean=true) {
            //enable object
            Transform.getOrCreateMutable(this.entityParent).scale = PARENT_SCALE_ON;
            TextShape.getMutable(this.attackPowerText).text = def.Attack.toString();
            TextShape.getMutable(this.healthText).text = def.HealthCur.toString();
            TextShape.getMutable(this.armorText).text = def.Armour.toString();
            
            /** status effect icons */
            const entityEffectIcons:Entity[] = [];
            for(let i = 0; i < 6; i++)
            {
                entityEffectIcons[i] = engine.addEntity();
                Transform.create(entityEffectIcons[i],{
                    parent:this.entityParent,
                    position: { x:-1.02+(i*0.41), y:-0.7, z:-0.1,},
                    scale: { x:0.37, y:0.37, z:0.3,},
                });
                MeshRenderer.setPlane(entityEffectIcons[i])
                
            }
            

        }
            
        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.isActive = false;
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
    export function Disable(object:StatDisplayObject) {
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
    export function Destroy(object:StatDisplayObject) {
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


