import { Entity, engine, Transform, GltfContainer, ColliderLayer, MeshRenderer, Material, TextureWrapMode, MaterialTransparencyMode, TextShape, TextAlignMode } from "@dcl/sdk/ecs";
import { Color4 } from "@dcl/sdk/math";
import Dictionary, { List } from "../utilities/collections";
import { CardDataObject, CardTextureDataObject, CardData } from "./data/tcg-card-data";
import { CARD_FACTION_TYPE, CardFactionDataObject, CardFactionTextureDataObject } from "./data/tcg-card-faction-data";
import { PlayerCardRegistry } from "./tcg-card-registry";


/** object model location */
const cardObjectFrameModelLocation:string = 'models/tcg-framework/tcg-card-border-R1.glb';

/** default frame object size */
const cardObjectSize = {x:0.25, y:0.25, z:0.25};
/** background object size */
const cardObjectBackgroundPos = {x:0, y:0, z:-0.035};
const cardObjectBackgroundScale = {x:2, y:3, z:1};
/** character object size */
const cardObjectCharacterPos = {x:0, y:0, z:-0.036};
const cardObjectCharacterScale = {x:1.4, y:2.3, z:1};
/** cost text transform */
const cardTextCostPos = {x:1.08, y:1.45, z:-0.12};
const cardTextCostScale = {x:0.25, y:0.25, z:0.25};
/** health text transform */
const cardTextHealthPos = {x:0.01, y:-1.27, z:-0.14};
const cardTextHealthScale = {x:0.3, y:0.3, z:0.3};
/** attack text transform */
const cardTextAttackPos = {x:-0.88, y:-1.35, z:-0.12};
const cardTextAttackScale = {x:0.25, y:0.25, z:0.25};
/** armour text transform */
const cardTextArmourPos = {x:0.88, y:-1.35, z:-0.12};
const cardTextArmourScale = {x:0.25, y:0.25, z:0.25};

/** draw points for plane vectors */
function GetCardDrawVectors(totalX:number, totalY:number, elementX:number, elementY:number, posX:number, posY:number) {
    const stepSizeX = elementX/totalX;
    const stepSizeY = elementY/totalY;
    const drawX = stepSizeX*posX;
    const drawY = stepSizeY*posY;
    //console.log("plane draw: total["+totalX+","+totalY+"], step["+stepSizeX+","+stepSizeY+"], draw["+drawX+","+drawY+"]");
    return [ 
        //plane front
        drawX, drawY, //left-bottom corner 
        drawX, drawY+stepSizeY, //left-top corner
        drawX+stepSizeX, drawY+stepSizeY, //right-top corner
        drawX+stepSizeX, drawY, //right-bottom corner
        //plane back (we dont care about this)
        0, 0, 0, 0, 0, 0, 0, 0,
    ];
}

/** defines the blueprint for callbacks made from a card when it is clicked/selected
 *      currently all card objects provide a callback that provides the card's play-data
 *      key as a parameter
*/
type CardObjectCallback = (key:string) => void;
/** contains all pieces that make up a card object  */
export class CardObjectData { 
    /** true when this object is rendered in the scene */
    isActive:boolean = false; 
    /** true when this object can be interacted with */
    isInteractable:boolean = false; 
    /** true when this card is selected 
     *  ex: player clicks card in hand turns to true, player clicks again and unselects it turns to false
     * */
    isSelected:boolean = false;

    /**  rarity of the card */
    rarity:number = 0;

    /** access key for card's play-data 
     *      play-data contains the game-relevent values/details for the card, 
     *      ex: how much health card has, if it is in-play, etc.
     * */
    key:string = "";
    /** core definition for this card () */
    def:string = "";

    /** text displayed when the user is mousing over the card */
    hoverText:string = "Select Card "+this.key;
    get HoverText():string { return this.hoverText; }

    /** card frame (parent) */
    entityFrame:Entity;
    /** card background display */
    entityBackgroundDisplay:Entity;
    /** card character display */
    entityCharacterDisplay:Entity;
    /** card cost text */
    entityTextCost:Entity;
    /** card health text */
    entityTextHealth:Entity;
    /** card attack text */
    entityTextAttack:Entity;
    /** card armour text */
    entityTextArmour:Entity;

    /** card effect pieces */

    /** builds out the card, ensuring all required components exist and positioned correctly */
    constructor() {
        //create frame
        //  create entity
        this.entityFrame = engine.addEntity();
        Transform.create(this.entityFrame, {
            scale: cardObjectSize
        });
        //  add custom model
        GltfContainer.create(this.entityFrame, {
            src: cardObjectFrameModelLocation,
            visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
            invisibleMeshesCollisionMask: undefined
        });
        
        //create background display
        //  create entity
        this.entityBackgroundDisplay = engine.addEntity();
        Transform.create(this.entityBackgroundDisplay, {
            parent: this.entityFrame, 
            position: cardObjectBackgroundPos, 
            scale: cardObjectBackgroundScale,
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
            parent: this.entityFrame, 
            position: cardObjectCharacterPos, 
            scale: cardObjectCharacterScale,
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
        
        //primary action -> interact with card
        /*
        pointerEventsSystem.onPointerDown(
            {
                entity: this.entityFrame,
                opts: 
                {
                    hoverText: this.HoverText,
                    button: InputAction.IA_ANY,
                    maxDistance: 8
                }
            },
            (e) => {
                //if(e.button == InputAction.IA_PRIMARY || e.button == InputAction.IA_POINTER) this.Interact();
            }
        );
        */
        //create cost text
        this.entityTextCost = engine.addEntity();
        Transform.create(this.entityTextCost, { parent: this.entityFrame, 
            position: cardTextCostPos, scale: cardTextCostScale 
        });
        TextShape.create(this.entityTextCost, { text: "3", 
            textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
        });
        
        //create health text
        this.entityTextHealth = engine.addEntity();
        Transform.create(this.entityTextHealth, { parent: this.entityFrame, 
            position: cardTextHealthPos, scale: cardTextHealthScale 
        });
        TextShape.create(this.entityTextHealth, { text: "10", 
            textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
        });
        
        //create attack text
        this.entityTextAttack = engine.addEntity();
        Transform.create(this.entityTextAttack, { parent: this.entityFrame, 
            position: cardTextAttackPos, scale: cardTextAttackScale
        });
        TextShape.create(this.entityTextAttack, { text: "4", 
            textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
        });

        //create armour textA
        this.entityTextArmour = engine.addEntity();
        Transform.create(this.entityTextArmour, { parent: this.entityFrame, 
            position: cardTextArmourPos, scale: cardTextArmourScale 
        });
        TextShape.create(this.entityTextArmour, { text: "2", 
            textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER
        });
    }
}
/*      TRADING CARD GAME - CARD OBJECT
    contains all the functionality for the framework's card objects. these are simply display
    objects, providing a visual representation of the given card data. the framework also keys
    each card, linking it to existing play-data when required (ex: card existing in the player's hand)

    in some contexts they can be interacted with (ex: during a player's turn to select and play
    the card to the field).

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module CardObject
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<CardObjectData> = new List<CardObjectData>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<CardObjectData> = new List<CardObjectData>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<CardObjectData> = new List<CardObjectData>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<CardObjectData> = new Dictionary<CardObjectData>();

    /** listing of all callbacks to be called when the object is interacted with */
    var objectInteractionCallbacks:CardObjectCallback[] = [];
    /** clears all existing callbacks */
    export function ClearCallbacks() {
        while(objectInteractionCallbacks.length > 0) {
            const callback = objectInteractionCallbacks.pop();
            if(callback != undefined) objectInteractionCallbacks.push(callback);
        }
    }
    /** registers a new callback */
    export function RegisterCallback(callback:CardObjectCallback) {
        objectInteractionCallbacks.push(callback);
    }

    /** attmepts to find an object of the given key. if no object is registered under the
     *  given key then 'undefined' is returned.
     * 
     * use create to initialize a card object (send it def, rarity, etc.)
     */
    export function Get(key:string):undefined|CardObjectData {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }

    /** creates a card based given a faction and positional index */
    export function CreateByFaction(faction:CARD_FACTION_TYPE, index:number, key:string):CardObjectData {
        return Create(PlayerCardRegistry.Instance.GetEntryByFaction(faction, index).DataDef, key);
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
    export function Create(cardDef:CardDataObject, key:string):CardObjectData {
        if(isDebugging) console.log("Card Object: attempting to create object, key="+key);
        
        //if a card under the requested key is already active, hand that back
        if(pooledObjectsRegistry.containsKey(key)) {
            console.log("Card Object WARNING: requesting pre-existing object (use get instead), key="+key);
            return pooledObjectsRegistry.getItem(key);
        } 

        //prepare object
        var cardObject:undefined|CardObjectData = undefined;
        //  attempt to find an existing unused object
        if(pooledObjectsInactive.size() > 0) {
            //grab entity from (grabbing from back is a slight opt)
            cardObject = pooledObjectsInactive.getItem(pooledObjectsInactive.size()-1);
            //  remove from inactive listing
            pooledObjectsInactive.removeItem(cardObject);
            
            //set default object size
            Transform.getMutable(cardObject.entityFrame).parent = undefined; 
            Transform.getMutable(cardObject.entityFrame).scale = cardObjectSize; 
        }
        //  if not recycling unused object
        if(cardObject == undefined) {
            //create card object frame
            //  create data object (initializes all sub-components)
            cardObject = new CardObjectData();
            //  add to overhead collection
            pooledObjectsAll.addItem(cardObject);
        }

        //add object to active collection (ensure only 1 entry)
        var posX = pooledObjectsActive.getItemPos(cardObject);
        if(posX == -1) pooledObjectsActive.addItem(cardObject);

        //get faction def
        const factionDef: CardFactionDataObject = PlayerCardRegistry.Instance.GetFaction(cardDef.faction);
        //get faction sheet
        const factionSheet: CardFactionTextureDataObject = PlayerCardRegistry.Instance.GetFactionTexture(cardDef.faction);
        //get card sheet
        const cardSheet: CardTextureDataObject = PlayerCardRegistry.Instance.GetCardTexture(cardDef.id);
        
        //TODO: when the SDK7 is fix and mutable materials actually work we can simplify this
        //set card details
        //  background image
        MeshRenderer.setPlane(cardObject.entityBackgroundDisplay, GetCardDrawVectors(
            factionSheet.sheetDetails.totalSizeX, 
            factionSheet.sheetDetails.totalSizeY, 
            factionSheet.sheetDetails.elementSizeX, 
            factionSheet.sheetDetails.elementSizeY, 
            factionDef.sheetData.posX, 
            factionDef.sheetData.posY
        ));
        Material.setPbrMaterial(cardObject.entityBackgroundDisplay, {
            texture: Material.Texture.Common({
                src: factionSheet.path,
                wrapMode: TextureWrapMode.TWM_REPEAT
            }),
            transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
        });
        //  character image
        MeshRenderer.setPlane(cardObject.entityCharacterDisplay, GetCardDrawVectors(
            cardSheet.sheetDetails.totalSizeX, 
            cardSheet.sheetDetails.totalSizeY, 
            cardSheet.sheetDetails.elementSizeX, 
            cardSheet.sheetDetails.elementSizeY, 
            cardDef.sheetData.posX, 
            cardDef.sheetData.posY
        ));
        Material.setPbrMaterial(cardObject.entityCharacterDisplay, {
            texture: Material.Texture.Common({
                src: cardSheet.path,
                wrapMode: TextureWrapMode.TWM_REPEAT
            }),
            transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
        });

        //set component defaults
        cardObject.isActive = false;
        cardObject.isInteractable = false;
        cardObject.isSelected = false;

        //TODO: redefined object based on given def/rarity; implement SetType
        
        if(isDebugging) console.log("Card Object: created new collectible object, key="+key+
            ", total="+pooledObjectsAll.size()+", active="+pooledObjectsActive.size()+", inactive="+pooledObjectsInactive.size());
        //provide entity reference
        return cardObject;
    }

    /** redefines the type of the given object */
    /*function SetType(entity:Entity, type:COLLECTIBLE_TYPE):Entity {}*/

    /** disables all objects, hiding them from the scene but retaining them in data & pooling */
    export function DisableAll() {
        if(isDebugging) console.log("Card Object: removing all objects...");
        //ensure all objects are parsed
        while(pooledObjectsActive.size() > 0) { 
            //small opt by starting at the back b.c of how list is implemented (list keeps order by swapping next item up)
            Disable(pooledObjectsActive.getItem(pooledObjectsActive.size()-1));
        }
        if(isDebugging) console.log("Card Object: removed all objects!");
    }
    /** disables the given object, hiding it from the scene but retaining it in data & pooling */
    export function Disable(cardObject:CardObjectData) {
        //adjust collections
        //  add to inactive listing (ensure add is required)
        var posX = pooledObjectsInactive.getItemPos(cardObject);
        if(posX == -1) pooledObjectsInactive.addItem(cardObject);
        //  remove from active listing
        pooledObjectsActive.removeItem(cardObject);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(cardObject.key)) pooledObjectsRegistry.removeItem(cardObject.key);

        //disable via component
        cardObject.isActive = false;
        cardObject.isInteractable = false;
        cardObject.isSelected = false;
        
        //hide object (soft remove work-around)
        Transform.getMutable(cardObject.entityFrame).scale = { x:0, y:0, z:0 }; 
    }

    /** removes all objects from the game */
    export function DestroyAll() {
        if(isDebugging) console.log("Card Object: destroying all objects...");
        //ensure all objects are parsed
        while(pooledObjectsAll.size() > 0) { 
            //small opt by starting at the back b.c of how list is implemented (list keeps order by swapping next item up)
            Destroy(pooledObjectsAll.getItem(pooledObjectsAll.size()-1));
        }
        if(isDebugging) console.log("Card Object: destroyed all objects!");
    }
    /** removes given object from game scene and engine */
    export function Destroy(cardObject:CardObjectData) {
        //adjust collections
        //  remove from overhead listing
        pooledObjectsAll.removeItem(cardObject);
        //  remove from inactive listing
        pooledObjectsInactive.removeItem(cardObject);
        //  remove from active listing
        pooledObjectsActive.removeItem(cardObject);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(cardObject.key)) pooledObjectsRegistry.removeItem(cardObject.key);

        //destroy game object
        engine.removeEntity(cardObject.entityFrame);
        //TODO: atm we rely on DCL to clean up object data class. so far it hasn't been an issue due to how
        //  object data is pooled, but we should look into how we can explicitly set data classes for removal
    }
}

//### EVERYTHING BELOW THIS POINT IS JUST TESTING COMMANDS TO ENSURE FUNCTIONALITY
//var pass
var testEntities:CardObjectData[] = [];
    
/** tests 'create' functionality
 *  PROCESS: create n objects
 *  RESULT: create n new objects
 */
export function TEST_CARD_OBJECT_CREATE(count:number) {
    //create requested number of objects
    for(var i=0; i<count; i++) {
        const cardObject = CardObject.Create(CardData[i], testEntities.length.toString());
        testEntities.push(cardObject);
        Transform.getMutable(cardObject.entityFrame).position = {x: (testEntities.length*0.65)-(count*0.65/2)+8, y:1.5, z:8};
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
    if(cardObject) CardObject.Disable(cardObject);
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
    CardObject.DestroyAll();
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
    if(cardObject) CardObject.Destroy(cardObject);
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
    CardObject.DestroyAll();
    //create more objects
    TEST_CARD_OBJECT_CREATE(3);
}