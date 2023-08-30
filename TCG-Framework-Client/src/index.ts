import { Player } from "./tcg-framework/config/tcg-player";
import { DeckManager } from "./tcg-framework/tcg-deck-manager";
import { InteractionManager } from "./tcg-framework/tcg-interaction-manager";
import { Table } from "./tcg-framework/tcg-table";

/**
 * main function that initializes scene and prepares it for play
 */
export function main() 
{
	//load player
	Player.LoadPlayerData();

	//create deck manager
	DeckManager.SetPosition({ x:8, y:0, z:8 });

	//create card table
	Table.Create({
		tableID:0,
        parent: undefined,
		position: { x:24, y:0, z:24 },
		rotation: { x:0, y:90, z:0 }
	});/**/

	//enable processing
	InteractionManager.ProcessingStart();
}