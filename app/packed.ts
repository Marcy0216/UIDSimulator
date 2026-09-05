import { decompress } from 'fzstd';

export type PackedDrop = { uid:number; rarity:'Legendary'|'Mythical'; itemId:string };
export type Shard = { start:number; end:number; file:string; records:number; compressedBytes:number; sha256:string };
export type Manifest = { formatVersion:number; codec:'zstd'; minUid:number; maxUid:number; shardSize:number; totalRecords:number; releaseBaseUrl:string; shards:Shard[] };

function readInt(view:DataView, offset:number){return view.getInt32(offset,true)}
function readVarInt(bytes:Uint8Array,state:{offset:number}){let value=0,shift=0;while(state.offset<bytes.length){const b=bytes[state.offset++];value+=(b&127)*2**shift;if((b&128)===0)return value;shift+=7;if(shift>35)throw new Error('Invalid varint');}throw new Error('Unexpected end of shard')}

function decode(bytes:Uint8Array,fromUid:number,limit:number,rarity:string,query:string):PackedDrop[]{
 const raw=decompress(bytes),view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
 if(new TextDecoder().decode(raw.slice(0,4))!=='UDS1')throw new Error('Unsupported shard');
 const start=readInt(view,4),count=readInt(view,12),itemCount=readInt(view,16),state={offset:20},decoder=new TextDecoder(),items:string[]=[];
 for(let i=0;i<itemCount;i++){const length=readVarInt(raw,state);items.push(decoder.decode(raw.slice(state.offset,state.offset+length)));state.offset+=length}
 const result:PackedDrop[]=[];let uid=start-1;const needle=query.trim().toLowerCase();
 for(let i=0;i<count;i++){uid+=readVarInt(raw,state);const code=readVarInt(raw,state),itemId=items[Math.floor(code/2)],kind=code%2?'Mythical':'Legendary';if(uid>=fromUid&&(rarity==='All'||kind===rarity)&&itemId.toLowerCase().includes(needle)){result.push({uid,rarity:kind,itemId});if(result.length>=limit)break}}
 return result;
}

export async function loadManifest(base:string):Promise<Manifest|null>{const response=await fetch(new URL('data/manifest.json',base));if(!response.ok)return null;const value=await response.json() as Partial<Manifest>;return value?.formatVersion===1&&Array.isArray(value.shards)?value as Manifest:null}
export async function loadForecast(manifest:Manifest,uid:number,limit:number,rarity:string,query:string){const output:PackedDrop[]=[];for(const shard of manifest.shards.filter(s=>s.end>=uid).slice(0,4)){const response=await fetch(`${manifest.releaseBaseUrl}/${encodeURIComponent(shard.file)}`);if(!response.ok)throw new Error(`Shard download failed: ${response.status}`);output.push(...decode(new Uint8Array(await response.arrayBuffer()),uid,limit-output.length,rarity,query));if(output.length>=limit)break;uid=shard.end+1}return output}
