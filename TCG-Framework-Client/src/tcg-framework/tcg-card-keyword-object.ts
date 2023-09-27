import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import Dictionary, { List } from "../utilities/collections";
import { ColliderLayer, Entity, GltfContainer, InputAction, Material, MaterialTransparencyMode, MeshRenderer, PointerEventType, PointerEvents, Schemas, TextAlignMode, TextShape, TextureWrapMode, Transform, engine } from "@dcl/sdk/ecs";
import { CARD_OBJECT_OWNER_TYPE } from "./config/tcg-config";
import { CARD_KEYWORD_ID, CardKeywordDataObject } from "./data/tcg-keyword-data";
import { GetCardDrawVectors } from "../utilities/texture-sheet-splicing";
import { CardKeywordTextureDataObject } from "./data/tcg-keyword-texture-data";
import { CardKeywordRegistry } from "./data/tcg-keyword-data-registry";
import { CardEffectDataObject } from "./data/tcg-card-data";


/*      TRADING CARD GAME - CARD KEYWORD OBJECT
    contains all the functionality for the framework's card keyword objects. these are simply display
    objects, providing a visual representation of a card's keywords/effects. the framework also keys
    each keyword object, linking it to existing play-data when required (ex: card existing in the player's hand)

    in some contexts they can be interacted with (ex: during game when player wants more details about what a keyword is).

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module CardKeywordDisplayObject
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Card Keyword Object: ";

    /** object model location */
    const MODEL_KEYWORD_FRAME:string = 'models/tcg-framework/card-core/tcg-card-prototype-keyword.glb';

    /** transform - parent */
    const PARENT_POSITION_ON:Vector3 = { x:0, y:0, z:0 };
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_POSITION_OFF:Vector3 = { x:8, y:-4, z:8 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };
    const PARENT_ROTATION:Vector3 = { x:0, y:0, z:0 };

    /** default frame object size */
    const CARD_CORE_SCALE = {x:0.25, y:0.25, z:0.25};
    /** icon plane */
    const ICON_POSITION = {x:-0.235, y:0.0, z:0};
    const ICON_SCALE = {x:0.37, y:0.37, z:0.37};
    /** text */
    const TEXT_POSITION = {x:0, y:0, z:0};
    const TEXT_SCALE = {x:0.25, y:0.25, z:0.25};
    
    /** indexing key */
    export function GetKeyFromData(data:CardKeywordObjectCreationData):string { return data.ownerType+"-"+(data.tableID??"0")+"-"+(data.teamID??"0")+"-"+data.slotID+"-"+data.indexerID; };

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<CardKeywordDisplayObject> = new List<CardKeywordDisplayObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<CardKeywordDisplayObject> = new List<CardKeywordDisplayObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<CardKeywordDisplayObject> = new List<CardKeywordDisplayObject>();
    /** registry of all objects in-use, */
    var pooledObjectsRegistry:Dictionary<CardKeywordDisplayObject> = new Dictionary<CardKeywordDisplayObject>();

    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|CardKeywordDisplayObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }

    /** component for on-click interactions */
    export const CardKeywordObjectComponentData = {
        //what type of display this card is tied to
        //  0=table, 1=deck manager
        ownerType:Schemas.Number,
        //indexing
        tableID:Schemas.String,
        teamID:Schemas.String,
        slotID:Schemas.String,
        indexerID:Schemas.String,
    }
	/** define component, adding it to the engine as a managed behaviour */
    export const CardKeywordObjectComponent = engine.defineComponent("CardKeywordObjectComponentData", CardKeywordObjectComponentData);
    
	/** object interface used to define all data required to create a new object */
	export interface CardKeywordObjectCreationData {
        //display type
        ownerType:CARD_OBJECT_OWNER_TYPE,
        def:CardEffectDataObject,
        //indexing
        tableID?:string,
        teamID?:string,
        slotID:string,
        indexerID:string,
        //details
        hasInteractions?:boolean
        //position
        parent?: Entity, //entity to parent object under 
		position?: { x:number; y:number; z:number; }; //new position for object
		scale?: { x:number; y:number; z:number; }; //new scale for object
		rotation?: { x:number; y:number; z:number; }; //new rotation for object (in eular degrees)
	}

    /** contains all pieces that make up a card object  */
    export class CardKeywordDisplayObject { 
        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };
        
        /** true when this object can be interacted with */
        IsInteractable:boolean = false; 

        /** type of owner/how this object should be interacted with */
        private ownerType:number = 0;
        public get OwnerType():number { return this.ownerType; };

        public get Key():string { return this.OwnerType+"-"+(this.TableID??"0")+"-"+(this.TeamID??"0")+"-"+this.SlotID+"-"+this.Indexer; }
        public get KeyCard():string { return this.OwnerType+"-"+(this.TableID??"0")+"-"+(this.TeamID??"0")+"-"+this.SlotID; }

        /** represents the unique index of this slot's table, req for networking */
        private tableID:string = "";
        public get TableID():string { return this.tableID; };

        /** represents the unique index of this slot's team, req for networking */
        private teamID:string = "";
        public get TeamID():string { return this.teamID; };

        /** represents the unique index of this slot, req for networking */
        private slotID:string = "";
        public get SlotID():string { return this.slotID; };

        /** */
        private indexer:string = "";
        public get Indexer():string { return this.indexer; };

        private defID:CARD_KEYWORD_ID = 0;
        public get DefID():CARD_KEYWORD_ID { return this.defID; };

        /** parental entity */
        private entityParent:Entity;
        /** keyword core frame */
        private entityCoreFrameObject:Entity;
        /** keyword display icon (plane with texture) */
        private entityDisplayIcon:Entity;
        /** keyword display text (power -> turn count) */
        private entityDisplayText:Entity;

        /** builds out the card, ensuring all required components exist and positioned correctly */
        constructor() {
            //create parent
            this.entityParent = engine.addEntity();
            Transform.create(this.entityParent, {
                position: PARENT_POSITION_OFF,
                scale: PARENT_SCALE_OFF,
            });

            //create core frame
            //  create entity
            this.entityCoreFrameObject = engine.addEntity();
            Transform.create(this.entityCoreFrameObject, {
                parent: this.entityParent,
                scale: CARD_CORE_SCALE
            });
            //  add custom model
            GltfContainer.create(this.entityCoreFrameObject, {
                src: MODEL_KEYWORD_FRAME,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            
            //create icon display
            //  create entity
            this.entityDisplayIcon = engine.addEntity();
            Transform.create(this.entityDisplayIcon, {
                parent: this.entityCoreFrameObject,
                position: ICON_POSITION, 
                scale: ICON_SCALE,
            });
            //  add display plane
            MeshRenderer.setPlane(this.entityDisplayIcon, GetCardDrawVectors(512, 512, 256, 512, 1, 0));
            Material.setPbrMaterial(this.entityDisplayIcon, {
                texture: Material.Texture.Common({
                    src: '',
                    wrapMode: TextureWrapMode.TWM_REPEAT
                })
            });

            //create armour text
            this.entityDisplayText = engine.addEntity();
            Transform.create(this.entityDisplayText, {
                parent: this.entityCoreFrameObject,
                position: TEXT_POSITION, 
                scale: TEXT_SCALE 
            });
            TextShape.create(this.entityDisplayText, { text: "P:99\nT:99",
                fontSize:6, 
                textColor: Color4.White(),
                textAlign:TextAlignMode.TAM_MIDDLE_LEFT,
            });
        }

        /** initializes the object based on given creation data */
        public Initialize(data: CardKeywordObjectCreationData) {
            this.isActive = true;
            this.IsInteractable = false;
            //indexing
            this.ownerType = data.ownerType;
            this.tableID = data.tableID??"0";
            this.teamID = data.teamID??"0";
            this.slotID = data.slotID;
            this.indexer = data.indexerID;
            //parent 
            const transform = Transform.getOrCreateMutable(this.entityParent);
            transform.parent = data.parent;
            transform.position = data.position??PARENT_POSITION_ON;
            const rot = data.rotation??PARENT_ROTATION;
            transform.rotation = Quaternion.fromEulerDegrees(rot.x,rot.y,rot.z);
            //core frame
            Transform.getOrCreateMutable(this.entityCoreFrameObject).scale = data.scale??CARD_CORE_SCALE;
            //core component
            CardKeywordObjectComponent.createOrReplace(this.entityCoreFrameObject, {
                ownerType:data.ownerType,
                tableID:data.tableID??"0",
                teamID:data.teamID??"0",
                slotID:data.slotID,
                indexerID:data.indexerID,
            });

            //apply card definition
            this.SetKeyword(data.def, data.hasInteractions);
        }

        /** */
        public SetKeyword(data:CardEffectDataObject, hasInteractions:boolean=true) {
            this.defID = data.type;
            //enable object
            Transform.getOrCreateMutable(this.entityParent).scale = PARENT_SCALE_ON;
            
            //get keyword definition
            const defData:CardKeywordDataObject = CardKeywordRegistry.Instance.GetDefByID(data.type);
            //set keyword icon image
            //  get required def references
            const keywordSheet: CardKeywordTextureDataObject = CardKeywordRegistry.Instance.CallbackGetKeywordTexture(defData.ID);
            //  background image
            MeshRenderer.setPlane(this.entityDisplayIcon, GetCardDrawVectors(
                keywordSheet.sheetDetails.totalSizeX, 
                keywordSheet.sheetDetails.totalSizeY, 
                keywordSheet.sheetDetails.elementSizeX, 
                keywordSheet.sheetDetails.elementSizeY, 
                defData.sheetData.posX, 
                defData.sheetData.posY
            ));
            Material.setPbrMaterial(this.entityDisplayIcon, {
                texture: Material.Texture.Common({
                    src: keywordSheet.path,
                    wrapMode: TextureWrapMode.TWM_REPEAT,
                }),
                albedoColor: defData.iconColour,
                emissiveColor: defData.iconColour,
                emissiveIntensity: 3,
                transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
            });

            //update text
            var str:string = "P:"+data.strength;
            if(data.duration != undefined) str += "\nT:"+data.duration;

            TextShape.getMutable(this.entityDisplayText).text = str;
            
            //if card has interactions, add pointer event system
            if(hasInteractions) {
                PointerEvents.createOrReplace(this.entityCoreFrameObject, {
                    pointerEvents: [
                        { //primary mouse -> attempt select
                            eventType: PointerEventType.PET_DOWN,
                            eventInfo: { button: InputAction.IA_POINTER, hoverText: "SELECT "+defData.displayName }
                        },
                        { //primary key -> attempt select
                            eventType: PointerEventType.PET_DOWN,
                            eventInfo: { button: InputAction.IA_PRIMARY, hoverText: "SELECT "+defData.displayName }
                        },
                    ]
                });
            } else {
                PointerEvents.deleteFrom(this.entityCoreFrameObject);
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
    
    /** provides a new card object (either pre-existing & un-used or entirely new) */
    export function Create(data:CardKeywordObjectCreationData):CardKeywordDisplayObject {
        const key:string = GetKeyFromData(data);
        var object:undefined|CardKeywordDisplayObject = undefined;
        if(isDebugging) console.log(debugTag+"attempting to create new object, key="+key+"...");
        
        //if an object under the requested key is already active, hand that back
        if(pooledObjectsRegistry.containsKey(key)) {
            console.log(debugTag+"<WARNING> requesting pre-existing object (use get instead), key="+key);
            object = pooledObjectsRegistry.getItem(key);
        } 
        //  attempt to find an existing unused object
        else if(pooledObjectsInactive.size() > 0) {
            //grab entity from (grabbing from back is a slight opt)
            object = pooledObjectsInactive.getItem(pooledObjectsInactive.size()-1);
            //  remove from inactive listing
            pooledObjectsInactive.removeItem(object);
        }
        //  if not recycling unused object
        if(object == undefined) {
            //create card object frame
            //  create data object (initializes all sub-components)
            object = new CardKeywordDisplayObject();
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
    export function Disable(object:CardKeywordDisplayObject) {
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
    export function Destroy(object:CardKeywordDisplayObject) {
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