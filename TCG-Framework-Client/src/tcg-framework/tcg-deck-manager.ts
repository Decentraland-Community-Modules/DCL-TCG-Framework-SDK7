import { Animator, ColliderLayer, Entity, GltfContainer, Material, MeshRenderer, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { CardDisplayObject } from "./tcg-card-object";
import * as utils from '@dcl-sdk/utils'
import { CardDataRegistry } from "./data/tcg-card-registry";
import { CardSubjectObject } from "./tcg-card-subject-object";
import { CARD_TYPE_STRINGS, CardData, CardDataObject } from "./data/tcg-card-data";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { CardFactionData } from "./data/tcg-faction-data";
import { InteractionObject } from "./tcg-interaction-object";
import { PlayCardDeck } from "./tcg-play-card-deck";
import { PlayerLocal } from "./config/tcg-player-local";
import { Dictionary, List } from "../utilities/collections";
/*      TRADING CARD GAME FRAMEWORK - DECK MANAGER
    all utilities for viewing cards and managing card decks; this includes viewing all cards (with 
    filtering options), adding/removing cards to/from a deck, and saving/loading decks. 
    
    NOTE: this module comes with 2 pieces
    1 - deck manager display: 3D object with a trigger area that activates the deck manager display when
            a player gets enters the trigger. can have multiple instances spread throughout the world.
    2 - deck manager viewer: overhead object used to display card details & interact with decks. there
            is only 1 instance of this object that is moved around the scene as required.

    here's an example of the process in the context of a chest/inventory system: you can have multiple chests
    placed around your house, but when you interact with any of those chests the same inventory interaction UI
    is used between them. for the deck manager, display object = check & viewer = UI panel.

    NOTE: display issues can occur when deck manager objects are placed too close to one another. to avoid
    this ensure that trigger areas for deck manager do not overlap. 

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder), Jacko
    TeamContact: thecryptotrader69@gmail.com
*/
export module DeckManager {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Deck Manager: ";

    //currently active deck manager display object
    var curDisplayObject:undefined|DeckManagerDisplayObject;

    //### INTERACTION TYPES
    /** all interaction types for display filter buttons */
    enum FILTER_TYPE {
        FACTION="faction",
        TYPE="type",
        COST="cost",
    }
    /** all interaction types for deck management buttons */
    export enum DECK_INTERACTION_TYPE {
        SELECT="select",
        SAVE="save",
        LOAD="load",
    }

    //### DISPLAY OBJECT (ACTIVATION OBJECT)
    /** core display object model location */
    const MODEL_CORE:string = 'models/tcg-framework/deck-manager/tcg-deck-manager-prototype-1.glb';
    /** character display pedistal model location */
    const MODEL_CHARACTER_PEDISTAL:string = 'models/tcg-framework/deck-manager/tcg-deck-manager-prototype-1-pedistal.glb';

    /** animations that will be used when a card's model is being displayed */
    const DISPLAY_CHARACTER_ANIMATION = [ 
        CardSubjectObject.ANIM_KEY_CHARACTER.IDLE,
        CardSubjectObject.ANIM_KEY_SPELL.PLAY,
        0   //no animations for terrain (we do not currently display terrain models) 
    ];
    /** animation keys for deck manager object */
    const ANIM_KEYS_DECK_MANAGER:string[] = [
        "state_inactive",
        "anim_activate",
        "anim_deactivate"
    ];
    
    //transform defaults - (used when no pos, scale, or rot is given)
    //  enabled
    const PARENT_POSITION_ON:Vector3 = { x:0, y:0, z:0 };
    const PARENT_SCALE_ON:Vector3 = { x:1, y:1, z:1 };
    const PARENT_ROTATION_ON:Vector3 = { x:0, y:0, z:0 };
    //  disabled
    const PARENT_POSITION_OFF:Vector3 = { x:8, y:-4, z:8 };
    const PARENT_SCALE_OFF:Vector3 = { x:0, y:0, z:0 };

    /** core display scale */
    const DISPLAY_CORE_SCALE = { x:1, y:1, z:1 };
    
    /** character display offsets, per card type */
    const DISPLAY_CHARACTER_OFFSET = [
        { x:0.0, y:0.46, z:0.0 },   //spell
        { x:0.0, y:0.46, z:0.0 },   //character
        { x:0.0, y:0.48, z:-0.05 }  //terrain
    ];
    /** character display scales, per card type */
    const DISPLAY_CHARACTER_SCALE = [
        { x:0.1, y:0.1, z:0.1 },    //spell
        { x:0.25, y:0.25, z:0.25 }, //character
        { x:0.0, y:0.0, z:0.0 }     //terrain
    ];
    
    /** activation trigger area offset */
    const TRIGGER_OFFSET = { x:0, y:1.5, z:-2 };
    /** activation trigger area offset */
    const TRIGGER_SCALE = { x:8, y:4, z:6 };

    //display object pooling
    /** pool of ALL existing objects */
    var pooledObjectsAll:List<DeckManagerDisplayObject> = new List<DeckManagerDisplayObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<DeckManagerDisplayObject> = new List<DeckManagerDisplayObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<DeckManagerDisplayObject> = new List<DeckManagerDisplayObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<DeckManagerDisplayObject> = new Dictionary<DeckManagerDisplayObject>();
    
    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|DeckManagerDisplayObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }
    /** object interface used to define all data required to create a new object */
    export interface DeckManagerCreationData {
        //targeting
        key:string;
        //transform
        parent?: Entity; //entity to parent object under
        position?: { x:number; y:number; z:number; }; //new position for object
        scale?: { x:number; y:number; z:number; }; //new scale for object
        rotation?: { x:number; y:number; z:number; }; //new rotation for object (in eular degrees)
    }
    
    /** contains all pieces that make up a deck manager display object (model & trigger zone for summoning viewer) */
    export class DeckManagerDisplayObject { 
        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** unique key used for access */
        private key:string = "";
        public get Key():string { return this.key; };

        /** parental entity */
        public entity:Entity;
        /** core (contains animations) */
        public entityCore:Entity;
        /** display pedistal */
        public entityPedistal:Entity;
        /** selection preview display point (where object will be parented/placed, has rotation applied) */
        public previewPoint:Entity;
        /** selection preview display object */
        public previewObject:undefined|CardSubjectObject.CardSubjectObject;

        /** builds out the deck manager object, ensuring all required components exist and positioned correctly */
        constructor() {
            //parental
            this.entity = engine.addEntity();
            Transform.create(this.entity);
            
            //core display object
            this.entityCore = engine.addEntity();
            Transform.create(this.entityCore, { parent: this.entity, scale: DISPLAY_CORE_SCALE });
            //  add custom model
            GltfContainer.create(this.entityCore, {
                src: MODEL_CORE,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            //  add animations
            Animator.create(this.entityCore, {
                states:[
                    { name: ANIM_KEYS_DECK_MANAGER[0], clip: ANIM_KEYS_DECK_MANAGER[0], playing: true, loop: false },
                    { name: ANIM_KEYS_DECK_MANAGER[1], clip: ANIM_KEYS_DECK_MANAGER[1], playing: false, loop: false },
                    { name: ANIM_KEYS_DECK_MANAGER[2], clip: ANIM_KEYS_DECK_MANAGER[2], playing: false, loop: false },
                ]
            });

            //pedistal display object
            this.entityPedistal = engine.addEntity();
            Transform.create(this.entityPedistal, { parent: this.entity });
            //  add custom model
            GltfContainer.createOrReplace(this.entityPedistal, {
                src: MODEL_CHARACTER_PEDISTAL,
                visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
                invisibleMeshesCollisionMask: undefined
            });
            //  add animator
            Animator.create(this.entityPedistal, {
                states:[
                    { name: 'rotate', clip: 'rotate', playing: true, loop: true, speed:0.25 },
                ]
            });

            //add display point (parent object for )
            this.previewPoint = engine.addEntity();
            Transform.create(this.previewPoint, { parent: this.entity });
            //  add constant rotation
            utils.perpetualMotions.startRotation(this.previewPoint, Quaternion.fromEulerDegrees(0, -15, 0));
        }

        /** initializes the  */
        public Initialize(data: DeckManagerCreationData) {
            this.key = data.key;
            this.isActive = true;
            //parent
            const transform = Transform.getMutable(this.entity);
            transform.parent = data.parent;
            transform.position = data.position??PARENT_POSITION_ON;
            transform.scale = data.scale??PARENT_SCALE_ON;
            const rot = data.rotation??PARENT_ROTATION_ON;
            transform.rotation = Quaternion.fromEulerDegrees(rot.x,rot.y,rot.z);
            //  add trigger zone (enter -> shows deck view, close -> hides deck view)
            const callKey = this.Key;
            utils.triggers.addTrigger(this.entityCore, utils.NO_LAYERS, utils.LAYER_1, 
                [{type: 'box', position: TRIGGER_OFFSET, scale: TRIGGER_SCALE }],
                //this.OnTriggerEntry,
                function() { DeckManager.OnTriggerEntry(callKey); },
                function() { DeckManager.OnTriggerExit(); },
            );
        }

        /** updates the character preview with the given card def */
        public SetSelection(dataDef:CardDataObject) {
            //update preview point location based on card type
            const transform = Transform.getOrCreateMutable(this.previewPoint);
            transform.position = DISPLAY_CHARACTER_OFFSET[dataDef.type];
            transform.scale = DISPLAY_CHARACTER_SCALE[dataDef.type];
            //update card preview based on new card
            this.previewObject = CardSubjectObject.Create({
                key: "dm-"+this.Key,
                type: dataDef.type,
                model: dataDef.objPath,
                forceRepeat: true,
                parent: this.previewPoint, 
                position: { x:0, y:0, z:0, },
                scale: { x:1, y:1, z:1, },
                rotation: { x:0, y:0, z:0, }
            });
            this.SetAnimation(DISPLAY_CHARACTER_ANIMATION[dataDef.type]);
        }

        /** sets the given animation */
        public SetAnimation(value:number) {
            //turn off animations
            for(let i = 0; i < ANIM_KEYS_DECK_MANAGER.length; i++) {
                Animator.getClip(this.entityCore, ANIM_KEYS_DECK_MANAGER[i]).playing = false;
            }
            //turn on animation
            Animator.getClip(this.entityCore, ANIM_KEYS_DECK_MANAGER[value]).playing = true;
        }

        /** disables the given object, hiding it from the scene but retaining it in data & pooling */
        public Disable() {
            this.isActive = false;
            //hide card parent
            const transformParent = Transform.getMutable(this.entity);
            transformParent.parent = undefined;
            transformParent.position = PARENT_POSITION_OFF;
            transformParent.scale = PARENT_SCALE_OFF;
        }

        /** removes objects from game scene and engine */
        public Destroy() {
            //destroy game object
            engine.removeEntity(this.entity);
        }
    }
    
    /** provides a new interaction object (either pre-existing & un-used or entirely new) */
    export function Create(data:DeckManagerCreationData):DeckManagerDisplayObject {
        var object:undefined|DeckManagerDisplayObject = undefined;
        if(isDebugging) console.log(debugTag+"attempting to create new object...");
        
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
            object = new DeckManagerDisplayObject();
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

        if(isDebugging) console.log(debugTag+"created new object, key='"+object.Key+"'!");
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
    export function Disable(object:DeckManagerDisplayObject) {
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
    export function Destroy(object:DeckManagerDisplayObject) {
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

    /** triggered when player enters the area */
    export function OnTriggerEntry(key:string) {
        if(isDebugging) console.log(debugTag+"trigger entered deck manager zone: "+key);
        //attempt to get display object
        curDisplayObject = GetByKey(key);
        if(curDisplayObject != undefined) {
            //set animation
            curDisplayObject.SetAnimation(1);
            Transform.getMutable(viewParent).parent = curDisplayObject.entity;

            //update display
            utils.timers.setTimeout(
                function() {
                    GenerateCardObjects();
                    //select and load the first deck
                    DeckInteractionSelect(0);
                    DeckInteractionLoad();
                    //show display
                    Transform.getMutable(viewParent).scale = Vector3.One(); 
                },
                1000
            );
        }/**/
    }

    /** triggered when player exits the area */
    export function OnTriggerExit() { 
        if(isDebugging) console.log(debugTag+"trigger exited deck manager zone: "+curDisplayObject?.Key);
        //if display object is set
        if(curDisplayObject != undefined) {
            //set animation
            curDisplayObject.SetAnimation(2);

            //release all cards
            ReleaseCardObjects();
            //hide displays
            Transform.getMutable(viewParent).parent = undefined; 
            Transform.getMutable(viewParent).scale = Vector3.Zero();
        }
    }

    //### VIEW OBJECT
    //card grid
    /* number of cards in display grid width */
    const DISPLAY_GRID_COUNT_X:number = 5;
    /* number of cards in display grid height */
    const DISPLAY_GRID_COUNT_Y:number = 2;
    /** number of cards displayed in the grid */
    const DISPLAY_GRID_TOTAL:number = DISPLAY_GRID_COUNT_X*DISPLAY_GRID_COUNT_Y;
    /* width size of cards in display grid */
    const CARD_SIZE_X:number = 0.35;
    /* width size of cards in display grid */
    const CARD_SIZE_Y:number = 0.45;
    
    //card
    /** display card object scale */
    const CARD_OBJECT_SCALE = { x:0.125, y:0.125, z:0.025 };
    /** display card objects offset */
    const CARD_OBJECT_OFFSET = { x:0.0, y:1.8, z:-0.05 };

    /** references to all cards being used to display the current card page */
    var entityGridCards:CardDisplayObject.CardDisplayObject[] = [];

    /** parental object for all view pieces **/
    const viewParent:Entity = engine.addEntity();
    Transform.create(viewParent);

    //## CARD DISPLAY GRID FILTERING
    /** parental object for all display gird filtering elements */
    const filterParent:Entity = engine.addEntity();
    Transform.create(filterParent,{
        parent:viewParent,
        position: { x:0, y:0, z:0 },
        rotation: Quaternion.fromEulerDegrees(0,-0,0)
    });
    /** filter objects - per faction (fire, water, etc.) */
    var filterFactionMask:boolean[] = [];
    var filterFactionObj:InteractionObject.InteractionObject[] = [];
    for(let i:number=0; i<CardFactionData.length; i++) {
        filterFactionMask.push(true);
        filterFactionObj.push(InteractionObject.Create({
            ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_FILTER,
            target:FILTER_TYPE.FACTION, 
            action:i,
            interactionText:"toggle "+CardFactionData[i].name,
            modelInteraction: "models/tcg-framework/menu-buttons/button-oct-dynamic.glb",
            animCount:3,
            modelSecondary:"models/tcg-framework/menu-buttons/symbol-faction-"+CardFactionData[i].name+".glb",
            parent: filterParent, 
            position: { x:-1.1, y:2.2-(i*0.2), z:-0.025 },
            scale: { x:0.07, y:0.07, z:0.04, }
        }));
        //set green background
        filterFactionObj[i].SetAnimation(1);
    }
    /** filter objects - per type (spell, character, terrain)*/
    var filterTypeMask:boolean[] = [];
    var filterTypeObj:InteractionObject.InteractionObject[] = [];
    for(let i:number=0; i<CARD_TYPE_STRINGS.length; i++) {
        filterTypeMask.push(true);
        filterTypeObj.push(InteractionObject.Create({
            ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_FILTER,
            target:FILTER_TYPE.TYPE, 
            action:i,
            interactionText:"toggle "+CARD_TYPE_STRINGS[i],
            modelInteraction: "models/tcg-framework/menu-buttons/button-oct-dynamic.glb",
            animCount:3,
            modelSecondary:"models/tcg-framework/menu-buttons/symbol-type-"+CARD_TYPE_STRINGS[i]+".glb",
            parent: filterParent, 
            position: { x:-0.95, y:2-(i*0.2), z:-0.025 },
            scale: { x:0.07, y:0.07, z:0.04, }
        }));
        //set green background
        filterTypeObj[i].SetAnimation(1);
    }
    /** filter objects - per cost */
    var filterCostMask:boolean[] = [];
    var filterCostObj:InteractionObject.InteractionObject[] = [];
    for(let i:number=0; i<10; i++) {
        filterCostMask.push(true);
        filterCostObj.push(InteractionObject.Create({
            ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_FILTER,
            target:FILTER_TYPE.COST, 
            action:i,
            displayText:i.toString(),
            interactionText:"toggle cost "+i,
            modelInteraction: "models/tcg-framework/menu-buttons/button-oct-dynamic.glb",
            animCount:3,
            parent: filterParent, 
            position: { x:-0.675+(i*0.15), y:2.35, z:-0.025 },
            scale: { x:0.07, y:0.07, z:0.04, }
        }));
        //set green background
        filterCostObj[i].SetAnimation(1);
    }

    /** toggles filter of given type */
    export function ToggleFilter(type:string, index:number) {
        if(isDebugging) console.log(debugTag+"toggling filter tag type="+type+", index="+index);
        switch(type) {
            case 
                FILTER_TYPE.FACTION: filterFactionMask[index] = !filterFactionMask[index];
                if(filterFactionMask[index]) filterFactionObj[index].SetAnimation(1);
                else filterFactionObj[index].SetAnimation(2);
            break;
            case 
                FILTER_TYPE.TYPE: filterTypeMask[index] = !filterTypeMask[index];
                if(filterTypeMask[index]) filterTypeObj[index].SetAnimation(1);
                else filterTypeObj[index].SetAnimation(2);

            break;
            case 
                FILTER_TYPE.COST: filterCostMask[index] = !filterCostMask[index];
                if(filterCostMask[index]) filterCostObj[index].SetAnimation(1);
                else filterCostObj[index].SetAnimation(2);

            break;
        }
        RedrawCardView();
    }

    //## CARD DISPLAY GRID PAGING
    /** currently selected card page */
    var curPage:number = 0;
    /** calculates number of pages that can be displayed given current filters */
    function maxPage():number{ return Math.ceil(getCardLength()/DISPLAY_GRID_TOTAL);  }
    /** calculates number of cards that can be displaed given current filters */
    function getCardLength():number{
        var index = 0;
        var cardLength = 0;
        var cardData;

        while(index < CardData.length) {
            //set card data
            cardData = CardData[index];
            //push to next card data
            index++;

            //check filters
            //  faction
            if(!filterFactionMask[cardData.faction]) continue;
            //  type
            else if(!filterTypeMask[cardData.type]) continue;
            //  cost
            else if(!filterCostMask[cardData.attributeCost]) continue;

            cardLength++;
        }
        return cardLength;
    }

    /** parental object for all display gird paging elements */
    const cardPageParent:Entity = engine.addEntity();
    Transform.create(cardPageParent,{
        parent:viewParent,
        position: { x:0, y:1.25, z:-0.025 },
        rotation: Quaternion.fromEulerDegrees(0,0,0)
    });
    /** next page button */
    const buttonCardPageNext = InteractionObject.Create({
        ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_PAGING,
        target:"0", 
        displayText:">",
        interactionText:"Page Up",
        parent: cardPageParent, 
        position: { x:0.2, y:0, z:0 },
        scale: { x:0.1, y:0.1, z:0.04, }
    });
    Material.setPbrMaterial(buttonCardPageNext.entityInteraction, {
        albedoColor: Color4.Green(),
    });
    /** previous page button */
    const buttonCardPagePrev = InteractionObject.Create({
        ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_PAGING,
        target:"1", 
        displayText:"<",
        interactionText:"Page down",
        parent: cardPageParent, 
        position: { x:-0.2, y:0, z:0 },
        scale: { x:0.1, y:0.1, z:0.04, }
    });
    Material.setPbrMaterial(buttonCardPagePrev.entityInteraction, {
        albedoColor: Color4.Green(),
    });
    /** current page background */
    const cardPageCurBackground:Entity = engine.addEntity();
    Transform.create(cardPageCurBackground,{
        parent:cardPageParent,
        position: { x:0, y:0, z:0 },
        scale: { x:0.25, y:0.1, z:0.04, }
    });
    MeshRenderer.setBox(cardPageCurBackground);
    /** current page text */
    const cardPageCurText:Entity = engine.addEntity();
    Transform.create(cardPageCurText,{
        parent:cardPageCurBackground,
        position: { x:0, y:0.0, z:-0.52 },
        scale: { x:0.4, y:0.8, z:0.1, },
    });
    TextShape.create(cardPageCurText, { text: "",
        textColor: Color4.Black(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER,
    });

    /** displays next page of cards */
    export function NextCardDisplayPage() { 
        //check if current page is over page count (can do roll-over to zero or just cap)
        if (curPage +1 >= maxPage()) return;
        //display next page
        curPage++;
        RedrawCardView();
    }

    /** displays previous page of cards */
    export function PrevCardDisplayPage() { 
        //check if current page is over page count (can do roll-over to zero or just cap)
        if (curPage -1 < 0) return;
        //display prev page
        curPage--;
        RedrawCardView();
    }

    //## DECK MANAGEMENT VIEW
    /** local deck data capsule (overwritten/saved to player's actual decks) */
    var deckLocalContainer = PlayCardDeck.Create({ key: 'deck-manager', type: PlayCardDeck.DECK_TYPE.PLAYER_LOCAL });
    /** reference to currently targeted deck */
    var deckTargetContainer:PlayCardDeck.PlayCardDeckObject = PlayerLocal.PlayerDecks[0];

    /** parental object for all deck display/management elements */
    const deckInfoParent:Entity = engine.addEntity();
    Transform.create(deckInfoParent,{
        parent:viewParent,
        position: { x:2.05, y:1.78, z:-0.325 },
        rotation: Quaternion.fromEulerDegrees(0,35,0)
    });
    /** deck header background */
    const deckInfoHeaderBackground:Entity = engine.addEntity();
    Transform.create(deckInfoHeaderBackground,{
        parent:deckInfoParent,
        position: { x:0, y:0.45, z:-0.09 },
        scale: { x:0.3, y:0.2, z:0.01, },
    });
    GltfContainer.create(deckInfoHeaderBackground, {
        src: "models/tcg-framework/menu-displays/title-base-plate.glb",
        visibleMeshesCollisionMask: undefined,
        invisibleMeshesCollisionMask: undefined
    });
    /** deck header text */
    const deckInfoHeaderText:Entity = engine.addEntity();
    Transform.create(deckInfoHeaderText,{
        parent:deckInfoHeaderBackground,
        position: { x:0, y:0.20, z:-0.52 },
        scale: { x:0.2, y:0.26, z:0.1, },
    });
    TextShape.create(deckInfoHeaderText, { text: "A VALID DECK HAS 8 TO 12 CARDS", 
        textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER,
    });
    /** deck state text */
    const deckInfoStateText:Entity = engine.addEntity();
    Transform.create(deckInfoStateText,{
        parent:deckInfoHeaderBackground,
        position: { x:0, y:-0.18, z:-0.52 },
        scale: { x:0.2, y:0.28, z:0.1, },
    });
    TextShape.create(deckInfoStateText, { text: "DECK CARDS ###/###", 
        textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER,
    });
    /** select deck buttons */
    const deckInfoButtonSelectors:InteractionObject.InteractionObject[] = [];
    for(let i:number=0; i<CardFactionData.length; i++) {
        deckInfoButtonSelectors.push(InteractionObject.Create({
            ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_MODIFY,
            target: DECK_INTERACTION_TYPE.SELECT,
            action: i,
            interactionText: "SELECT DECK "+i,
            textScale: { x:0.08, y:0.8, z:1 },
            textPosition: { x:0, y:0, z:-1 },
            parent: deckInfoParent, 
            position: { x:0, y:0.29-(i*0.125), z:-0.1 },
            scale: { x:1.0, y:0.10, z:0.01 }
        }));
        Material.setPbrMaterial(deckInfoButtonSelectors[i].entityInteraction, { albedoColor: Color4.White(), });
        TextShape.getMutable(deckInfoButtonSelectors[i].entityText).text = "DECK "+i+" - ("+PlayerLocal.PlayerDecks[i]?.CardsAll.size()+")";
    }
    /** save deck button */
    const deckInfoButtonSave = InteractionObject.Create({
        ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_MODIFY,
        target: DECK_INTERACTION_TYPE.SAVE,
        displayText: "SAVE",
        modelInteraction:"models/tcg-framework/menu-displays/info-base-plate.glb",
        interactionText: "SAVE DECK",
        textColour:Color4.White(),
        textScale: { x:0.35, y:1, z:1, },
        textPosition: { x:0.45, y:0, z:-0.1 },
        parent: deckInfoParent, 
        position: { x:-0.38, y:-0.4, z:-0.1 },
        scale: { x:0.18, y:0.07, z:0.05, }
    });
    /** load deck button */
    const deckInfoButtonLoad = InteractionObject.Create({
        ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_MODIFY,
        target:DECK_INTERACTION_TYPE.LOAD,
        displayText:"LOAD",
        modelInteraction:"models/tcg-framework/menu-displays/info-base-plate.glb",
        interactionText:"LOAD DECK",
        textColour:Color4.White(),
        textScale: { x:0.35, y:1, z:1, },
        textPosition: { x:0.45, y:0, z:-0.1 },
        parent: deckInfoParent, 
        position: { x:0.23, y:-0.4, z:-0.1 },
        scale: { x:0.18, y:0.07, z:0.05, }
    });
    
    /** selects a new deck, loading it in for modification */
    export function DeckInteractionSelect(index:number) {
        if(isDebugging) console.log(debugTag+"selecting deck, key="+index); 

        Material.setPbrMaterial(deckInfoButtonSelectors[PlayerLocal.GetPlayerDeckIndex()].entityInteraction, { albedoColor: Color4.White(), });
        //set reference
        PlayerLocal.SetPlayerDeck(index);
        deckTargetContainer = PlayerLocal.PlayerDecks[index];
        Material.setPbrMaterial(deckInfoButtonSelectors[PlayerLocal.GetPlayerDeckIndex()].entityInteraction, { albedoColor: Color4.Green(), });
    }

    /** called when player interacts with counter buttons */
    export function DeckInteractionSave() {
        if(isDebugging) console.log(debugTag+"saving deck, key="+PlayerLocal.GetPlayerDeckIndex()); 
        //ensure deck has correct number of cards
        if(deckLocalContainer.CardsAll.size() < PlayCardDeck.DECK_SIZE_MIN || deckLocalContainer.CardsAll.size() > PlayCardDeck.DECK_SIZE_MAX) {
            if(isDebugging) console.log(debugTag+"deck not withing card limits, card count="+deckLocalContainer.CardsAll.size()); 
            TextShape.getMutable(deckInfoHeaderText).textColor = Color4.Red();
            return;
        }
        
        //save local deck to target deck
        deckTargetContainer.Clone(deckLocalContainer);
        TextShape.getMutable(deckInfoButtonSelectors[PlayerLocal.GetPlayerDeckIndex()].entityText).text = "DECK "+PlayerLocal.GetPlayerDeckIndex()+" - ("+deckTargetContainer.CardsAll.size()+")";
        TextShape.getMutable(deckInfoHeaderText).textColor = Color4.White();

        //update count text
        RedrawCardView();
        UpdateCardCount();
    }

    /** called when player interacts with counter buttons */
    export function DeckInteractionLoad() {
        if(isDebugging) console.log(debugTag+"loading deck, key="+PlayerLocal.GetPlayerDeckIndex());
        //load local deck from target deck
        deckLocalContainer.Clone(deckTargetContainer);

        //update count text
        RedrawCardView();
        UpdateCardCount();
    }

    /** redraws the card count text, displaying the current number of cards in the mod-deck */
    export function UpdateCardCount() {
        TextShape.getMutable(deckInfoStateText).text = "DECK CARDS "+deckLocalContainer.CardsAll.size()+"/"+PlayCardDeck.DECK_SIZE_MAX;
    }

    //### SELECTED CARD VIEW
    /** parental object for all selected card info elements */
    const cardInfoParent:Entity = engine.addEntity();
    Transform.create(cardInfoParent,{
        parent:viewParent,
        position: { x:-2.05, y:1.8, z:-0.325 },
        rotation: Quaternion.fromEulerDegrees(0,-35,0)
    });
    /** selected card name background */
    const cardInfoHeaderBackground:Entity = engine.addEntity();
    Transform.create(cardInfoHeaderBackground,{
        parent:cardInfoParent,
        position: { x:0, y:0.5, z:-0.10 },
        scale: { x:0.315, y:0.25, z:0.1, },
    });
    GltfContainer.create(cardInfoHeaderBackground, {
        src: "models/tcg-framework/menu-displays/title-base-plate.glb",
        visibleMeshesCollisionMask: undefined,
        invisibleMeshesCollisionMask: undefined
    });
    /** selected card name header text */
    const cardInfoHeaderText:Entity = engine.addEntity();
    Transform.create(cardInfoHeaderText,{
        parent:cardInfoParent,
        position: { x:0, y:0.5, z:-0.12 },
        scale: { x:0.085, y:0.085, z:0.1, },
    });
    TextShape.create(cardInfoHeaderText, { text: "CARD_DEF_NAME", 
        textColor: Color4.White(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER,
    });
    /** selected card details background */
    const cardInfoDetailsBackground:Entity = engine.addEntity();
    Transform.create(cardInfoDetailsBackground,{
        parent:cardInfoParent,
        position: { x:-0.32, y:0.10, z:-0.10 },
        scale: { x:0.25, y:0.19, z:0.01, },
    });
    GltfContainer.create(cardInfoDetailsBackground, {
        src: "models/tcg-framework/menu-displays/info-base-plate.glb",
        visibleMeshesCollisionMask: undefined,
        invisibleMeshesCollisionMask: undefined
    });
    /** selected card details text */
    const cardInfoDetailsText:Entity = engine.addEntity();
    Transform.create(cardInfoDetailsText,{
        parent:cardInfoParent,
        position: { x:-0.32, y:0.10, z:-0.11 },
        scale: { x:0.05, y:0.05, z:0.1, },
    });
    TextShape.create(cardInfoDetailsText, { text: "\nFaction: \nType: \nCost:", 
        textColor: Color4.White(), 
        textAlign:TextAlignMode.TAM_TOP_LEFT,
        textWrapping:true,
        width: 9, height:10
    });
    /** selected card details background */
    const cardKeywordDetailsBackground:Entity = engine.addEntity();
    Transform.create(cardKeywordDetailsBackground,{
        parent:cardInfoParent,
        position: { x:0.1, y:0.10, z:-0.10 },
        scale: { x:0.25, y:0.19, z:0.01, },
    });
    GltfContainer.create(cardKeywordDetailsBackground, {
        src: "models/tcg-framework/menu-displays/keyword-base-plate.glb",
        visibleMeshesCollisionMask: undefined,
        invisibleMeshesCollisionMask: undefined
    });
    /** selected card desc background */
    const cardInfoDescBackground:Entity = engine.addEntity();
    Transform.create(cardInfoDescBackground,{
        parent:cardInfoParent,
        position: { x:0, y:-0.30, z:-0.10 },
        scale: { x:0.35, y:0.30, z:0.01, },
    });        
    GltfContainer.create(cardInfoDescBackground, {
        src: "models/tcg-framework/menu-displays/desc-base-plate.glb",
        visibleMeshesCollisionMask: undefined,
        invisibleMeshesCollisionMask: undefined
    });
    /** selected card desc text */
    const cardInfoDescText:Entity = engine.addEntity();
    Transform.create(cardInfoDescText,{
        parent:cardInfoParent,
        position: { x:0, y:-0.30, z:-0.11 },
        scale: { x:0.05, y:0.05, z:0.1, },
    });
    TextShape.create(cardInfoDescText, { text: "Description:", 
        textColor: Color4.White(), 
        textAlign:TextAlignMode.TAM_MIDDLE_CENTER,
        textWrapping:true,
        width: 23, height:5
    });
    /** selected card display object */
    const cardInfoObject = CardDisplayObject.Create({
        ownerType: CardDisplayObject.CARD_OBJECT_OWNER_TYPE.DECK_MANAGER,
        hasInteractions: false,
        hasCounter: false,
        slotID: "dm-preview",
        def: CardDataRegistry.Instance.GetEntryByPos(1).DataDef, 
        parent: cardInfoParent,
        position: { x:0.41, y:0.10, z:-0.1 },
        scale: { x:0.125, y:0.125, z:0.125, },
    });

    //## CARD DISPLAY GRID FUNCTIONALITY
    /** displays a list of cards in the game, based on the current filters/page  */
    function GenerateCardObjects() {
        if(isDebugging) console.log(debugTag+"redrawing card display..."); 
        entityGridCards = [];
        //populate card grid display
        const invTotalX = CARD_SIZE_X * (DISPLAY_GRID_COUNT_X - 1);
        const invTotalY = CARD_SIZE_Y * (DISPLAY_GRID_COUNT_Y - 1);
        for(let y = 0; y < DISPLAY_GRID_COUNT_Y; y++) {
            for(let x = 0; x < DISPLAY_GRID_COUNT_X; x++) {
                //create new card object
                const card = CardDisplayObject.Create({
                    ownerType: CardDisplayObject.CARD_OBJECT_OWNER_TYPE.DECK_MANAGER,
                    slotID: (x + (y*DISPLAY_GRID_COUNT_X)).toString(),
                    def: CardDataRegistry.Instance.GetEntryByPos(0).DataDef, 
                    parent: viewParent,
                    position: {
                        x:CARD_OBJECT_OFFSET.x + (x * CARD_SIZE_X) - (invTotalX / 2), 
                        y:CARD_OBJECT_OFFSET.y - (y * CARD_SIZE_Y) + (invTotalY / 2), 
                        z:CARD_OBJECT_OFFSET.z 
                    },
                    scale: CARD_OBJECT_SCALE,
                });
                entityGridCards.push(card);
            }
        }
        if(isDebugging) console.log(debugTag+"redrew display cards with "+entityGridCards.length); 
    }

    /** processes all cards looking  */
    function RedrawCardView() {
        //process all display card objects
        var indexDisplay: number = 0;
        var indexData: number = 0;
        var curProcessingPage: number = 0;
        //ensures current page never exceeds max page
        if(curPage >= maxPage()) curPage = maxPage() - 1;
        //ensures page number does not display 0 when filtering from no cards being shown to cards being shown
        if(curPage < 0 && maxPage() != 0 ) curPage = 0;
        console.log(curPage);
        //updates the page numbers
        TextShape.getMutable(cardPageCurText).text = (curPage +1)+"/"+maxPage();
        while(indexDisplay < entityGridCards.length) {
            //attempt to get next card data
            var cardData:undefined|CardDataObject = undefined;
            while(indexData < CardData.length) {
                //set card data
                cardData = CardData[indexData];
                //push to next card data
                indexData++;

                //check filters
                //  faction
                if(!filterFactionMask[cardData.faction]) cardData = undefined;
                //  type
                else if(!filterTypeMask[cardData.type]) cardData = undefined;
                //  cost
                else if(!filterCostMask[cardData.attributeCost]) cardData = undefined;

                //displays cards based on current page 
                if(curProcessingPage < curPage*DISPLAY_GRID_TOTAL){
                    curProcessingPage++;
                    cardData = undefined;
                }

                //if card data was found, exit
                if(cardData != undefined) break;
            }

            //if card data was found, populate display object based on data 
            var cardObject:CardDisplayObject.CardDisplayObject = entityGridCards[indexDisplay];
            if(cardData != undefined) {
                cardObject.SetCard(cardData);
                //update count text
                cardObject.SetCounterValue(deckLocalContainer.GetCardCount(cardObject.DefIndex).toString());
            }
            //if no card data, hide card object
            else {
                cardObject.Disable();
            }

            //push to next card objects
            indexDisplay++;
        }
    }

    /** called when player interacts with counter buttons */
    export function CardInteractionCounterButton(slotID:string, change:number) {
        //get card object
        const cardObject = entityGridCards[Number.parseInt(slotID)];
        if(isDebugging) console.log(debugTag+"modifying card ID="+cardObject.DefIndex+", change="+change+"...");

        //process change
        if(change > 0) deckLocalContainer.AddCard(cardObject.DefIndex);
        else deckLocalContainer.RemoveCard(cardObject.DefIndex);

        //update count text
        UpdateCardCount();
        cardObject.SetCounterValue(deckLocalContainer.GetCardCount(cardObject.DefIndex).toString());
    }

    /** called when a card is interacted with */
    export function CardInteractionSelect(slotID:string) {
        if(isDebugging) console.log(debugTag+"player interacted with card, key="+slotID);
        if(curDisplayObject == undefined) return;

        const dataDef = CardData[entityGridCards[Number.parseInt(slotID)].DefIndex];
        const cardStatData = CardData[entityGridCards[Number.parseInt(slotID)].DefIndex];

        //create character display model 
        curDisplayObject.SetSelection(dataDef);
        
        //update selection display card
        cardInfoObject.SetCard(dataDef, false);
        
        //update selection view
        TextShape.getMutable(cardInfoHeaderText).text = dataDef.name;

        if(dataDef.type == 0){
            TextShape.getMutable(cardInfoDetailsText).text = 
            "\nFaction: "+CardDataRegistry.Instance.GetFaction(dataDef.faction).name+
            "\nType: "+CARD_TYPE_STRINGS[dataDef.type]+
            "\nCost: "+dataDef.attributeCost;
        }
        else if(dataDef.type == 1){
            TextShape.getMutable(cardInfoDetailsText).text = 
            "\nFaction: "+CardDataRegistry.Instance.GetFaction(dataDef.faction).name+
            "\nType: "+CARD_TYPE_STRINGS[dataDef.type]+
            "\nCost: "+dataDef.attributeCost+
            "\nHealth: "+dataDef.attributeCharacter?.unitHealth+
            "\nArmor: "+dataDef.attributeCharacter?.unitArmour+
            "\nDamage: "+dataDef.attributeCharacter?.unitAttack;
        } 
        
        TextShape.getMutable(cardInfoDescText).text = dataDef.desc;
              
    }

    /** releases all card objects in the current display grid */
    function ReleaseCardObjects() {
        if(isDebugging) console.log(debugTag+"releasing display card, count="+entityGridCards.length); 
        while(entityGridCards.length > 0) {
            const card = entityGridCards.pop();
            if(card) CardDisplayObject.Disable(card);
        }
        if(isDebugging) console.log(debugTag+"released display card, remaining="+entityGridCards.length); 
    }
}