/**
    contains useful functions for dynamically splicing/managing textures 

    TODO: make this a module so not available EVERYWHERE, mmm or namespace
*/

/** draw points for plane vectors */
export function GetCardDrawVectors(totalX:number, totalY:number, elementX:number, elementY:number, posX:number, posY:number) {
    const stepSizeX = elementX/totalX;
    const stepSizeY = elementY/totalY;
    const drawX = stepSizeX*posX;
    const drawY = stepSizeY*posY;
    //console.log("plane draw: total["+totalX+","+totalY+"], step["+stepSizeX+","+stepSizeY+"], draw["+drawX+","+drawY+"]");
    return [ 
        //plane front
        drawX, drawY, //left-bottom corner 
        drawX, drawY+stepSizeY, //left-top corner
        drawX+stepSizeX, drawY+stepSizeY, //right-top corner
        drawX+stepSizeX, drawY, //right-bottom corner
        //plane back (we dont care about this)
        0, 0, 0, 0, 0, 0, 0, 0,
    ];
}