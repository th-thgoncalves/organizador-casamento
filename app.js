// ==========================================
// CONFIGURAÇÃO INICIAL (COLE SEU LINK AQUI!)
// ==========================================
// Cole o link do seu App da Web do Google Apps Script entre as aspas abaixo.
// Exemplo: const URL_GOOGLE_SHEETS = "https://script.google.com/macros/s/SEU_ID/exec";
const URL_GOOGLE_SHEETS = "https://script.google.com/macros/s/AKfycbz_wWUEkTxmppUtfVuY1_SaOkEzpa_6YXbChYyRyBGrz-Y_ELTJjCEb9_bdXFHia-xq/exec";

// Variáveis globais para guardar os dados carregados
let dadosApp = { config: {}, categorias: [], contas: [] };

// ==========================================
// INICIALIZAÇÃO DO APP
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    iniciarContagemRegressiva();
    carregarDados();
    
    // Configurar envio dos formulários
    document.getElementById("form-categoria").addEventListener("submit", salvarCategoria);
    document.getElementById("form-conta").addEventListener("submit", salvarConta);
});

// ==========================================
// NAVEGAÇÃO ENTRE ABAS
// ==========================================
function abrirAba(idAba) {
    // Esconde todas as abas
    const abas = document.querySelectorAll(".aba-conteudo");
    abas.forEach(aba => aba.style.display = "none");

    // Remove a classe ativa de todos os botões
    const botoes = document.querySelectorAll("nav button");
    botoes.forEach(btn => btn.classList.remove("aba-ativa"));

    // Mostra a aba clicada e marca o botão
    document.getElementById(`aba-${idAba}`).style.display = "block";
    event.target.classList.add("aba-ativa");
}

// ==========================================
// CONTAGEM REGRESSIVA
// ==========================================
function iniciarContagemRegressiva() {
    // Data alvo (30/06/2027) - Vamos puxar isso da planilha depois, mas deixamos um padrão aqui.
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

// ==========================================
// CARREGAR DADOS DA PLANILHA
// ==========================================
async function carregarDados() {
    if (URL_GOOGLE_SHEETS === "COLE_AQUI_O_SEU_LINK") {
        alert("Atenção: Você esqueceu de colocar o link do Google Sheets no arquivo app.js!");
        return;
    }

    try {
        const resposta = await fetch(`${URL_GOOGLE_SHEETS}?action=getDados`);
        const dados = await resposta.json();
        
        dadosApp = dados;
        
        atualizarTela();
    } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
        alert("Erro ao conectar com o banco de dados. Verifique o link no app.js.");
    }
}

// ==========================================
// ATUALIZAR A TELA COM OS DADOS
// ==========================================
function atualizarTela() {
    // 1. Atualizar Resumo Financeiro
    const teto = parseFloat(dadosApp.config.Teto_Gastos) || 0;
    
    // Soma o valor pago de todas as categorias
    let totalPago = 0;
    dadosApp.categorias.forEach(cat => {
        totalPago += parseFloat(cat.pago) || 0;
    });

    const saldo = teto - totalPago;

    document.getElementById("teto-gastos").innerText = formatarMoeda(teto);
    document.getElementById("total-comprometido").innerText = formatarMoeda(totalPago);
    document.getElementById("saldo-disponivel").innerText = formatarMoeda(saldo);
    
    // Cor do saldo
    const elSaldo = document.getElementById("saldo-disponivel");
    if (saldo < 0) {
        elSaldo.className = "texto-vermelho";
    } else {
        elSaldo.className = "texto-verde";
    }

    // Barra de Progresso
    let porcentagem = (totalPago / teto) * 100;
    if (porcentagem > 100) porcentagem = 100;
    document.getElementById("barra-progresso").style.width = `${porcentagem}%`;

    // 2. Atualizar Lista de Categorias
    const listaCat = document.getElementById("lista-categorias");
    listaCat.innerHTML = ""; // Limpa
    const selectCat = document.getElementById("conta-categoria");
    selectCat.innerHTML = "<option value=''>Selecione...</option>";

    dadosApp.categorias.forEach(cat => {
        // Adiciona na lista visual
        listaCat.innerHTML += `
            <div class="item-card">
                <div class="item-info">
                    <h4>${cat.categoria}</h4>
                    <p>Status: ${cat.status}</p>
                </div>
                <div class="item-valores">
                    <strong>Pago: ${formatarMoeda(cat.pago)}</strong>
                    <span>Est: ${formatarMoeda(cat.estimado)}</span>
                </div>
            </div>
        `;
        
        // Adiciona no Select do modal de contas
        selectCat.innerHTML += `<option value="${cat.categoria}">${cat.categoria}</option>`;
    });

    // 3. Atualizar Lista de Contas a Pagar
    const listaContas = document.getElementById("lista-contas");
    listaContas.innerHTML = "";
    
    // Ordenar contas pela data de vencimento
    const contasOrdenadas = dadosApp.contas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

    contasOrdenadas.forEach(conta => {
        // Formatar a data para o padrão brasileiro
        let dataFormatada = "Data Inválida";
        if(conta.vencimento) {
            const dataObj = new Date(conta.vencimento);
            dataFormatada = dataObj.toLocaleDateString('pt-BR');
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

// ==========================================
// ENVIAR NOVA CATEGORIA PARA A PLANILHA
// ==========================================
async function salvarCategoria(e) {
    e.preventDefault();
    const nome = document.getElementById("cat-nome").value;
    const estimado = document.getElementById("cat-estimado").value;

    const dadosEnvio = {
        action: "addCategoria",
        nome: nome,
        estimado: estimado
    };

    try {
        await fetch(URL_GOOGLE_SHEETS, {
            method: 'POST',
            body: JSON.stringify(dadosEnvio)
        });
        fecharModal('modal-categoria');
        document.getElementById("form-categoria").reset();
        carregarDados(); // Recarrega os dados atualizados
    } catch (erro) {
        alert("Erro ao salvar categoria.");
    }
}

// ==========================================
// ENVIAR NOVA CONTA A PAGAR (COM PARCELAS)
// ==========================================
async function salvarConta(e) {
    e.preventDefault();
    const desc = document.getElementById("conta-desc").value;
    const categoria = document.getElementById("conta-categoria").value;
    const valorTotal = document.getElementById("conta-valor").value;
    const dataVenc = document.getElementById("conta-data").value;
    const parcelado = document.getElementById("conta-parcelado").value;
    const numParcelas = document.getElementById("conta-num-parcelas").value;

    const dadosEnvio = {
        action: "addConta",
        descricao: desc,
        categoria: categoria,
        valorTotal: valorTotal,
        primeiroVencimento: dataVenc,
        parcelado: parcelado,
        numParcelas: parcelado === "2" ? numParcelas : 1
    };

    try {
        await fetch(URL_GOOGLE_SHEETS, {
            method: 'POST',
            body: JSON.stringify(dadosEnvio)
        });
        fecharModal('modal-conta');
        document.getElementById("form-conta").reset();
        toggleParcelas(); // Esconde o campo de parcelas novamente
        carregarDados();
    } catch (erro) {
        alert("Erro ao salvar conta.");
    }
}

// ==========================================
// FUNÇÕES DE APOIO (MODAIS E FORMATAÇÃO)
// ==========================================
function abrirModal(id) {
    document.getElementById(id).style.display = "flex";
}

function fecharModal(id) {
    document.getElementById(id).style.display = "none";
}

function toggleParcelas() {
    const select = document.getElementById("conta-parcelado");
    const divParcelas = document.getElementById("div-parcelas");
    
    if (select.value === "2") {
        divParcelas.style.display = "block";
    } else {
        divParcelas.style.display = "none";
    }
}

function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
