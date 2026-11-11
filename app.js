// COLE O SEU LINK AQUI (Não esqueça das aspas no final!)
const URL_GOOGLE_SHEETS = "https://script.google.com/macros/s/AKfycbz_wWUEkTxmppUtfVuY1_SaOkEzpa_6YXbChYyRyBGrz-Y_ELTJjCEb9_bdXFHia-xq/exec";

let dadosApp = { config: {}, categorias: [], contas: [] };

document.addEventListener("DOMContentLoaded", () => {
    iniciarContagemRegressiva();
    carregarDados();
    
    document.getElementById("form-categoria").addEventListener("submit", salvarCategoria);
    document.getElementById("form-conta").addEventListener("submit", salvarConta);
});

function abrirAba(idAba) {
    const abas = document.querySelectorAll(".aba-conteudo");
    abas.forEach(aba => aba.style.display = "none");

    const botoes = document.querySelectorAll("nav button");
    botoes.forEach(btn => btn.classList.remove("aba-ativa"));

    document.getElementById(`aba-${idAba}`).style.display = "block";
    event.target.classList.add("aba-ativa");
}

function iniciarContagemRegressiva() {
    const dataCasamento = new Date("2027-06-30T00:00:00").getTime();
    const intervalo = setInterval(() => {
        const agora = new Date().getTime();
        const diferenca = dataCasamento - agora;

        if (diferenca < 0) {
            clearInterval(intervalo);
            document.getElementById("contagem-regressiva").innerHTML = "O grande dia chegou! 🎉";
            return;
        }

        const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));

        document.getElementById("contagem-regressiva").innerHTML = `Faltam ${dias}d ${horas}h ${minutos}m`;
    }, 1000);
}

async function carregarDados() {
    try {
        const resposta = await fetch(`${URL_GOOGLE_SHEETS}?action=getDados`);
        const dados = await resposta.json();
        dadosApp = dados;
        atualizarTela();
    } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
    }
}

function atualizarTela() {
    const teto = parseFloat(dadosApp.config.Teto_Gastos) || 0;
    let totalPago = 0;
    
    // Garante que categorias existe antes de tentar ler
    if (dadosApp.categorias && Array.isArray(dadosApp.categorias)) {
        dadosApp.categorias.forEach(cat => {
            totalPago += parseFloat(cat.pago) || 0;
        });
    }

    const saldo = teto - totalPago;

    document.getElementById("teto-gastos").innerText = formatarMoeda(teto);
    document.getElementById("total-comprometido").innerText = formatarMoeda(totalPago);
    document.getElementById("saldo-disponivel").innerText = formatarMoeda(saldo);
    
    const elSaldo = document.getElementById("saldo-disponivel");
    if (saldo < 0) { elSaldo.className = "texto-vermelho"; } else { elSaldo.className = "texto-verde"; }

    let porcentagem = (totalPago / teto) * 100;
    if (porcentagem > 100) porcentagem = 100;
    document.getElementById("barra-progresso").style.width = `${porcentagem}%`;

    // Lista de Categorias COM BOTÃO EXCLUIR
    const listaCat = document.getElementById("lista-categorias");
    listaCat.innerHTML = ""; 
    const selectCat = document.getElementById("conta-categoria");
    selectCat.innerHTML = "<option value=''>Selecione...</option>";

    if (dadosApp.categorias && Array.isArray(dadosApp.categorias)) {
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
                        <button onclick="excluirCategoria('${cat.id}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; margin-top:5px;" title="Excluir">🗑️</button>
                    </div>
                </div>
            `;
            selectCat.innerHTML += `<option value="${cat.categoria}">${cat.categoria}</option>`;
        });
    }

    // Lista de Contas
    const listaContas = document.getElementById("lista-contas");
    listaContas.innerHTML = "";
    
    if (dadosApp.contas && Array.isArray(dadosApp.contas)) {
        const contasOrdenadas = dadosApp.contas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

        contasOrdenadas.forEach(conta => {
            let dataFormatada = "Data Inválida";
            if(conta.vencimento) {
                const dataObj = new Date(conta.vencimento);
                // Ajuste para evitar erro de fuso horário na formatação
                dataFormatada = new Date(dataObj.getTime() + dataObj.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
            }

            listaContas.innerHTML += `
                <div class="item-card" style="border-left-color: #f39c12;">
                    <div class="item-info">
                        <h4>${conta.desc}</h4>
                        <p>Vence: ${dataFormatada} | Parcela ${conta.parcelaAtual}/${conta.totalParcelas}</p>
                    </div>
                    <div class="item-valores">
                        <strong>${formatarMoeda(conta.valor)}</strong>
                        <span>${conta.status}</span>
                    </div>
                </div>
            `;
        });
    }
}

async function salvarCategoria(e) {
    e.preventDefault();
    const nome = document.getElementById("cat-nome").value;
    const estimado = document.getElementById("cat-estimado").value;

    await fetch(URL_GOOGLE_SHEETS, {
        method: 'POST',
        body: JSON.stringify({ action: "addCategoria", nome: nome, estimado: estimado })
    });
    fecharModal('modal-categoria');
    document.getElementById("form-categoria").reset();
    carregarDados(); 
}

// NOVA FUNÇÃO: EXCLUIR CATEGORIA
async function excluirCategoria(id) {
    if (confirm("Tem certeza que deseja excluir esta categoria? Os valores serão apagados.")) {
        await fetch(URL_GOOGLE_SHEETS, {
            method: 'POST',
            body: JSON.stringify({ action: "deleteCategoria", id: id })
        });
        carregarDados();
    }
}

async function salvarConta(e) {
    e.preventDefault();
    const desc = document.getElementById("conta-desc").value;
    const categoria = document.getElementById("conta-categoria").value;
    const valorTotal = document.getElementById("conta-valor").value;
    const dataVenc = document.getElementById("conta-data").value;
    const parcelado = document.getElementById("conta-parcelado").value;
    const numParcelas = document.getElementById("conta-num-parcelas").value;

    await fetch(URL_GOOGLE_SHEETS, {
        method: 'POST',
        body: JSON.stringify({
            action: "addConta", descricao: desc, categoria: categoria, valorTotal: valorTotal,
            primeiroVencimento: dataVenc, parcelado: parcelado, numParcelas: parcelado === "2" ? numParcelas : 1
        })
    });
    fecharModal('modal-conta');
    document.getElementById("form-conta").reset();
    toggleParcelas(); 
    carregarDados();
}

function abrirModal(id) { document.getElementById(id).style.display = "flex"; }
function fecharModal(id) { document.getElementById(id).style.display = "none"; }

function toggleParcelas() {
    const select = document.getElementById("conta-parcelado");
    const divParcelas = document.getElementById("div-parcelas");
    divParcelas.style.display = (select.value === "2") ? "block" : "none";
}

function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
