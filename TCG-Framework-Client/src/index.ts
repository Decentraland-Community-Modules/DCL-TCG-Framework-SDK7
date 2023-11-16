import { Entity, GltfContainer, TextShape, Transform, engine, executeTask } from "@dcl/sdk/ecs";
import { TABLE_TEAM_TYPE } from "./tcg-framework/config/tcg-config";
import { PlayerLocal } from "./tcg-framework/config/tcg-player-local";
import { CardDataRegistry } from "./tcg-framework/data/tcg-card-registry";
import { DeckManager } from "./tcg-framework/tcg-deck-manager";
import { InteractionManager } from "./tcg-framework/tcg-interaction-manager";
import { Table } from "./tcg-framework/tcg-table";
import { InfoPanel } from "./tcg-framework/tcg-info-display-panel";
import { Networking } from "./tcg-framework/config/tcg-networking";
import { Color4, Quaternion } from "@dcl/sdk/math";
import { LevelUnlockRegistry } from "./tcg-framework/data/tcg-level-unlocks-registry";
import { ContractUnlockRegistry } from "./tcg-framework/data/tcg-contract-unlocks-registry";

/*      TRADING CARD GAME - DEMO SCENE
  	this scene is meant as a demo to display how to set up a trading card game using the NFT TCG Framework. 

	TODO:
		- over-time effects don't kill a unit, check for death after effects have proc'd
		- create keywords/effects for each golem (allows better testing) 
		- default decks can have locked cards: make a split in the deck manager where players can pick between
		preset or custom decks

	STRETCH:
		- demo opensea use for NFT ownership (requires opensea API keys)
		- toggle for locking deck inputs based on a faction (ex: fire cards can only be used in fire decks)
		- add in-depth card display for showing more details (about factions, keywords, card types)
 */
export function main() {
    //main stage object
    const baseInfoPanel:Entity = engine.addEntity();
    Transform.create(baseInfoPanel,{
        parent:undefined,
        position: { x:0, y:0, z:0 },
        scale: { x:1, y:1, z:1 },
    });
    GltfContainer.create(baseInfoPanel, {
        src: "models/tcg-framework/stage-terrain.glb",
        visibleMeshesCollisionMask: undefined,
        invisibleMeshesCollisionMask: undefined
    });

	//prepare tcg framework
	executeTask(tcgSetUp);
}
	
/** routine for setting up the trading card game framework (loading player data/decks/level, preparing deck manager & tables) */
async function tcgSetUp() {
	try {
		//load player
		await PlayerLocal.LoadPlayerData();

		//displays
		//	info panel
		InfoPanel.SetPosition({ x:28, y:1.5, z:33 });
		//	unlocks
		LevelUnlockRegistry.Instance.SetPosition({ x:24.3, y:1.5, z:31.5 });
		LevelUnlockRegistry.Instance.SetRotation({ x:0, y:-45, z:0 });
		ContractUnlockRegistry.Instance.SetPosition({ x:31.7, y:1.5, z:31.5 });
		ContractUnlockRegistry.Instance.SetRotation({ x:0, y:45, z:0 });

		//create deck managers
		//	left
		DeckManager.Create({ 
			key:"dm-0",
			parent: undefined,
			position: { x:10, y:0, z:28 },
			rotation: { x:0, y:270, z:0 } 
		});
		//	right
		DeckManager.Create({ 
			key:"dm-1",
			parent: undefined,
			position: { x:46, y:0, z:28 },
			rotation: { x:0, y:90, z:0 } 
		});
	
		//PVE TABLES
		//	pve local table
		const preview_0 = engine.addEntity();
		Transform.create(preview_0, { position: {x:24,y:2,z:14}, scale: {x:0.25,y:0.25,z:0.25}, rotation: Quaternion.fromEulerDegrees(0,270,0) });
		TextShape.create(preview_0, { text:"LOCAL TABLE (PVE)", fontSize: 18, outlineWidth:0.1, outlineColor:Color4.Black(), textColor:Color4.Red() });
		Table.Create({
			//indexing
			tableID: 0,
			//config
			networkingType: Networking.TABLE_CONNECTIVITY_TYPE.LOCAL,
			teamTypes: [TABLE_TEAM_TYPE.HUMAN,TABLE_TEAM_TYPE.AI],
			//transform
			parent: undefined,
			position: { x:14, y:0, z:14 },
			rotation: { x:0, y:0, z:0 }
		});
		//	pve peer-to-peer table
		const preview_1 = engine.addEntity();
		Transform.create(preview_1, { position: {x:32,y:2,z:14}, scale: {x:0.25,y:0.25,z:0.25}, rotation: Quaternion.fromEulerDegrees(0,90,0) });
		TextShape.create(preview_1, { text:"PEER TABLE (PVE)", fontSize: 18, outlineWidth:0.1, outlineColor:Color4.Black(), textColor:Color4.Red() });
		Table.Create({
			//indexing
			tableID: 1,
			//config
			networkingType: Networking.TABLE_CONNECTIVITY_TYPE.PEER_TO_PEER,
			teamTypes: [TABLE_TEAM_TYPE.HUMAN,TABLE_TEAM_TYPE.AI],
			//transform
			parent: undefined,
			position: { x:42, y:0, z:14 },
			rotation: { x:0, y:180, z:0 }
		});
		//PVP TABLES
		//	pvp peer-to-peer table
		const preview_3 = engine.addEntity();
		Transform.create(preview_3, { position: {x:24,y:2,z:42}, scale: {x:0.25,y:0.25,z:0.25}, rotation: Quaternion.fromEulerDegrees(0,270,0) });
		TextShape.create(preview_3, { text:"PEER TABLE (PVP)", fontSize: 18, outlineWidth:0.1, outlineColor:Color4.Black(), textColor:Color4.Red() });
		Table.Create({
			//indexing
			tableID: 3,
			//config
			networkingType: Networking.TABLE_CONNECTIVITY_TYPE.PEER_TO_PEER,
			teamTypes: [TABLE_TEAM_TYPE.HUMAN,TABLE_TEAM_TYPE.HUMAN],
			//transform
			parent: undefined,
			position: { x:14, y:0, z:42 },
			rotation: { x:0, y:0, z:0 }
		});
		//	pvp server table
		const preview_4 = engine.addEntity();
		Transform.create(preview_4, { position: {x:32,y:2,z:42}, scale: {x:0.25,y:0.25,z:0.25}, rotation: Quaternion.fromEulerDegrees(0,90,0) });
		TextShape.create(preview_4, { text:"SERVER TABLE (PVP)", fontSize: 18, outlineWidth:0.1, outlineColor:Color4.Black(), textColor:Color4.Red() });
		Table.Create({
			//indexing
			tableID: 4,
			//config
			networkingType: Networking.TABLE_CONNECTIVITY_TYPE.SERVER_STRICT,
			teamTypes: [TABLE_TEAM_TYPE.HUMAN,TABLE_TEAM_TYPE.HUMAN],
			//transform
			parent: undefined,
			position: { x:42, y:0, z:42 },
			rotation: { x:0, y:180, z:0 }
		});
	
		//enable processing
		InteractionManager.ProcessingStart();
		
		//start prewarm routine
		CardDataRegistry.Instance.PrewarmAssetStart();
	} catch (error) {
	  console.error(error);
	}
}