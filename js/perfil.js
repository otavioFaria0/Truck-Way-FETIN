const inputFoto =
document.getElementById("inputFoto");

const fotoPerfil =
document.getElementById("fotoPerfil");

const previewImagem =
document.getElementById("previewImagem");

const editorImagem =
document.getElementById("editorImagem");

const zoomImagem =
document.getElementById("zoomImagem");

const salvarImagem =
document.getElementById("salvarImagem");

let imagemAtual = "";



/* ABRIR IMAGEM */

inputFoto.addEventListener(
    "change",
    (event) => {

        const arquivo =
        event.target.files[0];

        if (!arquivo) return;

        const reader =
        new FileReader();

        reader.onload = () => {

            imagemAtual =
            reader.result;

            previewImagem.src =
            imagemAtual;

            editorImagem.style.display =
            "flex";

            atualizarZoom();
        };

        reader.readAsDataURL(arquivo);
    }
);



/* ZOOM */

zoomImagem.addEventListener(
    "input",
    atualizarZoom
);

function atualizarZoom() {

    const zoom =
    zoomImagem.value;

    previewImagem.style.transform =
    `scale(${zoom})`;
}



/* SALVAR FOTO */

salvarImagem.addEventListener(
    "click",
    () => {

        fotoPerfil.src =
        imagemAtual;

        fotoPerfil.style.transform =
        previewImagem.style.transform;

        editorImagem.style.display =
        "none";

        inputFoto.value = "";
    }
);