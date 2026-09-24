const replacements={'ß':'ss','æ':'ae','œ':'oe','ø':'o','ł':'l','đ':'d','ð':'d','þ':'th'};

export function normalizeSlug(value){
 return String(value||'').toLowerCase()
  .replace(/[ßæœøłđðþ]/g,character=>replacements[character])
  .normalize('NFKD').replace(/\p{M}/gu,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
  .slice(0,30).replace(/-+$/,'');
}

export function validSlug(value){return /^[a-z0-9][a-z0-9-]{2,29}$/.test(value)}
