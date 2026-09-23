export const fieldTypes={text:'Short text',textarea:'Long text',email:'Email',tel:'Phone',date:'Date',select:'Dropdown',checkbox:'Checkbox'};
export const defaultFields=[{id:'name',label:'Name',type:'text',required:true},{id:'email',label:'Email',type:'email',required:true},{id:'message',label:'Message',type:'textarea',required:true}];
export function cleanFields(value){const ids=new Set();return (Array.isArray(value)?value:defaultFields).slice(0,12).map((field,i)=>{let id=/^[a-z][a-z0-9_-]{0,60}$/.test(field?.id||'')&&!['website','slug','values','constructor','__proto__','prototype'].includes(field.id)?field.id:'field_'+i;while(ids.has(id))id+='_';ids.add(id);return {id,label:String(field?.label||'Field '+(i+1)).trim().slice(0,100),type:Object.hasOwn(fieldTypes,field?.type)?field.type:'text',required:field?.required===true,options:[...new Set((Array.isArray(field?.options)?field.options:[]).map(v=>String(v).trim().slice(0,100)).filter(Boolean))].slice(0,20)}})}
export function validateAnswers(fields,values){
 const answers=cleanFields(fields).map(field=>{const raw=values?.[field.id];const value=field.type==='checkbox'?raw===true||raw==='on':typeof raw==='string'?raw.trim():'';const error=()=>{throw Object.assign(Error('Check the field: '+field.label),{status:400})};
 if(field.required&&!value)error();if(typeof value==='string'&&value.length>(field.type==='textarea'?5000:field.type==='email'?254:500))error();
 if(value&&field.type==='email'&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value))error();
 if(value&&field.type==='select'&&!field.options.includes(value))error();
 if(value&&field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))error();
 return {id:field.id,label:field.label,type:field.type,value};});
 if(JSON.stringify(answers).length>12000)throw Object.assign(Error('Your message is too long.'),{status:400});return answers;
}
