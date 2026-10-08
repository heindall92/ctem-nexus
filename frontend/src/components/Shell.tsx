import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crosshair,
  Download,
  HelpCircle,
  Info,
  Layers,
  LayoutDashboard,
  ListChecks,
  Moon,
  MoreHorizontal,
  Palette,
  PanelLeft,
  Radar,
  RotateCcw,
  Route,
  Search,
  Waypoints,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ACCENT_SWATCHES, chrome, roleLabel, screen, useL } from '../i18n';
import { useResult } from '../lib/analysis';
import { download, stamp } from '../lib/download';
import { useStore, type View } from '../store/store';
import { SPRING } from './ui';

const NAV: Array<{ view: View; icon: ReactNode }> = [
  { view: 'panel', icon: <LayoutDashboard /> },
  { view: 'alcance', icon: <Crosshair /> },
  { view: 'priorizacion', icon: <Radar /> },
  { view: 'rutas', icon: <Route /> },
  { view: 'movilizacion', icon: <ListChecks /> },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/** Iniciales del perfil o, si aún no hay nombre, el icono de usuario (nunca un «·» suelto). */
function Avatar({ name, icon = 'size-4' }: { name: string; icon?: string }) {
  const ini = initials(name);
  return ini ? <>{ini}</> : <User className={icon} aria-hidden />;
}

function LangSwitch() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  // Activa: superficie elevada y texto de máximo contraste (el acento sobre su propio tinte no llega a 4,5:1).
  const on = 'rounded-full bg-surface px-2 py-1 text-ink shadow-sm ring-1 ring-hairline-strong';
  const off = 'rounded-full px-1.5 py-1 text-ink-2 hover:text-ink';
  return (
    <div className="flex h-8 items-center rounded-full bg-surface-2 p-0.5 text-[11px] font-semibold" role="group" aria-label={lang === 'en' ? 'Language' : 'Idioma'}>
      <button type="button" aria-pressed={lang === 'es'} onClick={() => setLang('es')} className={lang === 'es' ? on : off}>ES</button>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={lang === 'en' ? on : off}>EN</button>
    </div>
  );
}

function ThemeSwitch() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const lang = useStore((s) => s.lang);
  const dark = theme !== 'light';
  const t = chrome[lang];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? t.themeLight : t.themeDark}
      title={dark ? t.themeLight : t.themeDark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="theme-sw active:scale-[0.97]"
    >
      <Sun className="size-3.5" />
      <Moon className="size-3.5" />
      <span className="knob" aria-hidden>{dark ? <Moon className="size-3" /> : <Sun className="size-3" />}</span>
    </button>
  );
}

export function Logo() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-[var(--color-accent-ink)]" aria-hidden>
      <Waypoints className="size-[18px]" strokeWidth={2.25} />
    </span>
  );
}

export function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const project = useStore((s) => s.project);
  const profile = useStore((s) => s.settings.profile);
  const lang = useStore((s) => s.lang);
  const accent = useStore((s) => s.accent);
  const setAccent = useStore((s) => s.setAccent);
  const t = chrome[lang];
  const c = screen[lang];

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accentOpen, setAccentOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const accentRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const { result } = useResult();

  useEffect(() => {
    if (!accentOpen) return;
    const close = (e: MouseEvent) => {
      if (accentRef.current && !accentRef.current.contains(e.target as Node)) setAccentOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAccentOpen(false); };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); };
  }, [accentOpen]);

  const badges: Partial<Record<View, number>> = {
    priorizacion: result.summary.byBand.critica,
    rutas: result.summary.chokePoints,
  };

  const item = (n: { view: View; icon: ReactNode }) => {
    const active = view === n.view;
    const label = t[n.view];
    return (
      <li key={n.view} className="relative w-full">
        <button
          type="button"
          onClick={() => setView(n.view)}
          aria-current={active ? 'page' : undefined}
          title={label}
          className={`group relative flex items-center ${active ? 'font-semibold text-accent' : 'text-ink-3'} ${
            collapsed
              ? 'size-11 mx-auto justify-center rounded-2xl'
              : 'h-10 w-full gap-3 rounded-2xl px-3 text-left text-[0.8125rem]'
          }`}
        >
          {active && (
            <motion.span
              layoutId="nexus-active-pill"
              className={`absolute rounded-full bg-accent ${
                collapsed ? '-left-2 top-2.5 bottom-2.5 w-1' : '-left-1.5 top-2 bottom-2 w-1.5'
              }`}
              transition={SPRING}
            />
          )}

          <span className={`shrink-0 flex items-center justify-center [&_svg]:size-5 ${active ? 'text-accent' : 'text-ink-3 group-hover:text-ink'}`}>
            {n.icon}
          </span>

          {!collapsed && <span className="flex-1 truncate font-medium">{label}</span>}

          {/* Badge de alertas */}
          {badges[n.view] ? (
            collapsed ? (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-critica ring-2 ring-surface" title={c.alerts(badges[n.view] ?? 0)} />
            ) : (
              <span className="flex size-5 items-center justify-center rounded-full bg-critica text-[11px] font-bold text-[var(--color-on-critica)] shadow-sm">
                {badges[n.view]}
              </span>
            )
          ) : null}
        </button>
      </li>
    );
  };

  const nombre = profile?.nombre?.trim() ?? '';
  const rol = profile?.rol?.trim() ?? '';

  return (
    <>
    <aside
      className={`no-print relative z-40 my-3 ml-3 hidden shrink-0 flex-col rounded-[26px] border border-hairline bg-surface/90 backdrop-blur-xl shadow-xl shadow-black/5 md:flex dark:shadow-black/20 transition-[width,padding] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        collapsed ? 'w-[70px] p-2.5 items-center' : 'w-[260px] p-3.5'
      }`}
    >
      {/* 1. Cabecera */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 pb-3 w-full border-b border-hairline">
          <button
            type="button"
            onClick={toggleSidebar}
            className="group flex size-10 items-center justify-center rounded-2xl transition hover:scale-105 active:scale-95"
            title="CTEM-Nexus"
            aria-label={t.expand}
          >
            <Logo />
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink active:scale-95 transition"
            title={t.expand}
            aria-label={t.expand}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Logo />
            <div className="leading-tight">
              <div className="text-[0.9375rem] font-bold tracking-tight text-ink">CTEM-Nexus</div>
              <div className="text-[0.6875rem] tracking-wider text-ink-3 font-mono uppercase">{t.map}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink active:scale-95 transition"
            aria-label={t.collapse}
            title={t.collapse}
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      )}

      {/* 2. Selector de Proyecto (solo en modo expandido) */}
      {!collapsed && (
        <div className="my-2.5 px-0.5">
          <button
            type="button"
            onClick={() => setView('ajustes')}
            className="flex w-full items-center justify-between rounded-2xl border border-hairline bg-surface-2/60 px-3 py-2 text-xs transition hover:bg-surface-2 active:scale-[0.98]"
            title={`Proyecto: ${project.name}`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className="flex size-6 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Layers className="size-3.5" />
              </span>
              <span className="truncate font-medium text-ink">{project.name}</span>
            </div>
            <ChevronDown className="size-3.5 text-ink-3 shrink-0 ml-1" />
          </button>
        </div>
      )}

      {/* 3. Navegación principal */}
      <nav aria-label={lang === 'en' ? 'Sections' : 'Secciones'} className={`nav-rail isolate flex-1 overflow-y-auto w-full px-0.5 ${collapsed ? 'py-2 flex flex-col items-center' : 'py-1'}`}>
        <ul className={`flex flex-col gap-1.5 w-full ${collapsed ? 'items-center' : ''}`}>{NAV.map(item)}</ul>
        <div className={`my-2.5 h-px bg-hairline ${collapsed ? 'w-8 mx-auto' : 'w-full'}`} />
        <ul className={`w-full ${collapsed ? 'flex justify-center' : ''}`}>{item({ view: 'ajustes', icon: <SettingsIcon /> })}</ul>
      </nav>

      {/* 4. Bloque inferior del sidebar */}
      <div className={`mt-auto w-full border-t border-hairline pt-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'mb-2 gap-1.5 px-1'}`}>
          {!collapsed && <span className="flex-1 text-[11px] font-medium text-ink-3">{t.accentColor}</span>}
          <div ref={accentRef} className="relative">
            <button
              type="button"
              aria-expanded={accentOpen}
              aria-label={t.accentColor}
              title={t.accentColor}
              onClick={() => setAccentOpen((v) => !v)}
              className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-accent/10 hover:text-accent active:scale-[0.97]"
            >
              <Palette className="size-4" />
            </button>
            {accentOpen && (
              <div className="absolute bottom-0 left-full z-30 ml-3 w-[232px] rounded-2xl border border-hairline bg-surface p-3 shadow-xl">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{t.accentColor}</div>
                <div className="flex flex-wrap gap-2.5" role="group" aria-label={t.accentColor}>
                  {ACCENT_SWATCHES.map((sw) => (
                    <button
                      key={sw.id}
                      type="button"
                      aria-pressed={accent === sw.id}
                      title={lang === 'en' ? sw.en : sw.es}
                      onClick={() => { setAccent(sw.id); setAccentOpen(false); }}
                      className={`size-6 rounded-full active:scale-95 ${accent === sw.id ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
                      style={{ background: sw.swatch, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.22)' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="relative w-full">
          <button
            type="button"
            ref={userBtnRef}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            aria-label={`${c.account}: ${nombre || t.noName}`}
            className={`flex w-full items-center gap-2.5 rounded-2xl p-1.5 text-left active:scale-[0.98] ${
              userMenuOpen ? 'bg-accent/10' : 'hover:bg-surface-2'
            } ${collapsed ? 'justify-center' : ''}`}
            title={nombre || t.noName}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-[var(--color-accent-ink)]">
              <Avatar name={nombre} />
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-xs font-semibold text-ink">{nombre || t.noName}</span>
                  <span className="block truncate text-[11px] text-ink-3">{roleLabel(rol, lang) || t.noRole}</span>
                </span>
                <MoreHorizontal className="size-4 shrink-0 text-ink-3" />
              </>
            )}
          </button>
          <UserMenu
            open={userMenuOpen}
            onClose={() => setUserMenuOpen(false)}
            anchorRef={userBtnRef}
            placement="right"
            onProfile={() => { setUserMenuOpen(false); setProfileOpen(true); }}
          />
        </div>
      </div>
    </aside>
    {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </>
  );
}

/** Banner flotante ovalado estilo Rosetta cuando hay datos de demo */
export function DemoBanner() {
  const isDemo = useStore((s) => s.project.demo);
  const loadDemo = useStore((s) => s.loadDemo);
  const startFresh = useStore((s) => s.startFresh);
  const notify = useStore((s) => s.notify);
  const c = screen[useStore((s) => s.lang)];
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  return (
    <div className="no-print mx-auto mt-2 max-w-[1240px] px-2 sm:px-4">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="demo-banner-card flex flex-wrap items-center justify-between gap-3 rounded-2xl sm:rounded-full px-4 py-2.5 text-xs transition"
      >
        <div className="flex items-center gap-2.5 leading-normal">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
            <Info className="size-3.5" />
          </span>
          <div>
            <strong className="font-semibold text-ink">{c.demoTitle}</strong>{' '}
            <span className="text-ink-3">{c.demoText}</span>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          <button
            type="button"
            onClick={() => {
              loadDemo();
              notify(c.resetDone);
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink active:scale-95 transition"
          >
            <RotateCcw className="size-3" />
            <span>{c.reset}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              startFresh();
              notify(c.startFresh, 'info');
              document.getElementById('contenido')?.scrollTo({ top: 0 });
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1 font-semibold text-[var(--color-accent-ink)] shadow-sm transition hover:brightness-110 active:scale-95"
          >
            <span>{c.startMine}</span>
            <ArrowRight className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              document.getElementById('contenido')?.scrollTo({ top: 0 });
            }}
            className="flex size-6 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink transition ml-1"
            title={c.hideNotice}
            aria-label={c.hideNotice}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MenuRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-sm text-ink hover:bg-surface-2 active:scale-[0.98]">
      <span className="text-ink-3">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ProfileDialog({ onClose }: { onClose: () => void }) {
  const stored = useStore((s) => s.settings.profile);
  const setSettings = useStore((s) => s.setSettings);
  const accent = useStore((s) => s.accent);
  const setAccent = useStore((s) => s.setAccent);
  const lang = useStore((s) => s.lang);
  const t = chrome[lang];
  const c = screen[lang];
  const { result } = useResult();
  const base = { nombre: '', rol: '', organizacion: '', correo: '', ...stored };
  const [profile, setProfile] = useState(base);
  const emailBad = profile.correo.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.correo.trim());
  const write = (patch: Partial<typeof profile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    setSettings({ profile: { nombre: next.nombre.trim(), rol: next.rol, organizacion: next.organizacion.trim(), correo: next.correo.trim() } });
  };
  const who = [profile.nombre.trim(), roleLabel(profile.rol, lang), profile.organizacion.trim()].filter(Boolean).join(' · ');
  const roles = Object.keys(c.roles) as Array<keyof typeof c.roles>;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-ground p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="perfil-titulo">
      <button type="button" className="absolute inset-0" aria-label={c.close} onClick={onClose} />
      <div className="relative mx-auto w-full max-w-[920px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{c.account}</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h2 id="perfil-titulo" className="text-3xl font-bold tracking-tight text-ink">{c.yourProfile}</h2>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2" aria-label={c.close}>
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 max-w-[52ch] text-sm text-ink-3">{c.profileLead}</p>
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <section className="panel flex flex-col items-center px-5 py-6 text-center">
            <span className="flex size-24 items-center justify-center rounded-full bg-accent text-2xl font-bold text-[var(--color-accent-ink)]"><Avatar name={profile.nombre} icon="size-10" /></span>
            <p className="mt-4 text-base font-bold text-ink">{profile.nombre.trim() || t.noName}</p>
            <p className="text-sm text-ink-3">{roleLabel(profile.rol, lang) || t.noRole}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label={t.accentColor}>
              {ACCENT_SWATCHES.map((sw) => (
                <button
                  key={sw.id}
                  type="button"
                  aria-pressed={accent === sw.id}
                  title={lang === 'en' ? sw.en : sw.es}
                  onClick={() => setAccent(sw.id)}
                  className={`size-5 rounded-full active:scale-95 ${accent === sw.id ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
                  style={{ background: sw.swatch, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.22)' }}
                />
              ))}
            </div>
            <dl className="mt-6 grid w-full grid-cols-2 gap-2 border-t border-hairline pt-4">
              <div>
                <dt className="text-2xl font-bold text-ink">1</dt>
                <dd className="text-xs text-ink-3">{c.projects}</dd>
              </div>
              <div>
                <dt className="text-2xl font-bold text-ink">{result.summary.openFindings}</dt>
                <dd className="text-xs text-ink-3">{c.openShort}</dd>
              </div>
            </dl>
          </section>
          <form className="panel px-5 py-5" onSubmit={(e) => e.preventDefault()}>
            <h3 className="text-base font-semibold text-ink">{c.profileData}</h3>
            <label className="mt-4 block text-xs text-ink-3">
              {c.fullName}
              <input className="field mt-1 w-full" value={profile.nombre} autoFocus onChange={(e) => write({ nombre: e.target.value })} />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-ink-3">
                {t.roleField}
                <select className="field mt-1 w-full" value={roles.includes(profile.rol as keyof typeof c.roles) ? profile.rol : ''} onChange={(e) => write({ rol: e.target.value })}>
                  <option value="">{c.chooseRole}</option>
                  {roles.map((id) => <option key={id} value={id}>{c.roles[id]}</option>)}
                </select>
              </label>
              <label className="block text-xs text-ink-3">
                {c.organization}
                <input className="field mt-1 w-full" value={profile.organizacion} onChange={(e) => write({ organizacion: e.target.value })} />
              </label>
            </div>
            <label className="mt-3 block text-xs text-ink-3">
              {c.email}
              <input className="field mt-1 w-full" type="email" inputMode="email" placeholder={c.emailPh} value={profile.correo} aria-invalid={emailBad} onChange={(e) => write({ correo: e.target.value })} />
              {emailBad && <span className="mt-1 block text-critica">{c.emailBad}</span>}
            </label>
            <p className="mt-4 text-sm text-ink-3">{who ? c.authorLine(who) : c.authorLine(c.noAuthor)}</p>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Menú de cuenta anclado al pie del lateral. */
function UserMenu({
  open,
  onClose,
  anchorRef,
  placement = 'bottom-end',
  onProfile,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement?: 'bottom-end' | 'top-start' | 'top-end' | 'right';
  onProfile?: () => void;
}) {
  const lang = useStore((s) => s.lang);
  const t = chrome[lang];
  const setView = useStore((s) => s.setView);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const project = useStore((s) => s.project);
  const notify = useStore((s) => s.notify);
  const profile = useStore((s) => s.settings.profile);
  const nombre = profile?.nombre?.trim() ?? '';
  const rol = profile?.rol?.trim() ?? '';
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left?: number; right?: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      if (placement === 'bottom-end') {
        setCoords({
          top: rect.bottom + 8,
          right: Math.max(12, window.innerWidth - rect.right),
        });
      } else if (placement === 'top-start') {
        setCoords({
          bottom: Math.max(12, window.innerHeight - rect.top + 8),
          left: Math.max(12, rect.left),
        });
      } else if (placement === 'right') {
        setCoords({
          top: Math.max(12, Math.min(window.innerHeight - 320, rect.top - 8)),
          left: Math.min(window.innerWidth - 260, rect.right + 12),
        });
      } else {
        setCoords({
          bottom: Math.max(12, window.innerHeight - rect.top + 8),
          right: Math.max(12, window.innerWidth - rect.right),
        });
      }
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, anchorRef, placement]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); anchorRef.current?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose, anchorRef]);

  // Al abrir, el foco pasa a la primera opción en cuanto el menú está posicionado (antes es invisible).
  const focused = useRef(false);
  useEffect(() => {
    if (!open) { focused.current = false; return; }
    if (coords && !focused.current) {
      focused.current = true;
      requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus());
    }
  }, [open, coords]);

  useEffect(() => {
    const clickAway = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    if (open) window.addEventListener('mousedown', clickAway);
    return () => window.removeEventListener('mousedown', clickAway);
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: placement.startsWith('top') ? 6 : -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={SPRING}
      style={{
        position: 'fixed',
        zIndex: 99999,
        visibility: coords ? 'visible' : 'hidden',
        top: coords?.top,
        bottom: coords?.bottom,
        left: coords?.left,
        right: coords?.right,
      }}
      className="w-60 rounded-2xl border border-hairline bg-surface p-2 shadow-2xl select-none"
      role="menu"
      aria-label={t.profile}
    >
      <div className="flex items-center gap-3 px-2 py-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-[var(--color-accent-ink)]">
          <Avatar name={nombre} icon="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{nombre || t.noName}</span>
          <span className="block truncate text-xs text-ink-3">{roleLabel(rol, lang) || t.noRole}</span>
        </span>
      </div>
      <div className="my-1 h-px bg-hairline" />
      <MenuRow icon={<User className="size-4" />} label={t.profile} onClick={() => { onClose(); onProfile?.(); }} />
      <MenuRow icon={<SlidersHorizontal className="size-4" />} label={t.settingsShort} onClick={() => { onClose(); setView('ajustes'); }} />
      <MenuRow icon={<HelpCircle className="size-4" />} label={t.help} onClick={() => { onClose(); setHelpOpen(true); }} />
      <div className="my-1 h-px bg-hairline" />
      <MenuRow icon={<Compass className="size-4" />} label={t.scopeShort} onClick={() => { onClose(); setView('alcance'); }} />
      <MenuRow icon={<Download className="size-4" />} label={t.export} onClick={() => { onClose(); download(`ctem-nexus-${stamp()}.json`, JSON.stringify(project, null, 2), 'application/json'); notify(t.exported); }} />
    </motion.div>,
    document.body
  );
}

/** Barra superior ovalada flotante estilo Rosetta y ENS Compliance */
export function TopBar({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const lang = useStore((s) => s.lang);
  const t = chrome[lang];
  const nombre = useStore((s) => s.settings.profile?.nombre?.trim() ?? '');

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const userBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="no-print sticky top-0 z-30 mx-auto w-full max-w-[1280px] px-3 pt-2 sm:px-6">
      <header className="flex h-14 w-full min-w-0 items-center gap-2 rounded-full border border-hairline bg-surface/90 px-2.5 shadow-lg shadow-black/5 backdrop-blur-xl transition dark:shadow-black/20 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden size-8 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink active:scale-95 transition md:flex"
            title={t.toggle}
            aria-label={t.toggle}
          >
            <PanelLeft className="size-4" />
          </button>
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <Logo />
            <span className="shrink-0 text-sm font-bold tracking-tight text-ink">CTEM-Nexus</span>
          </div>
          <h1 className="sr-only">{title}</h1>
          {subtitle && <p className="sr-only">{subtitle}</p>}
        </div>

        {actions && (
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {actions}
          </div>
        )}

        <div className="flex shrink-0 items-center justify-end gap-1 md:gap-1.5">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-8 items-center gap-2 rounded-full border border-hairline bg-surface px-3 text-xs text-ink-3 active:scale-[0.98] md:flex"
            title="Ctrl K"
          >
            <Search className="size-3.5 shrink-0 text-ink-3" />
            <span>{t.search}</span>
            <kbd className="kbd text-[11px]">Ctrl K</kbd>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink active:scale-95 transition md:hidden"
            title={t.search}
            aria-label={t.search}
          >
            <Search className="size-4" />
          </button>
          <LangSwitch />
          <ThemeSwitch />
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink active:scale-95 transition md:size-8"
            title={t.help}
            aria-label={t.help}
          >
            <HelpCircle className="size-4" />
          </button>
          <div className="relative md:hidden">
            <button
              ref={userBtnRef}
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-[var(--color-accent-ink)] active:scale-95 transition"
              title={nombre || t.noName}
              aria-label={`${screen[lang].account}: ${nombre || t.noName}`}
            >
              <Avatar name={nombre} />
            </button>
            <UserMenu open={userMenuOpen} onClose={() => setUserMenuOpen(false)} anchorRef={userBtnRef} placement="bottom-end" onProfile={() => { setUserMenuOpen(false); setProfileOpen(true); }} />
          </div>
          {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
        </div>
      </header>
      <DemoBanner />
    </div>
  );
}

export function MobileTabBar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const lang = useStore((s) => s.lang);
  const t = chrome[lang];
  const [more, setMore] = useState(false);
  const main: Array<{ view: View; icon: ReactNode }> = [
    { view: 'panel', icon: <LayoutDashboard /> },
    { view: 'priorizacion', icon: <Radar /> },
    { view: 'rutas', icon: <Route /> },
    { view: 'movilizacion', icon: <ListChecks /> },
  ];
  const go = (next: View) => {
    setMore(false);
    setView(next);
  };
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 backdrop-blur-xl md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label={lang === 'en' ? 'Sections' : 'Secciones'}>
      {more && (
        <div className="absolute inset-x-3 bottom-full mb-2 flex flex-col gap-1 rounded-2xl border border-hairline bg-surface p-2 shadow-xl">
          <button type="button" onClick={() => go('alcance')} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm text-ink active:scale-[0.97]">
            <Crosshair className="size-4 text-accent" /> {t.alcance}
          </button>
          <button type="button" onClick={() => go('ajustes')} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm text-ink active:scale-[0.97]">
            <SettingsIcon className="size-4 text-accent" /> {t.ajustes}
          </button>
          <button type="button" onClick={() => { setMore(false); setHelpOpen(true); }} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm text-ink active:scale-[0.97]">
            <HelpCircle className="size-4 text-accent" /> {t.help}
          </button>
        </div>
      )}
      <ul className="grid grid-cols-5">
        {main.map((n) => {
          const active = view === n.view;
          return (
            <li key={n.view}>
              <button type="button" onClick={() => go(n.view)} aria-current={active ? 'page' : undefined} className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] active:scale-[0.97] ${active ? 'text-accent' : 'text-ink-3'}`}>
                <span className="[&_svg]:size-5">{n.icon}</span>
                <span className="max-w-full truncate px-1">{t[n.view]}</span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] active:scale-[0.97] ${more ? 'text-accent' : 'text-ink-3'}`}>
            <MoreHorizontal className="size-5" />
            <span>{t.more}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function Toasts() {
  const L = useL();
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismiss);
  const reduce = useReducedMotion();
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 };
  return (
    <div className="no-print pointer-events-none fixed bottom-24 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 md:bottom-5 md:right-5" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout={!reduce}
            initial={hidden}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ ...hidden, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
            transition={SPRING}
            className="glass glass-edge pointer-events-auto flex items-start gap-3 rounded-[16px] px-4 py-3 text-[0.8125rem]"
          >
            <span
              aria-hidden
              className="mt-1.5 size-1.5 shrink-0 rounded-full"
              style={{
                background:
                  t.tone === 'error'
                    ? 'var(--color-critica)'
                    : t.tone === 'info'
                    ? 'var(--color-media)'
                    : 'var(--color-ok)',
              }}
            />
            <span className="flex-1 text-ink">{t.text}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon -my-1 -mr-2 rounded-full"
              aria-label={L('Cerrar aviso', 'Close notice')}
              onClick={() => dismiss(t.id)}
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Panel lateral con velo translúcido y animación fluida estilo Apple */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
  hasOverlay = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  hasOverlay?: boolean;
}) {
  const L = useL();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
    return () => prev?.focus?.({ preventScroll: true });
  }, [open]);
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, x: 36 };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          {/* Velo translúcido con desenfoque de fondo */}
          {hasOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            />
          )}
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={hidden}
            animate={{ opacity: 1, x: 0 }}
            exit={{ ...hidden, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }}
            transition={SPRING}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            tabIndex={-1}
            ref={ref}
            className="no-print glass-thick glass-edge fixed bottom-3 right-3 top-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[24px] border border-hairline outline-none shadow-2xl"
            style={{ width }}
          >
            <div className="flex items-start gap-3 border-b border-hairline px-6 py-4.5">
              <div id={titleId} className="min-w-0 flex-1">{title}</div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon -mr-1 rounded-full text-ink-3 hover:text-ink"
                onClick={onClose}
                aria-label={L('Cerrar panel', 'Close panel')}
              >
                <X className="size-4" />
              </button>
            </div>
            {/* Enfocable para poder desplazarlo con el teclado (WCAG 2.1.1). */}
            <div className="flex-1 overflow-y-auto px-6 py-5" tabIndex={0}>{children}</div>
            {footer && <div className="border-t border-hairline px-6 py-3.5">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Modal centrado estilo Apple con velo translúcido y animación spring sin rebote */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 720,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}) {
  const L = useL();
  const reduce = useReducedMotion();
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 };
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); prev?.focus?.({ preventScroll: true }); };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
          {/* Velo con desenfoque suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-md"
          />

          {/* Caja modal centrada */}
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={hidden}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ ...hidden, transition: { duration: 0.16 } }}
            transition={SPRING}
            className="glass-thick glass-edge relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[24px] border border-hairline bg-surface shadow-2xl outline-none"
            style={{ maxWidth }}
          >
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4.5">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-base font-semibold text-ink">{title}</h2>
                {subtitle && <div className="text-xs text-ink-3 mt-0.5">{subtitle}</div>}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon rounded-full text-ink-3 hover:text-ink"
                onClick={onClose}
                aria-label={L('Cerrar ventana', 'Close window')}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6" tabIndex={0}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
