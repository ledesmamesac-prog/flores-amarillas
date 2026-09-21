document.addEventListener("DOMContentLoaded", () => {
    const pressBtn = document.getElementById("pressBtn");
    const welcomeScreen = document.getElementById("welcomeScreen");
    const bouquetScreen = document.getElementById("bouquetScreen");
    const bouquetContainer = document.getElementById("bouquetContainer");
    const petalsRainContainer = document.getElementById("petalsRain");

    // Si la persona tiene activado "reducir movimiento", no ponemos la lluvia de pétalos
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Iniciar lluvia continua de pétalos en segundo plano
    if (!sinMovimiento) startPetalsRain();

    pressBtn.addEventListener("click", () => {
        pressBtn.disabled = true;
        // Ocultar pantalla de bienvenida con transición suave
        welcomeScreen.style.opacity = "0";
        setTimeout(() => {
            welcomeScreen.classList.add("hidden");
            bouquetScreen.classList.remove("hidden");
            bouquetScreen.classList.add("visible");
            buildBouquet();
        }, 500);
    });

    /* ------------------------------------------------------------------
       COLORES DEL RAMO: si quieres cambiar algo (por ejemplo el lazo),
       este es el único lugar que tienes que tocar.
       Los degradados van de la base hacia la punta.
    ------------------------------------------------------------------ */
    const COLOR = {
        petaloFondo:  ["#d98200", "#f6b100", "#ffd84d"],
        petaloFrente: ["#f2ae00", "#ffd633", "#fff59a"],
        centro:       ["#6a3410", "#3a1a06"],   // interior → borde
        semillas:     "#e0a63e",
        hojaOscura:   ["#1b6538", "#4fae59"],
        hojaClara:    ["#27803f", "#7ccf6c"],
        tallo:        "#2e8b4a",
        ramita:       "#3f9d55",
        papelIzq:     ["#fffbea", "#eddca8"],   // arriba → abajo
        papelDer:     ["#f9edc9", "#d9bf7e"],
        lazo:         ["#f77fa3", "#c22e5a"],   // claro → oscuro
    };

    // Punto donde se juntan todos los tallos (queda tapado por el papel)
    const BASE = { x: 160, y: 300 };

    // Número "al azar" pero siempre el mismo ramo: así se ve igual en cada visita
    function crearAzar(semilla) {
        return function () {
            semilla = (semilla + 0x6d2b79f5) | 0;
            let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const r1 = (n) => Math.round(n * 10) / 10;

    /* ------------------------------ Gradientes ------------------------------ */
    function degradado(id, colores, dir = 'x1="0" y1="1" x2="0" y2="0"') {
        const paradas = colores
            .map((c, i) => `<stop offset="${r1(i / (colores.length - 1) * 100) / 100}" stop-color="${c}"/>`)
            .join("");
        return `<linearGradient id="${id}" ${dir}>${paradas}</linearGradient>`;
    }

    function crearDefs() {
        return [
            degradado("gPetaloFondo", COLOR.petaloFondo),
            degradado("gPetaloFrente", COLOR.petaloFrente),
            degradado("gHojaOscura", COLOR.hojaOscura),
            degradado("gHojaClara", COLOR.hojaClara),
            degradado("gPapelIzq", COLOR.papelIzq, 'x1="0" y1="0" x2="1" y2="1"'),
            degradado("gPapelDer", COLOR.papelDer, 'x1="1" y1="0" x2="0" y2="1"'),
            degradado("gLazo", COLOR.lazo, 'x1="0" y1="0" x2="1" y2="1"'),
            `<radialGradient id="gCentro">
                <stop offset="0" stop-color="${COLOR.centro[0]}"/>
                <stop offset="1" stop-color="${COLOR.centro[1]}"/>
            </radialGradient>`,
            // Sombra suave alrededor de cada flor para que se note cuál va delante
            `<radialGradient id="gSombra">
                <stop offset="0.68" stop-color="#3a1600" stop-opacity="0.34"/>
                <stop offset="1" stop-color="#3a1600" stop-opacity="0"/>
            </radialGradient>`,
        ].join("");
    }

    /* -------------------------------- Flores -------------------------------- */
    // Un pétalo apuntando hacia arriba desde (0,0), con la punta un poco afilada
    function petalo(largo, ancho) {
        return `M0 0C${r1(-ancho)} ${r1(-largo * 0.22)} ${r1(-ancho * 1.1)} ${r1(-largo * 0.72)} 0 ${r1(-largo)}` +
               `C${r1(ancho * 1.1)} ${r1(-largo * 0.72)} ${r1(ancho)} ${r1(-largo * 0.22)} 0 0Z`;
    }

    function flor(f, azar) {
        const n = 15 + Math.floor(azar() * 3);      // entre 15 y 17 pétalos por capa
        const paso = 360 / n;
        const giro = azar() * paso;
        let fondo = "";
        let frente = "";

        // Capa de atrás: pétalos más largos y de tono más profundo
        for (let i = 0; i < n; i++) {
            const a = giro + i * paso + (azar() - 0.5) * 5;
            const l = 46 + (azar() - 0.5) * 5;
            fondo += `<g transform="rotate(${r1(a)})"><path d="${petalo(l, 10.5)}" fill="url(#gPetaloFondo)" stroke="#b86f00" stroke-opacity=".35" stroke-width=".6"/></g>`;
        }

        // Capa de adelante: más cortos, más claros y desfasados media vuelta
        for (let i = 0; i < n; i++) {
            const a = giro + paso / 2 + i * paso + (azar() - 0.5) * 5;
            const l = 38 + (azar() - 0.5) * 4;
            frente += `<g transform="rotate(${r1(a)})">` +
                `<path d="${petalo(l, 9.5)}" fill="url(#gPetaloFrente)"/>` +
                `<path d="M0 -9L0 ${r1(-l * 0.78)}" stroke="#c98000" stroke-opacity=".3" stroke-width=".8" stroke-linecap="round" fill="none"/>` +
                `</g>`;
        }

        // Centro con semillas en espiral (como un girasol)
        let semillas = "";
        for (let i = 1; i <= 38; i++) {
            const rad = 1.85 * Math.sqrt(i);
            const ang = i * 2.39996;                 // ángulo áureo: 137,5°
            semillas += `<circle cx="${r1(rad * Math.cos(ang))}" cy="${r1(rad * Math.sin(ang))}" r="${r1((0.75 + i * 0.012) * 100) / 100}"/>`;
        }

        return `<g transform="translate(${f.x} ${f.y})">
            <g class="florecer" style="--d:${r1(f.delay * 100) / 100}s">
                <g transform="rotate(${f.r}) scale(${f.s})">
                    <circle r="52" fill="url(#gSombra)"/>
                    ${fondo}
                    ${frente}
                    <circle r="15.5" fill="#b8770f"/>
                    <circle r="13.2" fill="url(#gCentro)"/>
                    <g fill="${COLOR.semillas}" opacity=".75">${semillas}</g>
                    <circle r="13.2" fill="none" stroke="#f6c453" stroke-opacity=".4"/>
                    <ellipse cx="-4" cy="-5" rx="5" ry="3" fill="#fff" opacity=".08" transform="rotate(-30)"/>
                </g>
            </g>
        </g>`;
    }

    /* --------------------------------- Hojas -------------------------------- */
    function hoja(h, i) {
        const { l, w } = h;
        const contorno = `M0 0C${-w} ${r1(-l * 0.2)} ${r1(-w * 1.05)} ${r1(-l * 0.7)} 0 ${-l}` +
                         `C${r1(w * 1.05)} ${r1(-l * 0.7)} ${w} ${r1(-l * 0.2)} 0 0Z`;
        const mitad = `M0 0C${w} ${r1(-l * 0.2)} ${r1(w * 1.05)} ${r1(-l * 0.7)} 0 ${-l}Z`;
        const vena = `M0 -3Q${r1(w * 0.1)} ${r1(-l * 0.5)} 0 ${r1(-l * 0.92)}`;
        const relleno = h.clara ? "gHojaClara" : "gHojaOscura";

        return `<g transform="translate(${h.bx} ${h.by}) rotate(${h.a})">
            <g class="hoja" style="--d:${r1((0.2 + i * 0.07) * 100) / 100}s">
                <path d="${contorno}" fill="url(#${relleno})"/>
                <path d="${mitad}" fill="#fff" opacity=".1"/>
                <path d="${vena}" fill="none" stroke="#d3f5c8" stroke-opacity=".45" stroke-linecap="round"/>
            </g>
        </g>`;
    }

    /* ---------------------------- Tallos y ramitas --------------------------- */
    function curva(x, y) {
        // Sale casi vertical desde la base y se abre hacia la flor
        const cx = BASE.x + (x - BASE.x) * 0.12;
        const cy = y + (BASE.y - y) * 0.55;
        return `M${BASE.x} ${BASE.y}Q${r1(cx)} ${r1(cy)} ${x} ${y}`;
    }

    function tallo(f) {
        return `<path class="tallo" pathLength="1" style="--d:${r1(f.delay - 0.5)}s" d="${curva(f.x, f.y)}" ` +
               `fill="none" stroke="${COLOR.tallo}" stroke-width="3.4" stroke-linecap="round"/>`;
    }

    // Ramitas finas con florecitas blancas, para rellenar los huecos
    function ramita(punta, j, azar) {
        const [x, y] = punta;
        const retraso = 0.6 + j * 0.08;
        let puntos = "";
        for (let i = 0; i < 5; i++) {
            const ang = azar() * Math.PI * 2;
            const dist = 2 + azar() * 8;
            const rad = 2.6 + azar() * 1.6;
            const color = i === 4 ? "#ffe8a3" : "#fff8e1";
            puntos += `<circle class="punto" cx="${r1(x + Math.cos(ang) * dist)}" cy="${r1(y + Math.sin(ang) * dist)}" ` +
                      `r="${r1(rad)}" fill="${color}" style="--d:${r1(retraso + 0.55 + i * 0.05)}s"/>`;
        }
        return `<path class="tallo" pathLength="1" style="--d:${r1(retraso)}s" d="${curva(x, y)}" ` +
               `fill="none" stroke="${COLOR.ramita}" stroke-width="1.5" stroke-linecap="round"/>${puntos}`;
    }

    /* ------------------------------ Papel y lazo ------------------------------ */
    function papel() {
        return `<g class="papel">
            <path d="M40 250Q100 262 160 282L178 392L138 392Z" fill="url(#gPapelIzq)"/>
            <path d="M280 250Q220 262 160 282L142 392L182 392Z" fill="url(#gPapelDer)"/>
            <path d="M150 284L160 282L142 392L132 392Z" fill="#000" opacity=".06"/>
            <path d="M160 282L142 392" stroke="#7a5a10" stroke-opacity=".25" stroke-width="1.4" fill="none"/>
            <path d="M214 276L172 392" stroke="#fff" stroke-opacity=".28" stroke-width="1.2" fill="none"/>
            <path d="M52 259L136 383" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" fill="none"/>
        </g>`;
    }

    function lazo() {
        return `<g class="lazo">
            <path d="M96 329Q160 338 224 329L214 345Q160 354 106 345Z" fill="url(#gLazo)"/>
            <path d="M157 343C149 362 139 378 129 392L141 387L146 397C155 378 162 362 165 345Z" fill="url(#gLazo)"/>
            <path d="M163 343C171 362 181 378 191 392L179 387L174 397C165 378 158 362 155 345Z" fill="url(#gLazo)"/>
            <path d="M160 341C132 314 98 322 106 346C112 364 148 356 160 341Z" fill="url(#gLazo)"/>
            <path d="M160 341C188 314 222 322 214 346C208 364 172 356 160 341Z" fill="url(#gLazo)"/>
            <path d="M158 341C138 328 118 334 121 346C124 354 144 350 158 341Z" fill="${COLOR.lazo[1]}" opacity=".45"/>
            <path d="M162 341C182 328 202 334 199 346C196 354 176 350 162 341Z" fill="${COLOR.lazo[1]}" opacity=".45"/>
            <rect x="151" y="332" width="18" height="18" rx="6" fill="url(#gLazo)"/>
            <path d="M154 337Q160 333 166 337" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round" fill="none"/>
        </g>`;
    }

    /* --------------------------- Armar todo el ramo --------------------------- */
    function buildBouquet() {
        const azar = crearAzar(7);

        // x, y = dónde queda el centro de la flor · s = tamaño · r = giro
        // n = en qué orden florece (0 = primera). El orden de la lista es el orden de capas:
        // las últimas quedan por delante.
        const flores = [
            { x: 160, y: 58,  s: 0.78, r: 4,   n: 6 },
            { x: 98,  y: 90,  s: 0.72, r: -18, n: 4 },
            { x: 222, y: 90,  s: 0.72, r: 20,  n: 5 },
            { x: 56,  y: 150, s: 0.66, r: -26, n: 7 },
            { x: 264, y: 150, s: 0.66, r: 30,  n: 8 },
            { x: 160, y: 124, s: 0.88, r: -6,  n: 0 },
            { x: 112, y: 174, s: 0.64, r: 12,  n: 2 },
            { x: 208, y: 174, s: 0.64, r: -14, n: 3 },
            { x: 160, y: 208, s: 0.64, r: 0,   n: 1 },
        ];
        flores.forEach((f) => { f.delay = 0.5 + f.n * 0.15 + 0.5; });

        // a = inclinación (grados) · l = largo · w = ancho
        const hojas = [
            { a: -64, l: 120, w: 22, bx: 156, by: 284 },
            { a: 64,  l: 120, w: 22, bx: 164, by: 284 },
            { a: -48, l: 150, w: 26, bx: 157, by: 284, clara: true },
            { a: 48,  l: 150, w: 26, bx: 163, by: 284, clara: true },
            { a: -30, l: 165, w: 24, bx: 158, by: 284 },
            { a: 30,  l: 165, w: 24, bx: 162, by: 284 },
            { a: -12, l: 150, w: 20, bx: 159, by: 284, clara: true },
            { a: 12,  l: 150, w: 20, bx: 161, by: 284, clara: true },
        ];

        const puntas = [
            [24, 118], [298, 112], [66, 40], [258, 44],
            [122, 14], [206, 12], [20, 184], [304, 180],
        ];

        bouquetContainer.innerHTML = `
            <svg class="bouquet-svg" viewBox="0 0 320 400" role="img" aria-label="Ramo de flores amarillas" xmlns="http://www.w3.org/2000/svg">
                <defs>${crearDefs()}</defs>
                <g class="balanceo">
                    ${puntas.map((p, j) => ramita(p, j, azar)).join("")}
                    ${hojas.map((h, i) => hoja(h, i)).join("")}
                    ${flores.map((f) => tallo(f)).join("")}
                    ${flores.map((f) => flor(f, azar)).join("")}
                    ${papel()}
                    ${lazo()}
                </g>
            </svg>`;
    }

    /* ---------------------------- Lluvia de pétalos --------------------------- */
    // Función para generar la lluvia de pétalos infinita
    function startPetalsRain() {
        const petalCount = 25; // Cantidad simultánea de pétalos cayendo

        for (let i = 0; i < petalCount; i++) {
            createFallingPetal(true);
        }
    }

    function createFallingPetal(randomInitialY = false) {
        const petal = document.createElement("div");
        petal.classList.add("falling-petal");

        // Tamaño aleatorio del pétalo
        const size = Math.floor(Math.random() * 8) + 10; // entre 10px y 17px
        petal.style.width = `${size}px`;
        petal.style.height = `${size * 1.6}px`;

        // Posición horizontal aleatoria
        const posX = Math.random() * 100;
        petal.style.left = `${posX}%`;

        // Cada pétalo se va de lado y da vueltas distinto, para que no caigan todos igual
        const deriva = (Math.random() - 0.5) * 160;
        const giro = (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 300);
        petal.style.setProperty("--deriva", `${deriva}px`);
        petal.style.setProperty("--giro", `${giro}deg`);

        // Si inicia al cargar la página, ubicarlos en diferentes alturas de la pantalla
        if (randomInitialY) {
            petal.style.top = `${Math.random() * -100}vh`;
        } else {
            petal.style.top = "-5vh";
        }

        // Duración de caída y retraso aleatorios para que se vea natural
        const duration = Math.random() * 4 + 5; // entre 5 y 9 segundos
        const delay = randomInitialY ? Math.random() * 5 : 0;

        petal.style.animationDuration = `${duration}s`;
        petal.style.animationDelay = `${delay}s`;

        petalsRainContainer.appendChild(petal);

        // Al terminar la animación de caída, reciclar el pétalo creándolos de nuevo arriba
        setTimeout(() => {
            petal.remove();
            createFallingPetal(false);
        }, (duration + delay) * 1000);
    }
});