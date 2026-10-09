import {decorateSite} from '../../../shared/decorate.js';
import {addSiteLandmarks} from '../../../shared/site-landmarks.js';
import {addAtriumDressing} from './dressing.js';

export function buildDetails(root,block){
 decorateSite(root,block,'atrium');
 addSiteLandmarks(root,block,'atrium');
 addAtriumDressing(root,block);
}
