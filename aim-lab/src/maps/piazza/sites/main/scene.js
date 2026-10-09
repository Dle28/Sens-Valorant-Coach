import {decorateSite} from '../../../shared/decorate.js';
import {addSiteLandmarks} from '../../../shared/site-landmarks.js';
import {addPiazzaDressing} from './dressing.js';

export function buildDetails(root,block){
 decorateSite(root,block,'piazza');
 addSiteLandmarks(root,block,'piazza');
 addPiazzaDressing(root,block);
}
