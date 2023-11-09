import Dictionary, { List } from "../utilities/collections";
import { MAX_CARD_COUNT_PER_TYPE } from "./config/tcg-config";
import { CardData } from "./data/tcg-card-data";
import { PlayCard } from "./tcg-play-card";

/*      TRADING CARD GAME - PLAY CARD DECK
    represents a deck of cards, with links to each card's active data

    each player has multiple decks that can be swapped between at the deck manager
    pve decks are handled locally atm
    peer-to-peer decks are managed by the authoritive source for a table
    server decks are managed completely by the server (tells specific client what to pick up/discard) 

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module PlayCardDeck {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Play Card Deck: ";

    /** all possible card deck types */
    export enum DECK_TYPE {
        PLAYER_LOCAL,  //local player
        PLAYER_REMOTE, //remote player (local is peer-to-peer auth)
        AI, //deck is being used in a pve encounter
    };

    /** index per targeted collection */
    export enum DECK_CARD_STATES {
        DECK,
        HAND,
        FIELD,
        TERRAIN,
        DISCARD,
    };
    
    /* min number of cards in a viable deck */
    export const DECK_SIZE_MIN = 8;
    /* max number of cards in a viable deck */
    export const DECK_SIZE_MAX = 12;

    /** indexing key */
    export function GetKeyFromObject(data:PlayCardDeckObject):string { return data.Key; };
    export function GetKeyFromData(data:PlayCardDeckDataCreationData):string { return data.key; };

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<PlayCardDeckObject> = new List<PlayCardDeckObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<PlayCardDeckObject> = new List<PlayCardDeckObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<PlayCardDeckObject> = new List<PlayCardDeckObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<PlayCardDeckObject> = new Dictionary<PlayCardDeckObject>();

    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|PlayCardDeckObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }
    
	/** object interface used to define all data required to create a new object */
	export interface PlayCardDeckDataCreationData {
        //indexing 
        key: string;
        //target
        type: DECK_TYPE,
	}

    /** represents a single card's data in a deck
     * can contain multiple entries/owner proofs, on a per instance basis  
    */
    export class PlayCardDeckPiece {
        public DefID:number;
        public Count:number;

        constructor(id:number, count:number) {
            this.DefID = id;
            this.Count = count;
        }
        //TODO: add instance sub-keying/add ownership veri/use NFTs to increase total count
    }

    /** contains all pieces that make up a single card deck */
    export class PlayCardDeckObject {
        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** current state of the card */
        public DeckType:DECK_TYPE = 0;

        /** represents the unique index of this slot's table, req for networking */
        private key:string = "";
        public get Key():string { return this.key; };

        /** all play cards tied to this deck */
        public CardsAll:List<PlayCard.PlayCardDataObject> = new List<PlayCard.PlayCardDataObject>;

        /** holds the number of cards registered per ID */
        public RegisteredCardCountList:List<PlayCardDeckPiece> = new List<PlayCardDeckPiece>();
        public RegisteredCardCountDict:Dictionary<PlayCardDeckPiece> = new Dictionary<PlayCardDeckPiece>();

        /** cards in deck */
        public CardsPerState:List<PlayCard.PlayCardDataObject>[] = [
            new List<PlayCard.PlayCardDataObject>(),
            new List<PlayCard.PlayCardDataObject>(),
            new List<PlayCard.PlayCardDataObject>(),
            new List<PlayCard.PlayCardDataObject>(),
            new List<PlayCard.PlayCardDataObject>(),
        ];

        /** initializes the object */
        public Initialize(data: PlayCardDeckDataCreationData) {
            this.isActive = true;
            //indexing
            this.key = data.key;
            //collections
            this.CardsAll = new List<PlayCard.PlayCardDataObject>();
            this.RegisteredCardCountList = new List<PlayCardDeckPiece>();
            this.RegisteredCardCountDict = new Dictionary<PlayCardDeckPiece>();
            this.CardsPerState = [
                new List<PlayCard.PlayCardDataObject>(),
                new List<PlayCard.PlayCardDataObject>(),
                new List<PlayCard.PlayCardDataObject>(),
                new List<PlayCard.PlayCardDataObject>(),
                new List<PlayCard.PlayCardDataObject>(),
            ];
        }

        /** returns the count of a cards corrisponding to the given definition */
        public GetCardCount(def:number):number {
            if(!this.RegisteredCardCountDict.containsKey(def.toString())) return 0;
            else return this.RegisteredCardCountDict.getItem(def.toString()).Count;
        }

        /** adds a single instance of the given card data index */
        public AddCard(defIndex:number) {
            if(isDebugging) console.log(debugTag+"adding card to deck="+this.key+", def="+defIndex+"...");
            //ensure card instance limit is not over max
            if(this.GetCardCount(defIndex) >= MAX_CARD_COUNT_PER_TYPE[CardData[defIndex].type]) {
                if(isDebugging) console.log(debugTag+"failed to add card - too many instances of cards in deck (count="+this.GetCardCount(defIndex)+")!");
                return;
            } 

            //create instance of card
            const card = PlayCard.Create({
                deck: this.key,
                index: this.GetCardCount(defIndex),
                defIndex: defIndex,
            });
            //add card to deck
            this.CardsAll.addItem(card);
            this.CardsPerState[DECK_CARD_STATES.DECK].addItem(card);
            
            //update count of registered cards
            if(!this.RegisteredCardCountDict.containsKey(defIndex.toString())) {
                //create new entry object
                const entry = new PlayCardDeckPiece(defIndex, 1);
                this.RegisteredCardCountList.addItem(entry);
                this.RegisteredCardCountDict.addItem(defIndex.toString(), entry);
            } else {
                //update entry object
                this.RegisteredCardCountDict.getItem(defIndex.toString()).Count += 1;
            } 
            if(isDebugging) console.log(debugTag+"added card to deck="+this.key+" (size="+this.CardsAll.size()+"), def="+
                defIndex+" (count="+this.GetCardCount(defIndex)+"), cardKey="+card.Key+"!");
        }

        /** adds a card to the given state listing using the serialized data */
        public AddCardBySerial(stateIndex:number, serial:PlayCard.CardSerialData):PlayCard.PlayCardDataObject {
            if(isDebugging) console.log(debugTag+"adding card to deck="+this.key+", index="+stateIndex+"...");

            //create new instance of card
            const card = PlayCard.Create({
                deck: this.key,
                index: serial.index,
                defIndex: serial.defIndex,
            });
            card.DeserializeData(serial);

            //add card to deck
            this.CardsAll.addItem(card);
            this.CardsPerState[stateIndex].addItem(card);
            
            //update count of registered cards
            if(!this.RegisteredCardCountDict.containsKey(serial.defIndex.toString())) {
                //create new entry object
                const entry = new PlayCardDeckPiece(serial.defIndex, 1);
                this.RegisteredCardCountList.addItem(entry);
                this.RegisteredCardCountDict.addItem(serial.defIndex.toString(), entry);
            } else {
                //update entry object
                this.RegisteredCardCountDict.getItem(serial.defIndex.toString()).Count += 1;
            } 
            if(isDebugging) console.log(debugTag+"added card to deck="+this.key+", index="+stateIndex+", collectionSize="+this.CardsAll.size()+"!");
            return card;
        }

        //TODO: atm it is assumed the deck will be in a neutral state with all cards set to deck-state (not in-hand ect.)
        /** removes a single instance of the given card data */
        public RemoveCard(defIndex:number) {
            if(isDebugging) console.log(debugTag+"removing card from deck="+this.key+", def="+defIndex+"...");
            //check if requested card exists
            if(this.GetCardCount(defIndex) <= 0) {
                if(isDebugging) console.log(debugTag+"failed to remove card - no instances in deck!");
                return;
            } 

            //find an instance of the targeted card def
            //NOTE: we must ensure we remove the card with the highest sub-index to keep keying integrity
            var index:number = 0;
            var card:undefined|PlayCard.PlayCardDataObject = undefined;
            while(index<this.CardsAll.size()) {
                //check entry for targeted card
                const test = this.CardsAll.getItem(index);
                if(test.DefIndex == defIndex) {
                    //only update target card if no card exists or next card has higher index 
                    if(card == undefined) card = test;
                    else if(test.Index > card.Index) card = test;
                }
                index++;
            }

            if(card == undefined) {
                console.log("ERROR: faulty deck remove!");
                return;
            }
            const cardKey:string = card.Key;

            //remove instance of card
            this.CardsAll.removeItem(card);
            this.CardsPerState[DECK_CARD_STATES.DECK].removeItem(card);
            //disable card
            PlayCard.Disable(card);
            
            //modify count reg
            const entry = this.RegisteredCardCountDict.getItem(defIndex.toString());
            entry.Count -= 1;
            if(entry.Count == 0) {
                this.RegisteredCardCountList.removeItem(entry)
                this.RegisteredCardCountDict.removeItem(entry.DefID.toString());
            }

            if(isDebugging) console.log(debugTag+"removed card from deck="+this.key+" (size="+this.CardsAll.size()+"), def="+
                defIndex+" (count="+this.GetCardCount(defIndex)+"), cardIndex="+cardKey+"!");
        }

        /** resets all cards their normal playable state (all def-values & in deck, not in hand/discard) */
        public Reset() {
            //move all cards to deck (skip first state listing b.c is deck)
            for(let i:number = 1; i<this.CardsPerState.length; i++) {
                while(this.CardsPerState[i].size() > 0) {
                    const card = this.CardsPerState[i].getItem(0);
                    this.CardsPerState[i].removeItem(card);
                    this.CardsPerState[DECK_CARD_STATES.DECK].addItem(card);
                }
            }

            //re-slot each card 
            for(let i:number = 1; i<this.CardsPerState.length; i++) {
                for(let j:number = 1; j<this.CardsPerState.length; j++) {
                    this.CardsPerState[i].getItem(j).ResetCard();
                }
            }
        }

        /** shuffles all cards in the deck, randomizing order */
        public ShuffleCards() {
            let card:PlayCard.PlayCardDataObject;
            let swap:number;
            let count = this.CardsPerState[DECK_CARD_STATES.DECK].size();
            for (let i = 0; i < this.CardsPerState[DECK_CARD_STATES.DECK].size(); i++) 
            {
                swap = Math.floor(Math.random() * (count));
                card = this.CardsPerState[DECK_CARD_STATES.DECK].getItem(swap);
                this.CardsPerState[DECK_CARD_STATES.DECK].removeItem(card);
                this.CardsPerState[DECK_CARD_STATES.DECK].addItem(card);
            }
        }

        /** remove & release all cards in this deck */
        public Clean() {
            if(isDebugging) console.log(debugTag+"cleaning deck="+this.Key+", cardCount="+this.CardsAll.size()+" cardReg="+this.RegisteredCardCountList.size()+"...");
            //disable all cards
            while(this.CardsAll.size() > 0) {
                //remove and disable card
                const card = this.CardsAll.getItem(0);
                this.CardsAll.removeItem(card);
                PlayCard.Disable(card);
            }

            //reset listings
            this.CardsAll = new List<PlayCard.PlayCardDataObject>();
            this.RegisteredCardCountList = new List<PlayCardDeckPiece>();
            this.RegisteredCardCountDict = new Dictionary<PlayCardDeckPiece>();
            this.CardsPerState = [
                new List<PlayCard.PlayCardDataObject>(),
                new List<PlayCard.PlayCardDataObject>(),
                new List<PlayCard.PlayCardDataObject>(),
                new List<PlayCard.PlayCardDataObject>(),
                new List<PlayCard.PlayCardDataObject>(),
            ];

            if(isDebugging) console.log(debugTag+"cleaned deck="+this.Key+", \n\tcardCount="+this.CardsAll.size()
                +"\n\tcard" +" cardReg="+this.RegisteredCardCountList.size()+"!");
        }

        /** copies over all cards from one deck to another */
        public Clone(deck: PlayCardDeckObject) {
            if(isDebugging) console.log(debugTag+"cloning deckLocal="+this.key+" (count="+this.CardsAll.size()
                +"), deckLocal="+deck.key+" (count="+deck.CardsAll.size()+")...");

            //remove all previous cards
            this.Clean();
            //mirror all cards from other deck
            var index:number = 0;
            while(index < deck.CardsAll.size()) {
                this.AddCard(deck.CardsAll.getItem(index).DefIndex);
                index++;
            }
            if(isDebugging) console.log(debugTag+"cloning deckLocal="+this.key+" (count="+this.CardsAll.size()
                +"), deckLocal="+deck.key+" (count="+deck.CardsAll.size()+")!");
        }

        /** returns a serialized string representing all cards in this deck */
        public Serialize():string {
            var serial:string = "";

            //process every registered card
            for(let i:number=0; i<this.RegisteredCardCountList.size(); i++) {
                const entry = this.RegisteredCardCountList.getItem(i);
                serial += entry.DefID+":"+entry.Count+"-";
            }
            serial = serial.slice(0,-1);

            if(isDebugging) console.log(debugTag+"serialized deck, serial="+serial);
            return serial;
        }

        /** initializes this deck based on the given serial string */
        public Deserial(serial:string) {
            if(isDebugging) console.log(debugTag+"deserializing deckID="+this.Key+", serial="+serial);
            //remove all previous cards
            this.Clean();

            //add all cards from serial
            const split:string[] = serial.split('-');
            for(let i:number=0; i<split.length; i++) {
                const entrySplit = split[i].split(':');
                for(let j:number=0; j<parseInt(entrySplit[1]); j++) {
                    this.AddCard(parseInt(entrySplit[0]));
                }
            }
            if(isDebugging) console.log(debugTag+"deserialized deckID="+this.Key+", size="+this.CardsAll.size());
        }
    }
    
    /** provides a new card object (either pre-existing & un-used or entirely new) */
    export function Create(data:PlayCardDeckDataCreationData):PlayCardDeckObject {
        const key:string = GetKeyFromData(data);
        var object:undefined|PlayCardDeckObject = undefined;
        if(isDebugging) console.log(debugTag+"attempting to create new object, key="+key+"...");
        
        //if an object under the requested key is already active, hand that back
        if(pooledObjectsRegistry.containsKey(key)) {
            console.log(debugTag+"<WARNING> requesting pre-existing object (use get instead), key="+key);
            object = pooledObjectsRegistry.getItem(key);
        } 
        //  attempt to find an existing unused object
        if(pooledObjectsInactive.size() > 0) {
            //grab entity from (grabbing from back is a slight opt)
            object = pooledObjectsInactive.getItem(pooledObjectsInactive.size()-1);
            //  remove from inactive listing
            pooledObjectsInactive.removeItem(object);
        }
        //  if not recycling unused object
        if(object == undefined) {
            //create card object frame
            //  create data object (initializes all sub-components)
            object = new PlayCardDeckObject();
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
    export function Disable(object:PlayCardDeckObject) {
        const key:string = GetKeyFromObject(object);
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
    export function Destroy(object:PlayCardDeckObject) {
        const key:string = GetKeyFromObject(object);
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