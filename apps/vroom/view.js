/* HOW FAR A DRIVER SEES, in one place. The fog, the cull and the camera's far plane have to agree (a road that is dropped before the fog has hidden it pops out of the picture; a fog that ends after the
   far plane shows a wall of sky), so none of them keeps a number of its own: each is a base distance in metres times VIEW_K. At 30 m/s the old view (130 m) was four seconds of road; raising VIEW_K is the
   one change that lengthens it everywhere. Pure data. */
export const VIEW_K = 1.5;
export const far = m => m * VIEW_K;

export const FAR = far(130);               /* the camera's far plane: nothing is drawn past it */
export const RANGE_CAP = far(110);         /* the most road and scenery drawn round the camera (the fog's end, when that is nearer, sets it instead) */
export const CAR_RANGE = far(80);          /* a car further than this from the camera is not drawn */
export const PICKUP_RANGE = far(70);       /* nor is a pickup */
export const LAMP_REACH = far(36);         /* a road lamp lights its surroundings when it is within its own radius plus this of the camera */
