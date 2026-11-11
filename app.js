// COLE O SEU LINK AQUI (com as aspas no final!)
const URL_GOOGLE_SHEETS = "COLE_AQUI_O_SEU_LINK";

let dadosApp = { config: {}, categorias: [], contas: [] };

document.addEventListener("DOMContentLoaded", () => {
    iniciarContagemRegressiva();
    carregarDados();
    document.getElementById("form-categoria").addEventListener("submit", salvarCategoria);
    document.getElementById("form-conta").addEventListener("submit", salvarConta);
});

function abrirAba(idAba) {
    document.querySelectorAll(".aba-conteudo").forEach(aba => aba.style.display = "none");
    document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("aba-ativa"));
    document.getElementById(`aba-${idAba}`).style.display = "block";
    event.target.classList.add("aba-ativa");
}

function iniciarContagemRegressiva() {
    const dataCasamento = new Date("2027-06-30T00:00:00").getTime();
    const intervalo = setInterval(() => {
        const agora = new Date().getTime();
        const diferenca = dataCasamento - agora;
        if (diferenca < 0) { clearInterval(intervalo); return; }
        const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById("contagem-regressiva").innerHTML = `Faltam ${dias}d ${horas}h ${minutos}m`;
    }, 1000);
}

async function carregarDados() {
    try {
        const resposta = await fetch(`${URL_GOOGLE_SHEETS}?action=getDados`);
        dadosApp = await resposta.json();
        atualizarTela();
    } catch (erro) { console.error("Erro:", erro); }
}

function atualizarTela() {
    const teto = parseFloat(dadosApp.config.Teto_Gastos) || 0;
    let totalPago = 0;
    if (dadosApp.categorias) dadosApp.categorias.forEach(cat => totalPago += parseFloat(cat.pago) || 0);

    document.getElementById("teto-gastos").innerText = formatarMoeda(teto);
    document.getElementById("total-comprometido").innerText = formatarMoeda(totalPago);
    const saldo = teto - totalPago;
    const elSaldo = document.getElementById("saldo-disponivel");
    elSaldo.innerText = formatarMoeda(saldo);
    elSaldo.className = saldo < 0 ? "texto-vermelho" : "texto-verde";

    let porcentagem = (totalPago / teto) * 100;
    if (porcentagem > 100) porcentagem = 100;
    document.getElementById("barra-progresso").style.width = `${porcentagem}%`;

    // RENDERIZAR CATEGORIAS
    const listaCat = document.getElementById("lista-categorias");
    listaCat.innerHTML = ""; 
    const selectCat = document.getElementById("conta-categoria");
    selectCat.innerHTML = "<option value=''>Selecione...</option>";

    if (dadosApp.categorias) {
        dadosApp.categorias.forEach(cat => {
            listaCat.innerHTML += `
                <div class="item-card">
                    <div class="item-info">
                        <h4>${cat.categoria}</h4>
                        <p>Status: ${cat.status}</p>
                    </div>
                    <div class="item-valores" style="display: flex; flex-direction: column; align-items: flex-end;">
                        <strong>Pago: ${formatarMoeda(cat.pago)}</strong>
                        <span>Est: ${formatarMoeda(cat.estimado)}</span>
                        <div>
                            <button onclick="abrirModalCategoria('${cat.id}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem;">✏️</button>
                            <button onclick="excluirCategoria('${cat.id}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem;">🗑️</button>
                        </div>
                    </div>
                </div>`;
            selectCat.innerHTML += `<option value="${cat.categoria}">${cat.categoria}</option>`;
        });
    }

    // RENDERIZAR CONTAS
    const listaContas = document.getElementById("lista-contas");
    listaContas.innerHTML = "";
    if (dadosApp.contas) {
        dadosApp.contas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento)).forEach(conta => {
            let dataFormatada = "Data Inválida";
            if(conta.vencimento) {
                const dataObj = new Date(conta.vencimento);
                dataFormatada = new Date(dataObj.getTime() + dataObj.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
            }
            const corBorda = conta.status === "Pago" ? "#2ecc71" : "#f39c12";
            
            listaContas.innerHTML += `
                <div class="item-card" style="border-left-color: ${corBorda};">
                    <div class="item-info">
                        <h4>${conta.desc}</h4>
                        <p>Vence: ${dataFormatada} | Parcela ${conta.parcelaAtual}/${conta.totalParcelas}</p>
                    </div>
                    <div class="item-valores" style="display: flex; flex-direction: column; align-items: flex-end;">
                        <strong>${formatarMoeda(conta.valor)}</strong>
                        <span style="color: ${corBorda}; font-weight: bold;">${conta.status}</span>
                        <div>
                            <button onclick="abrirModalConta('${conta.id}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem;">✏️</button>
                            <button onclick="excluirConta('${conta.id}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem;">🗑️</button>
                        </div>
                    </div>
                </div>`;
        });
    }
}

// --- FUNÇÕES DE CATEGORIA ---
function abrirModalCategoria(id = null) {
    document.getElementById("form-categoria").reset();
    document.getElementById("cat-id").value = "";
    document.getElementById("titulo-modal-categoria").innerText = "Nova Categoria";

    if (id) {
        const cat = dadosApp.categorias.find(c => c.id == id);
        if (cat) {
            document.getElementById("titulo-modal-categoria").innerText = "Editar Categoria";
            document.getElementById("cat-id").value = cat.id;
            document.getElementById("cat-nome").value = cat.categoria;
            document.getElementById("cat-estimado").value = cat.estimado;
            document.getElementById("cat-pago").value = cat.pago;
            document.getElementById("cat-status").value = cat.status;
        }
    }
    document.getElementById("modal-categoria").style.display = "flex";
}

async function salvarCategoria(e) {
    e.preventDefault();
    const id = document.getElementById("cat-id").value;
    const dadosEnvio = {
        action: id ? "updateCategoria" : "addCategoria",
        id: id,
        nome: document.getElementById("cat-nome").value,
        estimado: document.getElementById("cat-estimado").value,
        pago: document.getElementById("cat-pago").value,
        status: document.getElementById("cat-status").value
    };

    await fetch(URL_GOOGLE_SHEETS, { method: 'POST', body: JSON.stringify(dadosEnvio) });
    fecharModal('modal-categoria');
    carregarDados(); 
}

async function excluirCategoria(id) {
    if (confirm("Excluir esta categoria?")) {
        await fetch(URL_GOOGLE_SHEETS, { method: 'POST', body: JSON.stringify({ action: "deleteCategoria", id: id }) });
        carregarDados();
    }
}

// --- FUNÇÕES DE CONTA ---
function abrirModalConta(id = null) {
    document.getElementById("form-conta").reset();
    document.getElementById("conta-id").value = "";
    document.getElementById("titulo-modal-conta").innerText = "Nova Conta a Pagar";
    
    // Mostra opções de parcelamento e valor total (só para contas novas)
    document.getElementById("div-valor-total").style.display = "block";
    document.getElementById("div-parcelamento").style.display = "block";
    document.getElementById("conta-valor").required = true;

    if (id) {
        const conta = dadosApp.contas.find(c => c.id == id);
        if (conta) {
            document.getElementById("titulo-modal-conta").innerText = "Editar Conta";
            document.getElementById("conta-id").value = conta.id;
            document.getElementById("conta-desc").value = conta.desc;
            document.getElementById("conta-categoria").value = conta.cat;
            document.getElementById("conta-data").value = conta.vencimento;
            document.getElementById("conta-status").value = conta.status;
            
            // Esconde opções que não devem ser editadas numa parcela específica
            document.getElementById("div-valor-total").style.display = "none";
            document.getElementById("div-parcelamento").style.display = "none";
            document.getElementById("conta-valor").required = false;
        }
    }
    document.getElementById("modal-conta").style.display = "flex";
}

async function salvarConta(e) {
    e.preventDefault();
    const id = document.getElementById("conta-id").value;
    
    if (id) {
        // Editar conta existente
        const dadosEnvio = {
            action: "updateConta", id: id,
            descricao: document.getElementById("conta-desc").value,
            categoria: document.getElementById("conta-categoria").value,
            valor: document.getElementById("conta-valor").value || 0, // O valor não muda na edição
            vencimento: document.getElementById("conta-data").value,
            status: document.getElementById("conta-status").value
        };
        await fetch(URL_GOOGLE_SHEETS, { method: 'POST', body: JSON.stringify(dadosEnvio) });
    } else {
        // Criar nova conta
        const parcelado = document.getElementById("conta-parcelado").value;
        const dadosEnvio = {
            action: "addConta",
            descricao: document.getElementById("conta-desc").value,
            categoria: document.getElementById("conta-categoria").value,
            valorTotal: document.getElementById("conta-valor").value,
            primeiroVencimento: document.getElementById("conta-data").value,
            parcelado: parcelado,
            numParcelas: parcelado === "2" ? document.getElementById("conta-num-parcelas").value : 1,
            status: document.getElementById("conta-status").value
        };
        await fetch(URL_GOOGLE_SHEETS, { method: 'POST', body: JSON.stringify(dadosEnvio) });
    }
    
    fecharModal('modal-conta');
    carregarDados();
}

async function excluirConta(id) {
    if (confirm("Excluir esta conta?")) {
        await fetch(URL_GOOGLE_SHEETS, { method: 'POST', body: JSON.stringify({ action: "deleteConta", id: id }) });
        carregarDados();
    }
}

// --- APOIO ---
function fecharModal(id) { document.getElementById(id).style.display = "none"; }
function toggleParcelas() { document.getElementById("div-parcelas").style.display = document.getElementById("conta-parcelado").value === "2" ? "block" : "none"; }
function formatarMoeda(valor) { return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
