import fs from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import type {Express,Request,Response} from 'express';
type Snapshot={name:string;habits:{id:string;name:string;category:string}[];cells:Record<string,string>;updated:string};
type State={users:Record<string,{snapshot:Snapshot|null;friends:string[]}>;invites:Record<string,{owner:string;expires:number}>};
export function installSocial(app:Express,file:string){
 let state:State={users:{},invites:{}};if(fs.existsSync(file))state=JSON.parse(fs.readFileSync(file,'utf8'));
 const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
 const persist=()=>{fs.writeFileSync(file+'.tmp',JSON.stringify(state),{mode:0o600});fs.renameSync(file+'.tmp',file);};
 const identity=(req:Request)=>{const secret=req.get('x-tracker-token')||'';if(!/^[a-f0-9]{64}$/.test(secret))throw Error('Нет ключа доступа к трекеру.');return hash(secret);};
 const route=(url:string,fn:(req:Request,id:string)=>unknown)=>app.post('/api/social/'+url,(req:Request,res:Response)=>{res.set('Cache-Control','no-store');try{res.json(fn(req,identity(req)));}catch(e){res.status(400).json({error:e instanceof Error?e.message:'Ошибка трекера'});}});
 const user=(id:string)=>{if(!state.users[id])throw Error('Сначала подтвердите публикацию своего трекера.');return state.users[id];};
 route('sync',(req,id)=>{const s=req.body;const habits=s.habits;if(typeof s.name!=='string'||!s.name.trim()||s.name.length>80||!Array.isArray(habits)||habits.length>100||habits.some(h=>!h||typeof h.id!=='string'||h.id.length>100||typeof h.name!=='string'||h.name.length>100||typeof h.category!=='string'))throw Error('Некорректный профиль.');if(!s.cells||typeof s.cells!=='object'||Array.isArray(s.cells)||Object.keys(s.cells).length>20000||Object.entries(s.cells).some(([k,v])=>!/^.+_\d{4}-\d{2}-\d{2}$/.test(k)||!['empty','done','partial'].includes(String(v))))throw Error('Некорректные отметки.');state.users[id]??={snapshot:null,friends:[]};state.users[id].snapshot={name:s.name.trim(),habits:habits.map(h=>({id:h.id,name:h.name,category:h.category})),cells:s.cells,updated:new Date().toISOString()};persist();return {ok:true};});
 route('invite',(_req,id)=>{user(id);for(const [key,invite] of Object.entries(state.invites))if(invite.expires<Date.now()||invite.owner===id)delete state.invites[key];const token=randomBytes(32).toString('hex');state.invites[hash(token)]={owner:id,expires:Date.now()+7*86400000};persist();return {token};});
 route('preview',(req,id)=>{const invite=state.invites[hash(String(req.body.token))];if(!invite||invite.expires<Date.now()||invite.owner===id)throw Error('Приглашение недействительно, просрочено или создано вами.');return {name:user(invite.owner).snapshot?.name};});
 route('accept',(req,id)=>{const me=user(id),key=hash(String(req.body.token)),invite=state.invites[key];if(!invite||invite.expires<Date.now()||invite.owner===id)throw Error('Приглашение недействительно.');const other=user(invite.owner);me.friends=[...new Set([...me.friends,invite.owner])];other.friends=[...new Set([...other.friends,id])];delete state.invites[key];persist();return {ok:true};});
 route('list',(_req,id)=>({friends:(state.users[id]?.friends||[]).map(friend=>({id:friend,name:state.users[friend]?.snapshot?.name||'Друг'}))}));
 route('view',(req,id)=>{if(!user(id).friends.includes(req.body.id)||!user(req.body.id).friends.includes(id))throw Error('Друг не подтвердил доступ или отозвал его.');return user(req.body.id).snapshot;});
 route('revoke',(req,id)=>{const me=user(id);me.friends=me.friends.filter(x=>x!==req.body.id);if(state.users[req.body.id])state.users[req.body.id].friends=state.users[req.body.id].friends.filter(x=>x!==id);persist();return {ok:true};});
}
