document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('dados.json');
    const data = await response.json();
    const state = {
        disciplinas: data.disciplinas,
        conexoes: new Map()
    };

    renderGrade(state);
    carregarProgresso(state);
    window.addEventListener('resize', () => atualizarConexoes(state));
});

function renderGrade(state) {
    const container = document.getElementById('gradeContainer');
    container.innerHTML = ''; // Limpa a grade existente

    const svgConexoes = document.getElementById('conexoes');
    svgConexoes.innerHTML = ''; // Limpa as conexões SVG

    const periodos = [...new Set(state.disciplinas.map(d => d.periodo))].sort((a, b) => a - b);

    periodos.forEach(periodo => {
        const periodoDiv = document.createElement('div');
        periodoDiv.className = 'periodo';
        periodoDiv.innerHTML = `
            <div class="periodo-titulo">${periodo}º Período</div>
            <div class="disciplinas-container"></div>
        `;

        const disciplinasContainer = periodoDiv.querySelector('.disciplinas-container');
        const disciplinasPeriodo = state.disciplinas.filter(d => d.periodo === periodo);

        disciplinasPeriodo.forEach(disciplina => {
            const div = document.createElement('div');
            div.className = 'disciplina';
            div.textContent = disciplina.nome;
            div.dataset.id = disciplina.id;
            div.addEventListener('click', () => toggleConcluida(disciplina, div, state));
            disciplinasContainer.appendChild(div);
        });

        container.appendChild(periodoDiv);
    });

    desenharConexoes(state, svgConexoes);
}

function desenharConexoes(state, svg) {
    svg.innerHTML = '';
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("refX", "7");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", "0 0, 8 3, 0 6");
    poly.setAttribute("fill", "#95a5a6");
    
    marker.appendChild(poly);
    defs.appendChild(marker);
    svg.appendChild(defs);

    state.disciplinas.forEach(disciplina => {
        disciplina.preRequisitos.forEach(preReqId => {
            const origem = document.querySelector(`[data-id="${preReqId}"]`);
            const destino = document.querySelector(`[data-id="${disciplina.id}"]`);
            
            if (origem && destino) {
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.classList.add("conexao");
                updateConexao(origem, destino, path);
                svg.appendChild(path);
            }
        });
    });
}

function toggleConcluida(disciplina, element, state) {
    element.classList.toggle('concluida');
    disciplina.concluida = !disciplina.concluida;
    atualizarBloqueios(state);
    salvarProgresso(state);
}

function atualizarBloqueios(state) {
    state.disciplinas.forEach(d => {
        const element = document.querySelector(`[data-id="${d.id}"]`);
        if (element) {
            const preRequisitosCompletos = d.preRequisitos.every(id => 
                state.disciplinas.find(d => d.id === id)?.concluida
            );
            
            element.classList.toggle('bloqueada', !preRequisitosCompletos && !d.concluida);
        }
    });
}

function salvarProgresso(state) {
    const progresso = state.disciplinas
        .filter(d => d.concluida)
        .map(d => d.id);
    
    localStorage.setItem('progresso', JSON.stringify(progresso));
}

function carregarProgresso(state) {
    const progresso = JSON.parse(localStorage.getItem('progresso') || '[]');
    
    progresso.forEach(id => {
        const disciplina = state.disciplinas.find(d => d.id === id);
        const element = document.querySelector(`[data-id="${id}"]`);
        if (disciplina && element) {
            disciplina.concluida = true;
            element.classList.add('concluida');
        }
    });
    
    atualizarBloqueios(state);
}

function updateConexao(origem, destino, path) {
    const origRect = origem.getBoundingClientRect();
    const destRect = destino.getBoundingClientRect();
    
    const start = {
        x: origRect.right + window.scrollX,
        y: origRect.top + origRect.height/2 + window.scrollY
    };
    
    const end = {
        x: destRect.left + window.scrollX,
        y: destRect.top + destRect.height/2 + window.scrollY
    };
    
    path.setAttribute("d", `M${start.x},${start.y} C${start.x + 50},${start.y} ${end.x - 50},${end.y} ${end.x},${end.y}`);
}

function atualizarConexoes(state) {
    const svg = document.getElementById('conexoes');
    svg.innerHTML = ''; // Limpa conexões antigas

    state.disciplinas.forEach(disciplina => {
        disciplina.preRequisitos.forEach(preReqId => {
            const origem = document.querySelector(`[data-id="${preReqId}"]`);
            const destino = document.querySelector(`[data-id="${disciplina.id}"]`);
            
            if (origem && destino) {
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.classList.add("conexao");
                updateConexao(origem, destino, path);
                svg.appendChild(path);
            }
        });
    });
}


// Mantenha as demais funções (toggleConcluida, atualizarBloqueios, etc.) como no código anterior