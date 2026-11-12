'use strict';
/* Tabla de mareas — radar y preparación de convocatorias.
   Sin dependencias ni servidor: los datos viven en el navegador (localStorage)
   y se comparten exportando un archivo .json. */

const CLAVE = 'tabla-de-mareas-v1';

const ESTADOS = [
  { id: 'Detectada', fase: 'activa' },
  { id: 'En estudio', fase: 'activa' },
  { id: 'Aún no abierta', fase: 'activa' },
  { id: 'En preparación', fase: 'activa' },
  { id: 'Presentada', fase: 'presentada' },
  { id: 'Concedida', fase: 'resuelta' },
  { id: 'En ejecución', fase: 'resuelta' },
  { id: 'Justificada', fase: 'resuelta' },
  { id: 'Denegada', fase: 'resuelta' },
  { id: 'Cerrada', fase: 'resuelta' },
  { id: 'Descartada', fase: 'descartada' },
];
const FASES = [
  ['activa', 'En curso'], ['presentada', 'Presentadas'], ['resuelta', 'Resueltas'],
  ['descartada', 'Descartadas'], ['todas', 'Todas'],
];
const AMBITOS = ['Europa', 'Estatal', 'Cataluña', 'Tarragona local', 'Fundación / premio', 'Latinoamérica', 'Otro'];
const ROLES = ['', 'líder', 'socia', 'no aplica'];
const ESTADOS_REG = ['hecho', 'en trámite', 'pendiente', 'sin confirmar'];

const REGISTROS_BASE = [
  { id: 'reg-asociaciones', nombre: 'Registre d\'Associacions de la Generalitat' },
  { id: 'municipal', nombre: 'Registre Municipal d\'Entitats' },
  { id: 'cens-juvenils', nombre: 'Cens d\'entitats juvenils' },
  { id: 'cens-voluntariat', nombre: 'Cens d\'entitats del voluntariat' },
  { id: 'pic', nombre: 'PIC (EU Funding & Tenders Portal)' },
  { id: 'oid', nombre: 'OID de Erasmus+' },
  { id: 'eyf', nombre: 'Base de datos de la Fundación Europea de la Juventud' },
  { id: 'ongd-aecid', nombre: 'Registro de ONGD de la AECID' },
  { id: 'ongd-accd', nombre: 'Registre d\'ONGD de la cooperació catalana (ACCD)' },
];
const DOCS_BASE = [
  'NIF de la entidad', 'Estatutos sellados por el registro', 'Acta fundacional',
  'Certificado de inscripción en el registro de asociaciones', 'Certificado de la junta vigente y representante legal',
  'Certificado digital de representante', 'Certificado de estar al corriente con la AEAT',
  'Certificado de estar al corriente con la Seguridad Social', 'Certificado de estar al corriente con la Agència Tributària de Catalunya',
  'Certificado de titularidad bancaria', 'Cuentas anuales aprobadas', 'Memoria de actividades',
  'Seguro de responsabilidad civil y de voluntariado', 'Protocolo contra el acoso y plan de igualdad',
].map((nombre, i) => ({ id: 'doc-' + (i + 1), nombre }));

const PLAN_BASE = [
  [42, 'Leer las bases completas y decidir si nos presentamos'],
  [35, 'Confirmar socios, cartas de apoyo y cofinanciación'],
  [28, 'Primer borrador de la memoria técnica'],
  [21, 'Presupuesto detallado y justificado'],
  [14, 'Reunir la documentación de la entidad y los certificados al corriente'],
  [7, 'Revisión cruzada: repasar los criterios de valoración uno a uno'],
  [2, 'Presentar en la plataforma (no esperar al último día)'],
];

/* ───────── utilidades ───────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
const acota = (n, a, b) => Math.min(b, Math.max(a, n));
const fechaOK = s => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) ? s : '';
const urlOK = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
const faseDe = estado => (ESTADOS.find(e => e.id === estado) || ESTADOS[0]).fase;

const p2 = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const fecha = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const HOY_FIJO = fechaOK(new URLSearchParams(location.search).get('hoy') || '');
const hoy = () => HOY_FIJO || iso(new Date());
const dias = (a, b) => Math.round((fecha(b) - fecha(a)) / 864e5);
const masDias = (s, n) => { const d = fecha(s); d.setDate(d.getDate() + n); return iso(d); };
const masMeses = (s, n) => {
  const d = fecha(s), dia = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return iso(d);
};
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const f = s => { if (!s) return ''; const d = fecha(s); return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`; };
const fCorta = s => { const d = fecha(s); return `${d.getDate()} ${MES[d.getMonth()]}`; };
const eur = n => n == null ? '—' : new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n) + ' €';
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/* ───────── datos ───────── */
function normConv(c) {
  c = c || {};
  return {
    id: c.id || uid(),
    idExterno: c.idExterno ? String(c.idExterno) : '',
    nombre: String(c.nombre || '').trim(),
    financiador: c.financiador || '',
    ambito: c.ambito || '',
    estado: ESTADOS.some(e => e.id === c.estado) ? c.estado : 'Detectada',
    rol: ROLES.includes(c.rol) ? c.rol : '',
    apertura: fechaOK(c.apertura),
    plazo: fechaOK(c.plazo),
    plazoHora: c.plazoHora || '',
    plazoConfirmado: c.plazoConfirmado !== false,
    resolucion: fechaOK(c.resolucion),
    importeTexto: c.importeTexto || '',
    importeSolicitado: num(c.importeSolicitado),
    importeConcedido: num(c.importeConcedido),
    cofinanciacion: num(c.cofinanciacion),
    encaje: acota(parseInt(c.encaje, 10) || 0, 0, 5),
    reqAntiguedadMeses: Math.max(0, num(c.reqAntiguedadMeses) || 0),
    reqEjercicios: Math.max(0, num(c.reqEjercicios) || 0),
    reqUtilidadPublica: !!c.reqUtilidadPublica,
    reqRegistros: Array.isArray(c.reqRegistros) ? c.reqRegistros.map(String) : [],
    reqVerificado: !!c.reqVerificado,
    semanasPrep: acota(num(c.semanasPrep) || 6, 1, 52),
    notas: c.notas || '',
    enlace: c.enlace || '',
    carpeta: c.carpeta || '',
    motivo: c.motivo || '',
    aprendizaje: c.aprendizaje || '',
    revisado: fechaOK(c.revisado),
    tareas: (Array.isArray(c.tareas) ? c.tareas : []).map(t => ({
      id: t.id || uid(), texto: String(t.texto || ''), fecha: fechaOK(t.fecha), hecha: !!t.hecha,
    })),
  };
}

function normalizar(d) {
  d = d && typeof d === 'object' ? d : {};
  const e = d.entidad || {};
  return {
    version: 1,
    entidad: {
      nombre: e.nombre || '',
      constitucion: fechaOK(e.constitucion),
      constitucionAprox: !!e.constitucionAprox,
      ejercicios: (Array.isArray(e.ejercicios) ? e.ejercicios : [])
        .map(x => ({ anio: num(x.anio) || '', previsto: fechaOK(x.previsto), aprobado: fechaOK(x.aprobado) }))
        .sort((a, b) => (a.anio || 0) - (b.anio || 0)),
      utilidadPublica: fechaOK(e.utilidadPublica),
      utilidadPublicaPrevista: fechaOK(e.utilidadPublicaPrevista),
      registros: (Array.isArray(e.registros) ? e.registros : REGISTROS_BASE).map(r => ({
        id: r.id || uid(), nombre: r.nombre || '', nota: r.nota || '',
        estado: ESTADOS_REG.includes(r.estado) ? r.estado : 'sin confirmar',
      })),
      documentos: (Array.isArray(e.documentos) ? e.documentos : DOCS_BASE).map(x => ({
        id: x.id || uid(), nombre: x.nombre || '', listo: !!x.listo, caduca: fechaOK(x.caduca), enlace: x.enlace || '',
      })),
    },
    convocatorias: (Array.isArray(d.convocatorias) ? d.convocatorias : []).map(normConv),
    meta: { ultimaCopia: (d.meta && d.meta.ultimaCopia) || '', cambios: (d.meta && d.meta.cambios) || 0 },
  };
}

function cargar() {
  try { const crudo = localStorage.getItem(CLAVE); if (crudo) return normalizar(JSON.parse(crudo)); } catch (e) { /* almacenamiento no disponible */ }
  return normalizar({});
}
let S = cargar();

function guardar() {
  S.meta.cambios = (S.meta.cambios || 0) + 1;
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); }
  catch (e) { aviso('Este navegador no deja guardar. Descarga una copia desde Datos para no perder los cambios.'); }
}

/* ───────── lógica ───────── */
const prepInicio = c => c.plazo ? masDias(c.plazo, -c.semanasPrep * 7) : '';

function ejerciciosCerrados() {
  const h = hoy();
  return S.entidad.ejercicios.map(e => e.aprobado || (e.previsto && e.previsto >= h ? e.previsto : ''));
}

/* ¿Puede presentarse la entidad? Se calcula a la fecha de cierre, no a la de hoy. */
function elegibilidad(c) {
  const E = S.entidad, ref = c.plazo || hoy();
  const faltan = [], tramites = [];
  let desde = '', sinFecha = false;
  const retrasa = fch => { if (fch) { if (fch > desde) desde = fch; } else sinFecha = true; };

  if (c.reqAntiguedadMeses > 0) {
    if (!E.constitucion) { faltan.push('indica la fecha de constitución en Entidad'); sinFecha = true; }
    else {
      const cumple = masMeses(E.constitucion, c.reqAntiguedadMeses);
      if (cumple > ref) { faltan.push(`${plural(c.reqAntiguedadMeses, 'mes', 'meses')} de antigüedad (se cumplen el ${f(cumple)})`); retrasa(cumple); }
    }
  }
  if (c.reqEjercicios > 0) {
    const fechas = ejerciciosCerrados();
    const cuando = fechas[c.reqEjercicios - 1] || '';
    const yaEnRef = fechas.slice(0, c.reqEjercicios).every(x => x && x <= ref) && fechas.length >= c.reqEjercicios;
    if (!yaEnRef) {
      faltan.push(`${plural(c.reqEjercicios, 'ejercicio cerrado', 'ejercicios cerrados')}${cuando ? ` (previsto el ${f(cuando)})` : ''}`);
      retrasa(cuando);
    }
  }
  if (c.reqUtilidadPublica) {
    const up = E.utilidadPublica || E.utilidadPublicaPrevista;
    if (!up || up > ref) { faltan.push(`utilidad pública${up ? ` (prevista el ${f(up)})` : ''}`); retrasa(up); }
  }
  for (const id of c.reqRegistros) {
    const r = E.registros.find(x => x.id === id);
    if (r && r.estado !== 'hecho') tramites.push(r.nombre);
  }
  const estado = faltan.length ? 'no' : tramites.length ? 'tramite' : c.reqVerificado ? 'si' : 'verificar';
  return { estado, faltan, tramites, desde: sinFecha ? '' : desde };
}

function textoEleg(c) {
  const el = elegibilidad(c);
  if (el.estado === 'no') return ['no', el.desde ? `No elegible hasta el ${f(el.desde)}` : 'No elegible por ahora'];
  if (el.estado === 'tramite') return ['no', `Falta inscripción: ${el.tramites.join(', ')}`];
  if (el.estado === 'verificar') return ['duda', 'Requisitos sin verificar'];
  return ['si', 'Elegible'];
}

function hitos() {
  const E = S.entidad, h = hoy(), out = [];
  const vivas = S.convocatorias.filter(c => !['presentada', 'resuelta'].includes(faseDe(c.estado)));
  const meses = new Set([12, 24, 36]);
  vivas.forEach(c => { if (c.reqAntiguedadMeses > 0) meses.add(c.reqAntiguedadMeses); });
  if (E.constitucion) {
    for (const m of [...meses].sort((a, b) => a - b)) {
      const fch = masMeses(E.constitucion, m);
      out.push({
        fecha: fch, hecho: fch <= h, aprox: E.constitucionAprox,
        titulo: m % 12 === 0 ? `${plural(m / 12, 'año', 'años')} de antigüedad` : `${m} meses de antigüedad`,
        corto: m % 12 === 0 ? plural(m / 12, 'año', 'años') : `${m} meses`,
        convs: vivas.filter(c => c.reqAntiguedadMeses === m),
      });
    }
  }
  E.ejercicios.forEach((e, i) => {
    out.push({
      fecha: e.aprobado || e.previsto, hecho: !!e.aprobado && e.aprobado <= h, previsto: !e.aprobado,
      corto: `Cuentas ${e.anio || ''}`,
      titulo: `${i === 0 ? 'Primer ejercicio cerrado' : `${i + 1} ejercicios cerrados`}: cuentas de ${e.anio || '—'} aprobadas`,
      convs: vivas.filter(c => c.reqEjercicios === i + 1),
    });
  });
  if (E.utilidadPublica || E.utilidadPublicaPrevista || vivas.some(c => c.reqUtilidadPublica)) {
    out.push({
      fecha: E.utilidadPublica || E.utilidadPublicaPrevista, hecho: !!E.utilidadPublica && E.utilidadPublica <= h,
      previsto: !E.utilidadPublica, titulo: 'Declaración de utilidad pública', corto: 'Utilidad pública',
      convs: vivas.filter(c => c.reqUtilidadPublica),
    });
  }
  return out.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
}

/* Lo que pide atención, ordenado por fecha. */
function agenda() {
  const h = hoy(), out = [];
  for (const c of S.convocatorias) {
    const fase = faseDe(c.estado);
    if (fase === 'activa') {
      for (const t of c.tareas) {
        if (!t.hecha && t.fecha && dias(h, t.fecha) <= 14) out.push({ tipo: 'tarea', fecha: t.fecha, titulo: t.texto || 'Tarea sin título', sub: c.nombre, cid: c.id, tid: t.id });
      }
      const el = elegibilidad(c);
      if (el.estado === 'no' && (!c.plazo || (c.plazo >= h && dias(h, c.plazo) <= 120))) {
        out.push({ tipo: 'noelegible', fecha: h, titulo: 'La entidad no cumple los requisitos en esta edición', sub: `${c.nombre} — ${el.desde ? `se podrá optar desde el ${f(el.desde)}; ` : ''}descártala o búscale una entidad aliada`, cid: c.id });
      } else if (c.plazo) {
        const d = dias(h, c.plazo), ini = prepInicio(c);
        const est = c.plazoConfirmado ? '' : ' (fecha estimada)';
        if (d < 0) {
          out.push({ tipo: 'vencido', fecha: c.plazo, titulo: `El plazo venció hace ${plural(-d, 'día', 'días')}`, sub: `${c.nombre} — márcala como presentada o descártala`, cid: c.id });
        } else if (d <= 30) {
          out.push({ tipo: 'plazo', fecha: c.plazo, titulo: `${d === 0 ? 'Cierra hoy' : d === 1 ? 'Cierra mañana' : `Cierra en ${d} días`}${c.plazoHora ? `, ${c.plazoHora}` : ''}${est}`, sub: c.nombre, cid: c.id });
        } else if (!c.plazoConfirmado && dias(h, c.apertura && c.apertura < ini ? c.apertura : ini) <= 30) {
          out.push({ tipo: 'confirmar', fecha: h, titulo: 'Confirma las fechas en la fuente oficial', sub: `${c.nombre} — plazo estimado: ${f(c.plazo)}`, cid: c.id });
        } else if (ini <= h && c.estado !== 'En preparación' && !c.tareas.length) {
          out.push({ tipo: 'preparar', fecha: h, titulo: 'Toca empezar a prepararla', sub: `${c.nombre} — cierra el ${f(c.plazo)}`, cid: c.id });
        }
      }
    }
    if (c.estado === 'Presentada' && c.resolucion && c.resolucion < h) {
      out.push({ tipo: 'resolucion', fecha: c.resolucion, titulo: '¿Ha salido ya la resolución?', sub: c.nombre, cid: c.id });
    }
  }
  for (const d of S.entidad.documentos) {
    if (d.caduca && dias(h, d.caduca) <= 30) {
      out.push({ tipo: 'doc', fecha: d.caduca, titulo: d.caduca < h ? 'Documento caducado: hay que renovarlo' : 'Documento a punto de caducar', sub: d.nombre });
    }
  }
  for (const e of S.entidad.ejercicios) {
    if (!e.aprobado && e.previsto && e.previsto < h) {
      out.push({ tipo: 'cuentas', fecha: e.previsto, titulo: `Las cuentas de ${e.anio} siguen sin aprobar`, sub: 'Hay convocatorias que piden ejercicios cerrados' });
    }
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function resumenTexto() {
  const h = hoy(), ag = agenda();
  const lin = [`Convocatorias de ${S.entidad.nombre || 'la entidad'} — ${f(h)}`, ''];
  const urg = ag.filter(a => a.fecha <= masDias(h, 14));
  lin.push(urg.length ? 'ESTAS DOS SEMANAS' : 'Estas dos semanas: nada urgente.');
  urg.forEach(a => lin.push(`• ${fCorta(a.fecha)} · ${a.titulo} — ${a.sub}`));
  const prox = S.convocatorias.filter(c => faseDe(c.estado) === 'activa' && c.plazo && c.plazo > masDias(h, 14) && c.plazo <= masDias(h, 90))
    .sort((a, b) => a.plazo.localeCompare(b.plazo));
  if (prox.length) {
    lin.push('', 'PRÓXIMOS 3 MESES');
    prox.forEach(c => lin.push(`• ${f(c.plazo)}${c.plazoConfirmado ? '' : ' (estimada)'} · ${c.nombre} · encaje ${c.encaje || '—'}/5 · ${textoEleg(c)[1]}`));
  }
  return lin.join('\n');
}

/* ───────── vistas ───────── */
const main = $('#main');
const ui = { vista: 'hoy', fase: 'activa', ambito: '', q: '' };
const VISTAS = ['hoy', 'convocatorias', 'calendario', 'entidad'];

const puntos = n => `<span class="encaje" role="img" aria-label="Encaje ${n || 0} de 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const opciones = (lista, sel) => lista.map(o => `<option${o === sel ? ' selected' : ''}>${esc(o)}</option>`).join('');

function render() {
  const v = location.hash.replace('#', '');
  ui.vista = VISTAS.includes(v) ? v : 'hoy';
  $$('.top nav a').forEach(a => a.getAttribute('href') === '#' + ui.vista ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  main.innerHTML = { hoy: vistaHoy, convocatorias: vistaLista, calendario: vistaCalendario, entidad: vistaEntidad }[ui.vista]();
}

function vistaHoy() {
  const h = hoy();
  if (!S.convocatorias.length) {
    return `<section class="bienvenida">
      <p class="ante">Tabla de mareas</p>
      <h1>Llegar a cada plazo con la solicitud hecha.</h1>
      <p class="sub">Aquí se ve qué convocatoria cierra cuándo, si la entidad cumple los requisitos en esa fecha y qué toca hacer esta semana para llegar a tiempo. Los datos se quedan en este ordenador.</p>
      <ol>
        <li><div><strong>Trae tus convocatorias.</strong> Importa un archivo de datos o añade la primera a mano.</div></li>
        <li><div><strong>Cuenta cómo es la entidad.</strong> Con la fecha de constitución se calcula sola la elegibilidad de cada convocatoria.</div></li>
        <li><div><strong>Abre esta página cada lunes.</strong> Te dirá qué vence, qué hay que confirmar y qué empezar.</div></li>
      </ol>
      <div class="fila-btn">
        <button class="btn primario" data-accion="datos">Importar un archivo de datos</button>
        <button class="btn" data-accion="nueva">Añadir una convocatoria</button>
        <a class="btn" href="#entidad">Configurar la entidad</a>
      </div>
    </section>`;
  }

  const activas = S.convocatorias.filter(c => faseDe(c.estado) === 'activa');
  const futuras = activas.filter(c => c.plazo && c.plazo >= h).sort((a, b) => a.plazo.localeCompare(b.plazo));
  const opta = c => elegibilidad(c).estado !== 'no';
  const prox = futuras.find(c => opta(c) && (c.estado === 'En preparación' || c.encaje >= 3)) || futuras.find(opta) || futuras[0];
  const concedidas = S.convocatorias.filter(c => ['Concedida', 'En ejecución', 'Justificada'].includes(c.estado));
  const denegadas = S.convocatorias.filter(c => c.estado === 'Denegada');
  const totalConcedido = concedidas.reduce((s, c) => s + (c.importeConcedido || 0), 0);
  const resueltas = concedidas.length + denegadas.length;

  let cabecera;
  if (prox) {
    const d = dias(h, prox.plazo), [cls, txt] = textoEleg(prox);
    cabecera = `<section class="proximo" aria-labelledby="prox-t">
      <p class="cifra" aria-hidden="true">${d}<small>${d === 1 ? 'día' : 'días'} para el próximo plazo</small></p>
      <div>
        <p class="ante">${prox.plazoConfirmado ? 'Próximo plazo' : 'Próximo plazo · fecha estimada'}</p>
        <h1 id="prox-t">${esc(prox.nombre)}</h1>
        <p class="datos">
          <span>Cierra el <b>${f(prox.plazo)}</b>${prox.plazoHora ? `, ${esc(prox.plazoHora)}` : ''}<span class="sr"> (quedan ${plural(d, 'día', 'días')})</span></span>
          ${prox.importeTexto ? `<span><b>${esc(prox.importeTexto)}</b></span>` : ''}
          <span>${esc(prox.estado)}</span>
        </p>
        <div class="marcas" style="margin-bottom:var(--e4)"><span class="marca-e ${cls}">${esc(txt)}</span>${puntos(prox.encaje)}</div>
        <button class="btn primario" data-abrir="${prox.id}">Abrir y preparar</button>
      </div>
    </section>`;
  } else {
    cabecera = `<section class="proximo"><div><p class="ante">Sin plazos a la vista</p><h1>Ninguna convocatoria en curso tiene fecha de cierre futura.</h1><p class="sub">Añade fechas, aunque sean estimadas, para que el calendario y los avisos funcionen.</p></div></section>`;
  }

  const ag = agenda();
  const ya = ag.filter(a => a.fecha <= h), pronto = ag.filter(a => a.fecha > h && a.fecha <= masDias(h, 14)), luego = ag.filter(a => a.fecha > masDias(h, 14));
  const fila = a => {
    const d = dias(h, a.fecha);
    const urg = a.tipo === 'vencido' || (a.tipo === 'plazo' && d <= 7) || (a.tipo === 'tarea' && d < 0) || (a.tipo === 'doc' && d < 0) || a.tipo === 'cuentas';
    const cuando = ['confirmar', 'preparar', 'noelegible'].includes(a.tipo) ? `Ahora<small>${{ confirmar: 'por confirmar', preparar: 'por empezar', noelegible: 'por decidir' }[a.tipo]}</small>` : `${fCorta(a.fecha)}<small>${d === 0 ? 'hoy' : d < 0 ? `hace ${-d} d` : `en ${d} d`}</small>`;
    const accion = a.tipo === 'tarea'
      ? `<label class="hecho"><input type="checkbox" data-hecha="${a.cid}" data-tid="${a.tid}"> Hecha</label>`
      : a.cid ? `<button class="btn mini" data-abrir="${a.cid}">Abrir</button>` : `<a class="btn mini" href="#entidad">Entidad</a>`;
    return `<li class="${urg ? 'urgente' : ''}"><div class="cuando">${cuando}</div><div class="que"><strong>${esc(a.titulo)}</strong><span>${esc(a.sub)}</span></div>${accion}</li>`;
  };
  const bloque = (titulo, nota, lista, vacio) => `<section class="seccion"><h2>${titulo}<small>${nota}</small></h2>${lista.length ? `<ul class="agenda">${lista.map(fila).join('')}</ul>` : `<p class="vacio">${vacio}</p>`}</section>`;

  const copia = S.meta.ultimaCopia ? dias(S.meta.ultimaCopia.slice(0, 10), h) : null;
  const avisoCopia = (S.meta.cambios > 0 && (copia === null || copia > 14))
    ? `<p class="aviso" style="margin-top:var(--e6)">${copia === null ? 'Todavía no has descargado ninguna copia de seguridad.' : `La última copia de seguridad es de hace ${copia} días.`} Los datos solo están en este navegador. <button class="btn enlace" data-accion="exportar">Descargar copia ahora</button></p>` : '';

  return `${cabecera}
    <dl class="cifras">
      <div><dt>En curso</dt><dd>${activas.length}</dd></div>
      <div><dt>En preparación</dt><dd>${activas.filter(c => c.estado === 'En preparación').length}</dd></div>
      <div><dt>Presentadas</dt><dd>${S.convocatorias.filter(c => c.estado === 'Presentada').length}</dd></div>
      <div><dt>Concedido</dt><dd>${eur(totalConcedido)} ${resueltas ? `<small>${concedidas.length} de ${resueltas} resueltas</small>` : ''}</dd></div>
    </dl>
    ${bloque('Pide decisión ya', plural(ya.length, 'asunto', 'asuntos'), ya, 'Nada atrasado. Bien.')}
    ${bloque('Próximos 14 días', plural(pronto.length, 'asunto', 'asuntos'), pronto, 'Nada con fecha en las próximas dos semanas.')}
    ${luego.length ? bloque('En el horizonte', 'hasta 30 días', luego, '') : ''}
    <div class="fila-btn" style="margin-top:var(--e6)">
      <button class="btn" data-accion="resumen">Copiar resumen para el equipo</button>
      <a class="btn" href="#calendario">Ver el año entero</a>
    </div>
    ${avisoCopia}`;
}

function filtradas() {
  const q = ui.q.trim().toLowerCase();
  const h = hoy();
  return S.convocatorias
    .filter(c => ui.fase === 'todas' || faseDe(c.estado) === ui.fase)
    .filter(c => !ui.ambito || c.ambito === ui.ambito)
    .filter(c => !q || `${c.nombre} ${c.financiador} ${c.notas} ${c.importeTexto}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const k = c => !c.plazo ? 3 : c.plazo >= h ? 1 : faseDe(c.estado) === 'activa' ? 0 : 2;
      const ka = k(a), kb = k(b);
      if (ka !== kb) return ka - kb;
      if (ka === 2) return b.plazo.localeCompare(a.plazo);
      return (a.plazo || '').localeCompare(b.plazo || '') || a.nombre.localeCompare(b.nombre);
    });
}

function listaHTML() {
  const h = hoy(), lista = filtradas();
  if (!lista.length) return `<p class="vacio">${S.convocatorias.length ? 'Ninguna convocatoria con estos filtros.' : 'Todavía no hay convocatorias. Añade la primera o importa un archivo desde Datos.'}</p>`;
  return `<ul class="lista">${lista.map(c => {
    const d = c.plazo ? dias(h, c.plazo) : null;
    const [cls, txt] = textoEleg(c);
    const fch = c.plazo
      ? `<span class="dia ${c.plazoConfirmado ? '' : 'estimada'}">${fecha(c.plazo).getDate()}<small>${MES[fecha(c.plazo).getMonth()]} ${fecha(c.plazo).getFullYear()}${c.plazoConfirmado ? '' : ' · est.'}</small></span>`
      : `<span class="dia sin">Sin fecha</span>`;
    const activa = faseDe(c.estado) === 'activa';
    const quedan = d === null || !activa ? '' : `<span class="marca-e dias ${d <= 14 ? 'cerca' : ''}">${d < 0 ? `venció hace ${-d} d` : d === 0 ? 'cierra hoy' : `quedan ${d} d`}</span>`;
    const pend = c.tareas.filter(t => !t.hecha).length;
    return `<li>
      <button class="abrir" data-abrir="${c.id}" aria-label="Abrir ${esc(c.nombre)}">
        ${fch}
        <span><span class="nombre">${esc(c.nombre)}</span>
          <span class="meta">${esc([c.ambito, c.importeTexto, c.rol && c.rol !== 'no aplica' ? `como ${c.rol}` : ''].filter(Boolean).join(' · '))}</span>
          <span class="marcas">${quedan}${faseDe(c.estado) === 'resuelta' ? '' : `<span class="marca-e ${cls}">${esc(txt)}</span>`}${c.tareas.length ? `<span class="marca-e duda">${pend ? `${plural(pend, 'tarea pendiente', 'tareas pendientes')}` : 'plan completado'}</span>` : ''}</span>
        </span>
      </button>
      ${puntos(c.encaje)}
      <select data-estado="${c.id}" aria-label="Estado de ${esc(c.nombre)}">${opciones(ESTADOS.map(e => e.id), c.estado)}</select>
    </li>`;
  }).join('')}</ul>`;
}

function vistaLista() {
  const cuenta = fase => S.convocatorias.filter(c => fase === 'todas' || faseDe(c.estado) === fase).length;
  return `<div class="cab-vista"><div><p class="ante">Convocatorias</p><h1 class="titulo-vista">Todo lo que está en el radar</h1></div>
      <button class="btn primario" data-accion="nueva">Nueva convocatoria</button></div>
    <div class="filtros">
      <div class="pestanas" role="group" aria-label="Fase">${FASES.map(([id, t]) => `<button data-fase="${id}" aria-pressed="${ui.fase === id}">${t}<span>${cuenta(id)}</span></button>`).join('')}</div>
      <select id="f-ambito" aria-label="Ámbito"><option value="">Todos los ámbitos</option>${opciones(AMBITOS, ui.ambito)}</select>
      <input type="search" id="f-q" placeholder="Buscar por nombre o nota" aria-label="Buscar" value="${esc(ui.q)}">
    </div>
    <div id="lista-zona">${listaHTML()}</div>`;
}

function vistaCalendario() {
  const h = hoy(), d0 = fecha(h);
  const ini = iso(new Date(d0.getFullYear(), d0.getMonth(), 1));
  const N = 14, fin = masMeses(ini, N), total = dias(ini, fin);
  const pos = s => acota(dias(ini, s) / total * 100, 0, 100);
  const convs = S.convocatorias.filter(c => faseDe(c.estado) === 'activa' && c.plazo && c.plazo >= ini && c.plazo < fin)
    .sort((a, b) => a.plazo.localeCompare(b.plazo));
  const sinFecha = S.convocatorias.filter(c => faseDe(c.estado) === 'activa' && !c.plazo);

  const meses = [];
  for (let i = 0; i < N; i++) {
    const m = masMeses(ini, i), dm = fecha(m);
    meses.push({ ini: m, etq: dm.getMonth() === 0 || i === 0 ? `${MES[dm.getMonth()]} ${String(dm.getFullYear()).slice(2)}` : MES[dm.getMonth()], anio: dm.getMonth() === 0 || i === 0, n: convs.filter(c => c.plazo.slice(0, 7) === m.slice(0, 7)).length });
  }
  const max = Math.max(1, ...meses.map(m => m.n));
  const pts = meses.map((m, i) => [(pos(m.ini) + pos(masMeses(m.ini, 1))) / 2 * 10, 108 - (m.n / max) * 84]);
  let linea = `M0,${pts[0][1]} L${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; linea += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
  linea += ` L1000,${pts[pts.length - 1][1]}`;
  const pico = meses.reduce((a, b) => b.n > a.n ? b : a, meses[0]);

  const hs = hitos().filter(x => x.fecha && x.fecha >= ini && x.fecha < fin && !x.hecho);
  const guias = `<div class="guias" aria-hidden="true">${meses.map(m => `<i class="guia" style="left:${pos(m.ini)}%"></i>`).join('')}${hs.map(x => `<i class="guia hito" style="left:${pos(x.fecha)}%"></i>`).join('')}<i class="guia hoy" style="left:${pos(h)}%"></i></div>`;

  const filas = convs.map(c => {
    const est = c.plazoConfirmado ? '' : ' estimada';
    const pi = prepInicio(c), a = c.apertura && c.apertura < c.plazo ? c.apertura : '';
    const finPrep = a || c.plazo;
    const prep = pi < finPrep ? `<i class="prep" style="left:${pos(pi)}%;width:${Math.max(0, pos(finPrep) - pos(pi))}%"></i>` : '';
    const vent = a ? `<i class="ventana${est}" style="left:${pos(a)}%;width:${Math.max(0.4, pos(c.plazo) - pos(a))}%"></i>` : '';
    const izq = pos(pi < finPrep ? pi : finPrep);
    const alaIzq = pos(c.plazo) > 86 && izq > 15;
    const rot = `<span class="rot" style="${alaIzq ? `right:${100 - izq}%;padding:0 var(--e3) 0 0` : `left:${pos(c.plazo)}%`}">${fCorta(c.plazo)}${c.plazoConfirmado ? '' : ' est.'}</span>`;
    return `<div class="crono-fila"><button class="etq" data-abrir="${c.id}" title="${esc(c.nombre)}"><span>${esc(c.nombre)}</span></button>
      <div class="pista">${prep}${vent}<i class="cierre${est}" style="left:${pos(c.plazo)}%"></i>${rot}</div></div>`;
  }).join('');

  const filaHitos = hs.length ? `<div class="crono-fila"><span class="etq" style="cursor:default;color:var(--tinta-2)">Hitos de la entidad</span><div class="pista">${hs.map((x, i) => `<span class="rot hito-etq ${pos(x.fecha) > 86 ? 'izq' : ''}" style="left:${pos(x.fecha)}%;top:${i % 2 ? 72 : 28}%">${esc(x.corto)}</span>`).join('')}</div></div>` : '';

  return `<div class="cab-vista"><div><p class="ante">Calendario</p><h1 class="titulo-vista">La tabla de mareas</h1>
      <p class="sub">Los próximos ${N} meses. La curva marca cuándo se juntan los plazos${pico.n ? `: la pleamar llega en <strong>${MES[fecha(pico.ini).getMonth()]} ${fecha(pico.ini).getFullYear()}</strong>, con ${plural(pico.n, 'cierre', 'cierres')}` : ''}. La trama rayada es el tiempo de preparación: si hoy cae dentro, hay que estar ya en ello.</p></div>
      <button class="btn" data-accion="ics">Llevar los plazos a mi calendario</button></div>
    ${convs.length ? `<div class="crono-desliza"><div class="crono">
      <div class="crono-fila" style="border-bottom:0"><span class="etq" style="cursor:default;color:var(--tinta-2)">Cierres por mes</span>
        <div class="marea"><svg viewBox="0 0 1000 120" preserveAspectRatio="none" role="img" aria-label="Número de plazos que cierran cada mes">
          <path class="area" d="${linea} L1000,120 L0,120 Z"/><path class="linea" d="${linea}"/></svg>
          ${meses.map((m, i) => m.n ? `<span class="n" style="left:${pts[i][0] / 10}%;top:${pts[i][1] / 120 * 100}%">${m.n}</span>` : '').join('')}
        </div></div>
      <div class="crono-cab"><span></span><div class="meses">${meses.map(m => `<span class="${m.anio ? 'anio' : ''}" style="left:${pos(m.ini)}%">${m.etq}</span>`).join('')}</div></div>
      <div class="crono-cuerpo">${guias}${filaHitos}${filas}</div>
    </div></div>
    <p class="leyenda"><span><i class="l-prep"></i>Tiempo de preparación</span><span><i class="l-ventana"></i>Plazo abierto</span><span><i class="l-estimada"></i>Fechas estimadas</span><span><i class="l-cierre"></i>Cierre</span><span><i class="l-hoy"></i>Hoy</span><span><i class="l-hito"></i>Hito de elegibilidad</span></p>`
      : `<p class="vacio">No hay convocatorias en curso con fecha de cierre en los próximos ${N} meses.</p>`}
    ${sinFecha.length ? `<section class="seccion"><h2>Sin fecha todavía<small>ponles una estimada para verlas arriba</small></h2><ul class="agenda">${sinFecha.map(c => `<li><div class="cuando">—</div><div class="que"><strong>${esc(c.nombre)}</strong><span>${esc(c.ambito)}</span></div><button class="btn mini" data-abrir="${c.id}">Abrir</button></li>`).join('')}</ul></section>` : ''}`;
}

function hitosHTML() {
  const h = hoy(), hs = hitos();
  if (!S.entidad.constitucion && !hs.length) return `<p class="vacio">Indica la fecha de constitución para calcular los hitos.</p>`;
  return `<ul class="hitos">${hs.map(x => {
    const d = x.fecha ? dias(h, x.fecha) : null;
    const cuando = x.fecha ? `${fCorta(x.fecha)} ${fecha(x.fecha).getFullYear()}<small>${x.hecho ? 'conseguido' : d < 0 ? 'fecha prevista pasada' : `faltan ${plural(d, 'día', 'días')}${x.previsto ? ' · previsto' : ''}${x.aprox ? ' · aprox.' : ''}`}</small>` : `Sin fecha<small>indica una prevista</small>`;
    const desb = x.convs.length
      ? `${x.hecho ? 'Lo pedían' : 'Lo exigen'}: ${x.convs.map(c => `<button data-abrir="${c.id}">${esc(c.nombre)}</button>`).join(', ')}`
      : 'Ninguna convocatoria del radar lo pide ahora mismo.';
    return `<li class="${x.hecho ? 'hecho' : ''}"><div class="cuando">${cuando}</div><div><strong>${esc(x.titulo)}</strong><p class="desbloquea">${desb}</p></div></li>`;
  }).join('')}</ul>`;
}

const cuentaDocs = () => `${S.entidad.documentos.filter(d => d.listo).length} de ${S.entidad.documentos.length} preparados`;

function vistaEntidad() {
  const E = S.entidad, h = hoy();
  return `<div class="cab-vista"><div><p class="ante">Entidad</p><h1 class="titulo-vista">Lo que la entidad puede pedir, y desde cuándo</h1>
      <p class="sub">Muchas convocatorias exigen antigüedad, cuentas cerradas o estar en un registro. Con estos datos, cada convocatoria sabe si la entidad cumple en su fecha de cierre.</p></div></div>
    <section class="seccion" style="margin-top:0"><h2>Datos básicos</h2>
      <div class="rejilla">
        <div class="c6"><label class="etq" for="e-nombre">Nombre de la entidad</label><input type="text" id="e-nombre" data-ent="nombre" value="${esc(E.nombre)}"></div>
        <div class="c3"><label class="etq" for="e-const">Fecha de constitución</label><input type="date" id="e-const" data-ent="constitucion" value="${E.constitucion}">
          <p class="ayuda">La de inscripción en el registro de asociaciones.</p></div>
        <div class="c3"><span class="etq-g espaciador">&nbsp;</span><label class="casilla"><input type="checkbox" data-ent="constitucionAprox" ${E.constitucionAprox ? 'checked' : ''}> El día es aproximado</label></div>
        <div class="c3"><label class="etq" for="e-up">Utilidad pública: concedida el</label><input type="date" id="e-up" data-ent="utilidadPublica" value="${E.utilidadPublica}"></div>
        <div class="c3"><label class="etq" for="e-upp">…o prevista para</label><input type="date" id="e-upp" data-ent="utilidadPublicaPrevista" value="${E.utilidadPublicaPrevista}"></div>
      </div>
    </section>
    <section class="seccion"><h2>Ejercicios económicos<small>cuentas anuales aprobadas en asamblea</small></h2>
      <table class="tabla apilar"><thead><tr><th>Ejercicio</th><th>Aprobación prevista</th><th>Aprobadas el</th><th></th></tr></thead><tbody>
      ${E.ejercicios.map((e, i) => `<tr>
        <td><input type="number" aria-label="Año del ejercicio" data-ej="${i}" data-campo="anio" value="${e.anio}" min="2000" max="2100"></td>
        <td><input type="date" aria-label="Aprobación prevista de las cuentas de ${e.anio}" data-ej="${i}" data-campo="previsto" value="${e.previsto}"></td>
        <td><input type="date" aria-label="Fecha de aprobación de las cuentas de ${e.anio}" data-ej="${i}" data-campo="aprobado" value="${e.aprobado}"></td>
        <td class="acc"><button class="quitar" data-quitar-ej="${i}" aria-label="Quitar el ejercicio ${e.anio}">×</button></td></tr>`).join('')}
      </tbody></table>
      <div class="fila-btn"><button class="btn mini" data-accion="mas-ej">Añadir ejercicio</button></div>
    </section>
    <section class="seccion"><h2>Hitos de elegibilidad<small>qué desbloquea cada uno</small></h2><div id="hitos-zona">${hitosHTML()}</div></section>
    <section class="seccion"><h2>Registros y censos<small>no dependen de la antigüedad: cuanto antes, mejor</small></h2>
      <table class="tabla apilar"><thead><tr><th>Registro</th><th style="width:170px">Estado</th><th>Nota</th><th></th></tr></thead><tbody>
      ${E.registros.map(r => `<tr>
        <td><input type="text" aria-label="Nombre del registro" data-reg="${r.id}" data-campo="nombre" value="${esc(r.nombre)}"></td>
        <td><select aria-label="Estado de ${esc(r.nombre)}" data-reg="${r.id}" data-campo="estado">${opciones(ESTADOS_REG, r.estado)}</select></td>
        <td><input type="text" aria-label="Nota sobre ${esc(r.nombre)}" data-reg="${r.id}" data-campo="nota" value="${esc(r.nota)}" placeholder="Número, fecha, quién lo lleva…"></td>
        <td class="acc"><button class="quitar" data-quitar-reg="${r.id}" aria-label="Quitar ${esc(r.nombre)}">×</button></td></tr>`).join('')}
      </tbody></table>
      <div class="fila-btn"><button class="btn mini" data-accion="mas-reg">Añadir registro</button></div>
    </section>
    <section class="seccion"><h2>Documentación lista para presentar<small id="docs-cuenta">${cuentaDocs()}</small></h2>
      <table class="tabla apilar"><thead><tr><th style="width:44px">Listo</th><th>Documento</th><th style="width:170px">Caduca el</th><th>Enlace a la carpeta</th><th></th></tr></thead><tbody>
      ${E.documentos.map(d => `<tr>
        <td><input type="checkbox" aria-label="${esc(d.nombre)}: listo" data-doc="${d.id}" data-campo="listo" ${d.listo ? 'checked' : ''}></td>
        <td><input type="text" aria-label="Nombre del documento" data-doc="${d.id}" data-campo="nombre" value="${esc(d.nombre)}">${d.caduca && d.caduca < h ? '<span class="marca-e no">caducado</span>' : ''}</td>
        <td><input type="date" aria-label="Caducidad de ${esc(d.nombre)}" data-doc="${d.id}" data-campo="caduca" value="${d.caduca}"></td>
        <td><input type="url" aria-label="Enlace de ${esc(d.nombre)}" data-doc="${d.id}" data-campo="enlace" value="${esc(d.enlace)}" placeholder="https://…"></td>
        <td class="acc"><button class="quitar" data-quitar-doc="${d.id}" aria-label="Quitar ${esc(d.nombre)}">×</button></td></tr>`).join('')}
      </tbody></table>
      <div class="fila-btn"><button class="btn mini" data-accion="mas-doc">Añadir documento</button></div>
      <p class="ayuda">Los certificados de estar al corriente suelen valer seis meses. Con la fecha de caducidad puesta, Hoy avisa un mes antes.</p>
    </section>`;
}

/* ───────── ficha de convocatoria ───────── */
const dlgConv = $('#dlg-conv'), dlgDatos = $('#dlg-datos');
let borrador = null, esNueva = false;

function abrirConv(id) {
  const orig = id ? S.convocatorias.find(c => c.id === id) : null;
  esNueva = !orig;
  borrador = orig ? JSON.parse(JSON.stringify(orig)) : normConv({});
  pintarFicha();
  dlgConv.showModal();
  if (esNueva) $('#c-nombre').focus();
}

function avisoElegHTML() {
  const el = elegibilidad(borrador);
  const cuando = borrador.plazo ? `En la fecha de cierre (${f(borrador.plazo)})` : 'A día de hoy (no hay fecha de cierre)';
  if (el.estado === 'no') return `<p class="aviso no"><strong>No elegible ${borrador.plazo ? 'en esta edición' : 'por ahora'}.</strong> ${cuando} falta: ${esc(el.faltan.join('; '))}.${el.desde ? ` Se podrá optar a partir del <strong>${f(el.desde)}</strong>.` : ''}${el.tramites.length ? ` Además, falta inscribirse en: ${esc(el.tramites.join(', '))}.` : ''}</p>`;
  if (el.estado === 'tramite') return `<p class="aviso no"><strong>Elegible si se hace un trámite.</strong> Falta inscribirse en: ${esc(el.tramites.join(', '))}. No depende de la antigüedad: se puede resolver ya.</p>`;
  if (el.estado === 'verificar') return `<p class="aviso"><strong>Requisitos sin verificar.</strong> Con lo anotado no hay impedimento, pero falta leerlos en las bases oficiales. Cuando estén comprobados, marca la casilla.</p>`;
  return `<p class="aviso"><strong>Elegible.</strong> ${cuando} la entidad cumple los requisitos anotados.</p>`;
}

function tareasHTML() {
  const ts = borrador.tareas.slice().sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
  return ts.length ? `<ul class="tareas">${ts.map(t => `<li class="${t.hecha ? 'hecha' : ''}">
      <input type="checkbox" data-t="${t.id}" data-campo="hecha" ${t.hecha ? 'checked' : ''} aria-label="Hecha: ${esc(t.texto)}">
      <input type="text" data-t="${t.id}" data-campo="texto" value="${esc(t.texto)}" aria-label="Tarea">
      <input type="date" data-t="${t.id}" data-campo="fecha" value="${t.fecha}" aria-label="Fecha de la tarea">
      <button type="button" class="quitar" data-quitar-t="${t.id}" aria-label="Quitar la tarea">×</button></li>`).join('')}</ul>`
    : `<p class="ayuda" style="margin:0 0 var(--e2)">Sin tareas. El plan hacia atrás reparte los pasos desde la fecha de cierre hasta hoy.</p>`;
}

function pintarFicha() {
  const c = borrador, E = S.entidad;
  $('#dlg-conv-t').textContent = esNueva ? 'Nueva convocatoria' : 'Ficha de la convocatoria';
  const enlace = urlOK(c.enlace), carpeta = urlOK(c.carpeta);
  $('#form-conv').innerHTML = `
    <fieldset><legend>Qué es</legend><div class="rejilla">
      <div class="c12"><label class="etq" for="c-nombre">Nombre</label><input type="text" id="c-nombre" name="nombre" value="${esc(c.nombre)}" required></div>
      <div class="c6"><label class="etq" for="c-fin">Financiador o programa</label><input type="text" id="c-fin" name="financiador" value="${esc(c.financiador)}"></div>
      <div class="c3"><label class="etq" for="c-amb">Ámbito</label><select id="c-amb" name="ambito"><option value="">—</option>${opciones(AMBITOS, c.ambito)}</select></div>
      <div class="c3"><label class="etq" for="c-rol">Papel de la entidad</label><select id="c-rol" name="rol">${ROLES.map(r => `<option value="${r}"${r === c.rol ? ' selected' : ''}>${r || '—'}</option>`).join('')}</select></div>
      <div class="c4"><label class="etq" for="c-est">Estado</label><select id="c-est" name="estado">${opciones(ESTADOS.map(e => e.id), c.estado)}</select></div>
      <div class="c4"><label class="etq" for="c-enc">Encaje (1 a 5)</label><select id="c-enc" name="encaje">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}"${n === c.encaje ? ' selected' : ''}>${n || 'Sin valorar'}</option>`).join('')}</select></div>
      <div class="c4"><label class="etq" for="c-imp">Importe (texto libre)</label><input type="text" id="c-imp" name="importeTexto" value="${esc(c.importeTexto)}" placeholder="Hasta 25.000 €"></div>
    </div></fieldset>

    <fieldset><legend>Fechas</legend><div class="rejilla">
      <div class="c3"><label class="etq" for="c-ape">Apertura</label><input type="date" id="c-ape" name="apertura" value="${c.apertura}"></div>
      <div class="c3"><label class="etq" for="c-pla">Cierre del plazo</label><input type="date" id="c-pla" name="plazo" value="${c.plazo}"></div>
      <div class="c3"><label class="etq" for="c-hora">Hora límite</label><input type="text" id="c-hora" name="plazoHora" value="${esc(c.plazoHora)}" placeholder="23:59 hora peninsular"></div>
      <div class="c3"><label class="etq" for="c-res">Resolución prevista</label><input type="date" id="c-res" name="resolucion" value="${c.resolucion}"></div>
      <div class="c6"><label class="casilla"><input type="checkbox" name="plazoConfirmado" ${c.plazoConfirmado ? 'checked' : ''}> Fechas confirmadas en la fuente oficial</label>
        <p class="ayuda">Sin marcar, se tratan como estimadas (por ejemplo, calculadas con la edición anterior).</p></div>
      <div class="c3"><label class="etq" for="c-sem">Semanas para prepararla</label><input type="number" id="c-sem" name="semanasPrep" min="1" max="52" value="${c.semanasPrep}"></div>
      <div class="c3"><label class="etq" for="c-rev">Datos revisados el</label><input type="date" id="c-rev" name="revisado" value="${c.revisado}"></div>
    </div></fieldset>

    <fieldset><legend>Requisitos de la entidad</legend>
      <div id="aviso-eleg">${avisoElegHTML()}</div>
      <div class="rejilla">
        <div class="c4"><label class="etq" for="c-ant">Antigüedad mínima (meses)</label><input type="number" id="c-ant" name="reqAntiguedadMeses" min="0" max="240" value="${c.reqAntiguedadMeses}" data-req></div>
        <div class="c4"><label class="etq" for="c-eje">Ejercicios cerrados que pide</label><input type="number" id="c-eje" name="reqEjercicios" min="0" max="10" value="${c.reqEjercicios}" data-req></div>
        <div class="c4"><span class="etq-g espaciador">&nbsp;</span><label class="casilla"><input type="checkbox" name="reqUtilidadPublica" ${c.reqUtilidadPublica ? 'checked' : ''} data-req> Exige utilidad pública</label></div>
        <div class="c12"><span class="etq-g">Registros que exige</span><div class="registros-check">${E.registros.map(r => `<label class="casilla"><input type="checkbox" name="reqRegistros" value="${esc(r.id)}" ${c.reqRegistros.includes(r.id) ? 'checked' : ''} data-req> <span>${esc(r.nombre)}${r.estado === 'hecho' ? '' : ` <span class="marca-e duda">${esc(r.estado)}</span>`}</span></label>`).join('')}</div></div>
        <div class="c12"><label class="casilla"><input type="checkbox" name="reqVerificado" ${c.reqVerificado ? 'checked' : ''} data-req> He comprobado los requisitos en las bases oficiales</label></div>
      </div>
    </fieldset>

    <fieldset><legend>Plan de preparación</legend>
      <div id="tareas-zona">${tareasHTML()}</div>
      <div class="fila-btn"><button type="button" class="btn mini" data-accion="plan">Generar plan hacia atrás</button><button type="button" class="btn mini" data-accion="mas-tarea">Añadir tarea</button></div>
    </fieldset>

    <fieldset><legend>Dinero</legend><div class="rejilla">
      <div class="c4"><label class="etq" for="c-sol">Importe solicitado (€)</label><input type="number" id="c-sol" name="importeSolicitado" min="0" step="1" value="${c.importeSolicitado ?? ''}"></div>
      <div class="c4"><label class="etq" for="c-con">Importe concedido (€)</label><input type="number" id="c-con" name="importeConcedido" min="0" step="1" value="${c.importeConcedido ?? ''}"></div>
      <div class="c4"><label class="etq" for="c-cof">Cofinanciación exigida (%)</label><input type="number" id="c-cof" name="cofinanciacion" min="0" max="100" value="${c.cofinanciacion ?? ''}"></div>
    </div></fieldset>

    <fieldset><legend>Notas y enlaces</legend><div class="rejilla">
      <div class="c12"><label class="etq" for="c-not">Requisitos, criterios y siguiente paso</label><textarea id="c-not" name="notas" rows="6">${esc(c.notas)}</textarea></div>
      <div class="c6"><label class="etq" for="c-enl">Enlace oficial</label><input type="url" id="c-enl" name="enlace" value="${esc(c.enlace)}" placeholder="https://…">${enlace ? `<p class="ayuda"><a href="${esc(enlace)}" target="_blank" rel="noopener noreferrer">Abrir la página oficial</a></p>` : ''}</div>
      <div class="c6"><label class="etq" for="c-car">Carpeta de trabajo</label><input type="url" id="c-car" name="carpeta" value="${esc(c.carpeta)}" placeholder="https://drive.google.com/…">${carpeta ? `<p class="ayuda"><a href="${esc(carpeta)}" target="_blank" rel="noopener noreferrer">Abrir la carpeta</a></p>` : ''}</div>
      <div class="c6"><label class="etq" for="c-mot">Motivo de descarte</label><input type="text" id="c-mot" name="motivo" value="${esc(c.motivo)}"></div>
      <div class="c6"><label class="etq" for="c-apr">Qué aprendimos (para la próxima edición)</label><input type="text" id="c-apr" name="aprendizaje" value="${esc(c.aprendizaje)}"></div>
    </div></fieldset>`;
  $('#btn-borrar-conv').hidden = esNueva;
}

function sincronizarTareas() {
  $$('#tareas-zona [data-t]').forEach(el => {
    const t = borrador.tareas.find(x => x.id === el.dataset.t), c = el.dataset.campo;
    if (t) t[c] = c === 'hecha' ? el.checked : c === 'fecha' ? fechaOK(el.value) : el.value;
  });
}

function leerFicha() {
  sincronizarTareas();
  const fd = new FormData($('#form-conv'));
  const v = k => String(fd.get(k) ?? '');
  Object.assign(borrador, normConv({
    ...borrador,
    nombre: v('nombre'), financiador: v('financiador'), ambito: v('ambito'), rol: v('rol'), estado: v('estado'),
    encaje: v('encaje'), importeTexto: v('importeTexto'), apertura: v('apertura'), plazo: v('plazo'), plazoHora: v('plazoHora'),
    resolucion: v('resolucion'), plazoConfirmado: fd.has('plazoConfirmado'), semanasPrep: v('semanasPrep'), revisado: v('revisado'),
    reqAntiguedadMeses: v('reqAntiguedadMeses'), reqEjercicios: v('reqEjercicios'), reqUtilidadPublica: fd.has('reqUtilidadPublica'),
    reqRegistros: fd.getAll('reqRegistros'), reqVerificado: fd.has('reqVerificado'),
    importeSolicitado: v('importeSolicitado'), importeConcedido: v('importeConcedido'), cofinanciacion: v('cofinanciacion'),
    notas: v('notas'), enlace: v('enlace'), carpeta: v('carpeta'), motivo: v('motivo'), aprendizaje: v('aprendizaje'),
  }));
}

function generarPlan() {
  leerFicha();
  if (!borrador.plazo) { aviso('Pon primero la fecha de cierre, aunque sea estimada.'); $('#c-pla').focus(); return; }
  const h = hoy(), quedan = dias(h, borrador.plazo);
  if (quedan < 0) { aviso('El plazo ya ha pasado.'); return; }
  const previsto = borrador.semanasPrep * 7;
  const escala = Math.min(previsto, quedan) / 42;
  const ya = new Set(borrador.tareas.map(t => t.texto));
  let n = 0;
  for (const [antes, texto] of PLAN_BASE) {
    if (ya.has(texto)) continue;
    let fch = masDias(borrador.plazo, -Math.round(antes * escala));
    if (fch < h) fch = h;
    borrador.tareas.push({ id: uid(), texto, fecha: fch, hecha: false });
    n++;
  }
  $('#tareas-zona').innerHTML = tareasHTML();
  aviso(n ? `Plan creado: ${n} pasos${quedan < previsto ? `, comprimidos en los ${quedan} días que quedan` : ''}.` : 'El plan ya estaba creado.');
}

function guardarFicha() {
  leerFicha();
  if (!borrador.nombre) { aviso('La convocatoria necesita un nombre.'); $('#c-nombre').focus(); return; }
  borrador.tareas = borrador.tareas.filter(t => t.texto.trim());
  const i = S.convocatorias.findIndex(c => c.id === borrador.id);
  if (i >= 0) S.convocatorias[i] = borrador; else S.convocatorias.push(borrador);
  guardar(); dlgConv.close(); render();
  aviso(esNueva ? 'Convocatoria añadida.' : 'Cambios guardados.');
}

/* ───────── importar, exportar ───────── */
function descargar(nombre, texto, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
  a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function exportar() {
  S.meta.ultimaCopia = new Date().toISOString(); S.meta.cambios = 0;
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ }
  descargar(`tabla-de-mareas-${hoy()}.json`, JSON.stringify(S, null, 2), 'application/json');
  aviso('Copia descargada. Guárdala en la carpeta compartida del equipo.');
  pintarDatos(); if (ui.vista === 'hoy') render();
}

function importar(texto, modo) {
  let d;
  try { d = JSON.parse(texto); } catch (e) { aviso('El archivo no es un JSON válido.'); return false; }
  if (Array.isArray(d)) d = { convocatorias: d };
  if (!d || typeof d !== 'object' || (!Array.isArray(d.convocatorias) && !d.entidad)) { aviso('No reconozco el formato: falta la lista «convocatorias».'); return false; }
  if (modo === 'reemplazar') {
    if (S.convocatorias.length && !confirm('Se sustituirá todo lo que hay ahora por el contenido del archivo. ¿Continuar?')) return false;
    S = normalizar(d); guardar(); render();
    aviso(`Datos cargados: ${plural(S.convocatorias.length, 'convocatoria', 'convocatorias')}.`);
    return true;
  }
  let nuevas = 0, act = 0;
  for (const inc of (d.convocatorias || [])) {
    if (!inc || typeof inc !== 'object') continue;
    const nom = String(inc.nombre || '').trim().toLowerCase();
    const ya = S.convocatorias.find(c => (inc.id && c.id === inc.id) || (inc.idExterno && c.idExterno === String(inc.idExterno)) || (nom && c.nombre.toLowerCase() === nom));
    if (ya) {
      Object.assign(ya, normConv({ ...ya, ...inc, id: ya.id, tareas: Array.isArray(inc.tareas) && inc.tareas.length ? inc.tareas : ya.tareas }));
      act++;
    } else if (nom) { S.convocatorias.push(normConv(inc)); nuevas++; }
  }
  const E = S.entidad;
  let ent = false;
  if (d.entidad && !E.constitucion && !E.nombre) { S.entidad = normalizar({ entidad: d.entidad }).entidad; ent = true; }
  guardar(); render();
  aviso(`${plural(nuevas, 'convocatoria nueva', 'convocatorias nuevas')}, ${plural(act, 'actualizada', 'actualizadas')}${ent ? ' y datos de la entidad cargados' : ''}.`);
  return true;
}

function exportarICS() {
  const sello = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const t = s => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');
  const ev = (id, dia, titulo, desc) => ['BEGIN:VEVENT', `UID:${id}@tabla-de-mareas`, `DTSTAMP:${sello}`,
    `DTSTART;VALUE=DATE:${dia.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${masDias(dia, 1).replace(/-/g, '')}`,
    `SUMMARY:${t(titulo)}`, desc ? `DESCRIPTION:${t(desc)}` : '', 'END:VEVENT'].filter(Boolean).join('\r\n');
  const evs = [];
  for (const c of S.convocatorias) {
    if (!['activa', 'presentada'].includes(faseDe(c.estado))) continue;
    if (faseDe(c.estado) === 'activa' && c.plazo) {
      evs.push(ev(c.id + '-plazo', c.plazo, `Cierra: ${c.nombre}${c.plazoConfirmado ? '' : ' (fecha estimada)'}`, [c.plazoHora, c.importeTexto, urlOK(c.enlace)].filter(Boolean).join(' · ')));
      evs.push(ev(c.id + '-prep', prepInicio(c), `Empezar a preparar: ${c.nombre}`, `Cierra el ${f(c.plazo)}`));
      c.tareas.filter(x => !x.hecha && x.fecha).forEach(x => evs.push(ev(c.id + '-' + x.id, x.fecha, `${x.texto} — ${c.nombre}`, '')));
    }
    if (c.estado === 'Presentada' && c.resolucion) evs.push(ev(c.id + '-res', c.resolucion, `Resolución prevista: ${c.nombre}`, ''));
  }
  if (!evs.length) { aviso('No hay plazos con fecha que llevar al calendario.'); return; }
  descargar('plazos-convocatorias.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tabla de mareas//ES', 'CALSCALE:GREGORIAN', ...evs, 'END:VCALENDAR'].join('\r\n'), 'text/calendar');
  aviso(`${plural(evs.length, 'fecha descargada', 'fechas descargadas')}. Abre el archivo o impórtalo en Google Calendar.`);
}

function pintarDatos() {
  const c = S.meta.ultimaCopia;
  $('#datos-estado').textContent = `${plural(S.convocatorias.length, 'convocatoria guardada', 'convocatorias guardadas')} en este navegador. ${c ? `Última copia: ${f(c.slice(0, 10))}.` : 'Aún no se ha descargado ninguna copia.'}`;
}

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* nada */ }
    ta.remove(); return ok;
  }
}

let relojAviso;
function aviso(texto) {
  const el = $('#toast');
  el.textContent = texto; el.classList.add('ver');
  clearTimeout(relojAviso); relojAviso = setTimeout(() => el.classList.remove('ver'), 4200);
}

/* ───────── eventos ───────── */
document.addEventListener('click', async ev => {
  const b = ev.target.closest('button, a');
  if (!b) return;
  const d = b.dataset;

  if (d.abrir) { abrirConv(d.abrir); return; }
  if (d.fase) { ui.fase = d.fase; render(); return; }
  if (d.cerrar) { $('#' + d.cerrar).close(); return; }

  if (d.quitarEj != null) { if (confirm('¿Quitar este ejercicio?')) { S.entidad.ejercicios.splice(+d.quitarEj, 1); guardar(); render(); } return; }
  if (d.quitarReg) {
    if (confirm('¿Quitar este registro?')) {
      S.entidad.registros = S.entidad.registros.filter(r => r.id !== d.quitarReg);
      S.convocatorias.forEach(c => { c.reqRegistros = c.reqRegistros.filter(x => x !== d.quitarReg); });
      guardar(); render();
    }
    return;
  }
  if (d.quitarDoc) { if (confirm('¿Quitar este documento de la lista?')) { S.entidad.documentos = S.entidad.documentos.filter(x => x.id !== d.quitarDoc); guardar(); render(); } return; }
  if (d.quitarT) { sincronizarTareas(); borrador.tareas = borrador.tareas.filter(t => t.id !== d.quitarT); $('#tareas-zona').innerHTML = tareasHTML(); return; }

  switch (d.accion) {
    case 'nueva': abrirConv(null); break;
    case 'datos': pintarDatos(); dlgDatos.showModal(); break;
    case 'exportar': exportar(); break;
    case 'ics': exportarICS(); break;
    case 'resumen': aviso(await copiar(resumenTexto()) ? 'Resumen copiado. Pégalo en el chat del equipo.' : 'No se ha podido copiar.'); break;
    case 'mas-ej': {
      const ult = S.entidad.ejercicios[S.entidad.ejercicios.length - 1];
      const anio = ult && ult.anio ? ult.anio + 1 : (S.entidad.constitucion ? +S.entidad.constitucion.slice(0, 4) : fecha(hoy()).getFullYear());
      S.entidad.ejercicios.push({ anio, previsto: `${anio + 1}-06-30`, aprobado: '' }); guardar(); render(); break;
    }
    case 'mas-reg': S.entidad.registros.push({ id: uid(), nombre: '', estado: 'pendiente', nota: '' }); guardar(); render(); { const xs = $$('[data-reg][data-campo="nombre"]'); xs[xs.length - 1].focus(); } break;
    case 'mas-doc': S.entidad.documentos.push({ id: uid(), nombre: '', listo: false, caduca: '', enlace: '' }); guardar(); render(); { const xs = $$('[data-doc][data-campo="nombre"]'); xs[xs.length - 1].focus(); } break;
    case 'plan': generarPlan(); break;
    case 'mas-tarea': {
      sincronizarTareas();
      borrador.tareas.push({ id: uid(), texto: '', fecha: '', hecha: false });
      $('#tareas-zona').innerHTML = tareasHTML();
      const xs = $$('#tareas-zona input[type="text"]'); (xs.find(x => !x.value) || xs[xs.length - 1]).focus(); break;
    }
    case 'borrar-conv':
      if (confirm(`¿Eliminar «${borrador.nombre}»? No se puede deshacer.`)) {
        S.convocatorias = S.convocatorias.filter(c => c.id !== borrador.id); guardar(); dlgConv.close(); render(); aviso('Convocatoria eliminada.');
      }
      break;
    case 'importar-texto': {
      const modo = $('input[name="modo"]:checked').value;
      if (importar($('#datos-texto').value, modo)) { $('#datos-texto').value = ''; dlgDatos.close(); }
      break;
    }
    case 'borrar-todo':
      if (confirm('Se borrarán todas las convocatorias y los datos de la entidad de este navegador. ¿Seguro?')) {
        try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
        S = normalizar({}); dlgDatos.close(); render(); aviso('Datos borrados.');
      }
      break;
  }
});

document.addEventListener('change', ev => {
  const el = ev.target, d = el.dataset;
  const val = el.type === 'checkbox' ? el.checked : el.value;

  if (d.estado) { const c = S.convocatorias.find(x => x.id === d.estado); if (c) { c.estado = val; guardar(); render(); aviso(`${c.nombre}: ${val}.`); } return; }
  if (d.hecha) {
    const c = S.convocatorias.find(x => x.id === d.hecha), t = c && c.tareas.find(x => x.id === d.tid);
    if (t) { t.hecha = val; guardar(); render(); aviso('Tarea hecha.'); }
    return;
  }
  if (el.id === 'f-ambito') { ui.ambito = val; $('#lista-zona').innerHTML = listaHTML(); return; }

  if (d.ent) {
    S.entidad[d.ent] = el.type === 'checkbox' ? val : (el.type === 'date' ? fechaOK(val) : val);
    guardar(); $('#hitos-zona').innerHTML = hitosHTML(); return;
  }
  if (d.ej != null) {
    const e = S.entidad.ejercicios[+d.ej]; if (!e) return;
    e[d.campo] = d.campo === 'anio' ? (num(val) || '') : fechaOK(val);
    guardar(); $('#hitos-zona').innerHTML = hitosHTML(); return;
  }
  if (d.reg) { const r = S.entidad.registros.find(x => x.id === d.reg); if (r) { r[d.campo] = val; guardar(); } return; }
  if (d.doc) {
    const x = S.entidad.documentos.find(y => y.id === d.doc); if (!x) return;
    x[d.campo] = d.campo === 'caduca' ? fechaOK(val) : val; guardar();
    $('#docs-cuenta').textContent = cuentaDocs();
    return;
  }
  if (d.t) {
    const t = borrador && borrador.tareas.find(x => x.id === d.t); if (!t) return;
    t[d.campo] = d.campo === 'fecha' ? fechaOK(val) : val;
    if (d.campo !== 'texto') $('#tareas-zona').innerHTML = tareasHTML();
    return;
  }
  if ('req' in d || el.name === 'plazo') { leerFicha(); $('#aviso-eleg').innerHTML = avisoElegHTML(); return; }

  if (el.id === 'datos-archivo' && el.files[0]) {
    const modo = $('input[name="modo"]:checked').value;
    el.files[0].text().then(txt => { if (importar(txt, modo)) dlgDatos.close(); el.value = ''; });
  }
});

document.addEventListener('input', ev => {
  if (ev.target.id === 'f-q') { ui.q = ev.target.value; $('#lista-zona').innerHTML = listaHTML(); }
});
$('#form-conv').addEventListener('submit', ev => { ev.preventDefault(); guardarFicha(); });
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

render();
