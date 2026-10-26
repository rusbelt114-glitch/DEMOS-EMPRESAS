"use strict";
const clients=[
  {name:"María Pérez",plan:"Mensual",active:true},
  {name:"José Rodríguez",plan:"Trimestral",active:true},
  {name:"Andrea Gómez",plan:"Personalizado",active:false},
  {name:"Carlos Díaz",plan:"Mensual",active:true}
];
const classes=[
  {day:"Lunes",time:"7:00 AM",name:"Entrenamiento funcional",coach:"Laura"},
  {day:"Miércoles",time:"6:00 PM",name:"Spinning",coach:"Miguel"},
  {day:"Viernes",time:"8:00 AM",name:"Fuerza",coach:"Daniela"}
];
const el=id=>document.getElementById(id);
function item(title,subtitle){
  const article=document.createElement("article");
  article.className="item";
  const b=document.createElement("b");
  b.textContent=title;
  const small=document.createElement("small");
  small.textContent=subtitle;
  article.append(b,small);
  return article;
}
function render(){
  el("total").textContent=clients.length;
  el("active").textContent=clients.filter(c=>c.active).length;
  const q=el("search").value.trim().toLocaleLowerCase("es");
  el("clientList").replaceChildren(...clients.filter(c=>c.name.toLocaleLowerCase("es").includes(q)).map(c=>item(c.name,c.plan+" · "+(c.active?"Activa":"Vencida"))));
}
function showTab(name){
  document.querySelectorAll("[data-tab]").forEach(button=>button.classList.toggle("active",button.dataset.tab===name));
  document.querySelectorAll(".panel").forEach(panel=>panel.classList.toggle("active",panel.id===name));
}
document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>showTab(button.dataset.tab)));
for(const [target,arr] of [["upcoming",classes.slice(0,2)],["schedule",classes]]){
  el(target).replaceChildren(...arr.map(c=>item(c.name,c.day+" · "+c.time+" · Entrenador/a: "+c.coach)));
}
el("search").addEventListener("input",render);
el("add").addEventListener("click",()=>el("newClient").showModal());
el("clientForm").addEventListener("submit",event=>{
  const submitter=event.submitter;
  if(submitter?.value!=="save")return;
  const form=event.currentTarget;
  const name=form.elements.namedItem("name").value.trim();
  if(!name){event.preventDefault();return;}
  clients.push({name,plan:form.elements.namedItem("plan").value,active:true});
  form.reset();
  render();
});
render();
