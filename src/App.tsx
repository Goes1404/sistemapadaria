import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from '@/store'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Estoque from '@/pages/Estoque'
import Producao from '@/pages/Producao'
import RH from '@/pages/RH'
import Whatsapp from '@/pages/Whatsapp'
import Financeiro from '@/pages/Financeiro'
import PDV from '@/pages/PDV'
import Ponto from '@/pages/Ponto'
import Kds from '@/pages/Kds'
import Clientes from '@/pages/Clientes'
import Bi from '@/pages/Bi'
import Produtos from '@/pages/Produtos'
import Auditoria from '@/pages/Auditoria'

function Protegido({ children }: { children: JSX.Element }) {
  const { usuario } = useStore()
  return usuario ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          {/* Terminais da loja: abrem direto no tablet, sem login de gerente */}
          <Route path="/pdv" element={<PDV />} />
          <Route path="/ponto" element={<Ponto />} />
          <Route path="/kds" element={<Kds />} />
          <Route path="/app" element={<Protegido><Layout /></Protegido>}>
            <Route index element={<Dashboard />} />
            <Route path="estoque" element={<Estoque />} />
            <Route path="producao" element={<Producao />} />
            <Route path="whatsapp" element={<Whatsapp />} />
            <Route path="rh" element={<RH />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="bi" element={<Bi />} />
            <Route path="auditoria" element={<Auditoria />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
