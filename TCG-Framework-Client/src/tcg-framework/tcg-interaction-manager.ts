import { InputAction, PointerEventType, engine, inputSystem } from "@dcl/sdk/ecs";
import { TableCardSlot } from "./tcg-table-card-slot";
import { CardDisplayObject } from "./tcg-card-object";
import { DeckManager } from "./tcg-deck-manager";
import { InteractionObject } from "./tcg-interaction-object";
import { Table } from "./tcg-table";
import { Player } from "./config/tcg-player";

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
    
    /** click events, general interaction objects */
    function ProcessClickInteractionObject() {
        const activatedEntites = engine.getEntitiesWith(InteractionObject.InteractionObjectComponent);
        for (const [entity] of activatedEntites) {
            //interaction: primary key => un/select slot
            if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
                //get card component
                const component = InteractionObject.InteractionObjectComponent.get(entity);
                if(isDebugging) console.log(debugTag+"interaction object, type="+component.ownerType.toString()+", primary="+component.actionPrimary+", secondary="+component.actionSecondary);
                
                //process interaction based on ownership type
                switch(component.ownerType) {
                    //deck manager -> filter toggles
                    case InteractionObject.INTERACTION_TYPE.DECK_MANAGER_FILTER:
                        DeckManager.ToggleFilter(component.actionPrimary, component.actionSecondary);
                    break;
                    //deck manager -> controls (load/save deck, model anims)
                    case InteractionObject.INTERACTION_TYPE.DECK_MANAGER_MODIFY:
                        //process interaction type type
                        switch(component.actionPrimary) {
                            case DeckManager.DECK_INTERACTION_TYPE.SELECT:
                                DeckManager.DeckInteractionSelect(component.actionSecondary);
                            break;
                            case DeckManager.DECK_INTERACTION_TYPE.SAVE:
                                DeckManager.DeckInteractionSave();
                            break;
                            case DeckManager.DECK_INTERACTION_TYPE.LOAD:
                                DeckManager.DeckInteractionLoad();
                            break;
                        }
                    break;
                    //card table -> controls (join/leave game)
                    case InteractionObject.INTERACTION_TYPE.GAME_TABLE:
                        //get targeted table
                        const table = Table.GetByKey(component.actionPrimary.toString());
                        if(table == undefined) {
                            if(isDebugging) console.log(debugTag+"<WARNING> targeted table="+component.actionPrimary+" does not exist!");
                            return;            
                        }
                        //process based on current state
                            switch(table.CurState) {
                                case Table.LOBBY_STATE.IDLE:
                                    switch(component.actionSecondary) {
                                        case Table.LOBBY_BUTTONS.JOIN:
                                            table.AddPlayerToTeam(Player.DisplayName());
                                        break;
                                        case Table.LOBBY_BUTTONS.LEAVE:
                                            table.RemovePlayerFromTeam(Player.DisplayName());
                                        break;
                                        case Table.LOBBY_BUTTONS.START:
                                            table.StartGame();
                                        break;
                                    }
                                break;
                                case Table.LOBBY_STATE.ACTIVE:
                                    switch(component.actionSecondary) {
                                        case Table.LOBBY_BUTTONS.END_TURN:
                                            table.NextTurn();
                                        break;
                                    }
                                break;
                                case Table.LOBBY_STATE.OVER:
                                    
                                break;
                            }
                    break;
                }
            }
        }
    }

    /** click events, card display objects */
    function ProcessClickCardDisplayObject() {
        const activatedEntites = engine.getEntitiesWith(CardDisplayObject.CardObjectComponent);
        for (const [entity] of activatedEntites) {
            //interaction: primary key -> attempt select
            if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)
                || inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN, entity)) {
                //get card component
                const component = CardDisplayObject.CardObjectComponent.get(entity);
                if(isDebugging) console.log(debugTag+"card display object selected, owner="+component.ownerType.toString()
                    +", table="+component.tableID+", team="+component.teamID+", slot="+component.slotID);
                
                //process interaction based on ownership type
                switch(component.ownerType) {
                    //card table team's hand 
                    case CardDisplayObject.CARD_OBJECT_OWNER_TYPE.GAME_TABLE_HAND:
                        //get table & confirm existance
                        const table = Table.GetByKey(component.tableID);
                        if(!table) { if(isDebugging) console.log(debugTag+"<ERROR> interaction attempt on non-existant table!"); return; }
                        //pass interaction call to table
                        table.InteractionCardObjectSelection(parseInt(component.teamID), component.slotID);
                    break;
                    //deck manager
                    case CardDisplayObject.CARD_OBJECT_OWNER_TYPE.DECK_MANAGER:
                        //process request type
                        switch(component.request) {
                            case CardDisplayObject.CARD_OBJECT_INTERACTION_TYPE.INTERACT:
                                DeckManager.CardInteractionSelect(component.slotID);
                            break;
                            case CardDisplayObject.CARD_OBJECT_INTERACTION_TYPE.COUNTER_UP:
                                DeckManager.CardInteractionCounterButton(component.slotID, 1);
                            break;
                            case CardDisplayObject.CARD_OBJECT_INTERACTION_TYPE.COUNTER_DOWN:
                                DeckManager.CardInteractionCounterButton(component.slotID, -1);
                            break;
                        }
                    break;
                    //loose display card
                    case CardDisplayObject.CARD_OBJECT_OWNER_TYPE.SHOWCASE:
                    break;
                }
            }
            //interaction: secondary key -> attempt action
            if (inputSystem.isTriggered(InputAction.IA_SECONDARY, PointerEventType.PET_DOWN, entity)) {
                //get card component
                const component = CardDisplayObject.CardObjectComponent.get(entity);
                if(isDebugging) console.log(debugTag+"card display object activated, owner="+component.ownerType.toString()
                    +", table="+component.tableID+", team="+component.teamID+", slot="+component.slotID);
                
                //process interaction based on ownership type
                switch(component.ownerType) {
                    //card table team's hand 
                    case CardDisplayObject.CARD_OBJECT_OWNER_TYPE.GAME_TABLE_HAND:
                        //get table & confirm existance
                        const table = Table.GetByKey(component.tableID);
                        if(!table) { if(isDebugging) console.log(debugTag+"<ERROR> interaction attempt on non-existant table!"); return; }
                        //pass interaction call to table
                        table.InteractionCardObjectActivate(parseInt(component.teamID), component.slotID);
                    break;
                    //deck manager
                    case CardDisplayObject.CARD_OBJECT_OWNER_TYPE.DECK_MANAGER:
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
                const table = Table.GetByKey(component.tableID);
                if(!table) { if(isDebugging) console.log(debugTag+"<ERROR> interaction attempt on non-existant table!"); return; }
                table.InteractionCardSlot(parseInt(component.teamID), parseInt(component.slotID));
            }
        }
    }

    /** starts all click event processing */
    export function ProcessingStart() {
        engine.addSystem(ProcessClickInteractionObject);
        engine.addSystem(ProcessClickCardDisplayObject);
        engine.addSystem(ProcessClickTableCardSlots);
    }

    /** stops all click event processing */
    export function ProcessingStop() {
        engine.removeSystem(ProcessClickInteractionObject);
        engine.removeSystem(ProcessClickCardDisplayObject);
        engine.removeSystem(ProcessClickTableCardSlots);
    }
}