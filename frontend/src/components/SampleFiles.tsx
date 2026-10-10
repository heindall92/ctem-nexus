/* Ficheros de ejemplo descargables desde la ayuda: los mismos de shared/samples que usan las pruebas.
 * Van incrustados en el HTML (no se descargan de ningún sitio) y son ficticios. */
import { Download } from 'lucide-react';
import nmap from '../../../shared/samples/nmap-ejemplo.xml?raw';
import bloodhound from '../../../shared/samples/bloodhound-ejemplo.json?raw';
import nessus from '../../../shared/samples/nessus-ejemplo.nessus?raw';
import openvas from '../../../shared/samples/openvas-ejemplo.xml?raw';
import nuclei from '../../../shared/samples/nuclei-ejemplo.jsonl?raw';
import trivy from '../../../shared/samples/trivy-ejemplo.json?raw';
import sarif from '../../../shared/samples/sarif-ejemplo.sarif?raw';
import kev from '../../../shared/samples/kev-ejemplo.json?raw';
import epss from '../../../shared/samples/epss-ejemplo.csv?raw';
import zap from '../../../shared/samples/zap-ejemplo.json?raw';
import burp from '../../../shared/samples/burp-ejemplo.xml?raw';
import pingcastle from '../../../shared/samples/pingcastle-ejemplo.xml?raw';
import certipy from '../../../shared/samples/certipy-ejemplo.json?raw';
import kairos from '../../../shared/samples/ecosistema/kairos-meridiano.json?raw';
import studio from '../../../shared/samples/ecosistema/studio-meridiano.json?raw';
import adauditor from '../../../shared/samples/ecosistema/ens-ad-auditor-meridiano.json?raw';
import responsables from '../../../shared/samples/ecosistema/responsables-norvik.csv?raw';
import kairosBia from '../../../shared/samples/ecosistema/kairos-bia-meridiano.json?raw';
import studioSoa from '../../../shared/samples/ecosistema/studio-soa-meridiano.json?raw';
import adSobre from '../../../shared/samples/ecosistema/ens-ad-auditor-hallazgos-meridiano.json?raw';
import { useL } from '../i18n';
import { download } from '../lib/download';

export const SAMPLES: Array<{ file: string; tool: string; where: [string, string]; text: string; mime: string }> = [
  { file: 'nmap-ejemplo.xml', tool: 'Nmap', where: ['Alcance → Importar Nmap XML', 'Scope → Import Nmap XML'], text: nmap, mime: 'text/xml' },
  { file: 'bloodhound-ejemplo.json', tool: 'BloodHound', where: ['Priorización → Importar BloodHound', 'Prioritization → Import BloodHound'], text: bloodhound, mime: 'application/json' },
  { file: 'nessus-ejemplo.nessus', tool: 'Nessus', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: nessus, mime: 'text/xml' },
  { file: 'openvas-ejemplo.xml', tool: 'OpenVAS', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: openvas, mime: 'text/xml' },
  { file: 'nuclei-ejemplo.jsonl', tool: 'Nuclei', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: nuclei, mime: 'application/x-ndjson' },
  { file: 'trivy-ejemplo.json', tool: 'Trivy', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: trivy, mime: 'application/json' },
  { file: 'sarif-ejemplo.sarif', tool: 'SARIF', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: sarif, mime: 'application/json' },
  { file: 'kev-ejemplo.json', tool: 'CISA KEV', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: kev, mime: 'application/json' },
  { file: 'epss-ejemplo.csv', tool: 'FIRST EPSS', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: epss, mime: 'text/csv' },
  { file: 'zap-ejemplo.json', tool: 'OWASP ZAP', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: zap, mime: 'application/json' },
  { file: 'burp-ejemplo.xml', tool: 'Burp Suite', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: burp, mime: 'text/xml' },
  { file: 'pingcastle-ejemplo.xml', tool: 'PingCastle', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: pingcastle, mime: 'text/xml' },
  { file: 'certipy-ejemplo.json', tool: 'Certipy', where: ['Priorización → Importar escáner', 'Prioritization → Import scanner'], text: certipy, mime: 'application/json' },
  { file: 'kairos-meridiano.json', tool: 'KAIROS', where: ['Ecosistema', 'Ecosystem'], text: kairos, mime: 'application/json' },
  { file: 'studio-meridiano.json', tool: 'Compliance Studio', where: ['Ecosistema', 'Ecosystem'], text: studio, mime: 'application/json' },
  { file: 'ens-ad-auditor-meridiano.json', tool: 'ENS AD Auditor', where: ['Ecosistema', 'Ecosystem'], text: adauditor, mime: 'application/json' },
  { file: 'responsables-norvik.csv', tool: 'Norvik', where: ['Ecosistema', 'Ecosystem'], text: responsables, mime: 'text/csv' },
  { file: 'kairos-bia-meridiano.json', tool: 'KAIROS · sobre «bia»', where: ['Ecosistema', 'Ecosystem'], text: kairosBia, mime: 'application/json' },
  { file: 'studio-soa-meridiano.json', tool: 'Compliance Studio · sobre «soa»', where: ['Ecosistema', 'Ecosystem'], text: studioSoa, mime: 'application/json' },
  { file: 'ens-ad-auditor-hallazgos-meridiano.json', tool: 'ENS AD Auditor · sobre «hallazgos»', where: ['Ecosistema', 'Ecosystem'], text: adSobre, mime: 'application/json' },
];

export function SampleFiles() {
  const L = useL();
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4" data-testid="ficheros-ejemplo">
      <h4 className="font-medium text-ink">{L('Ficheros de ejemplo', 'Sample files')}</h4>
      <p className="mt-1 text-xs text-ink-3">{L('Ficticios y coherentes con la demo (Industrias Meridiano). Descárgalos y pruébalos en la vista indicada; son los mismos que usan las pruebas automáticas.', 'Fictitious and consistent with the demo (Industrias Meridiano). Download them and try them in the view shown; they are the same files the automated tests use.')}</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {SAMPLES.map((s) => (
          <li key={s.file}>
            <button type="button" className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-[0.97]" onClick={() => download(s.file, s.text, `${s.mime};charset=utf-8`)} aria-label={L(`Descargar el ejemplo de ${s.tool} (${s.file})`, `Download the ${s.tool} sample (${s.file})`)}>
              <Download className="size-3.5 shrink-0 text-accent" aria-hidden />
              <span className="min-w-0"><span className="font-medium text-ink">{s.tool}</span> <span className="text-ink-3">· {L(s.where[0], s.where[1])}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
