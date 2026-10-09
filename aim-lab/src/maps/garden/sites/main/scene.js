import {buildInterior} from './interior.js';
import {addRuins} from './ruins.js';
import {addLotusGarden} from './lotus-garden.js';
import {addSanctuary,addLotusSky} from './sanctuary.js';
import {addWaterDetails} from './water.js';
import {addCanopy} from './canopy.js';
import {addSiteLandmarks} from '../../../shared/site-landmarks.js';
import {addTemplePerimeterDressing} from './perimeter-dressing.js';
export function buildDetails(root,block){buildInterior(root,block);addRuins(root,block);addLotusGarden(root,block);addSanctuary(root);addLotusSky(root);addCanopy(root);addWaterDetails(root,[[-8,-18],[8,-11],[-8,-2],[8,5]]);addSiteLandmarks(root,block,'garden');addTemplePerimeterDressing(root);}
