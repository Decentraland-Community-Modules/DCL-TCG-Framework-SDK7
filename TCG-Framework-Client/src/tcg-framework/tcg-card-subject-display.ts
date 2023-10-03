import { Entity, GltfContainer, MeshRenderer, TextShape, Transform, engine } from "@dcl/sdk/ecs";
import { Vector3 } from "@dcl/sdk/math";
import { CardDataRegistry } from "./data/tcg-card-registry";
import { CardDataObject } from "./data/tcg-card-data";

/*      TRADING CARD GAME FRAMEWORK - CARD SUBJECT DISPLAY PANEL

    Overhead diplay panel for a units stats

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder), Jacko
    TeamContact: thecryptotrader69@gmail.com
*/
export module CardSubjectDisplayPanel {
    
    /** core display object model location */
    const MODEL_CORE:string = 'models/tcg-framework/card-table/card-subject-display.glb';

    /** card subjext stat display background */
    const cardSubjectDisplayPanel:Entity = engine.addEntity();
    Transform.create(cardSubjectDisplayPanel,{
        parent:undefined,
        scale: { x:0.3, y:0.3, z:0.3,},
    });
    GltfContainer.create(cardSubjectDisplayPanel, {
        src: MODEL_CORE,
        visibleMeshesCollisionMask: undefined,
        invisibleMeshesCollisionMask: undefined
    });
    export function SetPosition(position:Vector3){
        Transform.getMutable(cardSubjectDisplayPanel).position = position;
    }

    /** info attack display*/
    const attackPowerText:Entity = engine.addEntity();
    Transform.create(attackPowerText,{
        parent:cardSubjectDisplayPanel,
        position: { x:-1.0, y:-0.04, z:-0.1,},
        scale: { x:0.3, y:0.3, z:0.3,},
    });
    TextShape.create(attackPowerText, { 
        text: "99",
        fontSize: 16,
    })

    /** info health display*/
    const healthText:Entity = engine.addEntity();
    Transform.create(healthText,{
        parent:cardSubjectDisplayPanel,
        position: { x:0, y:-0.04, z:-0.1,},
        scale: { x:0.3, y:0.3, z:0.3,},
    });
    TextShape.create(healthText, { 
        text: "99",
        fontSize: 16,
    })

    /** info defence display*/
    const defenceText:Entity = engine.addEntity();
    Transform.create(defenceText,{
        parent:cardSubjectDisplayPanel,
        position: { x:1, y:-0.04, z:-0.1,},
        scale: { x:0.3, y:0.3, z:0.3,},
    });
    TextShape.create(defenceText, { 
        text: "99",
        fontSize: 16,
    })

    /** status effect icons */
    const entityEffectIcons:Entity[] = [];
    for(let i = 0; i < 6; i++)
    {
        entityEffectIcons[i] = engine.addEntity();
        Transform.create(entityEffectIcons[i],{
            parent:cardSubjectDisplayPanel,
            position: { x:-1.02+(i*0.41), y:-0.7, z:-0.1,},
            scale: { x:0.37, y:0.37, z:0.3,},
        });
        MeshRenderer.setPlane(entityEffectIcons[i])
        
    }
    /** update stat dislay*/
    
    export function DisplayCardStats(cardData:CardDataObject){
        //halt if no character attribute
        if(cardData.attributeCharacter == undefined) return;
        //update stats text
        TextShape.getMutable(attackPowerText).text = cardData.attributeCharacter.unitAttack.toString();
        TextShape.getMutable(healthText).text = cardData.attributeCharacter.unitHealth.toString();
        TextShape.getMutable(defenceText).text = cardData.attributeCharacter.unitArmour.toString();
        for(let i = 0; i < 6; i++){
            
        }
    }
}