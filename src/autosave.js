// Storage and remote transport are injected so failures and races can be tested without a live account.
export class Autosave{
 constructor({store,remote,onStatus=()=>{},delay=1000,retryDelay=5000,online=()=>navigator.onLine}){
  Object.assign(this,{store,remote,onStatus,delay,retryDelay,online});this.row=null;this.user=null;this.block=null;this.cloudState='local';this.localState='saved';this.error='';this.localQueue=Promise.resolve();this.running=null;this.timer=null;this.epoch=0;this.seq=0;this.savedLocalId=null;
 }
 notify(){this.onStatus(this.status())}
 status(){return {local:this.localState,cloud:this.cloudState,error:this.error,blocked:this.block,connected:!!this.user,pending:!!this.row&&this.row.id!==this.row.syncedId,localDurable:!!this.row&&this.savedLocalId===this.row.id}}
 async start(document){const rows=await this.store.list();this.isNew=!rows.length;this.row=rows[0]||{id:crypto.randomUUID(),time:Date.now(),document:structuredClone(document),owner:null,revision:null,syncedId:null};this.seq=this.row.time;this.savedLocalId=rows.length?this.row.id:null;if(!rows.length)await this.persist();this.notify();return structuredClone(this.row.document)}
 persist(){const snapshot=structuredClone(this.row);this.localState='saving';this.notify();this.localQueue=this.localQueue.catch(()=>{}).then(async()=>{try{await this.store.write(snapshot);if(this.row.id===snapshot.id){this.savedLocalId=snapshot.id;this.localState='saved';}}catch{if(this.row.id===snapshot.id){this.localState='error';this.error='Device storage is full or unavailable. Your changes are still open here. Download a backup before leaving.';}}this.notify()});return this.localQueue}
 edit(document){this.seq=Math.max(Date.now(),this.seq+1);this.row={...this.row,id:crypto.randomUUID(),time:this.seq,document:structuredClone(document)};this.persist();this.schedule()}
 async connect(user){if(this.user?.id===user?.id)return;this.epoch++;this.user=user;clearTimeout(this.timer);this.block=null;this.error='';if(!user){this.cloudState='local';this.notify();return}
  const epoch=this.epoch;this.cloudState='checking';this.notify();
  try{if(!this.online())throw Error('You are offline.');const remote=await this.remote.read(user.id);if(epoch!==this.epoch)return;
   if(this.row.owner&&this.row.owner!==user.id){this.block='account';}
   else if(remote&&this.row.owner!==user.id){this.block='choose';}
   else if(remote&&this.row.revision!==remote.revision){
    if(remote.last_save_id===this.row.id){this.row.revision=remote.revision;this.row.syncedId=this.row.id;await this.persist()}
    else this.block='conflict';
   }else if(!remote&&this.row.owner===user.id&&this.row.revision!==null){this.block='conflict'}
   else {this.row.owner=user.id;this.row.revision=remote?.revision??null;await this.persist()}
   this.cloudState=this.block?'conflict':'saved';this.notify();if(!this.block)this.schedule();
  }catch(error){if(epoch!==this.epoch)return;this.cloudState='error';this.error=error.message;this.notify();this.timer=setTimeout(()=>this.reconnect(),this.retryDelay)}
 }
 reconnect(){const user=this.user;this.user=null;return this.connect(user)}
 schedule(){clearTimeout(this.timer);if(!this.user||this.block){this.notify();return}if(!this.online()){this.cloudState='offline';this.notify();return}this.cloudState='pending';this.notify();this.timer=setTimeout(()=>this.flush().catch(()=>{}),this.delay)}
 async flush(){clearTimeout(this.timer);if(this.running){await this.running;return this.flush()}if(!this.user)throw Error('Sign in to save online.');if(this.block)throw Error('Choose which draft to keep in Save & recovery.');if(!this.online()){this.cloudState='offline';this.notify();throw Error('Offline. Your draft will sync when the connection returns.')}
  if(this.row.owner!==this.user.id)throw Error('Connect this draft to your account first.');if(this.row.id===this.row.syncedId){this.cloudState='saved';this.notify();return this.row.revision}
  const snapshot=structuredClone(this.row),epoch=this.epoch;this.cloudState='saving';this.notify();
  this.running=(async()=>{try{const revision=await this.remote.write(snapshot.document,{userId:this.user.id,revision:snapshot.revision,requestId:snapshot.id});if(epoch!==this.epoch)return;
    this.row.revision=revision;this.row.syncedId=snapshot.id;this.error='';await this.persist();this.cloudState=this.row.id===snapshot.id?'saved':'pending';this.notify();
   }catch(error){if(epoch!==this.epoch)return;if(error.code==='VS409'||error.message?.includes('DRAFT_CONFLICT')){this.block='conflict';this.cloudState='conflict';this.error='An online draft changed on another device. Both copies are kept. Choose which version to use.';}
    else{this.cloudState=this.online()?'error':'offline';this.error=error.message||'Online saving failed.';this.timer=setTimeout(()=>this.flush().catch(()=>{}),this.retryDelay)}this.notify();throw error}
   finally{this.running=null}})();await this.running;if(epoch!==this.epoch)throw Error('Account changed. Save again in the current account.');if(this.row.id!==this.row.syncedId)return this.flush();return this.row.revision;
 }
 async chooseLocal(){if(!this.user)throw Error('Sign in first.');if(this.running)await this.running.catch(()=>{});const epoch=this.epoch;const row=await this.remote.read(this.user.id);if(epoch!==this.epoch)throw Error('Account changed.');this.row.owner=this.user.id;this.row.revision=row?.revision??null;this.row.syncedId=null;this.block=null;this.error='';await this.persist();return this.flush()}
 async loadOnline(){if(!this.user)throw Error('Sign in first.');if(this.running)await this.running.catch(()=>{});const epoch=this.epoch;clearTimeout(this.timer);await this.persist();if(this.localState==='error')throw Error('Download a backup before replacing your unsaved local draft.');const row=await this.remote.read(this.user.id);if(epoch!==this.epoch)throw Error('Account changed.');if(!row)throw Error('No online draft exists yet.');const document=await this.remote.resolve(row.document);if(epoch!==this.epoch)throw Error('Account changed.');this.seq=Math.max(Date.now(),this.seq+1);this.row={id:crypto.randomUUID(),time:this.seq,document,owner:this.user.id,revision:row.revision,syncedId:null};this.row.syncedId=this.row.id;this.block=null;this.error='';await this.persist();this.cloudState='saved';this.notify();return structuredClone(document)}
 async restore(id){const rows=await this.store.list();const found=rows.find(row=>row.id===id);if(!found)throw Error('This recovery version is no longer available.');this.edit(found.document);return structuredClone(found.document)}
 retry(){this.persist();return this.reconnect()}
 dispose(){clearTimeout(this.timer);this.epoch++}
}
