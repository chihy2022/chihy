const overlay=document.getElementById("overlay");

const popup=document.getElementById("popupContent");

document.querySelectorAll(".card").forEach(card=>{

    card.onclick=()=>{

        fetch(card.dataset.file)

        .then(r=>r.text())

        .then(html=>{

            popup.innerHTML=html;

            overlay.classList.add("show");

        });

    }

});

document.getElementById("close").onclick=()=>{

    overlay.classList.remove("show");

}

overlay.onclick=(e)=>{

    if(e.target===overlay){

        overlay.classList.remove("show");

    }

}