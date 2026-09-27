export function photonSuggestions(payload){
 const results=[],seen=new Set();
 for(const feature of Array.isArray(payload?.features)?payload.features:[]){
  const [lng,lat]=feature.geometry?.coordinates||[];
  if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lng)>180||Math.abs(lat)>85)continue;
  const p=feature.properties||{},street=[p.street,p.housenumber].filter(Boolean).join(' ');
  const parts=[street||p.name,p.city||p.town||p.village||p.county,p.country].filter(Boolean).map(value=>String(value).slice(0,100));
  const label=[...new Set(parts)].join(', ').slice(0,240);
  if(!label||seen.has(label))continue;
  seen.add(label);results.push({label,lng,lat});
  if(results.length===5)break;
 }
 return results;
}
