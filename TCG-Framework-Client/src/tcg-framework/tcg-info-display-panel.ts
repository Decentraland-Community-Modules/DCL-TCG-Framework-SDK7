import { engine, Transform, GltfContainer, Entity, TextShape, TextAlignMode } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { InteractionObject } from "./tcg-interaction-object";

/*      TRADING CARD GAME FRAMEWORK - INFO DISPLAY PANEL

    Displays a panel to help players learn about how to interact with 

    PrimaryAuthors: Jacko
    TeamContact: thecryptotrader69@gmail.com
*/
export module InfoPanel {
    
    /** core display object model location */
    const MODEL_CORE:string = 'models/utilities/Menu3D_Panel_Ornate_Long.glb';
    /** defines all text for the panel */
    const INFO_PANEL_TEXT = [
        {
            HeaderText:"WELCOME",
            ButtonText:"Welcome",
            DescText:"Welcome to the NFT TCG Framework! We're absolutely thrilled to have you here. Before we jump into the game, we've got some handy tips to help you get started. Check them out below:",
        },
        {
            HeaderText:"GENERAL PLAY",
            ButtonText:"General",
            DescText:"With this framework, you can play against other players or AI. To begin a match, just approach the matching arena and hit the Ready button. Afterward, each player takes turns using unit, spell, or terrain cards with the ultimate aim of reducing their opponent's health to 0!",
        },
        {
            HeaderText:"DECK MANAGER",
            ButtonText:"Deck",
            DescText:"The Deck Manager gives you the power to create, store, and modify up to 5 custom decks. When you choose a unit or spell card, you'll find a visual representation of the card below the center panel, along with a comprehensive description of the card and its keywords on the left-hand side.",
        },
        {
            HeaderText:"UNIT CARDS",
            ButtonText:"Units",
            DescText:"Units are categorized into 5 distinct factions, each with their own bonuses and effects. To deploy a unit, simply follow these steps: pick the unit from your hand, select your preferred spot on your side of the arena, and confirm by pressing F. While playing, you can command your unit to attack your opponent by selecting then interacting with them.",
        },
        {
            HeaderText:"SPELL CARDS",
            ButtonText:"Spells",
            DescText:"Spells are versatile cards with multiple uses. They can damage or de-buff enemy units or heal and buff your own units. Like units, spells have a mana cost, shown by the number in the top right-hand corner of the card. They also come with various effects, which are represented by icons on the left-hand side.",
        },
        {
            HeaderText:"KEYWORDS & EFFECTS",
            ButtonText:"Effects",
            DescText:"Effects or keywords can be found on both spell and some unit cards. These keywords are displayed on the left-hand side of the card, and their specific effects are represented by icons on the cards. Each card can have up to three different keywords, and each keyword may have a strength indicated by the letter P and/or a duration denoted by the letter T.",
        }
    ]

    /** main panel frame object */
    const baseInfoPanel:Entity = engine.addEntity();
    Transform.create(baseInfoPanel,{
        parent:undefined,
        position: { x:8, y:0.5, z:8 },
        scale: { x:1, y:1, z:1 },
    });
    GltfContainer.create(baseInfoPanel, {
        src: MODEL_CORE,
        visibleMeshesCollisionMask: undefined,
        invisibleMeshesCollisionMask: undefined
    });
    
    /** panel header */
    const panelHeaderText:Entity = engine.addEntity();
    Transform.create(panelHeaderText,{
        parent:baseInfoPanel,
        position: {x:0, y:1.04, z:-0.01},
        rotation: Quaternion.fromEulerDegrees(0,0,0),
        scale: {x:0.1, y:0.1, z:0.1}
    });
    TextShape.create(panelHeaderText, { 
        text: "SCENE DETAILS",
        textColor: Color4.create(1, 1, 1, 1),
        outlineColor: Color4.Black(),
        outlineWidth: 0.15,
        fontSize: 11.5,
        textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
        textWrapping: false,
        width: 0, height:0
    })
    
    /** content header */
    const contentHeaderText:Entity = engine.addEntity();
    Transform.create(contentHeaderText,{
        parent:baseInfoPanel,
        position: {x:0, y:0.62, z:-0.01},
        rotation: Quaternion.fromEulerDegrees(0,0,0),
        scale: {x:0.1, y:0.1, z:0.1}
    });
    TextShape.create(contentHeaderText, { 
        text: "[CONTENT_HEADER]",
        textColor: Color4.create(1, 1, 1, 1),
        outlineColor: Color4.Black(),
        outlineWidth: 0.15,
        fontSize: 14,
        textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
        textWrapping: false,
        width: 0, height:0
    })

    /** content description */
    const contentDescText:Entity = engine.addEntity();
    Transform.create(contentDescText,{
        parent:baseInfoPanel,
        position: { x:0, y:0.16, z:-0.01 },
        scale: { x:0.1, y:0.1, z:0.1 },
    });
    TextShape.create(contentDescText, { 
        text: "[CONTENT]",
        textColor: Color4.create(1, 1, 1, 1),
        outlineColor: Color4.Black(),
        outlineWidth: 0.15,
        fontSize: 8,
        textAlign:TextAlignMode.TAM_TOP_LEFT,
        textWrapping:true,
        width: 23, height:5
    })
    
    /** info selection buttons */
    const deckInfoButtonSelectors:InteractionObject.InteractionObject[] = [];
    for(let i:number=0; i<INFO_PANEL_TEXT.length; i++) {
        deckInfoButtonSelectors.push(InteractionObject.Create({
            ownerType: InteractionObject.INTERACTION_TYPE.INFO_DISPLAY,
            target: i.toString(),
            interactionText: INFO_PANEL_TEXT[i].ButtonText,
            displayText: INFO_PANEL_TEXT[i].ButtonText,
            textScale: { x:0.19, y:0.6, z:1 },
            textPosition: { x:0, y:0, z:-1 },
            parent: baseInfoPanel,
            position: { x:-1.125+(i*0.45), y:-0.75, z:-0.01 },
            scale: { x:0.42, y:0.16, z:0.01 }
        }));
    }

    /** sets the position of the frame */
    export function SetPosition(position:Vector3){
        Transform.getMutable(baseInfoPanel).position = position;
    }

    /** redraws display showing the  */
    export function SetDisplayContent(index:number){
        TextShape.getMutable(contentHeaderText).text = INFO_PANEL_TEXT[index].HeaderText;
        TextShape.getMutable(contentDescText).text = INFO_PANEL_TEXT[index].DescText;
    }

    //load first entry
    SetDisplayContent(0);
}