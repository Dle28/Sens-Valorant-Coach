import {decorateSite} from '../../../shared/decorate.js';
import {addSiteLandmarks} from '../../../shared/site-landmarks.js';
import {addFoundryPerimeterDressing} from './perimeter-dressing.js';
export function buildDetails(root,block){decorateSite(root,block,'foundry');addSiteLandmarks(root,block,'foundry');addFoundryPerimeterDressing(root);}
