import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'

export default function Login() {
  const { entrar } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('juliana@paoecia.com.br')
  const [senha, setSenha] = useState('demo1234')
  const [erro, setErro] = useState('')

  function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@') || senha.length < 4) {
      setErro('Informe um e-mail válido e uma senha com pelo menos 4 caracteres.')
      return
    }
    entrar('Juliana Prado')
    navigate('/app')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-crosta-800 p-12 text-crosta-50 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-crosta-600 text-xl">🥖</span>
          <span className="text-lg font-bold">Pão &amp; Cia</span>
        </div>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">
            A padaria inteira em uma tela só.
          </h2>
          <p className="mt-5 max-w-md text-crosta-200">
            Caixa, encomendas do WhatsApp, estoque com controle de lote e validade,
            produção e ponto da equipe — tudo conversando entre si, sem planilha paralela.
          </p>
          <ul className="mt-8 space-y-2.5 text-sm text-crosta-100">
            <li>✓ Baixa automática de insumos a cada fornada</li>
            <li>✓ Alerta de vencimento antes do prejuízo</li>
            <li>✓ Encomendas do WhatsApp sem celular na mão</li>
            <li>✓ Ponto eletrônico com hora do servidor</li>
          </ul>
        </div>
        <p className="text-xs text-crosta-400">Protótipo de validação · dados fictícios</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submeter} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-crosta-600 text-xl">🥖</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Entrar no backoffice</h1>
          <p className="mt-1.5 text-sm text-stone-500">Acesso restrito à gerência.</p>

          <div className="mt-7 space-y-4">
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" className="input" value={email}
                     onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="senha">Senha</label>
              <input id="senha" type="password" className="input" value={senha}
                     onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
            </div>
          </div>

          {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

          <button type="submit" className="btn-primary mt-6 w-full">Entrar</button>

          <p className="mt-6 rounded-lg bg-stone-100 px-4 py-3 text-xs text-stone-600">
            <strong>Demo:</strong> qualquer e-mail e senha funcionam. Os terminais de{' '}
            <a href="/pdv" className="font-semibold text-crosta-700 underline">PDV</a> e{' '}
            <a href="/ponto" className="font-semibold text-crosta-700 underline">Ponto</a>{' '}
            abrem sem login, como acontece nos tablets da loja.
          </p>
        </form>
      </div>
    </div>
  )
}
