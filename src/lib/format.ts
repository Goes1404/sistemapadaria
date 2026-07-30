export const brl = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const num = (valor: number, casas = 2) =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })

export const dataBR = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('pt-BR')

export const horaBR = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const dataHoraBR = (iso: string) => `${dataBR(iso)} ${horaBR(iso)}`

export const uid = () => Math.random().toString(36).slice(2, 10)
