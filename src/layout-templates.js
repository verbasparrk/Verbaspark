import {defaults} from './design.js';
const building='https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1400&auto=format&fit=crop';
const coast='https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1200&auto=format&fit=crop';
const cards=[
 {id:'story-intro',type:'intro',size:'wide',title:'Alex Morgan',subtitle:'Photographer & visual storyteller / Ljubljana, Slovenia',body:'I capture spaces, people and the moments in between.',url:'mailto:alex@example.com',ctaLabel:'Get in touch'},
 {id:'story-architecture',type:'photo',size:'wide',title:'Quiet architecture',body:'Studies of light, form and the quiet beauty of everyday spaces.',image:building,alt:'Architecture in natural light'},
 {id:'story-coast',type:'photo',size:'wide',title:'Coastal light',body:'A personal series about distance, movement and the changing coast.',image:coast,alt:'Coastal landscape'},
 {id:'story-about',type:'text',size:'wide',title:'Behind the lens',body:'Based in Ljubljana, I work on personal and commissioned projects that explore place, light and human connection.'},
 {id:'story-social',type:'link',size:'small',title:'Instagram',body:'New work and field notes.',url:'https://instagram.com/'},
 {id:'story-contact',type:'contact',size:'wide',title:'Let us create something together.',body:'Available for editorial and commissioned photography.',url:'mailto:alex@example.com',ctaLabel:'Get in touch'}
];
export const layoutTemplates=[
 {id:'editorial',layout:'editorial',label:'Editorial',subtitle:'A personal story with a magazine feel.',tag:'WORDS & STORIES',name:'Alex Morgan',accent:'#735541',gap:24,radius:0,design:{...defaults,mode:'light',headingFont:'serif',weight:400,background:'#f7f4ee',surface:'#f7f4ee',text:'#24231f',muted:'#68635d',border:'#ccc5bb'},cards:structuredClone(cards)},
 {id:'showcase',layout:'showcase',label:'Showcase',subtitle:'A cinematic home for your visual work.',tag:'IMAGES & PROJECTS',name:'Alex Morgan',accent:'#cab89b',gap:24,radius:4,design:{...defaults,headingFont:'serif',weight:400,background:'#121514',surface:'#191d1b',text:'#f6f3ed',muted:'#bdc1bb',border:'#3c423e'},cards:structuredClone(cards)}
];
