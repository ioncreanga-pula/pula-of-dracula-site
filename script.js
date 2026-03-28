document.addEventListener('DOMContentLoaded', () => {
    // Funcționalitate pentru meniul hamburger
    const navToggle = document.querySelector('.nav-toggle');
    const navLista = document.querySelector('.nav-lista');
    
    if (navToggle && navLista) {
        navToggle.addEventListener('click', () => {
            navLista.classList.toggle('nav-lista--vizibila');
            navToggle.classList.toggle('active');
        });

        // Închide meniul la click pe orice link (inclusiv logo)
        document.querySelectorAll('.site-header a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLista.classList.contains('nav-lista--vizibila')) {
                    navLista.classList.remove('nav-lista--vizibila');
                    navToggle.classList.remove('active');
                }
            });
        });
    }

    // Evidențiază link-ul activ (inclusiv LOGO-TEXT)
    const currentPagePath = window.location.pathname.split("/").pop() || "index.html";
    const logoText = document.querySelector('.logo-text');

    document.querySelectorAll('.navigatie-principala .nav-link').forEach(link => {
        const linkFile = link.getAttribute('href').split("/").pop() || "index.html";
        if (linkFile === currentPagePath) {
            link.classList.add('active');
        }
    });

    if (currentPagePath === "index.html" && logoText) {
        logoText.classList.add('active');
    }
});