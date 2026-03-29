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

    // Funcționalitate pentru Ticker-ul de Preț PULA
    const updatePulaPrice = async () => {
        const tokenAddress = "B8a7twkUV1fnB317PxihGXsE9XKbyGgfxNUBwicwpump"; // Contractul PULA pe Solana
        const usdToRon = 4.60; // Rată de schimb aproximativă
        const carutaSize = 1000000; // Un milion de jetoane per căruță

        try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
            const data = await response.json();
            
            if (data.pairs && data.pairs.length > 0) {
                const pair = data.pairs[0];
                const priceUsd = parseFloat(pair.priceUsd);
                const priceChange = pair.priceChange.h24 || 0;

                const pricePerCarutaUsd = (priceUsd * carutaSize).toFixed(2);
                const pricePerCarutaRon = (priceUsd * carutaSize * usdToRon).toFixed(2);

                // Găsim elementele de preț în pagină
                const tickerValue = document.querySelector('.ticker-value');
                const tickerChange = document.querySelector('.ticker-change');

                if (tickerValue) {
                    // Verificăm dacă suntem pe versiunea RO sau EN
                    const isEnglish = window.location.pathname.includes('/en/');
                    if (isEnglish) {
                        tickerValue.innerText = `$${pricePerCarutaUsd} USD`;
                    } else {
                        tickerValue.innerText = `${pricePerCarutaRon} RON`;
                    }
                }

                if (tickerChange) {
                    const arrow = priceChange >= 0 ? "▲" : "▼";
                    const color = priceChange >= 0 ? "#4caf50" : "#f44336";
                    tickerChange.innerText = `${arrow} ${priceChange}% (24h)`;
                    tickerChange.style.color = color;
                }
            }
        } catch (error) {
            console.error("Eroare la preluarea prețului PULA:", error);
        }
    };

    // Apelăm imediat și apoi la fiecare 60 de secunde
    updatePulaPrice();
    setInterval(updatePulaPrice, 60000);
});