import { InputAction, PointerEventType, engine, inputSystem } from "@dcl/sdk/ecs";
import { TableCardSlot } from "./tcg-table-card-slot";
import { CardDisplayObject } from "./tcg-card-object";
import { DeckManager } from "./tcg-deck-manager";

/*      TRADING CARD GAME - INTERACTION MANAGER
    used to process all interactions with tcg tables/card slots

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module InteractionManager {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Interaction: ";
    
    /** click events, card slot objects */
    function ProcessClickCardDisplayObject() {
        const activatedEntites = engine.getEntitiesWith(CardDisplayObject.CardObjectComponent);
        for (const [entity] of activatedEntites) {
            //interaction: primary key => un/select slot
            if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
                //get card component
                const component = CardDisplayObject.CardObjectComponent.get(entity);
                if(isDebugging) console.log(debugTag+"card display object, owner="+component.ownerType.toString()+", table="+component.tableID+", team="+component.teamID+", slot="+component.slotID);
                
                //process interaction based on ownership type
                switch(component.ownerType) {
                    //card table
                    case CardDisplayObject.CARD_OBJECT_OWNER_TYPE.GAME_TABLE:
                        break;
                    //deck manager
                    case CardDisplayObject.CARD_OBJECT_OWNER_TYPE.DECK_MANAGER:
                        DeckManager.CardInteraction(component.slotID);
                        break;
                    //loose display card
                    case CardDisplayObject.CARD_OBJECT_OWNER_TYPE.SHOWCASE:
                        break;
                }
            }
        }
    }
    
    /** click events, card slot objects */
    function ProcessClickTableCardSlots() {
        const activatedEntites = engine.getEntitiesWith(TableCardSlot.TableCardSlotComponent);
        for (const [entity] of activatedEntites) {
            //interaction: primary key => un/select slot
            if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
                //get card component
                const component = TableCardSlot.TableCardSlotComponent.get(entity);
                if(isDebugging) console.log(debugTag+"table card slot, table="+component.tableID+", team="+component.teamID+", slot="+component.slotID);
            }
        }
    }

    /** starts all click event processing */
    export function ProcessingStart() {
        engine.addSystem(ProcessClickCardDisplayObject);
        engine.addSystem(ProcessClickTableCardSlots);
    }

    /** stops all click event processing */
    export function ProcessingStop() {
        engine.removeSystem(ProcessClickCardDisplayObject);
        engine.removeSystem(ProcessClickTableCardSlots);
    }
}