import { InputAction, PointerEventType, engine, inputSystem } from "@dcl/sdk/ecs";
import { TableCardSlot } from "./tcg-table-card-slot";
import { CardDisplayObject } from "./tcg-card-object";
import { DeckManager } from "./tcg-deck-manager";
import { InteractionObject } from "./tcg-interaction-object";
import { Table } from "./tcg-table";
import { PlayerLocal } from "./config/tcg-player-local";
import { TableTeam } from "./tcg-table-team";
import { CARD_OBJECT_OWNER_TYPE, TABLE_GAME_STATE } from "./config/tcg-config";
import { InfoPanel } from "./tcg-info-display-panel";

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
                if(isDebugging) console.log(debugTag+"interaction object, type="+component.ownerType.toString()+", target="+component.target+", action="+component.action);
                
                //process interaction based on ownership type
                switch(component.ownerType) {
                    //deck manager filters
                    case InteractionObject.INTERACTION_TYPE.DECK_MANAGER_FILTER:
                        DeckManager.ToggleFilter(component.target, component.action);
                    break;
                    //deck manager controls (load/save deck, model anims)
                    case InteractionObject.INTERACTION_TYPE.DECK_MANAGER_MODIFY:
                        //process interaction type type
                        switch(component.target) {
                            case DeckManager.DECK_INTERACTION_TYPE.SELECT:
                                DeckManager.DeckInteractionSelect(component.action);
                            break;
                            case DeckManager.DECK_INTERACTION_TYPE.SAVE:
                                DeckManager.DeckInteractionSave();
                            break;
                            case DeckManager.DECK_INTERACTION_TYPE.LOAD:
                                DeckManager.DeckInteractionLoad();
                            break;
                        }
                    break;
                    //deck manager paging controls
                    case InteractionObject.INTERACTION_TYPE.DECK_MANAGER_PAGING:
                        //process interaction type type
                        switch(component.target) {
                            case "0":
                                DeckManager.NextCardDisplayPage();
                            break;
                            case "1":
                                DeckManager.PrevCardDisplayPage();
                            break;
                        }
                    break;
                    //card table controls
                    case InteractionObject.INTERACTION_TYPE.GAME_TABLE:
                        //split given key
                        var split:string[] = component.target.split('-');
                        //get targeted table
                        var table = Table.GetByKey(split[0]);
                        if(table == undefined) {
                            if(isDebugging) console.log(debugTag+"<WARNING> targeted table="+split[0]+" does not exist!");
                            return;            
                        }
                        if(isDebugging) console.log(debugTag+"processing action="+component.action+" on table="+table.TableID+", with state="+table.CurState);
            
                        //process based on current state
                        switch(table.CurState) {
                            case TABLE_GAME_STATE.IDLE:
                                switch(component.action) {
                                    case TableTeam.LOBBY_BUTTONS.TEAM_JOIN:
                                        table.LocalAddPlayerToTeam(parseInt(split[1]), PlayerLocal.DisplayName());
                                    break;
                                    case TableTeam.LOBBY_BUTTONS.TEAM_LEAVE:
                                        table.LocalRemovePlayerFromTeam(parseInt(split[1]));
                                    break;
                                    case TableTeam.LOBBY_BUTTONS.TEAM_READY:
                                        table.LocalSetPlayerReadyState(parseInt(split[1]), true);
                                    break;
                                    case TableTeam.LOBBY_BUTTONS.TEAM_UNREADY:
                                        table.LocalSetPlayerReadyState(parseInt(split[1]), false);
                                    break;
                                }
                            break;
                            case TABLE_GAME_STATE.ACTIVE:
                                switch(component.action) {
                                    case TableTeam.LOBBY_BUTTONS.GAME_END_TURN:
                                        table.LocalNextTurn();
                                    break;
                                    case TableTeam.LOBBY_BUTTONS.TEAM_TARGET:
                                        table.InteractionTeamSelection(parseInt(split[1]));
                                    break;
                                    case TableTeam.LOBBY_BUTTONS.GAME_LEAVE:
                                        table.LocalForfeitGame();
                                    break;
                                }
                            break;
                            case TABLE_GAME_STATE.OVER:
                                
                            break;
                        }
                    break;
                    //card info display
                    case InteractionObject.INTERACTION_TYPE.INFO_DISPLAY:
                        InfoPanel.SetDisplayContent(Number.parseInt(component.target))
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
                    case CARD_OBJECT_OWNER_TYPE.GAME_TABLE_HAND:
                        //get table & confirm existance
                        const table = Table.GetByKey(component.tableID);
                        if(!table) { if(isDebugging) console.log(debugTag+"<ERROR> interaction attempt on non-existant table!"); return; }
                        //pass interaction call to table
                        table.InteractionCardSelection(parseInt(component.teamID), component.slotID);
                    break;
                    //deck manager
                    case CARD_OBJECT_OWNER_TYPE.DECK_MANAGER:
                        //process request type
                        switch(component.request) {
                            case CardDisplayObject.CARD_OBJECT_INTERACTION_TYPE.INTERACT:
                                DeckManager.InteractionCard(component.slotID);
                            break;
                            case CardDisplayObject.CARD_OBJECT_INTERACTION_TYPE.COUNTER_UP:
                                DeckManager.InteractionCounterButton(component.slotID, 1);
                            break;
                            case CardDisplayObject.CARD_OBJECT_INTERACTION_TYPE.COUNTER_DOWN:
                                DeckManager.InteractionCounterButton(component.slotID, -1);
                            break;
                        }
                    break;
                    //loose display card
                    case CARD_OBJECT_OWNER_TYPE.SHOWCASE:
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
                    case CARD_OBJECT_OWNER_TYPE.GAME_TABLE_HAND:
                        //get table & confirm existance
                        const table = Table.GetByKey(component.tableID);
                        if(!table) { if(isDebugging) console.log(debugTag+"<ERROR> interaction attempt on non-existant table!"); return; }
                        //pass interaction call to table
                        table.InteractionAttemptActivation();
                    break;
                    //deck manager
                    case CARD_OBJECT_OWNER_TYPE.DECK_MANAGER:
                    break;
                    //loose display card
                    case CARD_OBJECT_OWNER_TYPE.SHOWCASE:
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
            if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)
            || inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN, entity)) {
                //get card component
                const component = TableCardSlot.TableCardSlotComponent.get(entity);
                if(isDebugging) console.log(debugTag+"table card slot selected, table="+component.tableID+", team="+component.teamID+", slot="+component.slotID);
                const table = Table.GetByKey(component.tableID.toString());
                if(!table) { if(isDebugging) console.log(debugTag+"<ERROR> interaction attempt on non-existant table!"); return; }
                table.InteractionSlotSelection(component.teamID, component.slotID);
            }
            //interaction: secondary key -> attempt action
            if (inputSystem.isTriggered(InputAction.IA_SECONDARY, PointerEventType.PET_DOWN, entity)) {
                //get card component
                const component = TableCardSlot.TableCardSlotComponent.get(entity);
                if(isDebugging) console.log(debugTag+"table card slot activated, table="+component.tableID+", team="+component.teamID+", slot="+component.slotID);
                const table = Table.GetByKey(component.tableID.toString());
                if(!table) { if(isDebugging) console.log(debugTag+"<ERROR> interaction attempt on non-existant table!"); return; }
                table.InteractionAttemptActivation();
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