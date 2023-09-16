import { Entity, GltfContainer, Transform, engine } from "@dcl/sdk/ecs";
import { TABLE_TEAM_TYPE } from "./tcg-framework/config/tcg-config";
import { PlayerLocal } from "./tcg-framework/config/tcg-player-local";
import { CardDataRegistry } from "./tcg-framework/data/tcg-card-registry";
import { DeckManager } from "./tcg-framework/tcg-deck-manager";
import { InteractionManager } from "./tcg-framework/tcg-interaction-manager";
import { Table } from "./tcg-framework/tcg-table";
import { InteractionObject } from "./tcg-framework/tcg-interaction-object";

/**
 * main function that initializes scene and prepares it for play
 */
export function main() 
{
	/*const test:Entity = engine.addEntity();
	Transform.create(test, { 
		position:{x:0,y:1,z:1},
		scale:{x:0.2,y:0.2,z:0.2},
	});
	GltfContainer.createOrReplace(test, {
		src: "models/tcg-framework/menu-buttons/button-oct-dynamic.glb",
		visibleMeshesCollisionMask: undefined,
		invisibleMeshesCollisionMask: undefined
	});*/

	//load player
	PlayerLocal.LoadPlayerData();

	//create deck manager
	DeckManager.SetPosition({ x:24, y:0, z:6 });

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