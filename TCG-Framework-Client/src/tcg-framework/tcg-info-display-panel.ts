import { engine, Transform, GltfContainer, ColliderLayer, Entity, TextShape, Font, TextAlignMode, Material } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { InteractionObject } from "./tcg-interaction-object";

/*      TRADING CARD GAME FRAMEWORK - INFO DISPLAY PANEL

    Displays a panel to help players learn about how to interact with 

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder), Jacko
    TeamContact: thecryptotrader69@gmail.com
*/
export module InfoPanel {
    
    /** core display object model location */
    const MODEL_CORE:string = 'models/utilities/Menu3D_Panel_Long.glb';
    const BUTTON_TEXT:string[] = [
        "General",
        "Units",
        "Spells",
        "Effects",
        "Deck",
    ];
    /** */
    const HEADER_TEXT:string[] = [
        "General Play",
        "Unit Cards",
        "Spell Cards",
        "Effects/Keywords",
        "Deck Manager",
    ];
    /** */
    const DESC_TEXT:string[] = [
        "With this framework, you can play against other players or AI. To begin a match, just approach the matching arena and hit the Ready button. Afterward, each player takes turns using unit, spell, or terrain cards with the ultimate aim of reducing their opponent's health to 0!",
        "Units are categorized into 5 distinct factions, each with their own bonuses and effects. To deploy a unit, simply follow these steps: pick the unit from your hand, select your preferred spot on your side of the arena, and confirm by pressing F. While playing, you can command your unit to attack your opponent by selecting then interacting with them.",
        "Spells are versatile cards with multiple uses. They can damage or de-buff enemy units or heal and buff your own units. Like units, spells have a mana cost, shown by the number in the top right-hand corner of the card. They also come with various effects, which are represented by icons on the left-hand side.",
        "Effects or keywords can be found on both spell and some unit cards. These keywords are displayed on the left-hand side of the card, and their specific effects are represented by icons on the cards. Each card can have up to three different keywords, and each keyword may have a strength indicated by the letter P and/or a duration denoted by the letter T.",
        "The Deck Manager gives you the power to create, store, and modify up to 5 custom decks. When you choose a unit or spell card, you'll find a visual representation of the card below the center panel, along with a comprehensive description of the card and its keywords on the left-hand side.",
    ];

    /** deck header background */
    const baseInfoPanel:Entity = engine.addEntity();
    Transform.create(baseInfoPanel,{
        parent:undefined,
        scale: { x:1, y:1, z:1,},
    });
    GltfContainer.create(baseInfoPanel, {
        src: MODEL_CORE,
        visibleMeshesCollisionMask: undefined,
        invisibleMeshesCollisionMask: undefined
    });
    export function SetPosition(position:Vector3){
        Transform.getMutable(baseInfoPanel).position = position;
    }
    
    /** info header background */
    const headerText:Entity = engine.addEntity();
    Transform.create(headerText,{
        parent:baseInfoPanel,
        position: { x:0, y:0.5, z:-0.01,},
        scale: { x:0.1, y:0.1, z:0.1,},
    });
    TextShape.create(headerText, { 
        text: "WELCOME!",
        fontSize: 16,
    })

    /** info description background */
    const descText:Entity = engine.addEntity();
    Transform.create(descText,{
        parent:baseInfoPanel,
        position: { x:0, y:0, z:-0.01,},
        scale: { x:0.1, y:0.1, z:0.1,},
    });
    TextShape.create(descText, { 
        text: "Welcome to the NFT TCG Framework! We're absolutely thrilled to have you here. Before we jump into the game, we've got some handy tips to help you get started. Check them out below:",
        fontSize: 8,
        textColor: Color4.White(), 
        textAlign:TextAlignMode.TAM_MIDDLE_CENTER,
        textWrapping:true,
        width: 23, height:5
    })
    
    /** info selection buttons */
    const deckInfoButtonSelectors:InteractionObject.InteractionObject[] = [];
    for(let i:number=0; i<BUTTON_TEXT.length; i++) {
        deckInfoButtonSelectors.push(InteractionObject.Create({
            ownerType: InteractionObject.INTERACTION_TYPE.INFO_DISPLAY,
            target: i.toString(),
            interactionText: BUTTON_TEXT[i],
            displayText: BUTTON_TEXT[i],
            textScale: { x:0.15, y:0.6, z:1 },
            textPosition: { x:0, y:0, z:-1 },
            parent: baseInfoPanel,
            position: { x:-0.9+(i*0.45), y:-0.6, z:-0.01 },
            scale: { x:0.41, y:0.13, z:0.01 }
        }));
    }

    export function SetDisplayContent(index:number){
        TextShape.getMutable(headerText).text = HEADER_TEXT[index];
        TextShape.getMutable(descText).text = DESC_TEXT[index];
    }
}