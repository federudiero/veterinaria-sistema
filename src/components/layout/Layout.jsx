import React, { useEffect, useMemo, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { navigation } from '../../data/navigation.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { APP_VERSION } from '../../config/runtime.js'
import { NotificationBell } from '../notifications/NotificationBell.jsx'
import { AppIcon } from '../icons/AppIcon.jsx'

const QUICK_SALE_PATH = '/ventas-caja?tab=venta-rapida'
const LEGACY_NAV_PATH_ALIASES = {
  '/turnos-caja': '/ventas-caja',
  '/cajas-del-dia': '/ventas-caja',
  '/venta-rapida': '/ventas-caja',
  '/ventas': '/ventas-caja',
  '/cuentas-corrientes': '/ventas-caja',
  '/caja': '/ventas-caja',
  '/recordatorios': '/agenda',
  '/cola-espera': '/agenda',
  '/turnos-veterinarios': '/agenda',
  '/productos-stock': '/compras',
  '/proveedores': '/compras',
  '/compras-futuras': '/compras',
  '/documentos': '/sistema',
  '/respaldo': '/sistema',
  '/usuarios': '/sistema',
  '/auditoria': '/sistema',
  '/etiquetas': '/sistema',
  '/configuracion': '/sistema',
  '/historia-clinica': '/pacientes',
  '/vacunas': '/pacientes',
  '/recetas': '/pacientes',
}

function normalizeStoredNavPath(path) {
  return LEGACY_NAV_PATH_ALIASES[path] || path
}

function normalizeNavigationOrder(navOrder = [], allowedPaths = []) {
  const saved = Array.isArray(navOrder) ? navOrder : []
  const allowed = new Set(allowedPaths)
  const normalized = []

  saved.forEach((path) => {
    const nextPath = normalizeStoredNavPath(path)
    if (!allowed.has(nextPath) || normalized.includes(nextPath)) return
    normalized.push(nextPath)
  })

  const defaultOrder = navigation.map((item) => item.path).filter((path) => allowed.has(path))
  defaultOrder.forEach((path) => {
    if (normalized.includes(path)) return

    const nextDefaultPath = defaultOrder.find((candidate) => {
      return defaultOrder.indexOf(candidate) > defaultOrder.indexOf(path) && normalized.includes(candidate)
    })

    if (nextDefaultPath) {
      normalized.splice(normalized.indexOf(nextDefaultPath), 0, path)
    } else {
      normalized.push(path)
    }
  })

  return normalized
}

function sortNavigationByAdminOrder(items, navOrder = []) {
  const allowedPaths = items.map((item) => item.path)
  const order = normalizeNavigationOrder(navOrder, allowedPaths)
  const indexByPath = new Map(order.map((path, index) => [path, index]))
  return [...items].sort((a, b) => {
    const aIndex = indexByPath.has(a.path) ? indexByPath.get(a.path) : Number.MAX_SAFE_INTEGER
    const bIndex = indexByPath.has(b.path) ? indexByPath.get(b.path) : Number.MAX_SAFE_INTEGER
    if (aIndex !== bIndex) return aIndex - bIndex
    return navigation.findIndex((item) => item.path === a.path) - navigation.findIndex((item) => item.path === b.path)
  })
}

export function Layout() {
  const { user, logout, hasPermission } = useAuth()
  const location = useLocation()
  const navRef = useRef(null)
  const mainRef = useRef(null)
  const settings = useCollection('settings', { limitCount: 20 })
  const appSettings = settings.items.find((item) => item.id === 'app') || {}
  const canUseQuickSale = hasPermission('ventas.read')
  const canAccessNavigationItem = (item) => {
    if (Array.isArray(item.permissionAny)) return item.permissionAny.some((permission) => hasPermission(permission))
    return hasPermission(item.permission)
  }
  const visibleNavigation = useMemo(() => {
    const baseNavigation = navigation.filter((item) => canAccessNavigationItem(item))
    return sortNavigationByAdminOrder(baseNavigation, appSettings.navOrder)
  }, [appSettings.navOrder, hasPermission])
  const clinicName = appSettings.clinicName || 'Sistema Veterinaria'
  const logoText = String(appSettings.logoText || 'V+').slice(0, 4).toUpperCase()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 1080px)').matches) return

    const activeLink = navRef.current?.querySelector('a.active')
    activeLink?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [location.pathname, visibleNavigation])

  function focusMainContentOnMobile() {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 1080px)').matches) return

    window.setTimeout(() => {
      const main = mainRef.current
      if (!main) return

      const sidebarHeight = document.querySelector('.sidebar')?.getBoundingClientRect().height || 0
      const targetTop = main.getBoundingClientRect().top + window.scrollY - sidebarHeight - 8
      window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' })
    }, 80)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand">
            <div className="brand-mark" style={{ background: appSettings.primaryColor || undefined }}>{logoText}</div>
            <div>
              <strong>{clinicName}</strong>
              <small>Gestión veterinaria profesional</small>
            </div>
          </div>

          <div className="layout-actions">
            <NotificationBell />
            {canUseQuickSale && (
              <NavLink
                to={QUICK_SALE_PATH}
                className="quick-sale-shortcut"
                onClick={focusMainContentOnMobile}
                aria-label="Abrir venta rápida"
              >
                <AppIcon name="bolt" size={19} />
              </NavLink>
            )}
            <button className="btn btn-ghost btn-small mobile-logout-button" onClick={logout}>Salir</button>
          </div>
        </div>

        <nav ref={navRef} className="nav-list" aria-label="Navegación principal">
          {visibleNavigation.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={focusMainContentOnMobile}>
              <span className="nav-icon-frame"><AppIcon name={item.icon} size={19} /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <small>Sesión</small>
          <strong>{user?.displayName || user?.email}</strong>
          <span className="version-pill">Sistema v{APP_VERSION}</span>
          <button className="btn btn-ghost full" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>

      <main ref={mainRef} className="main" tabIndex={-1}>
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
