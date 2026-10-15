const slides=[
 {eyebrow:"INNOVATION · SUSTAINABILITY · COMMUNITY",title:"GROWING TOMORROW,<br><em>TOGETHER.</em>",copy:"Empowering future agricultural and biosystems engineers through leadership, innovation, and service to our communities."},
 {eyebrow:"LEARN · LEAD · SERVE",title:"ENGINEERING A<br><em>SUSTAINABLE FUTURE.</em>",copy:"Building knowledge and practical skills for resilient agriculture, responsible resource use, and stronger communities."},
 {eyebrow:"ONE CHAPTER · SHARED PURPOSE",title:"ROOTED IN PURPOSE.<br><em>READY FOR TOMORROW.</em>",copy:"Connecting aspiring professionals through collaboration, meaningful activities, and a commitment to service."}
];
window.psabeHomeSlides=slides;
let activeSlide=0;
const title=document.getElementById('heroTitle'),copy=document.getElementById('heroCopy'),dots=[...document.querySelectorAll('.dot')];
function showSlide(index){activeSlide=(index+slides.length)%slides.length;title.innerHTML=slides[activeSlide].title;copy.textContent=slides[activeSlide].copy;dots.forEach((dot,i)=>{dot.classList.toggle('selected',i===activeSlide);dot.setAttribute('aria-pressed',String(i===activeSlide));});}
window.psabeShowHomeSlide=showSlide;
document.getElementById('prevSlide').addEventListener('click',()=>showSlide(activeSlide-1));
document.getElementById('nextSlide').addEventListener('click',()=>showSlide(activeSlide+1));
dots.forEach(dot=>dot.addEventListener('click',()=>showSlide(Number(dot.dataset.slide))));
let rotation=setInterval(()=>showSlide(activeSlide+1),6500);
const hero=document.querySelector('.hero');
hero.addEventListener('mouseenter',()=>clearInterval(rotation));
hero.addEventListener('mouseleave',()=>{clearInterval(rotation);rotation=setInterval(()=>showSlide(activeSlide+1),6500);});
document.getElementById('currentYear').textContent=new Date().getFullYear();
