import { Animator, ColliderLayer, Entity, GltfContainer, Schemas, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { CardObject } from "./tcg-card-object";
import * as utils from '@dcl-sdk/utils'
import { PlayerCardRegistry } from "./tcg-card-registry";
import { CardCharacterObject } from "./tcg-card-character-object";
import { CardData } from "./data/tcg-card-data";
import { Quaternion } from "@dcl/sdk/math";
/*      TRADING CARD GAME - DECK MANAGER
    all utilities for creating & managing a decks of cards, this includes 
    creating new decks, adding/removing cards from a deck, and viewing available
    cards through filters. comes with auto clean-up (hide cards when user gets too
    far away) & auto hide-others (hides other players when user enters deck manager
    area) to help keep the scene clean.

    only one instance of these display objects should exist at a time.

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module DeckManager
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Deck Manager: ";

    /** deck manager object model location */
    const MODEL_DECK_MANAGER:string = 'models/tcg-framework/deck-manager/tcg-deck-manager-prototype.glb';
    /** pedistal display model location */
    const MODEL_PEDISTAL:string = 'models/tcg-framework/deck-manager/tcg-display-pedistal.glb';
    /** animation keys */
    const animKeysDeckManagerObject:string[] = [
        "state_inactive",
        "anim_activate",
        "anim_deactivate"
    ];

    /** parental instance for all */
    var instance:undefined|Entity = undefined;
    /** instance pocketing for deck manager object, ensures initialization */
    function Instance():Entity {
        //ensure instance is set
        if(instance === undefined) {
            //create class
            instance = engine.addEntity();
            Transform.create(instance);
            Initialize();
        }
  
        return instance;
    }

    /** default size for the deck manager object */
    const deckManagerScale = { x:0.8, y:0.8, z:0.8 };
    
    /* min number of cards in a viable deck */
    const deckSizeMin = 24;
    /* max number of cards in a viable deck */
    const deckSizeMax = 32;
    
    /** default size for the deck manager object */
    const cardObjectOffset = { x:0.0, y:1.75, z:0.0 };
    const cardObjectScale = { x:0.125, y:0.125, z:0.125 };
    /* number of cards in the display */
    const cardGridSizeX:number = 5;
    const cardGridSizeY:number = 3;
    /* size of cards */
    const cardSizeX:number = 0.45;
    const cardSizeY:number = 0.6;
    
    /** true when this object can be interacted with */
    var isInteractable:boolean = false;

    /** display pedistal for card characters */
    const pedistalObject:Entity = engine.addEntity();
    Transform.create(pedistalObject, { 
        position: { x:8, y:0, z:12 } 
    });
    GltfContainer.createOrReplace(pedistalObject, {
        src: MODEL_PEDISTAL,
        visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
        invisibleMeshesCollisionMask: undefined
    });
    Animator.create(pedistalObject, {
        states:[
            { name: 'rotate', clip: 'rotate', playing: true, loop: true, speed:0.25 },
        ]
    });
    /** display location for selected card character */
    const pedistalDisplayPoint:Entity = engine.addEntity();
    Transform.create(pedistalDisplayPoint, { 
        parent: pedistalObject,
        position: { x:0, y:0.5, z:0 },
        scale: { x:0.75, y:0.75, z:0.75 }
    });
    utils.perpetualMotions.startRotation(pedistalDisplayPoint, Quaternion.fromEulerDegrees(0, -15, 0))

    //### DISPLAY DETAILS
    /** display frame */
    var entityFrame:Entity;
    /** save deck button */
    /** load deck button */
    /** area trigger, auto clean-up when player moves away */
    /** area trigger, auto hide other players in deck manager area */

    //### DECK DETAILS
    /** which deck slot is currently being modified (-1 for no-save) */
    var deckSelection:number = -1;
    /** number of cards in the current deck */
    var deckCardCount:number = 0;

    //### SELECTED CARD DETAILS
    /** which card slot is currently selected/displayed (-1 for no slot selected) */
    var cardSelection:number = -1;
    /** rarity of selected card */
    var cardRarity:number = 0;
    /** def key of selected card */
    var cardDef:string = "";

    //### DISPLAYED CARD PAGE DETAILS 
    /** references to all cards being used to display the current card page */
    var entityGridCards:CardObject.CardObject[] = [];
    /** display page current/count text */
    /** display page next */
    /** display page prev */

    /** builds out the deck manager, ensuring all required components exist and positioned correctly.
     *  card objects are claimed/released as the player interacts with the deck manager.
     */
    function Initialize() {
        //create frame
        //  create entity
        entityFrame = engine.addEntity();
        Transform.create(entityFrame, {parent: instance, scale: deckManagerScale});
        //  add custom model
        GltfContainer.create(entityFrame, {
            src: MODEL_DECK_MANAGER,
            visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
            invisibleMeshesCollisionMask: undefined
        });
        //add animator
        Animator.create(entityFrame, {
            states:[
                { name: animKeysDeckManagerObject[0], clip: animKeysDeckManagerObject[0], playing: true, loop: false },
                { name: animKeysDeckManagerObject[1], clip: animKeysDeckManagerObject[1], playing: false, loop: false },
                { name: animKeysDeckManagerObject[2], clip: animKeysDeckManagerObject[2], playing: false, loop: false },
            ]
        });
        //add trigger entry trigger
        utils.triggers.addTrigger(entityFrame, utils.NO_LAYERS, utils.LAYER_1, 
            [{type: 'box', position: {x:0,y:1.5,z:-2}, scale: {x:4,y:4,z:4}}],
            OnTriggerEntry,
            OnTriggerExit
        );
        
        //set default animation
        SetAnimation(0);
    }

    /** redefines the deck manager object's parent */
    export function SetParent(parent: undefined|Entity) {
        Transform.getMutable(Instance()).parent = parent;
    }

    /** redefines the deck manager object's position */
    export function SetPosition(position: {x:number,y:number,z:number}) {
        Transform.getMutable(Instance()).position = position;
    }

    /** redefines the deck manager object's rotation */
    export function SetRotation(rotation: {x:number,y:number,z:number,w:number}) {
        Transform.getMutable(Instance()).rotation = rotation;
    }

    /** sets the given animation */
    function SetAnimation(value:number) {
        //turn off animations
        for(let i = 0; i < animKeysDeckManagerObject.length; i++) {
            Animator.getClip(entityFrame, animKeysDeckManagerObject[i]).playing = false;
        }
        //turn on animation
        Animator.getClip(entityFrame, animKeysDeckManagerObject[value]).playing = true;
    }

    /** triggered when player enters the area */
    function OnTriggerEntry() {
        console.log(debugTag+"trigger entered");
        SetAnimation(1);
        DisplayCards();
        //claim callback functionality for card objects
        CardObject.callbackInteract = CardInteraction;
    }

    /** triggered when player exits the area */
    function OnTriggerExit() { 
        console.log(debugTag+"trigger exit"); 
        SetAnimation(2);
        ReleaseCardObjects();
    }

    /** displays a list of cards in the game, based on the current filters/page  */
    function DisplayCards() {
        console.log(debugTag+"redrawing card display..."); 
        //populate card grid display
        const invTotalX = cardSizeX * (cardGridSizeX - 1);
        const invTotalY = cardSizeY * (cardGridSizeY - 1);
        for(let x = 0; x < cardGridSizeX; x++) {
            for(let y = 0; y < cardGridSizeY; y++) {
                //create new card object
                entityGridCards.push(CardObject.Create({
                    key: "dm-"+x+"-"+y,
                    def: PlayerCardRegistry.Instance.GetEntryByPos(0).DataDef, 
                    parent: instance,
                    position: {
                        x:cardObjectOffset.x + (x * cardSizeX) - (invTotalX / 2), 
                        y:cardObjectOffset.y - (y * cardSizeY) + (invTotalY / 2), 
                        z:cardObjectOffset.z 
                    },
                    scale: cardObjectScale,
                    rotation: { x:0, y:0, z:0 },
                }));
            }
        }
        console.log(debugTag+"redrew display cards with "+entityGridCards.length); 
    }

    /** releases all card objects in the current display grid */
    function ReleaseCardObjects() {
        console.log(debugTag+"releasing display card, count="+entityGridCards.length); 
        while(entityGridCards.length > 0) {
            const card = entityGridCards.pop();
            if(card) CardObject.Disable(card);
        }
        console.log(debugTag+"released display card, remaining="+entityGridCards.length); 
    }

    /** called when a card is interacted with */
    function CardInteraction(object:CardObject.CardObject) {
        console.log(debugTag+"player interacted with card, key="+object.ID); 

        //create character display model
        CardCharacterObject.Create({
            key: "tcg-dm",
		    model: CardData[0].objPath,
            parent: pedistalDisplayPoint, 
            position: { x:0, y:0, z:0, },
            scale: { x:1, y:1, z:1, },
            rotation: { x:0, y:0, z:0, }
        });
    }
}

//### EVERYTHING BELOW THIS POINT IS JUST TESTING COMMANDS TO ENSURE FUNCTIONALITY
