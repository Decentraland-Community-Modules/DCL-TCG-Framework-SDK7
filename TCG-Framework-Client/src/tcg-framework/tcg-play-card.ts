import Dictionary, { List } from "../utilities/collections";
import { CARD_TYPE, CardData, CardDataObject, CardKeywordEffectsDataObject } from "./data/tcg-card-data";
import { CARD_KEYWORD_EFFECT_TIMING } from "./data/tcg-keyword-data";
import { CardKeywordRegistry } from "./data/tcg-keyword-data-registry";
import { STATUS_EFFECT_AFFINITY, STATUS_EFFECT_ID, STATUS_EFFECT_PROCESSING_TYPE, StatusEffectDataObject } from "./data/tcg-status-effect-data";
import { SatusEffectRegistry as StatusEffectRegistry } from "./data/tcg-status-effect-registry";

/*      TRADING CARD GAME - PLAY CARD
    data representing a card that is currently in play & managed by a
    game table (not deck manager). these cards may or may not have a card object
    representing the card's view. (a card registered in a deck will only have
    a card object if it is in the player's hand or on the field) 

    these card defs hold values that are modified during play (ex:health reduced by
    taking damage)

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module PlayCard
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Card Play Data: ";

    /** all possible card states */
    export enum CARD_STATE_TYPE {
        DECK,
        HAND,
        FIELD,
        DISCARD,
    }

    /** indexing key */
    export function GetKeyFromData(data:PlayCardDataCreationData):string { 
        var key:string = "";
        if(data.deck != undefined) key += data.deck;
        key += "-"+data.defIndex+"-";
        if(data.index != undefined) key += data.index;
        return key; 
    };

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<PlayCardDataObject> = new List<PlayCardDataObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<PlayCardDataObject> = new List<PlayCardDataObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<PlayCardDataObject> = new List<PlayCardDataObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<PlayCardDataObject> = new Dictionary<PlayCardDataObject>();

    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|PlayCardDataObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }

    /** represents a status effect that is active on the card */
    export interface ActiveStatusEffectData {
        /** id of active effect */
        ID:STATUS_EFFECT_ID;
        Timing:CARD_KEYWORD_EFFECT_TIMING;
        /** strength of applied effect */
        Strength:number;
        /** duration/number of rounds an effect is applied for */
        Duration:number;
    }
    
    //TODO: migrate to creation data system (pass all details to create a card in a single data object)
	/** object interface used to define all data required to create a new object */
	export interface PlayCardDataCreationData {
        //indexing 
        //  option 1 (used by deck manager)
        key?:string; //defines the key for card using a pre-set string (overwrites option 2)
        //  option 2 (used by card tables)
        deck?:string;
        index?:number;
        //target
        defIndex: number,
	}

    /** contains all pieces that make up a card's playing data */
    export class PlayCardDataObject {
        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** current state of the card */
        public CardState:CARD_STATE_TYPE = 0;

        /** unique index of this slot's table, req for networking */
        private key:string = "";
        public get Key():string { return this.key; };

        /** index of deck that currently owns this card */
        private deck:string = "";
        public get Deck():string { return this.deck; }
        
        /** sub index of card, derived from the number of cards of the same def that exist within the deck */
        private index:number = 0;
        public get Index():number { return this.index; }

        /** core definition for this card (this should be expanded to target play data) */
        private defIndex:number = -1;
        public get DefIndex():number { return this.defIndex; };
        public get DefData():CardDataObject { return CardData[this.defIndex]; }
        
        //## GENERAL STATS
        /** cost */
        public Cost:number = 0;

        //## CHARACTER STATS
        /** whether or not the character can attack */
        public ActionRemaining:boolean = false;
        /** health */
        public HealthCur:number = 0;
        public HealthMax:number = 0;
        /** attack */
        public Attack:number = 0;
        /** armour */
        public Armour:number = 0;

        //## KEYWORDS
        /** all keywords currently active on this card */
        public KeywordsList:List<ActiveStatusEffectData> = new List<ActiveStatusEffectData>();
        public KeywordsDict:Dictionary<ActiveStatusEffectData> = new Dictionary<ActiveStatusEffectData>();

        //## EFFECTS
        /** all effects currently active on this card */
        public EffectsList:List<ActiveStatusEffectData> = new List<ActiveStatusEffectData>();
        public EffectsDict:Dictionary<ActiveStatusEffectData> = new Dictionary<ActiveStatusEffectData>();
        /** sorted listing of effects */
        public EffectsConstantByAffinity:List<ActiveStatusEffectData>[] = [];
        public EffectsExpireByAffinity:List<ActiveStatusEffectData>[] = [];

        /** initializes card play data with  */
        public Initialize(data:PlayCardDataCreationData) {
            this.isActive = true;
            //load in stats
            this.SetCard(data.defIndex);
            //indexing
            if(data.key != undefined) this.key = data.key;
            else {
                if(data.deck != undefined) this.deck = data.deck;
                if(data.index != undefined) this.index = data.index;
                this.key = this.deck+"-"+this.defIndex+"-"+this.index;
            }
        }

        /** resets the card with the current data def */
        public ResetCard() {
            this.SetCard(this.defIndex);
        }

        /** sets this card as the given data */
        public SetCard(index: number) {
            const def = CardData[index];
            //general stats
            this.defIndex = index
            this.Cost = def.cardCost;
            
            //reset keyword listings

            //reset effect listings
            this.EffectsList = new List<ActiveStatusEffectData>();
            this.EffectsDict = new Dictionary<ActiveStatusEffectData>();
            this.EffectsConstantByAffinity = [ new List<ActiveStatusEffectData>(), new List<ActiveStatusEffectData>() ];
            this.EffectsExpireByAffinity = [ new List<ActiveStatusEffectData>(), new List<ActiveStatusEffectData>() ];

            //process type specific effects
            switch(def.cardAttributes.type) {
                case CARD_TYPE.SPELL:

                break;
                case CARD_TYPE.CHARACTER:
                    this.HealthCur = def.cardAttributes.unitHealth;
                    this.HealthMax = def.cardAttributes.unitHealth;
                    this.Attack = def.cardAttributes.unitAttack;
                    this.Armour = def.cardAttributes.unitArmour;
                break;
                case CARD_TYPE.TERRAIN:

                break;
            }
        }

        /** processes an interaction from a foriegn card */
        //TODO: there are a lot of targeting assumptions being made atm (ex: if an enemy unit is interacting with a card we assume
        //  the target card is a unit as well), we may want to flesh this out a bit with more restrictions/catches
        public ProcessInteractionFromCard(card:PlayCard.PlayCardDataObject) {
            if(isDebugging) console.log(debugTag+"processing card play between target="+this.Key+" source="+card.Key+"...");
            
            //if external card is a unit
            if(card.DefData.type == CARD_TYPE.CHARACTER) {
                //local card takes damage to health
                const damage = card.Attack - this.Armour;
                if(damage > 0) {
                    this.HealthCur -= damage;
                    //play flinch animation
                    //play impact sound
                } else {
                    //play armour deflect animation
                    //play deflect sound
                }
            }

            //process all keywords from inbound card
            for(let i:number=0; i<card.DefData.cardKeywordEffects.length; i++) {
                this.ProcessKeywords(card.DefData.cardKeywordEffects[i]);
            }

            if(isDebugging) console.log(debugTag+"processed card play between target="+this.Key+" source="+card.Key+"...");
        }

        /** processes a keyword against this card */
        public ProcessKeywords(data:CardKeywordEffectsDataObject) {
            //get keyword def
            const keywordDef = CardKeywordRegistry.Instance.GetDefByID(data.type);
            if(isDebugging) console.log(debugTag+"applying effect {keyword="+keywordDef.displayName+", str="+data.strength+", dur="+(data.duration??0)+"} on card="+this.Key+"...");
            
            //process every effect tied to keyword
            for(let i:number=0; i<keywordDef.playEffects.length; i++) {
                //get status effect def
                const statusEffectDef:StatusEffectDataObject = StatusEffectRegistry.Instance.GetDefByID(keywordDef.playEffects[i].id);

                switch (keywordDef.playEffects[i].timing) {
                    case CARD_KEYWORD_EFFECT_TIMING.INSTANT:
                        this.ProcessEffect(statusEffectDef.type, data.strength);
                    break;
                    case CARD_KEYWORD_EFFECT_TIMING.CONSTANT:
                        //if effect already exists
                        if(this.EffectsDict.containsKey(statusEffectDef.id.toString())) {
                            //apply difference
                            this.ProcessEffect(statusEffectDef.type, data.strength);
                            //modify existing def
                            const effect = this.EffectsDict.getItem(statusEffectDef.id.toString());
                            effect.Strength += data.strength;
                            if(data.duration && data.duration > effect.Duration) effect.Duration = data.duration; 
                        }
                        //id not, create a new def and place in listings
                        else {
                            //apply effect
                            this.ProcessEffect(statusEffectDef.type, data.strength);
                            //create data object
                            const effect:ActiveStatusEffectData = {
                                ID:statusEffectDef.id,
                                Timing:keywordDef.playEffects[i].timing,
                                Strength:data.strength,
                                Duration:-1, //effect lasts forever
                            };
                            //add to listings
                            this.EffectsList.addItem(effect);
                            this.EffectsDict.addItem(effect.Timing + "-" + effect.ID, effect);
                            this.EffectsConstantByAffinity[statusEffectDef.affinity].addItem(effect);
                        }
                    break;
                    case CARD_KEYWORD_EFFECT_TIMING.REPEATING:
                        //create data object
                        const effect:ActiveStatusEffectData = {
                            ID:statusEffectDef.id,
                            Timing:keywordDef.playEffects[i].timing,
                            Strength:data.strength,
                            Duration:data.duration??1,
                        };
                        //add to listings
                        this.EffectsList.addItem(effect);
                        this.EffectsDict.addItem(effect.Timing + "-" + effect.ID, effect);
                        this.EffectsExpireByAffinity[statusEffectDef.affinity].addItem(effect);
                    break;
                }
            }
            
            if(isDebugging) console.log(debugTag+"applying effect {keyword="+keywordDef.displayName+", str="+data.strength+", dur="+(data.duration??0)+"} on card="+this.Key+"!");
        }

        /** processes an effect against this card */
        public ProcessEffect(id:STATUS_EFFECT_PROCESSING_TYPE, power:number) {
            if(isDebugging) console.log(debugTag+"processing effect {id="+id+", power="+power+"} on card="+this.Key+"...");

            //deternime how keyword should be processed based on effect type (what keyword is being applied)
            switch(id) {
                //inflicts damage to character (reduced by armour)
                case STATUS_EFFECT_PROCESSING_TYPE.DAMAGE:
                    const damage = power - this.Armour;
                    if(damage > 0) this.HealthCur -= damage;
                break;
                //restores current health to character
                case STATUS_EFFECT_PROCESSING_TYPE.HEALTH_RECOVER:
                    this.HealthCur += power;
                    //leash cur health below max
                    if(this.HealthCur > this.HealthMax) this.HealthCur = this.HealthMax;
                break;
                //inflicts direct damage to character (no reduced by armour)
                case STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DAMAGE:
                    this.HealthMax -= power;
                break;
                //increases max & cur health of character
                case STATUS_EFFECT_PROCESSING_TYPE.HEALTH_INCREASE:
                    this.HealthCur += power;
                    this.HealthMax += power;
                break;
                //decreases max health of character
                case STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DECREASE:
                    this.HealthMax -= power;
                    //leash cur health below max
                    if(this.HealthCur > this.HealthMax) this.HealthCur = this.HealthMax;
                break;
                //increases attack damage of character
                case STATUS_EFFECT_PROCESSING_TYPE.ATTACK_INCREASE:
                    this.Attack += power;
                break;
                //reduces attack damage of character
                case STATUS_EFFECT_PROCESSING_TYPE.ATTACK_DECREASE:
                    this.Attack -= power;
                    //leash armour above 0
                    if(this.Attack < 0) this.Attack = this.Attack;
                break;
                //increases attack armour of character
                case STATUS_EFFECT_PROCESSING_TYPE.ARMOUR_INCREASE:
                    this.Armour += power;
                break;
                //reduces attack damamage of character
                case STATUS_EFFECT_PROCESSING_TYPE.ARMOUR_DECREASE:
                    this.Armour -= power;
                    //leash armour above 0
                    if(this.Armour < 0) this.Armour = this.Armour;
                break;
                //restores an action to character
                case STATUS_EFFECT_PROCESSING_TYPE.ACTIVITY_MOD_ACTION_ENABLE:
                    this.ActionRemaining = true;
                break;
                //removes an action from the character
                case STATUS_EFFECT_PROCESSING_TYPE.ACTIVITY_MOD_ACTION_DISABLE:
                    this.ActionRemaining = false;
                break;
                //sets this character to a higher targeting filter
                case STATUS_EFFECT_PROCESSING_TYPE.TARGETING_MOD_HIGH:
                    
                break;
                //sets this character to a lower targeting filter
                case STATUS_EFFECT_PROCESSING_TYPE.TARGETING_MOD_LOW:
                    
                break;
                //removes card from field and put into hand
                //<only process on death>
                case STATUS_EFFECT_PROCESSING_TYPE.DEATH_MOD_TO_HAND:
                    
                break;
                //removes card from field and put into deck
                //<only process on death>
                case STATUS_EFFECT_PROCESSING_TYPE.DEATH_MOD_TO_DECK:
                    
                break;
                //removes card from field and removes from deck
                //<only process on death>
                case STATUS_EFFECT_PROCESSING_TYPE.DEATH_MOD_DESTROY:
                    
                break;
            }

            if(isDebugging) console.log(debugTag+"processed effect {id="+id+", power="+power+"} on card="+this.Key+"!");
        }

        /** processes all effects that are applicable at the start of the owning player's turn */
        public ProcessEffectsByAffinity(affinity:STATUS_EFFECT_AFFINITY) {
            //process all timed effects
            for(let i:number=0; i<this.EffectsExpireByAffinity[affinity].size(); i++) {
                //get effect
                const effectData = this.EffectsExpireByAffinity[affinity].getItem(i);
                const effectDef = StatusEffectRegistry.Instance.GetDefByID(effectData.ID);
                //process against card
                this.ProcessEffect(effectDef.type, effectData.Strength);
                //reduce duration
                effectData.Duration -= 1;
                //check for removal
                if(effectData.Duration == 0) {
                    //remove from listings
                    this.EffectsList.removeItem(effectData);
                    this.EffectsDict.removeItem(effectData.Timing + "-" + effectData.ID);
                    this.EffectsExpireByAffinity[affinity].removeItem(effectData);
                }
            }
        }
    }
    
    /** provides a new card object (either pre-existing & un-used or entirely new) */
    export function Create(data:PlayCardDataCreationData):PlayCardDataObject {
        //get key (option 1 overwrites option 2)
        var key:string = "";
        if(data.key != undefined && data.key != "") key = data.key;
        else key = GetKeyFromData(data);

        var object:undefined|PlayCardDataObject = undefined;
        if(isDebugging) console.log(debugTag+"attempting to create new object, key="+key+"...");
        
        //if an object under the requested key is already active, hand that back
        if(pooledObjectsRegistry.containsKey(key)) {
            //console.log(debugTag+"<WARNING> requesting pre-existing object (use get instead), key="+key);
            object = pooledObjectsRegistry.getItem(key);
        } 
        //  attempt to find an existing unused object
        if(object == undefined && pooledObjectsInactive.size() > 0) {
            //grab entity from (grabbing from back is a slight opt)
            object = pooledObjectsInactive.getItem(pooledObjectsInactive.size()-1);
            //  remove from inactive listing
            pooledObjectsInactive.removeItem(object);
        }
        //  if not recycling unused object
        if(object == undefined) {
            //create card object frame
            //  create data object (initializes all sub-components)
            object = new PlayCardDataObject();
            //  add to overhead collection
            pooledObjectsAll.addItem(object);
        }

        //initialize object
        object.Initialize(data);
        
        //add object to active collection (ensure only 1 entry)
        var posX = pooledObjectsActive.getItemPos(object);
        if(posX == -1) pooledObjectsActive.addItem(object);
        //add to registry under given key
        pooledObjectsRegistry.addItem(key, object);

        if(isDebugging) console.log(debugTag+"created new object, key='"+key+"'!");
        //provide entity reference
        return object;
    }

    /** disables all objects, hiding them from the scene but retaining them in data & pooling */
    export function DisableAll() {
        if(isDebugging) console.log(debugTag+"removing all objects...");
        //ensure all objects are parsed
        while(pooledObjectsActive.size() > 0) { 
            //small opt by starting at the back b.c of how list is implemented (list keeps order by swapping next item up)
            Disable(pooledObjectsActive.getItem(pooledObjectsActive.size()-1));
        }
        if(isDebugging) console.log(debugTag+"removed all objects!");
    }

    /** disables the given object, hiding it from the scene but retaining it in data & pooling */
    export function Disable(object:PlayCardDataObject) {
        const key:string = object.Key;
        //adjust collections
        //  add to inactive listing (ensure add is required)
        var posX = pooledObjectsInactive.getItemPos(object);
        if(posX == -1) pooledObjectsInactive.addItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(key)) pooledObjectsRegistry.removeItem(key);
    }

    /** removes all objects from the game */
    export function DestroyAll() {
        if(isDebugging) console.log(debugTag+"destroying all objects...");
        //ensure all objects are parsed
        while(pooledObjectsAll.size() > 0) { 
            //small opt by starting at the back b.c of how list is implemented (list keeps order by swapping next item up)
            Destroy(pooledObjectsAll.getItem(pooledObjectsAll.size()-1));
        }
        if(isDebugging) console.log(debugTag+"destroyed all objects!");
    }

    /** removes given object from game scene and engine */
    export function Destroy(object:PlayCardDataObject) {
        const key:string = object.Key;
        //adjust collections
        //  remove from overhead listing
        pooledObjectsAll.removeItem(object);
        //  remove from inactive listing
        pooledObjectsInactive.removeItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(key)) pooledObjectsRegistry.removeItem(key);

        //TODO: atm we rely on DCL to clean up object data class. so far it hasn't been an issue due to how
        //  object data is pooled, but we should look into how we can explicitly set data classes for removal
    }
}