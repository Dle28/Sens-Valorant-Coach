// Inspect a downloaded GLB before fitting it to game hitboxes and animation states.
// Usage: node scripts/inspect-model.mjs <model.glb>
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function inspectModel(buffer){
 if(buffer.length<20||buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2)throw new Error('Expected a glTF 2.0 binary (.glb).');
 if(buffer.readUInt32LE(8)!==buffer.length)throw new Error('Incomplete GLB download.');
 const length=buffer.readUInt32LE(12);
 if(buffer.readUInt32LE(16)!==0x4e4f534a||20+length>buffer.length)throw new Error('Invalid GLB JSON chunk.');
 const gltf=JSON.parse(buffer.subarray(20,20+length).toString('utf8'));
 const dependencies=[...(gltf.buffers??[]),...(gltf.images??[])].map(x=>x.uri).filter(uri=>uri&&!uri.startsWith('data:'));
 const meshes=(gltf.meshes??[]).map(mesh=>({name:mesh.name??'',primitives:mesh.primitives.map(p=>({vertices:gltf.accessors[p.attributes.POSITION]?.count??0,triangles:p.mode===undefined||p.mode===4?(gltf.accessors[p.indices]?.count??gltf.accessors[p.attributes.POSITION]?.count??0)/3:null,min:gltf.accessors[p.attributes.POSITION]?.min,max:gltf.accessors[p.attributes.POSITION]?.max}))}));
 return {bytes:buffer.length,dependencies,extensions:gltf.extensionsRequired??[],meshes,skins:(gltf.skins??[]).map(s=>({name:s.name,joints:s.joints.length})),nodes:(gltf.nodes??[]).map(n=>n.name??''),animations:(gltf.animations??[]).map(a=>({name:a.name,channels:a.channels.length,targets:[...new Set(a.channels.map(c=>gltf.nodes?.[c.target.node]?.name??c.target.node))]}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(inspectModel(await readFile(process.argv[2])),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
