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

    // Funcționalitate pentru Ticker-ul de Preț PULA (via Jupiter API)
    const updatePulaPrice = async () => {
        const tokenAddress = "B8a7twkUV1fnB317PxihGXsE9XKbyGgfxNUBwicwpump";
        const usdToRon = 4.60;
        const carutaSize = 1000000;

        try {
            // Jupiter Price API este foarte rapid pentru tokenuri noi
            const response = await fetch(`https://price.jup.ag/v4/price?ids=${tokenAddress}`);
            const data = await response.json();

            if (data.data && data.data[tokenAddress]) {
                const priceUsd = data.data[tokenAddress].price;
                
                const pricePerCarutaUsd = (priceUsd * carutaSize).toFixed(2);
                const pricePerCarutaRon = (priceUsd * carutaSize * usdToRon).toFixed(2);

                const tickerValue = document.querySelector('.ticker-value');
                if (tickerValue) {
                    const isEnglish = window.location.pathname.includes('/en/');
                    tickerValue.innerText = isEnglish ? `$${pricePerCarutaUsd} USD` : `${pricePerCarutaRon} RON`;
                }
                
                // Notă: Jupiter V4 nu dă direct priceChange24h, 
                // deci pentru săgeată/procent vom rămâne momentan la indicatorul tău manual 
                // sau îl putem lăsa static până când PULA ajunge pe DexScreener.
                console.log("Preț PULA actualizat de pe Jupiter:", priceUsd);
            }
        } catch (error) {
            console.error("Jupiter API nu a putut returna prețul încă:", error);
        }
    };

    updatePulaPrice();
    setInterval(updatePulaPrice, 60000); // Update la fiecare minut
});