import {defaults} from './design.js';

export const businessCard={
 id:'business-card',label:'Digital business card',subtitle:'A clear introduction. An easy way to connect.',tag:'INTRODUCE & CONNECT',layout:'classic',name:'Luka Novak',accent:'#245e50',gap:20,radius:14,
 design:{...defaults,mode:'light',background:'#ffffff',surface:'#f3f6f4',border:'#dbe4de',text:'#172923',muted:'#53675e',headingFont:'sans',weight:600,fontSize:15},
 cards:[
  {id:'bc-cover',type:'photo',photoRole:'cover',size:'wide',title:'Seasonal cooking',alt:'Freshly prepared seasonal food',body:'',image:'https://images.unsplash.com/photo-1547592180-85f173990554?w=1400&auto=format&fit=crop'},
  {id:'bc-portrait',type:'photo',photoRole:'portrait',size:'small',title:'Luka Novak',alt:'Portrait of Luka Novak',body:'',image:'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop'},
  {id:'bc-intro',type:'intro',size:'wide',title:'Luka Novak',subtitle:'Private chef · Ljubljana, Slovenia',body:'Seasonal ingredients, thoughtful menus, and memorable evenings. Private dining and intimate events, made personal.',url:'mailto:luka@example.com',ctaLabel:'Plan your evening'},
  {id:'bc-about',type:'text',size:'wide',title:'At your table',body:'From a relaxed dinner with friends to a special celebration. I take care of the menu, cooking, and finishing touches so you can enjoy your guests.'},
  {id:'bc-contact',type:'contact',size:'wide',title:'Let’s make a plan',body:'Tell me your date, location, and number of guests.',url:'mailto:luka@example.com',ctaLabel:'Send an enquiry'},
  {id:'bc-link',type:'link',size:'wide',linkStyle:'wide',title:'Instagram',body:'Recent dishes and moments from the kitchen',url:'https://instagram.com'},
  {id:'bc-location',type:'link',size:'wide',linkStyle:'wide',title:'Based in Ljubljana',body:'Available for events across Slovenia',url:'https://www.google.com/maps/search/?api=1&query=Ljubljana+Slovenia'}
 ]
};

export function assignClassicRoles(cards){
 const photos=cards.filter(c=>c.type==='photo');
 if(!photos.some(c=>c.photoRole==='portrait')&&photos[0])photos[0].photoRole='portrait';
 if(!photos.some(c=>c.photoRole==='cover')){const cover=photos.find(c=>c.photoRole!=='portrait');if(cover)cover.photoRole='cover'}
}

export function classicCards(cards){
 const cover=cards.find(c=>c.type==='photo'&&c.photoRole==='cover');
 const portrait=cards.find(c=>c.type==='photo'&&c.photoRole==='portrait');
 const intro=cards.find(c=>c.type==='intro');
 const header=[cover,portrait,intro].filter(Boolean);
 return [...header,...cards.filter(c=>!header.includes(c))];
}

export function isClassicHeader(card,state){return state.layout==='classic'&&(card===state.cards.find(c=>c.type==='intro')||(card.type==='photo'&&['cover','portrait'].includes(card.photoRole)))}
