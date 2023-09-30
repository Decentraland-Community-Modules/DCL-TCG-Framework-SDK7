import { executeTask } from "@dcl/sdk/ecs";
import { TABLE_TEAM_TYPE } from "./tcg-framework/config/tcg-config";
import { PlayerLocal } from "./tcg-framework/config/tcg-player-local";
import { CardDataRegistry } from "./tcg-framework/data/tcg-card-registry";
import { NFTLinkageRegistry } from "./tcg-framework/data/tcg-nft-linkage-registry";
import { DeckManager } from "./tcg-framework/tcg-deck-manager";
import { InteractionManager } from "./tcg-framework/tcg-interaction-manager";
import { Table } from "./tcg-framework/tcg-table";
import { InfoPanel } from "./tcg-framework/tcg-info-display-panel";

/**
	TODO:
	- clean-up team stats when a the game ends
	- NFT ownership checks
	- dynamic card count limiting
	- modify ai to play spells
	- friendly spells cause flinch atm, they should not
	- timed/DOT effect processing (fire, acid, etc.)
	- unit stats display rework (thinking base-plates or something)
	- lock controls from players when an attack/spell is on-going to halt the possibility of animators getting scuffed
*/

/**
 * main function that initializes scene and prepares it for play
 */
export function main() 
{
	//load player
	PlayerLocal.LoadPlayerData();

	//create info panel
	InfoPanel.SetPosition({ x:24, y:2, z:8 });

	//create deck managers
	//	left
	DeckManager.Create({ 
		key:"dm-0",
        parent: undefined,
		position: { x:2, y:0, z:6 },
		rotation: { x:0, y:270, z:0 } 
	});
	//	right
	DeckManager.Create({ 
		key:"dm-1",
        parent: undefined,
		position: { x:46, y:0, z:6 },
		rotation: { x:0, y:90, z:0 } 
	});

	//create card tables
	//	peer to peer
	Table.Create({
		tableID:0,
		teamTypes: [TABLE_TEAM_TYPE.HUMAN,TABLE_TEAM_TYPE.HUMAN],
        parent: undefined,
		position: { x:14, y:0, z:24 },
		rotation: { x:0, y:90, z:0 }
	});
	//	ai
	Table.Create({
		tableID:1,
		teamTypes: [TABLE_TEAM_TYPE.HUMAN,TABLE_TEAM_TYPE.AI],
        parent: undefined,
		position: { x:34, y:0, z:24 },
		rotation: { x:0, y:90, z:0 }
	});

	//enable processing
	InteractionManager.ProcessingStart();
	
	//start prewarm routine
    CardDataRegistry.Instance.PrewarmAssetStart();
}