/* Parser de exportaciones JSON de BloodHound / SharpHound (Active Directory). */
import type { Asset, AssetType, Finding, ManualEdge } from './types';

export interface BloodHoundParseResult {
  assets: Asset[];
  findings: Finding[];
  edges: ManualEdge[];
  summary: {
    totalComputers: number;
    totalUsers: number;
    domainControllers: number;
    kerberoastable: number;
    asrepRoastable: number;
    unconstrainedDelegation: number;
    edgesCreated: number;
  };
}

function cleanName(raw: string): string {
  return raw.replace(/^[^\\]*\\/, '').replace(/@[^.]+.*$/, '').trim();
}

/**
 * Parsea contenido JSON exportado por SharpHound / BloodHound CE (computers, users, o estructura unificada).
 */
export function parseBloodHoundJson(jsonText: string): BloodHoundParseResult {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('El archivo no es un JSON válido de BloodHound.');
  }

  // Detectar formato BloodHound (con clave "data" o array directo)
  const items: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.data)
      ? parsed.data
      : Array.isArray(parsed.computers)
        ? parsed.computers
        : Array.isArray(parsed.users)
          ? parsed.users
          : [];

  if (items.length === 0) {
    throw new Error('No se encontraron objetos de Active Directory en el archivo JSON (data/computers/users).');
  }

  const assets: Asset[] = [];
  const findings: Finding[] = [];
  const edges: ManualEdge[] = [];

  let totalComputers = 0;
  let totalUsers = 0;
  let domainControllers = 0;
  let kerberoastable = 0;
  let asrepRoastable = 0;
  let unconstrainedDelegation = 0;

  // Registrar activos de computadoras y usuarios con roles
  const computerAssetMap = new Map<string, string>(); // name/sid -> assetId
  let dcAssetId: string | null = null;

  for (const item of items) {
    const props = item.Properties || item.properties || item;
    const name: string = props.name || props.Name || props.distinguishedname || '';
    if (!name) continue;

    const os: string = (props.operatingsystem || props.OperatingSystem || '').toLowerCase();
    const isComputer = !!(props.operatingsystem || props.PrimaryGroupSID?.endsWith('-516') || name.includes('$') || item.AllowedToDelegate);
    const highValue: boolean = !!props.highvalue;
    const unconstrained: boolean = !!(props.unconstraineddelegation || props.UnconstrainedDelegation);
    const primaryGroupSid: string = props.PrimaryGroupSID || props.primarygroupsid || '';

    if (isComputer) {
      totalComputers++;
      const isDc = primaryGroupSid.endsWith('-516') || os.includes('domain controller') || name.toUpperCase().includes('DC');
      let assetType: AssetType = 'servidor';
      let criticality: Asset['criticality'] = 3;

      if (isDc) {
        assetType = 'controlador_dominio';
        criticality = 5;
        domainControllers++;
      } else if (highValue) {
        assetType = 'servidor';
        criticality = 4;
      } else if (os.includes('server')) {
        assetType = 'servidor';
        criticality = 3;
      } else {
        assetType = 'estacion';
        criticality = 2;
      }

      const safeId = `bh_comp_${name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}`;
      if (isDc && !dcAssetId) {
        dcAssetId = safeId;
      }

      const tags = ['ActiveDirectory'];
      if (isDc) tags.push('Tier-0', 'Controlador de Dominio');
      if (highValue) tags.push('Alto Valor');
      if (unconstrained) tags.push('Delegación');

      const asset: Asset = {
        id: safeId,
        name: cleanName(name),
        type: assetType,
        ip: '',
        owner: 'Administración de Sistemas / AD',
        criticality,
        internetExposed: false,
        tags: tags.slice(0, 6),
      };

      assets.push(asset);
      computerAssetMap.set(name.toUpperCase(), safeId);
      if (item.ObjectIdentifier) computerAssetMap.set(item.ObjectIdentifier, safeId);

      // Hallazgo: Delegación sin restricciones en equipo
      if (unconstrained && !isDc) {
        unconstrainedDelegation++;
        findings.push({
          id: `F-BH-DEL-${String(findings.length + 1).padStart(3, '0')}`,
          title: `Delegación sin restricciones en ${cleanName(name)}`,
          kind: 'identidad',
          cve: null,
          cvss: 8.5,
          epss: null,
          kev: false,
          exploitPublic: true,
          assetId: safeId,
          status: 'abierto',
          remediation: 'unconstrained_delegation',
          technique: 'Delegación sin restricciones (T1558)',
          description: `El equipo ${name} tiene TrustedForDelegation habilitado, permitiendo capturar TGTs de usuarios autenticados.`,
          leadsTo: dcAssetId ? [dcAssetId] : [],
        });
      }
    } else {
      // Objeto de Usuario
      totalUsers++;
      const hasSpn: boolean = !!(props.hasspn || props.HasSPN || (props.serviceprincipalnames && props.serviceprincipalnames.length > 0));
      const dontReqPreauth: boolean = !!(props.dontreqpreauth || props.DontReqPreauth);
      const passwordNotReqd: boolean = !!(props.passwordnotreqd || props.PasswordNotReqd);
      const adminCount: boolean = !!props.admincount;

      // Si el usuario tiene vulnerabilidades relevantes para el grafo
      if (hasSpn || dontReqPreauth || passwordNotReqd || (highValue && adminCount)) {
        const userAssetId = `bh_usr_${name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}`;
        const userAsset: Asset = {
          id: userAssetId,
          name: `Cuenta: ${cleanName(name)}`,
          type: 'identidad',
          ip: '',
          owner: 'Directorio Activo',
          criticality: highValue || adminCount ? 4 : 3,
          internetExposed: false,
          tags: ['ActiveDirectory', 'Identidad', ...(adminCount ? ['AdminCount'] : [])],
        };
        assets.push(userAsset);

        if (hasSpn) {
          kerberoastable++;
          findings.push({
            id: `F-BH-KERB-${String(findings.length + 1).padStart(3, '0')}`,
            title: `Cuenta susceptible a Kerberoasting: ${cleanName(name)}`,
            kind: 'identidad',
            cve: null,
            cvss: 7.8,
            epss: 0.65,
            kev: false,
            exploitPublic: true,
            assetId: userAssetId,
            status: 'abierto',
            remediation: 'kerberoast',
            technique: 'Kerberoasting (T1558.003)',
            description: `Cuenta con ServicePrincipalName configurado en ${name}; permite solicitar tickets TGS cifrados con RC4/AES para crackeo offline.`,
            leadsTo: dcAssetId ? [dcAssetId] : [],
          });
        }

        if (dontReqPreauth) {
          asrepRoastable++;
          findings.push({
            id: `F-BH-ASREP-${String(findings.length + 1).padStart(3, '0')}`,
            title: `Autenticación previa deshabilitada (AS-REP Roasting): ${cleanName(name)}`,
            kind: 'identidad',
            cve: null,
            cvss: 7.5,
            epss: null,
            kev: false,
            exploitPublic: true,
            assetId: userAssetId,
            status: 'abierto',
            remediation: 'weak_credentials',
            technique: 'AS-REP Roasting (T1558.004)',
            description: `No requiere pre-autenticación Kerberos. Un atacante puede solicitar un AS-REP y crackear el hash offline.`,
            leadsTo: [],
          });
        }

        if (passwordNotReqd) {
          findings.push({
            id: `F-BH-NOPWD-${String(findings.length + 1).padStart(3, '0')}`,
            title: `Contraseña no obligatoria en ${cleanName(name)}`,
            kind: 'configuracion',
            cve: null,
            cvss: 7.0,
            epss: null,
            kev: false,
            exploitPublic: false,
            assetId: userAssetId,
            status: 'abierto',
            remediation: 'weak_credentials',
            technique: 'Credenciales por defecto',
            description: `El atributo PASSWD_NOTREQD está activo en ${name}.`,
            leadsTo: [],
          });
        }
      }
    }

    // Procesar aristas de rutas de ataque (Aces)
    const aces: any[] = item.Aces || item.aces || [];
    for (const ace of aces) {
      const right = ace.RightName || ace.rightname || '';
      const targetSid = item.ObjectIdentifier;
      const targetAssetId = computerAssetMap.get(targetSid) || computerAssetMap.get(name.toUpperCase());

      if (['GenericAll', 'WriteDacl', 'AllExtendedRights', 'AdminTo'].includes(right) && targetAssetId) {
        const principalName = ace.PrincipalName || ace.PrincipalSID || '';
        const sourceAssetId = computerAssetMap.get(principalName.toUpperCase()) || `bh_src_${cleanName(principalName).toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

        edges.push({
          id: `bh_edge_${edges.length + 1}`,
          from: sourceAssetId,
          to: targetAssetId,
          technique: `Abuso de privilegio AD: ${right}`,
        });
      }
    }
  }

  // Si hay joyas de la corona y hallazgos huérfanos de destino, asociamos una ruta defensiva
  if (dcAssetId) {
    for (const f of findings) {
      if (f.leadsTo && f.leadsTo.length === 0 && f.assetId !== dcAssetId) {
        f.leadsTo = [dcAssetId];
      }
    }
  }

  return {
    assets,
    findings,
    edges,
    summary: {
      totalComputers,
      totalUsers,
      domainControllers,
      kerberoastable,
      asrepRoastable,
      unconstrainedDelegation,
      edgesCreated: edges.length,
    },
  };
}
