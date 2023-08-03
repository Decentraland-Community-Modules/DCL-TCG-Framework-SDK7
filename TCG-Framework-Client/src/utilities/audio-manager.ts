import { AudioSource, AvatarAnchorPointType, AvatarAttach, Entity, Transform, engine } from "@dcl/sdk/ecs";
import { Quaternion, Vector3 } from "@dcl/sdk/math";

export enum AUDIO_SOUNDS {
    GAME_START = 0,
    GAME_END = 1,
    STAGE_CHANGED = 2,
    KEY_PICKUP = 3,
    KEY_SLOTTED = 4
}
/*      AUDIO MANAGER
    controls audio components in-scene, mainly lobby (game idle) and
    battle (during wave) music.

    Author: TheCryptoTrader69 (Alex Pazder)
    Contact: TheCryptoTrader69@gmail.com
*/
export class AudioManager
{
    //access pocketing
    private static instance:undefined|AudioManager;
    public static get Instance():AudioManager
    {
        //ensure instance is set
        if(AudioManager.instance === undefined)
        {
            AudioManager.instance = new AudioManager();
        }

        return AudioManager.instance;
    }

    private static audioStrings:string[] = [
        "audio/sfx_game_start.wav",
        "audio/sfx_game_end.wav",
        "audio/sfx_stage_change.wav",
        "audio/sfx_key_clicked.wav",
        "audio/sfx_key_slotted.wav"
    ];

    parentEntity:Entity;

    //lobby music
    private audioObjectLobby:Entity;
    private soundEffects:Entity[];

    //constructor
    constructor()
    {
        //parental entity
        this.parentEntity = engine.addEntity();
        Transform.create(this.parentEntity,
        ({
            position: Vector3.create(0,0,0),
            scale: Vector3.create(1,1,1),
            rotation: Quaternion.fromEulerDegrees(0, 0, 0)
        }));
        AvatarAttach.create(this.parentEntity,{
            anchorPointId: AvatarAnchorPointType.AAPT_NAME_TAG,
        })

        //lobby music
        this.audioObjectLobby = engine.addEntity();
        Transform.create(this.audioObjectLobby,
        ({
            parent: this.parentEntity,
            position: Vector3.create(0,0,0),
            scale: Vector3.create(1,1,1),
            rotation: Quaternion.fromEulerDegrees(0, 0, 0)
        }));
        AudioSource.create(this.audioObjectLobby, {
            audioClipUrl: "audio/music_scene.mp3",
            loop: true,
            playing: true,
            volume: 0.5,
        });

        //create sound entities
        this.soundEffects = []
        for (let i = 0; i < AudioManager.audioStrings.length; i++) {
            //entity
            const soundEntity = engine.addEntity();
            Transform.create(soundEntity,
            ({
                parent: this.parentEntity,
                position: Vector3.create(0,0,0),
                scale: Vector3.create(1,1,1),
                rotation: Quaternion.fromEulerDegrees(0, 0, 0)
            }));
            //audio source
            AudioSource.create(soundEntity, {
                audioClipUrl: AudioManager.audioStrings[i],
                loop: false,
                playing: false,
                volume: 3
            });
            //add to collection
            this.soundEffects.push(soundEntity);
        }
        //additional tuning
        //  volume change
        AudioSource.getMutable(this.soundEffects[AUDIO_SOUNDS.STAGE_CHANGED]).volume = 10;
        //  tone change
    }

    PlaySound(index:number)
    {
        //reset the place state to play from start
        AudioSource.getMutable(this.soundEffects[index]).playing = false;
        AudioSource.getMutable(this.soundEffects[index]).playing = true;
    }
}