import { Entity, engine, Transform, GltfContainer, ColliderLayer, MeshRenderer, Material, TextureWrapMode, MaterialTransparencyMode, TextShape, TextAlignMode, pointerEventsSystem, InputAction, Animator, Schemas, PointerEvents, PointerEventType, MeshCollider } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { Dictionary, List } from "../utilities/collections";
import { CardDataRegistry } from "./data/tcg-card-registry";
import { GetCardDrawVectors } from "../utilities/texture-sheet-splicing";
import { CardData, CardDataObject } from "./data/tcg-card-data";
import { CardFactionDataObject } from "./data/tcg-faction-data";
import { CardFactionTextureDataObject } from "./data/tcg-faction-texture-data";
import { CardTextureDataObject } from "./data/tcg-card-texture-data";
import { CARD_OBJECT_OWNER_TYPE } from "./config/tcg-config";
import { CardKeywordDisplayObject } from "./tcg-card-keyword-object";
import { CardKeywordData } from "./data/tcg-keyword-data";

/*      TRADING CARD GAME - CARD OBJECT
    contains all the functionality for the framework's card objects. these are simply display
    objects, providing a visual representation of the given card data. the framework also keys
    each card, linking it to existing play-data when required (ex: card existing in the player's hand)

    in some contexts they can be interacted with (ex: during a player's turn to select and play
    the card to the field).

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module CardDisplayObject
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Card Object: ";

    /** object model location */
    const MODEL_CARD_FRAME_CORE:string = 'models/tcg-framework/card-core/tcg-card-prototype-core.glb';
    const MODEL_CARD_FRAME_CHARACTER:string = 'models/tcg-framework/card-core/tcg-card-prototype-character.glb';
    const MODEL_CARD_FRAME_COUNTER:string = 'models/tcg-framework/card-core/tcg-card-prototype-counter.glb';
    
    /** determines all possible card interaction types */
    export enum CARD_OBJECT_INTERACTION_TYPE {
        INTERACT = 0,
        COUNTER_UP = 1,
        COUNTER_DOWN = 2,
    }

    /** animation key tags (FOR CARD) */
    const ANIM_KEYS_CARD:string[] = [
        "anim_grow", //selected/played
        "anim_shrink", //unselected
        "anim_hover", //mouse-over
    ];

    /** transform - parent */
    const PARENT_POSITION:Vector3 = { x:0, y:0, z:0 };
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };
    const PARENT_ROTATION:Vector3 = { x:0, y:0, z:0 };

    /** default frame object size */
    const CARD_CORE_SCALE = {x:0.25, y:0.25, z:0.25};
    /**  */
    const COUNTER_BUTTON_POSITION_INCREASE = {x:1.1, y:0.6, z:-0.15};
    const COUNTER_BUTTON_POSITION_DECREASE = {x:1.1, y:-0.6, z:-0.15};
    const COUNTER_BUTTON_SCALE = {x:0.5, y:0.5, z:0.1};
    const COUNTER_TEXT_POSITION = {x:1.1, y:0.0, z:-0.15};
    const COUNTER_TEXT_SCALE = {x:0.35, y:0.35, z:0.35};
    /** background object size */
    const CARD_BACKGROUND_POSITION = {x:0, y:0, z:-0.01};
    const CARD_BACKGROUND_SCALE = {x:2, y:3, z:1};
    /** character object size */
    const CARD_CHARACTER_POSITION = {x:0, y:0, z:-0.013};
    /** cost text transform */
    const cardTextCostPos = {x:1.08, y:1.45, z:-0.08};
    const cardTextCostScale = {x:0.25, y:0.25, z:0.25};
    /** health text transform */
    const cardTextHealthPos = {x:0.01, y:-1.25, z:-0.08};
    const cardTextHealthScale = {x:0.3, y:0.3, z:0.3};
    /** attack text transform */
    const cardTextAttackPos = {x:-0.87, y:-1.32, z:-0.08};
    const cardTextAttackScale = {x:0.25, y:0.25, z:0.25};
    /** armour text transform */
    const cardTextArmourPos = {x:0.87, y:-1.32, z:-0.08};
    const cardTextArmourScale = {x:0.25, y:0.25, z:0.25};

    /** indexing key */
    export function GetKeyFromObject(data:CardDisplayObject):string { return data.OwnerType+"-"+(data.TableID??"0")+"-"+(data.TeamID??"0")+"-"+data.SlotID; };
    export function GetKeyFromData(data:CardObjectCreationData):string { return data.ownerType+"-"+(data.tableID??"0")+"-"+(data.teamID??"0")+"-"+data.slotID; };

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<CardDisplayObject> = new List<CardDisplayObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<CardDisplayObject> = new List<CardDisplayObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<CardDisplayObject> = new List<CardDisplayObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<CardDisplayObject> = new Dictionary<CardDisplayObject>();

    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|CardDisplayObject {
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
	export interface CardObjectCreationData {
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

    /** contains all pieces that make up a card object  */
    export class CardDisplayObject { 
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

        /** core definition for this card (this should be expanded to target play data) */
        private defIndex:number = 0;
        public get DefIndex():number { return this.defIndex; };

        /**  rarity of the card */
        rarity:number = 0;

        /** parental entity */
        private entityParent:Entity;
        public SetPosition(pos:Vector3) { Transform.getMutable(this.entityParent).position = pos; }
        public SetRotation(rot:Vector3) { Transform.getMutable(this.entityParent).rotation = Quaternion.fromEulerDegrees(rot.x,rot.y,rot.z); }
        /** card core frame */
        private entityCoreFrameObject:Entity;
        /** card character stats display frame */
        private entityCharacterFrameObject:Entity;
        /** card counter display frame */
        private entityCounterFrame:Entity;
        private entityCounterText:Entity;
        private entityCounterButtonUp:Entity;
        private entityCounterButtonDown:Entity;
        /** card background display */
        private entityBackgroundDisplay:Entity;
        /** card character display */
        private entityCharacterDisplay:Entity;
        /** card cost text */
        private entityTextCost:Entity;
        /** card health text */
        private entityTextHealth:Entity;
        /** card attack text */
        private entityTextAttack:Entity;
        /** card armour text */
        private entityTextArmour:Entity;

        /** card effect/keyword pieces */
        private keywordObjects:CardKeywordDisplayObject.CardKeywordDisplayObject[] = [];
        /**  */
        

        /** builds out the card, ensuring all required components exist and positioned correctly */
        constructor() {
            //create parent
            this.entityParent = engine.addEntity();
            Transform.create(this.entityParent, {
                scale: PARENT_SCALE_ON
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
                src: MODEL_CARD_FRAME_CORE,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });

            //create character state frame
            //  create entity
            this.entityCharacterFrameObject = engine.addEntity();
            Transform.create(this.entityCharacterFrameObject, {
                parent: this.entityCoreFrameObject,
            });
            //  add custom model
            GltfContainer.create(this.entityCharacterFrameObject, {
                src: MODEL_CARD_FRAME_CHARACTER,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });

            //create counter frame
            //  create entity
            this.entityCounterFrame = engine.addEntity();
            Transform.create(this.entityCounterFrame, {
                parent: this.entityCoreFrameObject,
            });
            //  add custom model
            GltfContainer.create(this.entityCounterFrame, {
                src: MODEL_CARD_FRAME_COUNTER,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            //create counter button up
            this.entityCounterButtonUp = engine.addEntity();
            Transform.create(this.entityCounterButtonUp, {
                parent: this.entityCounterFrame,
                position: COUNTER_BUTTON_POSITION_INCREASE,
                scale: COUNTER_BUTTON_SCALE
            });
            //MeshRenderer.setBox(this.entityCounterButtonUp);
            MeshCollider.setBox(this.entityCounterButtonUp);
            //create counter button down
            this.entityCounterButtonDown = engine.addEntity();
            Transform.create(this.entityCounterButtonDown, {
                parent: this.entityCounterFrame,
                position: COUNTER_BUTTON_POSITION_DECREASE,
                scale: COUNTER_BUTTON_SCALE
            });
            //MeshRenderer.setBox(this.entityCounterButtonDown);
            MeshCollider.setBox(this.entityCounterButtonDown);
            //counter text
            this.entityCounterText = engine.addEntity();
            Transform.create(this.entityCounterText, {
                parent: this.entityCounterFrame,
                position: COUNTER_TEXT_POSITION, scale: COUNTER_TEXT_SCALE 
            });
            TextShape.create(this.entityCounterText, { text: "8", 
                textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
            });

            //create background display
            //  create entity
            this.entityBackgroundDisplay = engine.addEntity();
            Transform.create(this.entityBackgroundDisplay, {
                parent: this.entityCoreFrameObject,
                position: CARD_BACKGROUND_POSITION, 
                scale: CARD_BACKGROUND_SCALE,
            });
            //  add display plane
            MeshRenderer.setPlane(this.entityBackgroundDisplay, GetCardDrawVectors(512, 512, 256, 512, 1, 0));
            Material.setPbrMaterial(this.entityBackgroundDisplay, {
                texture: Material.Texture.Common({
                    src: '',
                    wrapMode: TextureWrapMode.TWM_REPEAT
                })
            });
            
            //create character display
            //  create entity
            this.entityCharacterDisplay = engine.addEntity();
            Transform.create(this.entityCharacterDisplay, {
                parent: this.entityCoreFrameObject,
                position: CARD_CHARACTER_POSITION,
            });
            //  add display plane
            MeshRenderer.setPlane(this.entityCharacterDisplay, GetCardDrawVectors(512, 512, 142, 256, 0, 0));
            Material.setPbrMaterial(this.entityCharacterDisplay, {
                texture: Material.Texture.Common({
                    src: '',
                    wrapMode: TextureWrapMode.TWM_REPEAT
                }),
                transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
            });
            
            //create cost text
            this.entityTextCost = engine.addEntity();
            Transform.create(this.entityTextCost, {
                parent: this.entityCoreFrameObject,
                position: cardTextCostPos, scale: cardTextCostScale 
            });
            TextShape.create(this.entityTextCost, { text: "99", 
                textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
            });
            
            //create health text
            this.entityTextHealth = engine.addEntity();
            Transform.create(this.entityTextHealth, {
                parent: this.entityCoreFrameObject,
                position: cardTextHealthPos, scale: cardTextHealthScale 
            });
            TextShape.create(this.entityTextHealth, { text: "99", 
                textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
            });
            
            //create attack text
            this.entityTextAttack = engine.addEntity();
            Transform.create(this.entityTextAttack, {
                parent: this.entityCoreFrameObject,
                position: cardTextAttackPos, scale: cardTextAttackScale
            });
            TextShape.create(this.entityTextAttack, { text: "99", 
                textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
            });

            //create armour text
            this.entityTextArmour = engine.addEntity();
            Transform.create(this.entityTextArmour, {
                parent: this.entityCoreFrameObject,
                position: cardTextArmourPos, scale: cardTextArmourScale 
            });
            TextShape.create(this.entityTextArmour, { text: "99", 
                textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
            });
        }

        /** initializes the  */
        public Initialize(data: CardObjectCreationData) {
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
            //core frame
            Transform.getOrCreateMutable(this.entityCoreFrameObject).scale = data.scale??CARD_CORE_SCALE;
            //core component
            CardObjectComponent.createOrReplace(this.entityCoreFrameObject, {
                ownerType:data.ownerType,
                tableID:data.tableID??"0",
                teamID:data.teamID??"0",
                slotID:data.slotID,
                request:CARD_OBJECT_INTERACTION_TYPE.INTERACT,
            });
            //button up component
            CardObjectComponent.createOrReplace(this.entityCounterButtonUp, {
                ownerType:data.ownerType,
                tableID:data.tableID??"0",
                teamID:data.teamID??"0",
                slotID:data.slotID,
                request:CARD_OBJECT_INTERACTION_TYPE.COUNTER_UP,
            });
            //pointer event system
            PointerEvents.createOrReplace(this.entityCounterButtonUp, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "INCREASE" }
                  },
                ]
            });
            //button down component
            CardObjectComponent.createOrReplace(this.entityCounterButtonDown, {
                ownerType:data.ownerType,
                tableID:data.tableID??"0",
                teamID:data.teamID??"0",
                slotID:data.slotID,
                request:CARD_OBJECT_INTERACTION_TYPE.COUNTER_DOWN,
            });
            //pointer event system
            PointerEvents.createOrReplace(this.entityCounterButtonDown, {
                pointerEvents: [
                  { //primary key -> select card slot
                    eventType: PointerEventType.PET_DOWN,
                    eventInfo: { button: InputAction.IA_POINTER, hoverText: "DECREASE" }
                  },
                ]
            });

            //set counter state
            this.SetCounterState(data.hasCounter??true);
            //apply card definition
            this.SetCard(data.def, data.hasInteractions);
        }

        /** */
        public SetCard(def:CardDataObject, hasInteractions:boolean=true) {
            this.defIndex = def.id;
            //enable object
            Transform.getOrCreateMutable(this.entityParent).scale = PARENT_SCALE_ON;
            //set card sprite display details
            //  get required def references
            const factionDef: CardFactionDataObject = CardDataRegistry.Instance.GetFaction(def.faction);
            const factionSheet: CardFactionTextureDataObject = CardDataRegistry.Instance.GetFactionTexture(def.faction);
            const cardSheet: CardTextureDataObject = CardDataRegistry.Instance.GetCardTexture(def.id);
            //  background image
            MeshRenderer.setPlane(this.entityBackgroundDisplay, GetCardDrawVectors(
                factionSheet.sheetDetails.totalSizeX, 
                factionSheet.sheetDetails.totalSizeY, 
                factionSheet.sheetDetails.elementSizeX, 
                factionSheet.sheetDetails.elementSizeY, 
                factionDef.sheetData.posX, 
                factionDef.sheetData.posY
            ));
            Material.setPbrMaterial(this.entityBackgroundDisplay, {
                texture: Material.Texture.Common({
                    src: factionSheet.path,
                    wrapMode: TextureWrapMode.TWM_REPEAT
                }),
                transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
            });
            //  character image
            Transform.getOrCreateMutable(this.entityCharacterDisplay).scale = {
                x:cardSheet.sheetDetails.displayScaleX, 
                y:cardSheet.sheetDetails.displayScaleY, 
                z:1
            };
            MeshRenderer.setPlane(this.entityCharacterDisplay, GetCardDrawVectors(
                cardSheet.sheetDetails.totalSizeX, 
                cardSheet.sheetDetails.totalSizeY, 
                cardSheet.sheetDetails.elementSizeX, 
                cardSheet.sheetDetails.elementSizeY, 
                def.sheetData.posX, 
                def.sheetData.posY
            ));
            Material.setPbrMaterial(this.entityCharacterDisplay, {
                texture: Material.Texture.Common({
                    src: cardSheet.path,
                    wrapMode: TextureWrapMode.TWM_REPEAT
                }),
                emissiveColor: Color4.White(),
                emissiveIntensity: 0.02,
                transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
            });
            //update text
            //  cost
            TextShape.getMutable(this.entityTextCost).text = def.attributeCost.toString();
            //  if character stat component exists in def
            if(def.attributeCharacter != undefined) {
                //core
                Transform.getOrCreateMutable(this.entityCharacterFrameObject).scale = Vector3.One();
                TextShape.getMutable(this.entityTextAttack).text = def.attributeCharacter.unitAttack.toString();
                TextShape.getMutable(this.entityTextHealth).text = def.attributeCharacter.unitHealth.toString();
                TextShape.getMutable(this.entityTextArmour).text = def.attributeCharacter.unitArmour.toString();
                //keyword display objects
                //  ensure correct number of objects
                while(this.keywordObjects.length > def.attributeCharacter.effects.length) {
                    const keyword = this.keywordObjects.pop();
                    if(keyword) {
                        CardKeywordDisplayObject.Disable(keyword);
                    }
                }
                //  process all required keywords
                for(let i:number=0; i<def.attributeCharacter.effects.length; i++) {
                    //if new keyword object needs to be claimed, create new keyword object
                    if(i > this.keywordObjects.length-1) {
                        this.keywordObjects.push(CardKeywordDisplayObject.Create({
                            ownerType:CARD_OBJECT_OWNER_TYPE.SHOWCASE,
                            def:def.attributeCharacter.effects[i],
                            tableID:this.TableID,
                            teamID:this.TeamID,
                            slotID:this.SlotID,
                            indexerID:i.toString(),
                            hasInteractions:true,
                            parent: this.entityCoreFrameObject,
                            position: { x:-1.0, y:0.95-(0.35*(i)), z:-0.05 },
                            scale: { x:0.8, y:0.8, z:0.8 }
                        }));
                    } 
                    //if keyword object already exists, repopulate keyword object
                    else {
                        //this.keywordObjects[i].SetKeyword(CardKeywordData[0]);
                    }
                    console.log(i+" key="+this.keywordObjects.length)
                }
            }
            else if(def.attributeSpell != undefined) {
                //core
                Transform.getOrCreateMutable(this.entityCharacterFrameObject).scale = Vector3.Zero();
                TextShape.getMutable(this.entityTextAttack).text = "";
                TextShape.getMutable(this.entityTextHealth).text = "";
                TextShape.getMutable(this.entityTextArmour).text = "";
                //keyword display objects
                //  ensure correct number of objects
                while(this.keywordObjects.length > def.attributeSpell.effects.length) {
                    const keyword = this.keywordObjects.pop();
                    if(keyword) {
                        CardKeywordDisplayObject.Disable(keyword);
                    }
                }
                //  process all required keywords
                for(let i:number=0; i<def.attributeSpell.effects.length; i++) {
                    //if new keyword object needs to be claimed, create new keyword object
                    if(i > this.keywordObjects.length-1) {
                        this.keywordObjects.push(CardKeywordDisplayObject.Create({
                            ownerType:CARD_OBJECT_OWNER_TYPE.SHOWCASE,
                            def:def.attributeSpell.effects[i],
                            tableID:this.TableID,
                            teamID:this.TeamID,
                            slotID:this.SlotID,
                            indexerID:i.toString(),
                            hasInteractions:true,
                            parent: this.entityCoreFrameObject,
                            position: { x:-1.0, y:0.95-(0.35*(i)), z:-0.05 },
                            scale: { x:0.8, y:0.8, z:0.8 }
                        }));
                    } 
                    //if keyword object already exists, repopulate keyword object
                    else {
                        //this.keywordObjects[i].SetKeyword(CardKeywordData[0]);
                    }
                    console.log(i+" key="+this.keywordObjects.length)
                }
            }

            //if card has interactions, add pointer event system
            if(hasInteractions) {
                PointerEvents.createOrReplace(this.entityCoreFrameObject, {
                    pointerEvents: [
                        { //primary mouse -> attempt select
                            eventType: PointerEventType.PET_DOWN,
                            eventInfo: { button: InputAction.IA_POINTER, hoverText: "SELECT "+def.name }
                        },
                        { //primary key -> attempt select
                            eventType: PointerEventType.PET_DOWN,
                            eventInfo: { button: InputAction.IA_PRIMARY, hoverText: "SELECT "+def.name }
                        },
                        { //secondary key -> attempt action
                            eventType: PointerEventType.PET_DOWN,
                            eventInfo: { button: InputAction.IA_SECONDARY, hoverText: "ACTIVATE "+def.name }
                        },
                    ]
                });
            } else {
                PointerEvents.deleteFrom(this.entityCoreFrameObject);
            }
        }

        /** */
        public SetCounterState(state:boolean) {
            if(state) Transform.getMutable(this.entityCounterFrame).scale = PARENT_SCALE_ON
            else Transform.getMutable(this.entityCounterFrame).scale = PARENT_SCALE_OFF
        }

        /** */
        public GetCounterValue() {
            return TextShape.getMutable(this.entityCounterText).text;
        }

        public SetCounterValue(value:string) {
            TextShape.getMutable(this.entityCounterText).text = value;
        }

        /** plays the given animation on the character */
        public SetAnimation(index:number) {
            //turn off all animations
            for(let i = 0; i < ANIM_KEYS_CARD.length; i++) {
                Animator.getClip(this.entityParent, ANIM_KEYS_CARD[i]).playing = false;
            }
            //turn on targeted animation
            if(index != -1) Animator.getClip(this.entityParent, ANIM_KEYS_CARD[index]).playing = true;
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
    
    /** provides a new card object (either pre-existing & un-used or entirely new)
     * 
     *  TODO: (most of this stuff will be done via rebinding UVs & texture swapping)
     *      add dynamic card background img
     *      add dynamic card character img
     *      add dynamic effect creation
     *      expand for card rarities
     * 
     *  @param cardData data def used to generate card
     *  @param key unique id of card object, used for access
     *  @returns: card object data 
     */
    export function Create(data:CardObjectCreationData):CardDisplayObject {
        const key:string = GetKeyFromData(data);
        var object:undefined|CardDisplayObject = undefined;
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
            object = new CardDisplayObject();
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
    export function Disable(object:CardDisplayObject) {
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
    export function Destroy(object:CardDisplayObject) {
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

//### EVERYTHING BELOW THIS POINT IS JUST TESTING COMMANDS TO ENSURE FUNCTIONALITY
//var pass
var testEntities:CardDisplayObject.CardDisplayObject[] = [];
    
/** tests 'create' functionality
 *  PROCESS: create n objects
 *  RESULT: create n new objects
 */
export function TEST_CARD_OBJECT_CREATE(count:number) {
    //create requested number of objects
    for(var i=0; i<count; i++) {
        testEntities.push(CardDisplayObject.Create({
            ownerType: CARD_OBJECT_OWNER_TYPE.SHOWCASE,
            slotID: "0",
            def: CardData[i], 
            position: { x:(testEntities.length*0.65)-(count*0.65/2)+8, y:1.5, z:8 },
        }));
    }
}

/** tests 'disable' functionality
 *  PROCESS: create 2 objects, disable 1 object, creates 2 objects
 *  RESULT: create 2 new objects, disable 1 object, reuse 1 object & create 1 new object
 */
export function TEST_CARD_OBJECT_DISABLE() {
    //create objects
    TEST_CARD_OBJECT_CREATE(2);
    //remove single object
    var cardObject = testEntities.pop();
    if(cardObject) CardDisplayObject.Disable(cardObject);
    //create more objects
    TEST_CARD_OBJECT_CREATE(2);
}

/** tests 'disable all' functionality
 *  PROCESS: create 2 objects, disable all objects, create 3 objects
 *  RESULT: create 2 new objects, disable 2 objects, reuse 2 objects & create 1 new object
 */
export function TEST_CARD_OBJECT_DISABLE_ALL() {
    //create objects
    TEST_CARD_OBJECT_CREATE(2);
    //remove all objects
    CardDisplayObject.DestroyAll();
    //create more objects
    TEST_CARD_OBJECT_CREATE(3);
}

/** tests 'disable' functionality
 *  PROCESS: create 2 objects, destroy 1 object, create 2 objects
 *  RESULT: create 2 new objects, destroy 1 object, create 2 new object
 */
export function TEST_CARD_OBJECT_DESTROY() {
    //create objects
    TEST_CARD_OBJECT_CREATE(2);
    //destroy single object
    var cardObject = testEntities.pop();
    if(cardObject) CardDisplayObject.Destroy(cardObject);
    //create more objects
    TEST_CARD_OBJECT_CREATE(2);
}

/** tests 'destroy all' functionality
 *  PROCESS: create 2 objects, destroy all objects, create 3 objectss
 *  RESULT: create 2 new objects, destroy 2 objects, create 3 new objects
 */
export function TEST_CARD_OBJECT_DESTROY_ALL() {
    //create objects
    TEST_CARD_OBJECT_CREATE(2);
    //destroy all objects
    CardDisplayObject.DestroyAll();
    //create more objects
    TEST_CARD_OBJECT_CREATE(3);
}