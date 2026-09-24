import {admin,body,checked,fail,owner} from '../server/platform.js';
import {deleteStoredFiles} from '../server/account-cleanup.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 try{
  const db=admin(),user=await owner(req,db),input=body(req);
  if(input.action!=='delete'||input.confirmEmail!==user.email||input.confirmPhrase!=='DELETE')
   return res.status(400).json({error:'Enter your account email and DELETE exactly as shown.'});
  const readiness=await db.rpc('platform_deletion_ready');
  if(readiness.error||readiness.data!==true)
   return res.status(503).json({error:'Account deletion is not ready yet. Please contact Verbaspark support.'});
  const membership=checked(await db.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle());
  if(membership){
   const {count,error}=await db.from('platform_admins').select('user_id',{count:'exact',head:true});
   if(error)throw error;
   if(count<=1)return res.status(409).json({error:'Assign another administrator before deleting the only admin account.'});
  }
  try{await deleteStoredFiles(db,user.id)}catch{throw Object.assign(Error('Could not finish removing your uploads. Please retry; some files may already be gone.'),{status:503})}
  const {error}=await db.auth.admin.deleteUser(user.id);
  if(error)throw Object.assign(Error('Could not finish deleting your account. Please retry.'),{status:503});
  return res.status(200).json({ok:true});
 }catch(error){return fail(res,error)}
}
