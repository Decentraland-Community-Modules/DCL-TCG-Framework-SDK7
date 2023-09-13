import { MessageBus } from '@dcl/sdk/message-bus'
import { SCENE_CONNECTIVITY_TYPE } from './tcg-config';

/** all networking interfaces and states */
export module Networking {
    /** represents the current state of the instance's connectivity,
     *  this follows a fail-through approach: if the game cannot connect
     *  to the server it will automatically fallback to peer-to-peer connectivity
     */
    export const CONNECTIVITY_STATE:SCENE_CONNECTIVITY_TYPE = SCENE_CONNECTIVITY_TYPE.PEER_TO_PEER_SANDBOX;
    
    /** modbus used for p2p communications */
    export const MESSAGE_BUS = new MessageBus();




}