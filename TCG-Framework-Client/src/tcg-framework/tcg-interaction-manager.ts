import { InputAction, PointerEventType, engine, inputSystem } from "@dcl/sdk/ecs";
import { TableCardSlot } from "./tcg-table-card-slot";

/*      TRADING CARD GAME - INTERACTION MANAGER
    used to process all interactions with tcg tables/card slots

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
module InteractionManager {
    
    /** add system for processing all on-click events,  */
    engine.addSystem(() => {
        const activatedEntites = engine.getEntitiesWith(TableCardSlot.TableCardSlotComponent);
        for (const [entity] of activatedEntites) {
            if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
                //get card component
                const component = TableCardSlot.TableCardSlotComponent.get(entity);
                console.log("card clicked: table="+component.tableID+", team="+component.teamID+", slot="+component.slotID);
            }
        }
    });


}