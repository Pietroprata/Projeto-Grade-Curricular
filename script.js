// ========== CONSTANTES ==========
const SELECTORS = {
    GRADE_CONTAINER: '#gradeContainer',
    CONEXOES: '#conexoes'
};

const CLASSES = {
    BLOQUEADA: 'bloqueada',
    CONCLUIDA: 'concluida',
    DISPONIVEL: 'disponivel'
};

// ========== GERENCIAMENTO DE ESTADO ==========
class GradeState {
    constructor(disciplinas) {
        this.disciplinas = new Map(disciplinas.map(d => [d.id, d]));
        this.carregarProgresso();
    }

    carregarProgresso() {
        const progresso = JSON.parse(localStorage.getItem('progresso') || '[]');
        progresso.forEach(id => {
            const disciplina = this.disciplinas.get(id);
            if (disciplina) disciplina.concluida = true;
        });
    }

    salvarProgresso() {
        const progresso = [...this.disciplinas.values()]
            .filter(d => d.concluida)
            .map(d => d.id);
        localStorage.setItem('progresso', JSON.stringify(progresso));
    }

    verificarDisponibilidade(disciplina) {
        return disciplina.preRequisitos.every(id => {
            const preReq = this.disciplinas.get(id);
            return preReq?.concluida;
        });
    }

    atualizarDependencias(id) {
        [...this.disciplinas.values()].forEach(d => {
            if (d.preRequisitos.includes(id)) {
                this.atualizarEstado(d);
            }
        });
    }

    atualizarEstado(disciplina) {
        disciplina.disponivel = this.verificarDisponibilidade(disciplina);
    }
}

// ========== RENDERIZAÇÃO ==========
class GradeRenderer {
    constructor(state) {
        this.state = state;
        this.init();
    }

    init() {
        this.renderGrade();
        this.renderConexoes();
        this.setupEventListeners();
        this.atualizarProgresso();
    }
    atualizarProgresso() {
        const total = this.state.disciplinas.size;
        const concluidas = [...this.state.disciplinas.values()].filter(d => d.concluida).length;
        const progresso = (concluidas / total) * 100;

        const barra = document.querySelector('.barra-progresso');
        if (barra) {
            barra.style.width = `${progresso}%`;
            barra.textContent = `${concluidas}/${total} (${progresso.toFixed(1)}%)`;
        }
    }

    renderGrade() {
        const container = document.querySelector(SELECTORS.GRADE_CONTAINER);
        container.innerHTML = '';

        const periodos = [...new Set([...this.state.disciplinas.values()]
            .map(d => d.periodo))].sort((a, b) => a - b);

        periodos.forEach(periodo => {
            const periodoDiv = this.criarPeriodo(periodo);
            container.appendChild(periodoDiv);
        });
    }

    

    criarPeriodo(periodo) {
        const div = document.createElement('div');
        div.className = 'periodo';
        div.innerHTML = `<div class="periodo-titulo">${periodo}º Período</div>`;

        const disciplinasContainer = document.createElement('div');
        disciplinasContainer.className = 'disciplinas-container';

        [...this.state.disciplinas.values()]
            .filter(d => d.periodo === periodo)
            .forEach(d => {
                disciplinasContainer.appendChild(this.criarDisciplina(d));
            });

        div.appendChild(disciplinasContainer);
        return div;
    }

    criarDisciplina(disciplina) {
        const div = document.createElement('div');
        div.className = `disciplina ${this.getEstadoClasses(disciplina)}`;
        div.textContent = disciplina.nome;
        div.dataset.id = disciplina.id;
    
        // Adiciona o evento de clique a todas as disciplinas
        div.addEventListener('click', () => this.toggleConcluida(disciplina));
    
        // Adiciona eventos de mouseover e mouseout para todas as disciplinas
        div.addEventListener('mouseover', () => this.destacarRelacionadas(disciplina));
        div.addEventListener('mouseout', () => this.removerDestaqueRelacionadas(disciplina));
    
        return div;
    }
    
    destacarRelacionadas(disciplina) {
        // Destaca os pré-requisitos faltantes
        disciplina.preRequisitos.forEach(preReqId => {
            const preReq = this.state.disciplinas.get(preReqId);
            if (preReq && !preReq.concluida) {
                const preReqElement = document.querySelector(`[data-id="${preReqId}"]`);
                if (preReqElement) {
                    preReqElement.classList.add('destaque-pre-requisito');
                }
            }
        });
    
        // Destaca as disciplinas que dependem desta (se houver)
        [...this.state.disciplinas.values()].forEach(d => {
            if (d.preRequisitos.includes(disciplina.id)) {
                const dependenteElement = document.querySelector(`[data-id="${d.id}"]`);
                if (dependenteElement) {
                    dependenteElement.classList.add('destaque-dependente');
                }
            }
        });
    
        // Adiciona um tooltip com informações
        this.mostrarTooltip(disciplina);
    }
    
    removerDestaqueRelacionadas(disciplina) {
        // Remove o destaque dos pré-requisitos
        disciplina.preRequisitos.forEach(preReqId => {
            const preReqElement = document.querySelector(`[data-id="${preReqId}"]`);
            if (preReqElement) {
                preReqElement.classList.remove('destaque-pre-requisito');
            }
        });
    
        // Remove o destaque das disciplinas dependentes
        [...this.state.disciplinas.values()].forEach(d => {
            if (d.preRequisitos.includes(disciplina.id)) {
                const dependenteElement = document.querySelector(`[data-id="${d.id}"]`);
                if (dependenteElement) {
                    dependenteElement.classList.remove('destaque-dependente');
                }
            }
        });
    
        // Remove o tooltip
        this.removerTooltip();
    }
    
    mostrarTooltip(disciplina) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerHTML = `
            <strong>${disciplina.nome}</strong><br>
            ${disciplina.concluida ? 'Concluída' : 'Não concluída'}<br>
            Pré-requisitos faltantes: ${disciplina.preRequisitos
                .filter(preReqId => !this.state.disciplinas.get(preReqId).concluida)
                .map(preReqId => this.state.disciplinas.get(preReqId).nome)
                .join(', ') || 'Nenhum'}
        `;
    
        const disciplinaElement = document.querySelector(`[data-id="${disciplina.id}"]`);
        disciplinaElement.appendChild(tooltip);
    }
    
    removerTooltip() {
        const tooltips = document.querySelectorAll('.tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    }
    getEstadoClasses(disciplina) {
        return [
            disciplina.concluida ? CLASSES.CONCLUIDA : '',
            !disciplina.concluida && !disciplina.disponivel ? CLASSES.BLOQUEADA : '',
            !disciplina.concluida && disciplina.disponivel ? CLASSES.DISPONIVEL : ''
        ].join(' ').trim();
    }
    
    toggleConcluida(disciplina) {
        // Alterna o estado de conclusão
        disciplina.concluida = !disciplina.concluida;

        // Atualiza o progresso no localStorage
        this.state.salvarProgresso();

        // Atualiza a disciplina visualmente
        this.atualizarDisciplina(disciplina);

        // Atualiza todas as dependências
        this.state.atualizarDependencias(disciplina.id);

        // Atualiza a interface de forma imediata
        [...this.state.disciplinas.values()].forEach(d => 
            this.state.atualizarEstado(d)
        );
        this.renderGrade(); // Re-renderiza a grade para refletir mudanças
        this.renderConexoes(true); // Atualiza conexões sem limpar tudo

        // Atualiza a barra de progresso
        this.atualizarProgresso();
    }
    

    atualizarDisciplina(disciplina) {
        const element = document.querySelector(`[data-id="${disciplina.id}"]`);
        if (element) {
            element.className = `disciplina ${this.getEstadoClasses(disciplina)}`;
        }
    }

    // ========== CONEXÕES ==========
    renderConexoes(updateOnly = false) {
        const svg = document.querySelector(SELECTORS.CONEXOES);
        
        if (!updateOnly) {
            svg.innerHTML = `
                <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" 
                    refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#95a5a6"/>
                    </marker>
                </defs>
            `;
        }

        [...this.state.disciplinas.values()].forEach(d => {
            d.preRequisitos.forEach(preReqId => {
                this.criarConexao(preReqId, d.id, svg);
            });
        });
    }

    criarConexao(origemId, destinoId, svg) {
        const origem = document.querySelector(`[data-id="${origemId}"]`);
        const destino = document.querySelector(`[data-id="${destinoId}"]`);
        
        if (origem && destino) {
            const path = this.getConexaoPath(origem, destino);
            path.classList.add('conexao');
            path.setAttribute('marker-end', 'url(#arrowhead)');
            svg.appendChild(path);
        }
    }

    getConexaoPath(origem, destino) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
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
        return path;
    }

    // ========== EVENTOS ==========
    setupEventListeners() {
        // Evento de clique para ativar/desativar o modo de visualização de dependências
        document.querySelector(SELECTORS.GRADE_CONTAINER).addEventListener('click', (event) => {
            const disciplinaElement = event.target.closest('.disciplina');
            if (disciplinaElement) {
                const disciplinaId = disciplinaElement.dataset.id;
                const disciplina = this.state.disciplinas.get(disciplinaId);
    
                if (disciplinaElement.classList.contains('dependencia-destacada')) {
                    this.limparDestaques();
                } else {
                    this.visualizarDependencias(disciplina);
                }
            } else {
                this.limparDestaques(); // Desativa o modo ao clicar fora
            }
        });
        window.addEventListener('resize', resizeHandler);
        window.addEventListener('orientationchange', resizeHandler);
    }
    visualizarDependencias(disciplina) {
        // Limpa destaque anterior
        this.limparDestaques();

        // Encontra todas as dependências diretas e indiretas
        const dependencias = this.encontrarDependencias(disciplina.id);

        // Destaca as disciplinas dependentes
        dependencias.forEach(id => {
            const dependenciaElement = document.querySelector(`[data-id="${id}"]`);
            if (dependenciaElement) {
                dependenciaElement.classList.add('dependencia-destacada');
            }
        });

        // Mostra um tooltip ou painel com a lista de dependências
        this.mostrarListaDependencias(dependencias);
    }

    encontrarDependencias(disciplinaId, dependencias = new Set()) {
        // Encontra todas as disciplinas que dependem direta ou indiretamente da disciplina selecionada
        [...this.state.disciplinas.values()].forEach(d => {
            if (d.preRequisitos.includes(disciplinaId) && !dependencias.has(d.id)) {
                dependencias.add(d.id);
                this.encontrarDependencias(d.id, dependencias); // Recursão para dependências indiretas
            }
        });
        return [...dependencias];
    }

    limparDestaques() {
        // Remove o destaque de todas as disciplinas
        document.querySelectorAll('.dependencia-destacada').forEach(element => {
            element.classList.remove('dependencia-destacada');
        });
    }

    mostrarListaDependencias(dependencias) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip-dependencias';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <strong>Disciplinas que dependem desta:</strong>
                <ul>
                    ${dependencias.map(id => `<li>${this.state.disciplinas.get(id).nome}</li>`).join('')}
                </ul>
            </div>
        `;
    
        // Posiciona o tooltip próximo à disciplina selecionada
        const disciplinaElement = document.querySelector(`[data-id="${disciplina.id}"]`);
        disciplinaElement.appendChild(tooltip);
    }
}


// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Limpa o progresso armazenado
        localStorage.removeItem('progresso');
        
        const response = await fetch('dados.json');
        const data = await response.json();
        
        const state = new GradeState(data.disciplinas);
        [...state.disciplinas.values()].forEach(d => 
            state.atualizarEstado(d)
        );

        new GradeRenderer(state);

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar a grade. Recarregue a página.');
    }
});
