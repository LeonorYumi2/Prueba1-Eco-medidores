// Paleta institucional EPMAPS y sistema de diseño visual corporativo.
// Colores base exigidos y derivados declarados con contraste accesible (WCAG AA).
export const tema = {
  colores: {
    // --- COLORES BASE INSTITUCIONALES ---
    // #6074A7 Primario: encabezados, botones principales, elementos activos.
    primario: '#6074A7',
    // #B72943 Acento crítico: errores, descartar, "en conflicto", consumo anómalo.
    critico: '#B72943',
    // #C1B388 Acento cálido: detalles decorativos, líneas de acento, avisos "por verificar".
    calido: '#C1B388',
    // #D4E6F3 Fondos suaves: fondo de pantalla general, chips informativos, cabeceras suaves.
    fondoSuave: '#D4E6F3',
    // #C6CADD Neutro: bordes, divisores, campos inactivos, estados deshabilitados.
    neutro: '#C6CADD',

    // --- DERIVADOS PERMITIDOS ---
    // Azul del escudo EPMAPS (#27357C): texto principal, títulos y máxima legibilidad bajo sol.
    textoPrincipal: '#27357C',
    // Tono oscuro derivado de #6074A7 para texto secundario y etiquetas legibles.
    textoSecundario: '#455375',
    // Tinte muy claro derivado para superficies de tarjetas y fondos de campos.
    superficie: '#FFFFFF',
    // Fondo de pantalla luminoso derivado de #D4E6F3.
    fondo: '#EBF3F9',
    // Tono más oscuro de #6074A7 para estado presionado de botones principales.
    primarioPresionado: '#485882',
    // Tono más oscuro de #B72943 para estado presionado en acciones críticas.
    criticoPresionado: '#8E1F33',

    // Tintes claros derivados de #C1B388 para fondos de aviso/alerta sin usar texto blanco encima.
    calidoFondo: '#F7F3E8',
    calidoBorde: '#D6C8A1',
    calidoTexto: '#4E411E', // Texto oscuro derivado de alto contraste (> 7:1)

    // Tintes claros derivados de #B72943 para fondos de error y estados críticos.
    criticoFondo: '#FCECEF',
    criticoBorde: '#E8A2AD',
    criticoTexto: '#781527', // Texto oscuro crítico (> 7:1)

    // Tintes derivados de #D4E6F3 y #6074A7 para información neutra.
    infoFondo: '#EAF2F9',
    infoBorde: '#AECBE2',
    infoTexto: '#27357C',

    // Único color semántico fuera de la paleta institucional: Verde para "Enviada"
    enviada: '#1B7F4B',
    enviadaFondo: '#E8F5ED',
    enviadaBorde: '#B1DFBE',
    enviadaTexto: '#0F5430',
  },
  // Radios de curvatura inspirados en la fluidez del agua
  radio: 16,
  radioBoton: 14,
  radioPill: 999,
} as const;
