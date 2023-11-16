import { List } from '../../utilities/collections';
import { CARD_UNLOCK_TYPE, CardDataRegistry } from './tcg-card-registry';
import { ColliderLayer, Entity, GltfContainer, TextAlignMode, TextShape, Transform, engine } from '@dcl/sdk/ecs';
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math';
import { LevelUnlockData, LevelUnlockDataObject } from './tcg-level-unlocks-data';

/*      TRADING CARD GAME - LEVEL UNLOCKS REGISTRY

    registry containing entries for all levels that unlock cards

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/

/* linkage for a single level unlock's data in the game */
export class LevelUnlockEntry {
    //level required to unlock
    private level:number; 
    public get Level() { return this.level; }
    //level unlock's data position
    private position:number;
    public get Position():number { return this.Position; }
    //returns the card's data component
    public get DataDef():LevelUnlockDataObject { return LevelUnlockData[this.position]; }
    
    //when true, nft belonging to contract is owned by the local player/has access to provided cards
    public IsOwned:boolean = false;

    /** prepares entry for use */
    constructor(pos:number, level:number) {
        this.position = pos;
        this.level = level;
    }
}
/*  manages entries for all level unlockables */
export class LevelUnlockRegistry {
    /** when true debug logs are generated (toggle off when you deploy) */
    static IsDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    static debugTag:string = "TCG Level Unlock Registry: ";

    /** represents the current load-state of the module, when true system is still processing */
    private isLoading:boolean = false;
    public get IsLoading() { return this.isLoading; }

    /** access pocketing */
    private static instance: undefined | LevelUnlockRegistry;
    public static get Instance(): LevelUnlockRegistry {
        //ensure instance is set
        if (LevelUnlockRegistry.instance === undefined) {
            LevelUnlockRegistry.instance = new LevelUnlockRegistry();
        }

        return LevelUnlockRegistry.instance;
    }

    /** display panel for unlock details */
    public DisplayPanelParent:Entity = engine.addEntity();
    private displayLogHeaderText:Entity = engine.addEntity();
    private displayLogContentText:Entity = engine.addEntity();

    //data registries
    private registryAll: List<LevelUnlockEntry>;
    
    /** prepares instanced registry for use */
    public constructor() {
        //setup 3D unlock display
        //  parent
        Transform.create(this.DisplayPanelParent, {
            position: {x:8, y:-4, z:8},
            rotation: Quaternion.fromEulerDegrees(0,0,0),
            scale: {x:1, y:1, z:1}
        });
        GltfContainer.create(this.DisplayPanelParent, {
            src: "models/utilities/Menu3D_Panel_Ornate_Square.glb",
            visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
            invisibleMeshesCollisionMask: undefined
        });
        //  header
        Transform.create(this.displayLogHeaderText, {
            parent: this.DisplayPanelParent,
            position: {x:0, y:1.04, z:-0.01},
            rotation: Quaternion.fromEulerDegrees(0,0,0),
            scale: {x:0.1, y:0.1, z:0.1}
        });
        TextShape.create(this.displayLogHeaderText, {
            text: "CARD UNLOCKS - LEVELS",
            textColor: Color4.create(1, 1, 1, 1),
            outlineColor: Color4.Black(),
            outlineWidth: 0.15,
            fontSize: 11.5,
            textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
            textWrapping: false,
            width: 0, height:0
        });
        //  content
        Transform.create(this.displayLogContentText, {
            parent: this.DisplayPanelParent,
            position: {x:-0.85, y:0.85, z:-0.01},
            rotation: Quaternion.fromEulerDegrees(0,0,0),
            scale: {x:0.1, y:0.1, z:0.1}
        });
        TextShape.create(this.displayLogContentText, {
            text: "LOADING CARD UNLOCKS FROM PLAYER LEVELS...",
            textColor: Color4.create(1, 1, 1, 1),
            outlineColor: Color4.Black(),
            outlineWidth: 0.15,
            fontSize: 7,
            textAlign: TextAlignMode.TAM_TOP_LEFT,
            textWrapping: false,
            width: 0, height:0
        });

        if(LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"initializing...");

        //initialize card collections
        this.registryAll = new List<LevelUnlockEntry>();

        //populate registry collections
        //  process every def
        for(var i: number = 0; i < LevelUnlockData.length; i++) {
            //prepare entry
            const def = LevelUnlockData[i];
            const entry = new LevelUnlockEntry(i, def.level);
            if (LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"creating entry {index=" + i + ", level=" + def.level + "}");
            //add to registry
            this.registryAll.addItem(entry);
        }

        //update display
        this.UpdateDisplayPanel();

        if(LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"initialized, total count=" + this.registryAll.size());
    }

    /** sets the position of the display frame */
    public SetPosition(position:Vector3){
        Transform.getMutable(this.DisplayPanelParent).position = position;
    }

    /** sets the rotation of the display frame */
    public SetRotation(rotation:Vector3){
        Transform.getMutable(this.DisplayPanelParent).rotation = Quaternion.fromEulerDegrees(rotation.x, rotation.y, rotation.z);
    }

    /** updates the text on the display panel */
    public UpdateDisplayPanel() {
        //  process every def
        let contentLog:string = "";
        for (var i: number = 0; i < this.registryAll.size(); i++) {
            //prepare entry
            const entry = this.registryAll.getItem(i);
            //update display
            //  unlocked
            if(entry.IsOwned) contentLog += "[UNLOCKED] ";
            else contentLog += "[LOCKED] ";
            //  core
            contentLog += "Level "+(entry.DataDef.level+1)+" provides:";
            for(var j: number = 0; j < entry.DataDef.providedCards.length; j++) {
                const cardDef = CardDataRegistry.Instance.GetEntryByID(entry.DataDef.providedCards[j].id).DataDef;
                contentLog += "\n\t(x"+entry.DataDef.providedCards[j].count+") "+cardDef.name;
            }
            contentLog += "\n\n";
        }
        //  update panel content text
        TextShape.getMutable(this.displayLogContentText).text = contentLog;
    }

    /** recalculates how many cards the player is allowed to add to their decks */
    public async CalculateCardProvisionCounts(level:number) {
        try {
            if(LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"recalculating card provisions provided by levels {level="+level+"}...");

            //reset all card allowcations for contracts
            CardDataRegistry.Instance.ResetAllowedCount(CARD_UNLOCK_TYPE.LEVEL);
            
            //process all contract entries
            var logOwnership = "";
            for(let i:number=0; i < this.registryAll.size(); i++) {
                //if contract is owned by player
                const entry = this.registryAll.getItem(i);
                logOwnership += "\n\t" + i + ", required level="+entry.Level+" owned=";
                if(entry.Level <= level) {
                    //provide all associated cards
                    for(let j:number=0; j < entry.DataDef.providedCards.length; j++) {
                        CardDataRegistry.Instance.GetEntryByID(entry.DataDef.providedCards[j].id).AddCount(CARD_UNLOCK_TYPE.LEVEL, entry.DataDef.providedCards[j].count);
                    }
                    entry.IsOwned = true;
                } else {
                    entry.IsOwned = false;
                }
                logOwnership += entry.IsOwned;
            }
            if(LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"recalculated card provisions provided by level!"+logOwnership);
        } catch (error) {
            console.log(LevelUnlockRegistry.debugTag+"an error occurred while recalculating player card provisions:\n"+error);
        }

        //update display
        LevelUnlockRegistry.Instance.UpdateDisplayPanel();
    }

    //### CONTRACTS
    /** returns level entry at given position */
    public CallbackGetEntryByPos(index: number): LevelUnlockEntry { return LevelUnlockRegistry.Instance.GetEntryByPos(index); }
    public GetEntryByPos(index: number): LevelUnlockEntry { return this.registryAll.getItem(index); }
}