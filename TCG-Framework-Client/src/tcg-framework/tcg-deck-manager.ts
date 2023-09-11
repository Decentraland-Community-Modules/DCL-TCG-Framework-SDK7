import { Animator, ColliderLayer, Entity, GltfContainer, Material, MeshRenderer, Schemas, TextAlignMode, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { CardDisplayObject } from "./tcg-card-object";
import * as utils from '@dcl-sdk/utils'
import { CardDataRegistry } from "./data/tcg-card-registry";
import { CardSubjectObject } from "./tcg-card-subject-object";
import { CARD_TYPE_STRINGS, CardData, CardDataObject } from "./data/tcg-card-data";
import { Color3, Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { CardFactionData } from "./data/tcg-faction-data";
import { InteractionObject } from "./tcg-interaction-object";
import { PlayCardDeck } from "./tcg-play-card-deck";
import { PlayerLocal } from "./config/tcg-player-local";
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
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Deck Manager: ";

    /** deck manager object model location */
    const MODEL_DECK_MANAGER:string = 'models/tcg-framework/deck-manager/tcg-deck-manager-prototype-1.glb';
    /** pedistal display model location */
    const MODEL_PEDISTAL:string = 'models/tcg-framework/deck-manager/tcg-deck-manager-prototype-1-pedistal.glb';
    /** animation keys */
    const ANIM_KEYS_DECK_MANAGER:string[] = [
        "state_inactive",
        "anim_activate",
        "anim_deactivate"
    ];

    /** all deck interaction buttons */
    export enum DECK_INTERACTION_TYPE {
        SELECT="select",
        SAVE="save",
        LOAD="load",
    }

    /** all filter interaction buttons */
    enum FILTER_TYPE {
        FACTION="faction",
        TYPE="type",
        COST="cost"
    }

    /** core display object defaults */
    const DISPLAY_OBJECT_SCALE = { x:1.2, y:1.2, z:1.2 };
    
    /** character display object defaults */
    const DISPLAY_CHARACTER_OFFSET = [
        { x:0.0, y:0.46, z:0.0 },
        { x:0.0, y:0.46, z:0.0 },
        { x:0.0, y:0.48, z:-0.05 }
    ];
    const DISPLAY_CHARACTER_SCALE = [
        { x:0.1, y:0.1, z:0.1 },
        { x:0.25, y:0.25, z:0.25 },
        { x:0.0, y:0.0, z:0.0 }
    ];
    const DISPLAY_CHARACTER_ANIMATION = [ 0,1,0 ];
    
    /** collsion area defaults */
    const TRIGGER_OFFSET = { x:0, y:1.5, z:-2 };
    const TRIGGER_SCALE = { x:8, y:4, z:6 };

    /** default size for the deck manager object */
    const CARD_OBJECT_OFFSET = { x:0.0, y:1.8, z:-0.05 };
    const CARD_OBJECT_SCALE = { x:0.125, y:0.125, z:0.025 };
    
    /* number of cards in the display */
    const DISPLAY_GRID_SIZE_X:number = 5;
    const DISPLAY_GRID_SIZE_Y:number = 2;
    /* size of cards */
    const CARD_SIZE_X:number = 0.35;
    const CARD_SIZE_Y:number = 0.45;
    
    /** parental display object */
    const entityParent:Entity = engine.addEntity();
    Transform.create(entityParent, {scale: DISPLAY_OBJECT_SCALE });

    /** core display model  */
    const entityDisplayModel = engine.addEntity();
    Transform.create(entityDisplayModel, { parent: entityParent });
    //  add custom model
    GltfContainer.create(entityDisplayModel, {
        src: MODEL_DECK_MANAGER,
        visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
        invisibleMeshesCollisionMask: undefined
    });
    //add animator
    Animator.create(entityDisplayModel, {
        states:[
            { name: ANIM_KEYS_DECK_MANAGER[0], clip: ANIM_KEYS_DECK_MANAGER[0], playing: true, loop: false },
            { name: ANIM_KEYS_DECK_MANAGER[1], clip: ANIM_KEYS_DECK_MANAGER[1], playing: false, loop: false },
            { name: ANIM_KEYS_DECK_MANAGER[2], clip: ANIM_KEYS_DECK_MANAGER[2], playing: false, loop: false },
        ]
    });
    //add trigger entry trigger
    utils.triggers.addTrigger(entityDisplayModel, utils.NO_LAYERS, utils.LAYER_1, 
        [{type: 'box', position: TRIGGER_OFFSET, scale: TRIGGER_SCALE }],
        OnTriggerEntry,
        OnTriggerExit
    );


    /** pedistal display model */
    const entityDisplayPedistal:Entity = engine.addEntity();
    Transform.create(entityDisplayPedistal, { parent: entityParent });
    //  add custom model
    GltfContainer.createOrReplace(entityDisplayPedistal, {
        src: MODEL_PEDISTAL,
        visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
        invisibleMeshesCollisionMask: undefined
    });
    //add animator
    Animator.create(entityDisplayPedistal, {
        states:[
            { name: 'rotate', clip: 'rotate', playing: true, loop: true, speed:0.25 },
        ]
    });

    /** card character display parent */
    const entityDisplayPedistalPoint:Entity = engine.addEntity();
    Transform.create(entityDisplayPedistalPoint, { 
        parent: entityParent,
        position: DISPLAY_CHARACTER_OFFSET[0],
        scale: DISPLAY_CHARACTER_SCALE[0]
    });
    //add constant rotation
    utils.perpetualMotions.startRotation(entityDisplayPedistalPoint, Quaternion.fromEulerDegrees(0, -15, 0));

    /** redefines the deck manager object's parent */
    export function SetParent(parent: undefined|Entity) {
        Transform.getMutable(entityParent).parent = parent;
    }

    /** redefines the deck manager object's position */
    export function SetPosition(position: {x:number,y:number,z:number}) {
        Transform.getMutable(entityParent).position = position;
    }

    /** redefines the deck manager object's rotation */
    export function SetRotation(rotation: {x:number,y:number,z:number,w:number}) {
        Transform.getMutable(entityParent).rotation = rotation;
    }

    /** sets the given animation */
    function SetAnimation(value:number) {
        //turn off animations
        for(let i = 0; i < ANIM_KEYS_DECK_MANAGER.length; i++) {
            Animator.getClip(entityDisplayModel, ANIM_KEYS_DECK_MANAGER[i]).playing = false;
        }
        //turn on animation
        Animator.getClip(entityDisplayModel, ANIM_KEYS_DECK_MANAGER[value]).playing = true;
    }

    /** triggered when player enters the area */
    function OnTriggerEntry() {
        if(isDebugging) console.log(debugTag+"trigger entered");
        SetAnimation(1);

        //update display
        utils.timers.setTimeout(
            function() { 
                GenerateCardObjects();
                DeckInteractionSelect(0);
                DeckInteractionLoad();
                Transform.getMutable(deckInfoParent).scale = Vector3.One(); 
                Transform.getMutable(filterParent).scale = Vector3.One(); 
            },
            1000
        );
    }

    /** triggered when player exits the area */
    function OnTriggerExit() { 
        if(isDebugging) console.log(debugTag+"trigger exit"); 
        SetAnimation(2);

        ReleaseCardObjects();
        Transform.getMutable(deckInfoParent).scale = Vector3.Zero();
        Transform.getMutable(filterParent).scale = Vector3.Zero();
    }

    //### DECK INTERACTION COMPONENTS
    const deckInfoParent:Entity = engine.addEntity();
    Transform.create(deckInfoParent,{
        parent:entityParent,
        position: { x:2.05, y:1.7, z:-0.325 },
        rotation: Quaternion.fromEulerDegrees(0,35,0)
    });
    /** deck header background */
    const deckHeaderBackground:Entity = engine.addEntity();
    Transform.create(deckHeaderBackground,{
        parent:deckInfoParent,
        position: { x:0, y:0.45, z:-0.09 },
        scale: { x:1, y:0.17, z:0.01, },
    });
    MeshRenderer.setBox(deckHeaderBackground);
    /** deck header text */
    const deckHeaderText:Entity = engine.addEntity();
    Transform.create(deckHeaderText,{
        parent:deckHeaderBackground,
        position: { x:0, y:0.235, z:-0.52 },
        scale: { x:0.055, y:0.4, z:0.1, },
    });
    TextShape.create(deckHeaderText, { text: "A VALID DECK HAS 8 TO 12 CARDS", 
        textColor: Color4.Black(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER,
    });
    /** deck state text */
    const deckStateText:Entity = engine.addEntity();
    Transform.create(deckStateText,{
        parent:deckHeaderBackground,
        position: { x:0, y:-0.235, z:-0.52 },
        scale: { x:0.055, y:0.4, z:0.1, },
    });
    TextShape.create(deckStateText, { text: "DECK CARDS ###/###", 
        textColor: Color4.Black(), textAlign:TextAlignMode.TAM_MIDDLE_CENTER,
    });
    /** select deck buttons */
    var deckButtonSelectors:InteractionObject.InteractionObject[] = [];
    for(let i:number=0; i<CardFactionData.length; i++) {
        deckButtonSelectors.push(InteractionObject.Create({
            ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_MODIFY,
            target: DECK_INTERACTION_TYPE.SELECT,
            action: i,
            interactionText: "SELECT DECK "+i,
            textScale: { x:0.125, y:1, z:1 },
            parent: deckInfoParent, 
            position: { x:0, y:0.29-(i*0.125), z:-0.1 },
            scale: { x:0.8, y:0.10, z:0.05 }
        }));
        Material.setPbrMaterial(deckButtonSelectors[i].entityShape, { albedoColor: Color4.White(), });
        TextShape.getMutable(deckButtonSelectors[i].entityText).text = "DECK "+i+" - ("+PlayerLocal.PlayerDecks[i]?.CardsAll.size()+")";
    }
    /** save deck button */
    const deckButtonSave = InteractionObject.Create({
        ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_MODIFY,
        target: DECK_INTERACTION_TYPE.SAVE,
        displayText: "SAVE",
        interactionText: "SAVE DECK",
        textScale: { x:0.35, y:1, z:1, },
        parent: deckInfoParent, 
        position: { x:-0.28, y:-0.4, z:-0.1 },
        scale: { x:0.5, y:0.2, z:0.05, }
    });
    /** load deck button */
    const deckButtonLoad = InteractionObject.Create({
        ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_MODIFY,
        target:DECK_INTERACTION_TYPE.LOAD,
        displayText:"LOAD",
        interactionText:"LOAD DECK",
        textScale: { x:0.35, y:1, z:1, },
        parent: deckInfoParent, 
        position: { x:0.28, y:-0.4, z:-0.1 },
        scale: { x:0.5, y:0.2, z:0.05, }
    });

    //### DECK DETAILS
    /** local deck data capsule (overwritten/saved to player's actual decks) */
    var deckLocalContainer = PlayCardDeck.Create({
        key: 'deck-manager',
        type: PlayCardDeck.DECK_TYPE.PLAYER_LOCAL
    });
    
    /** reference to currently targeted deck */
    var deckTargetContainer:PlayCardDeck.PlayCardDeckObject = PlayerLocal.PlayerDecks[0];

    /** selects a new deck, loading it in for modification */
    export function DeckInteractionSelect(index:number) {
        if(isDebugging) console.log(debugTag+"selecting deck, key="+index); 

        Material.setPbrMaterial(deckButtonSelectors[PlayerLocal.GetPlayerDeckIndex()].entityShape, { albedoColor: Color4.White(), });
        //set reference
        PlayerLocal.SetPlayerDeck(index);
        deckTargetContainer = PlayerLocal.PlayerDecks[index];
        Material.setPbrMaterial(deckButtonSelectors[PlayerLocal.GetPlayerDeckIndex()].entityShape, { albedoColor: Color4.Green(), });
    }

    /** called when player interacts with counter buttons */
    export function DeckInteractionSave() {
        if(isDebugging) console.log(debugTag+"saving deck, key="+PlayerLocal.GetPlayerDeckIndex()); 
        //ensure deck has correct number of cards
        if(deckLocalContainer.CardsAll.size() < PlayCardDeck.DECK_SIZE_MIN || deckLocalContainer.CardsAll.size() > PlayCardDeck.DECK_SIZE_MAX) {
            if(isDebugging) console.log(debugTag+"deck not withing card limits, card count="+deckLocalContainer.CardsAll.size()); 
            TextShape.getMutable(deckHeaderText).textColor = Color4.Red();
            return;
        }
        
        //save local deck to target deck
        deckTargetContainer.Clone(deckLocalContainer);
        TextShape.getMutable(deckButtonSelectors[PlayerLocal.GetPlayerDeckIndex()].entityText).text = "DECK "+PlayerLocal.GetPlayerDeckIndex()+" - ("+deckTargetContainer.CardsAll.size()+")";
        TextShape.getMutable(deckHeaderText).textColor = Color4.Black();

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

    //### SELECTED CARD DETAILS
    /** which card slot is currently selected/displayed (-1 for no slot selected) */
    var cardSelection:number = 0;
    /** rarity of selected card */
    var cardRarity:number = 0;
    /** def key of selected card */
    var cardDef:string = "";

    //### DISPLAYED CARD PAGE DETAILS 
    /** currently selected card page */
    var curPage:number = 0;
    /** references to all cards being used to display the current card page */
    var entityGridCards:CardDisplayObject.CardDisplayObject[] = [];
    /** display page current/count text */
    /** display page next */
    /** display page prev */

    /** displays next page of cards */
    export function NextCardDisplayPage() { //interaction object with action="0"
        //inc page
        curPage++;
        
        //check if current page is over page count (can do roll-over to zero or just cap)


        //display page
        UpdateCardDisplayPage();
    }

    /** displays previous page of cards */
    export function PrevCardDisplayPage() { //interaction object with action="1"
        //inc page
        curPage--;
        
        //check if current page is over page count (can do roll-over to zero or just cap)


        //display page
        UpdateCardDisplayPage();
    }

    /** displays the given page of cards */
    export function UpdateCardDisplayPage() {

    }

    //### CARD FILTERING
    const filterParent:Entity = engine.addEntity();
    Transform.create(filterParent, {parent:entityParent});
    /** filter objects - per faction */
    var filterFactionMask:boolean[] = [];
    var filterFactionObj:InteractionObject.InteractionObject[] = [];
    for(let i:number=0; i<CardFactionData.length; i++) {
        filterFactionMask.push(true);
        filterFactionObj.push(InteractionObject.Create({
            ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_FILTER,
            target:FILTER_TYPE.FACTION, 
            action:i,
            displayText:i.toString(),
            interactionText:"toggle "+CardFactionData[i].name,
            parent: filterParent, 
            model: "models/utilities/Menu3D_Button_Square.glb",
            position: { x:-1.1, y:2.2-(i*0.2), z:-0.025 },
            scale: { x:0.1, y:0.1, z:0.04, }
        }));
        Material.setPbrMaterial(filterFactionObj[i].entityShape, {
            albedoColor: Color4.Green(),
        });
    }
    /** filter objects - per type */
    var filterTypeMask:boolean[] = [];
    var filterTypeObj:InteractionObject.InteractionObject[] = [];
    for(let i:number=0; i<CARD_TYPE_STRINGS.length; i++) {
        filterTypeMask.push(true);
        filterTypeObj.push(InteractionObject.Create({
            ownerType: InteractionObject.INTERACTION_TYPE.DECK_MANAGER_FILTER,
            target:FILTER_TYPE.TYPE, 
            action:i,
            displayText:i.toString(),
            interactionText:"toggle "+CARD_TYPE_STRINGS[i],
            parent: filterParent, 
            position: { x:-0.95, y:2-(i*0.2), z:-0.025 },
            scale: { x:0.1, y:0.1, z:0.04, }
        }));
        Material.setPbrMaterial(filterTypeObj[i].entityShape, {
            albedoColor: Color4.Green(),
        });
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
            parent: filterParent, 
            position: { x:-0.675+(i*0.15), y:2.35, z:-0.025 },
            scale: { x:0.1, y:0.1, z:0.04, }
        }));
        Material.setPbrMaterial(filterCostObj[i].entityShape, {
            albedoColor: Color4.Green(),
        });
    }

    /** toggles filter of given type */
    export function ToggleFilter(type:string, index:number) {
        if(isDebugging) console.log(debugTag+"toggling filter tag type="+type+", index="+index);
        switch(type) {
            case 
                FILTER_TYPE.FACTION: filterFactionMask[index] = !filterFactionMask[index]; 
                if(filterFactionMask[index]) Material.setPbrMaterial(filterFactionObj[index].entityShape, { albedoColor: Color4.Green(), });
                else Material.setPbrMaterial(filterFactionObj[index].entityShape, { albedoColor: Color4.Red(), });
            break;
            case 
                FILTER_TYPE.TYPE: filterTypeMask[index] = !filterTypeMask[index]; 
                if(filterTypeMask[index]) Material.setPbrMaterial(filterTypeObj[index].entityShape, { albedoColor: Color4.Green(), });
                else Material.setPbrMaterial(filterTypeObj[index].entityShape, { albedoColor: Color4.Red(), });

            break;
            case 
                FILTER_TYPE.COST: filterCostMask[index] = !filterCostMask[index]; 
                if(filterCostMask[index]) Material.setPbrMaterial(filterCostObj[index].entityShape, { albedoColor: Color4.Green(), });
                else Material.setPbrMaterial(filterCostObj[index].entityShape, { albedoColor: Color4.Red(), });

            break;
        }
        RedrawCardView();
    }


    /** displays a list of cards in the game, based on the current filters/page  */
    function GenerateCardObjects() {
        if(isDebugging) console.log(debugTag+"redrawing card display..."); 
        entityGridCards = [];
        //populate card grid display
        const invTotalX = CARD_SIZE_X * (DISPLAY_GRID_SIZE_X - 1);
        const invTotalY = CARD_SIZE_Y * (DISPLAY_GRID_SIZE_Y - 1);
        for(let y = 0; y < DISPLAY_GRID_SIZE_Y; y++) {
            for(let x = 0; x < DISPLAY_GRID_SIZE_X; x++) {
                //create new card object
                const card = CardDisplayObject.Create({
                    ownerType: CardDisplayObject.CARD_OBJECT_OWNER_TYPE.DECK_MANAGER,
                    slotID: (x + (y*DISPLAY_GRID_SIZE_X)).toString(),
                    def: CardDataRegistry.Instance.GetEntryByPos(0).DataDef, 
                    parent: entityParent,
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

    export function UpdateCardCount() {
        TextShape.getMutable(deckStateText).text = "DECK CARDS "+deckLocalContainer.CardsAll.size()+"/"+PlayCardDeck.DECK_SIZE_MAX;
    }

    /** called when a card is interacted with */
    export function CardInteractionSelect(slotID:string) {
        if(isDebugging) console.log(debugTag+"player interacted with card, key="+slotID); 

        const dataDef = CardData[entityGridCards[Number.parseInt(slotID)].DefIndex];
        //create character display model
        const card = CardSubjectObject.Create({
            key: "tcg-dm",
            type: dataDef.type,
		    model: dataDef.objPath,
            forceRepeat: true,
            parent: entityDisplayPedistalPoint, 
            position: { x:0, y:0, z:0, },
            scale: { x:1, y:1, z:1, },
            rotation: { x:0, y:0, z:0, }
        });
        card.SetAnimation(DISPLAY_CHARACTER_ANIMATION[dataDef.type]);
        //update transform
        const transform = Transform.getOrCreateMutable(entityDisplayPedistalPoint);
        transform.position = DISPLAY_CHARACTER_OFFSET[dataDef.type];
        transform.scale = DISPLAY_CHARACTER_SCALE[dataDef.type];
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

    //ensure display is set as 
    UpdateCardCount();
    DeckInteractionSelect(0);
    OnTriggerExit();
}
//### EVERYTHING BELOW THIS POINT IS JUST TESTING COMMANDS TO ENSURE FUNCTIONALITY
