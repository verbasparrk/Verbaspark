import {admin} from '../server/platform.js';
import {processContactNotifications} from '../server/notifications.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).end();
 if(!process.env.CRON_SECRET||req.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`)return res.status(401).end();
 try{return res.status(200).json(await processContactNotifications(admin(),{batchSize:20}))}
 catch(error){console.error('Notification queue failed:',error);return res.status(503).json({error:'Notification queue unavailable.'})}
}
