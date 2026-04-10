export function formatarMoeda(valor) {
  return `R$ ${Number(valor || 0).toFixed(2)}`;
}

export function formatarData(data) {
  return new Date(data).toLocaleDateString("pt-BR");
}

export function formatarDataHora(data) {
  return new Date(data).toLocaleString("pt-BR");
}
