import {checked} from './platform.js';

export function notificationText(job,appURL){
 const answers=Array.isArray(job.answers)?job.answers:[];
 const fields=answers.map(answer=>`${String(answer.label||answer.id||'Field').slice(0,100)}: ${String(answer.value??'').slice(0,5000)}`).join('\n');
 const fallback=`Name: ${job.name||'Visitor'}\nEmail: ${job.email||'Not provided'}\nMessage: ${job.message||''}`;
 const inbox=new URL('/editor/',appURL).href;
 return `A new enquiry arrived on your Verbaspark page (${job.slug}).\n\n${fields||fallback}\n\nOpen your private Inbox: ${inbox}\n\nThis message was submitted by a visitor. Reply from your Inbox or email app; Verbaspark has not sent a reply.`;
}

export async function sendContactNotification(job,{fetcher=fetch,apiKey=process.env.RESEND_API_KEY,from=process.env.CONTACT_EMAIL_FROM,appURL=process.env.APP_URL}={}){
 if(!apiKey||!from||!appURL)throw Error('Notification email is not configured.');
 const payload={from,to:[job.recipient],subject:'New enquiry on your Verbaspark page',text:notificationText(job,appURL)};
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`contact/${job.message_id}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
 if(!response.ok){const detail=await response.text().catch(()=>'');throw Error(`Email provider returned ${response.status}: ${detail.slice(0,250)}`)}
 return response.json();
}

export async function processContactNotifications(db,{messageId=null,batchSize=10,send=sendContactNotification}={}){
 if(!process.env.RESEND_API_KEY||!process.env.CONTACT_EMAIL_FROM)return {processed:0,sent:0,skipped:'Email sender not configured'};
 const jobs=checked(await db.rpc('platform_claim_contact_notifications',{target_message:messageId,take_count:batchSize}))||[];
 let sent=0;
 for(const job of jobs){
  let delivered=false,errorText=null;
  try{await send(job);delivered=true;sent++}catch(error){errorText=error.message;console.error('Contact notification failed:',job.message_id,errorText)}
  checked(await db.rpc('platform_finish_contact_notification',{target_message:job.message_id,token:job.lease_token,delivered,error_text:errorText}));
 }
 return {processed:jobs.length,sent};
}
