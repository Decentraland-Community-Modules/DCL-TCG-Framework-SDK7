import { MenuElementManager2D } from "../utilities/menu-group-2D.ui";
import { LevelUnlockRegistry } from "./data/tcg-level-unlocks-registry";

/*      TRADING CARD GAME - LEVELING MANAGER
    provides an interface for processing player's experience and level. all actual data values for
    experience and prestige are stored in the inventory manager as token objects (levels are dynamically
    calculated via the player's current experience, do not need a data object or sever read/write)
    
    author: Alex Pazder
    contact: TheCryptoTrader69@gmail.com 
*/

//object that represents an enemy in scene
export module LevelManager {
    /** when true debug logs are generated (toggle off when you deploy) */
    const IsDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Level Manager: ";
    
    //level calculation settings
    const experienceConstant: number = 0.20;//0.0385;
    const experiencePower: number = 2.0;

    //experience
    let experience:number = 0;
    export let ExperienceText:undefined|MenuElementManager2D.MenuElement2D;
    let experienceMax:number = 0;
    export function GetExperience() { return experience; }
    /** increases experience by the given value, calculates the new level and provides rewards for newly achieved levels. */
    export function AddExperience(value:number) { SetExperience(experience + value); }
    export function SetExperience(value:number) {
        if(IsDebugging) console.log(debugTag+"setting experience=" + value.toString() + "...");
        
        //set experience value & leash experience to max
        experience = value
        if(experience > experienceMax) {
            if(IsDebugging) console.log(debugTag+"experience exceeds max, leashing exp {cur=" + experience + ",max=" + experienceMax + "}");
            experience = experienceMax;
        }

        //get new level & leash new level
        let targetLevel:number = CalculateLevel(experience);
        if(targetLevel > levelMax) {
            if(IsDebugging) console.log(debugTag+"level exceeds max, leashing level {cur=" + targetLevel + ",max=" + levelMax + "}");
            targetLevel = levelMax;
        }
        if(IsDebugging) console.log(debugTag+"experience applied, new level calculated {old=" + level + ", new=" + targetLevel + "}");

        //process change in level
        SetLevel(targetLevel);

        //set experience gui
        if(ExperienceText) ExperienceText.TextValue = experience.toString() + ", next level: "+GetExperienceToNextLevel();//+ "/" + CalculateExperienceRequiredForLevel(GetLevel() + 1).toString();
        if(IsDebugging) console.log(debugTag+"set experience, new total=" + experience);
    }
    export function CallbackGetExperience() { return LevelManager.GetExperience(); }

    //level
    let level:number = -1;
    export let LevelText:undefined|MenuElementManager2D.MenuElement2D;
    let levelMax:number = 50;
    export function GetLevel() { return level; }
    export function SetLevel(value:number) {
        //if there is a change in level
        if(level != value) {
            //set level value & update gui
            level = value;
            if(LevelText) LevelText.TextValue = (level+1).toString();
            //recalculate card provisions
            LevelUnlockRegistry.Instance.CalculateCardProvisionCounts(level);
        }
    }
    export function CallbackGetLevel() { return LevelManager.GetLevel(); }
    
    /** prepares the leveling system for use, assigning experience, level, and allocated cards */
    export function Initialize(experience:number) {
        if(IsDebugging) console.log(debugTag+"initializing...");

        //calculate experience limit
        experienceMax = CalculateExperienceRequiredForLevel(levelMax) + 1;
        if(IsDebugging) console.log(debugTag+"max experience set {experienceMax="+experienceMax+"}");

        //initialize ownership system
        AddExperience(experience);

        if(IsDebugging) console.log(debugTag+"initialized {experience=" + experience + ", level=" + level + "}");
    }

    /** returns experience required to complete the current level */
    export function GetExperienceToNextLevel(): number {
        if (level != levelMax) return CalculateExperienceRequiredForLevel(level + 1) - experience;
        else return 0;
    }

    /** takes in an experience and returns the repsective level */
    export function CalculateLevel(experience:number):number {
        return Math.floor(experienceConstant * Math.pow(experience, 1 / experiencePower));
    }

    /** takes in a level and returns the experience required */
    export function CalculateExperienceRequiredForLevel(level:number):number {
        return Math.floor(Math.pow(level / experienceConstant, experiencePower));
    }
}