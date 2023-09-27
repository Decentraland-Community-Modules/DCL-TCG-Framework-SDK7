import { getUserData } from '~system/UserIdentity';
import { getRealm } from '~system/Runtime';
import { executeTask } from '@dcl/sdk/ecs';
    
/*      TRADING CARD GAME - NFT LINKAGE REGISTRY

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module NFTLinkageRegistry {
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG NFT Link Registry: ";

    //attempts to collect the player's data
    export async function fetchPlayerData() {
        //attempt to process json
        try {
            if(isDebugging) console.log(debugTag+"attempting to fetch player data");
            //get user data
            const userData = await getUserData({});
            if(!userData.data) return;
            //get realm info
            const realmInfo = await getRealm({});
            if(!realmInfo.realmInfo) return;
            
            //create url 
            const url = realmInfo.realmInfo.baseUrl+"/lambdas/profile/"+userData.data.userId;
            if(isDebugging) console.log(debugTag+"making call using url: "+url);
            
            //attempt to pull json from url
            const json = (await fetch(url)).json();
            if(isDebugging) console.log(debugTag+"full response: "+json);

            //console.log('player is wearing :'+json[0].metadata.avatars[0].avatar.wearables);
            //console.log('player owns :'+json[0].metadata.avatars[0].inventory);
        } catch {
            console.log('an error occurred while reaching for player data');
        }
    }

    //attempts to collect the player's wearable data
    export async function fetchWearablesData() {
        try {
            if(isDebugging) console.log(debugTag+"attempting to fetch player wearable data");
            //get user data
            const userData = await getUserData({});
            if(!userData.data) return;
            //get realm info
            const realmInfo = await getRealm({});
            if(!realmInfo.realmInfo) return;

            //create url
            const url = realmInfo.realmInfo.baseUrl+"/lambdas/collections/wearables-by-owner/"+userData.data.userId+"includeDefinitions";
            if(isDebugging) console.log(debugTag+"making call using url: "+url);

            //attempt to pull json from url
            const json = (await fetch(url)).json();
            if(isDebugging) console.log(debugTag+"full response: "+json);
        } catch {
            console.log('an error occurred while reaching for wearables data');
        }
    }

}