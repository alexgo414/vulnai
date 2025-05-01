// Recuperar el proyecto desde localStorage
document.addEventListener("DOMContentLoaded", () => {
    const proyecto = JSON.parse(localStorage.getItem("proyectoEditar"));
    if (proyecto) {
        document.getElementById("nombre-proyecto").value = proyecto.nombre;
        document.getElementById("descripcion-proyecto").value = proyecto.descripcion;
    }
});