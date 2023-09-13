import Dictionary, { List } from "../utilities/collections";
import { CARD_TYPE, CardData, CardDataObject } from "./data/tcg-card-data";

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

    /** represents all key words */
    export class Keyword {

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

        //DETAILS
        /**  rarity of the card */
        rarity:number = 0;
        
        //STATS - GENERAL
        /** cost */
        public Cost:number = 0;
        /** keywords/effects */
        public Keywords:number[] = [];

        //STATS - CHARACTERS
        /** health */
        public Health:number = 0;
        /** attack */
        public Attack:number = 0;
        /** armour */
        public Armour:number = 0;

        /** initializes the  */
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
            this.Cost = def.attributeCost;
            //keywords/effects
            this.Keywords = [];
            for(let i:number=0;i<def.keywords.length;i++) {

            }
            //character stats
            if(def.attributeCharacter) {
                this.Health = def.attributeCharacter.unitHealth;
                this.Attack = def.attributeCharacter.unitAttack;
                this.Armour = def.attributeCharacter.unitArmour;
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