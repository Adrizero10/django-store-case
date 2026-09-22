/*
 * Analista IA de mercado (motor de simulación local).
 *
 * Implementa el rol descrito por el usuario: "analista de mercado e
 * inteligencia comercial" que, dado un nicho, propone 5-10 productos con
 * demanda/competencia/tendencia, costes estimados, margen y viabilidad, en
 * el formato JSON acordado.
 *
 * De momento NO llama a ninguna IA real: es una simulación con una base de
 * plantillas por categoría y una pequeña variación aleatoria en cada
 * ejecución, para poder probar el flujo completo (UI, export, envío a
 * Ranking) sin depender de una API key. El día que se conecte una IA real
 * (p. ej. la API de Claude), basta con sustituir `analizar()` por la
 * llamada al backend, manteniendo el mismo formato de salida.
 *
 * Lógica pura, sin DOM: funciona en navegador (window.AnalistaIA) y en
 * Node (module.exports) para poder testearla.
 */
(function (raiz) {
  "use strict";

  function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

  function normalizar(t) {
    return String(t || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .trim();
  }

  function jitter(v, pct) {
    var factor = 1 + (Math.random() * 2 - 1) * pct;
    return v * factor;
  }

  function jitterRango(rango, pct) {
    var a = r2(jitter(rango[0], pct));
    var b = r2(jitter(rango[1], pct));
    if (a > b) { var t = a; a = b; b = t; }
    return [Math.max(0, a), Math.max(0, b)];
  }

  function medio(rango) { return (rango[0] + rango[1]) / 2; }

  function barajar(arr) {
    var copia = arr.slice();
    for (var i = copia.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copia[i]; copia[i] = copia[j]; copia[j] = tmp;
    }
    return copia;
  }

  /* ------------------------------------------------------------------ *
   * Base de plantillas por categoría
   * ------------------------------------------------------------------ */

  var CATEGORIAS = [
    {
      clave: "moda", categoria: "Moda y accesorios",
      etiquetas: ["moda", "ropa", "accesorio", "accesorios", "joya", "joyeria",
        "bisuteria", "bolso", "bolsos", "gafas", "reloj", "relojes",
        "complemento", "calzado", "zapatilla"],
      productos: [
        { nombre: "Joyería minimalista de acero inoxidable", publico: "Mujeres 18-35, compra propia y regalo", demanda: "alta", competencia: "alta", tendencia: "evergreen", costeUnit: [1.5, 4], costeEnvio: [0.8, 2], cac: [3, 7], precioVenta: 19.99, riesgos: ["Mercado muy saturado: la diferenciación por diseño/marca es clave", "Alta tasa de devoluciones por talla en anillos"], razon: "Categoría evergreen, con búsqueda estable y alto volumen en marketplaces de moda." },
        { nombre: "Gafas de sol polarizadas unisex", publico: "18-40 años, uso diario y viaje", demanda: "media", competencia: "alta", tendencia: "evergreen", costeUnit: [2, 5], costeEnvio: [1, 2.5], cac: [4, 9], precioVenta: 24.99, riesgos: ["Necesita descripción clara de protección UV para evitar reclamaciones", "Compite con marcas reconocidas de bajo coste"], razon: "Demanda constante todo el año, refuerzo estacional en primavera-verano." },
        { nombre: "Bolso bandolera cruzado impermeable", publico: "Mujeres 20-40, uso urbano diario", demanda: "media", competencia: "media", tendencia: "trending", costeUnit: [3, 7], costeEnvio: [1.5, 3], cac: [4, 8], precioVenta: 29.99, riesgos: ["Volumen medio-alto: el flete internacional encarece el landed cost"], razon: "Tendencia al alza por el auge de accesorios funcionales/impermeables." },
        { nombre: "Cinturón reversible de piel sintética", publico: "Hombres y mujeres 25-50", demanda: "media", competencia: "media", tendencia: "evergreen", costeUnit: [2, 4], costeEnvio: [0.8, 1.8], cac: [3, 6], precioVenta: 17.99, riesgos: ["Diferenciación limitada frente a genéricos ya muy presentes"], razon: "Producto de reposición constante, poco estacional." },
        { nombre: "Gorro de punto personalizable con bordado", publico: "18-45 años, regalo y marca personal", demanda: "media", competencia: "baja", tendencia: "trending", costeUnit: [1.5, 3], costeEnvio: [0.8, 1.6], cac: [3, 6], precioVenta: 14.99, riesgos: ["Fuerte estacionalidad: se concentra en otoño-invierno"], razon: "Crecimiento por la moda de personalización/bordado bajo demanda." }
      ]
    },
    {
      clave: "hogar", categoria: "Hogar y cocina",
      etiquetas: ["hogar", "cocina", "casa", "decoracion", "organizador",
        "utensilio", "utensilios", "electrodomestico", "limpieza"],
      productos: [
        { nombre: "Organizador de nevera apilable (set 4 uds)", publico: "Familias y amantes del orden, 28-55 años", demanda: "alta", competencia: "media", tendencia: "trending", costeUnit: [3, 7], costeEnvio: [2, 4], cac: [3, 6], precioVenta: 27.99, riesgos: ["Producto voluminoso: el flete pesa en el margen"], razon: "Tendencia sostenida en redes sociales (organización del hogar)." },
        { nombre: "Dispensador de jabón automático con sensor", publico: "Hogares con niños, foco en higiene", demanda: "media", competencia: "media", tendencia: "evergreen", costeUnit: [4, 9], costeEnvio: [1.5, 3], cac: [4, 8], precioVenta: 24.99, riesgos: ["Electrónico: requiere certificación CE", "Fallos de batería/sensor generan devoluciones"], razon: "Demanda reforzada por hábitos de higiene post-pandemia, ahora estable." },
        { nombre: "Set de cuchillos de cocina antiadherentes", publico: "Aficionados a la cocina, 25-55 años", demanda: "media", competencia: "alta", tendencia: "evergreen", costeUnit: [5, 12], costeEnvio: [2, 4], cac: [5, 10], precioVenta: 34.99, riesgos: ["Objeto cortante: mayor riesgo de devoluciones/reclamaciones", "Competencia de marcas de cuchillería establecidas"], razon: "Categoría evergreen con demanda estable y buen ticket medio." },
        { nombre: "Luz LED regulable para debajo de armarios de cocina", publico: "Propietarios de vivienda, 30-55 años", demanda: "media", competencia: "baja", tendencia: "trending", costeUnit: [3, 6], costeEnvio: [1, 2.5], cac: [4, 8], precioVenta: 22.99, riesgos: ["Producto eléctrico: exige marcado CE"], razon: "Crecimiento del interés por mejoras de iluminación DIY económicas." },
        { nombre: "Organizador de cables y cargadores de escritorio", publico: "Teletrabajadores, 22-45 años", demanda: "media", competencia: "media", tendencia: "evergreen", costeUnit: [1.5, 3.5], costeEnvio: [0.8, 1.8], cac: [3, 6], precioVenta: 15.99, riesgos: ["Competencia de bajo precio en marketplaces generalistas"], razon: "Demanda constante ligada al auge del teletrabajo y el home office." }
      ]
    },
    {
      clave: "mascotas", categoria: "Mascotas",
      etiquetas: ["mascota", "mascotas", "perro", "perros", "gato", "gatos", "animal", "pet"],
      productos: [
        { nombre: "Comedero interactivo lento para perros/gatos", publico: "Dueños de mascotas, 25-50 años", demanda: "alta", competencia: "media", tendencia: "trending", costeUnit: [3, 7], costeEnvio: [1.5, 3], cac: [4, 8], precioVenta: 22.99, riesgos: ["Contacto con alimentos: cuidar materiales sin BPA"], razon: "Crecimiento sostenido del gasto en bienestar animal (humanización de mascotas)." },
        { nombre: "Arnés de paseo acolchado sin tirones", publico: "Dueños de perros medianos/grandes", demanda: "alta", competencia: "alta", tendencia: "evergreen", costeUnit: [3, 6], costeEnvio: [1.5, 3], cac: [4, 9], precioVenta: 24.99, riesgos: ["Necesita tallaje correcto: alto riesgo de devoluciones por talla"], razon: "Demanda estable todo el año, categoría núcleo del sector mascotas." },
        { nombre: "Fuente de agua automática con filtro", publico: "Dueños de gatos, 25-45 años", demanda: "media", competencia: "media", tendencia: "trending", costeUnit: [5, 11], costeEnvio: [2, 4], cac: [5, 10], precioVenta: 29.99, riesgos: ["Eléctrico: requiere CE", "Piezas de recambio (filtros) implican logística adicional"], razon: "Tendencia al alza vinculada a la salud renal felina." },
        { nombre: "Cama ortopédica de espuma viscoelástica para perro", publico: "Dueños de perros senior/grandes", demanda: "media", competencia: "media", tendencia: "evergreen", costeUnit: [6, 14], costeEnvio: [3, 6], cac: [5, 10], precioVenta: 44.99, riesgos: ["Producto voluminoso: flete y almacenaje encarecen el landed cost"], razon: "Nicho con buen ticket medio y baja estacionalidad." },
        { nombre: "Cepillo despelusador autolimpiante", publico: "Dueños de mascotas de pelo largo", demanda: "media", competencia: "baja", tendencia: "trending", costeUnit: [2, 4.5], costeEnvio: [1, 2], cac: [3, 6], precioVenta: 16.99, riesgos: ["Producto muy replicado: ventaja competitiva corta en el tiempo"], razon: "Buen desempeño en vídeo corto (demostración visual del producto)." }
      ]
    },
    {
      clave: "fitness", categoria: "Fitness y deporte",
      etiquetas: ["fitness", "deporte", "deportivo", "gimnasio", "gym",
        "entrenamiento", "yoga", "running", "ejercicio"],
      productos: [
        { nombre: "Bandas de resistencia set (5 niveles)", publico: "Practicantes de entrenamiento en casa, 20-45 años", demanda: "alta", competencia: "alta", tendencia: "evergreen", costeUnit: [2, 5], costeEnvio: [1, 2], cac: [3, 7], precioVenta: 19.99, riesgos: ["Precio de entrada muy accesible: guerra de precios frecuente"], razon: "Categoría consolidada del entrenamiento en casa, demanda estable." },
        { nombre: "Esterilla de yoga antideslizante ecológica", publico: "Practicantes de yoga/pilates, 20-50 años", demanda: "media", competencia: "alta", tendencia: "evergreen", costeUnit: [4, 9], costeEnvio: [2, 4], cac: [4, 9], precioVenta: 29.99, riesgos: ["Voluminoso: encarece el flete", "Alta competencia de marcas especializadas"], razon: "Demanda sostenida por el crecimiento del yoga/pilates en estudios y en casa." },
        { nombre: "Botella de agua motivacional con marcas horarias", publico: "18-35 años, hábitos saludables", demanda: "alta", competencia: "media", tendencia: "trending", costeUnit: [2.5, 5], costeEnvio: [1.2, 2.5], cac: [3, 6], precioVenta: 17.99, riesgos: ["Requiere declaración de contacto alimentario"], razon: "Muy viral en redes (contenido de hidratación/hábitos), demanda creciente." },
        { nombre: "Rodillo de espuma para masaje muscular", publico: "Deportistas y personas con dolor muscular", demanda: "media", competencia: "media", tendencia: "evergreen", costeUnit: [4, 8], costeEnvio: [1.5, 3], cac: [4, 8], precioVenta: 22.99, riesgos: ["Producto voluminoso"], razon: "Uso recomendado por fisioterapeutas: demanda estable y recurrente." },
        { nombre: "Guantes de entrenamiento con muñequera", publico: "Usuarios de gimnasio, 20-45 años", demanda: "media", competencia: "media", tendencia: "evergreen", costeUnit: [2, 4.5], costeEnvio: [1, 2], cac: [3, 7], precioVenta: 16.99, riesgos: ["Alto riesgo de devoluciones por talla"], razon: "Producto de reposición periódica en usuarios habituales de gimnasio." }
      ]
    },
    {
      clave: "belleza", categoria: "Belleza y cuidado personal",
      etiquetas: ["belleza", "cuidado personal", "skincare", "piel",
        "maquillaje", "cabello", "pelo", "cosmetica"],
      productos: [
        { nombre: "Rodillo facial de jade/cuarzo rosa", publico: "Mujeres 20-45, rutina de skincare", demanda: "alta", competencia: "alta", tendencia: "evergreen", costeUnit: [1.5, 4], costeEnvio: [0.8, 1.8], cac: [3, 6], precioVenta: 15.99, riesgos: ["Mercado saturado por su bajo coste de entrada"], razon: "Producto viral consolidado en la rutina de skincare, demanda estable." },
        { nombre: "Cepillo de silicona limpiador facial", publico: "18-40 años, foco en cuidado de la piel", demanda: "media", competencia: "media", tendencia: "trending", costeUnit: [2, 5], costeEnvio: [1, 2], cac: [3, 7], precioVenta: 18.99, riesgos: ["Contacto directo con la piel: cuidar certificados de material"], razon: "Crecimiento del interés por rutinas de limpieza facial en redes." },
        { nombre: "Plancha de pelo iónica de viaje", publico: "Mujeres 18-40, viajeras", demanda: "media", competencia: "alta", tendencia: "evergreen", costeUnit: [6, 13], costeEnvio: [2, 4], cac: [5, 10], precioVenta: 34.99, riesgos: ["Eléctrico: exige CE obligatorio", "Riesgo de devoluciones por fallo eléctrico"], razon: "Demanda estable, refuerzo en temporada de viajes y vacaciones." },
        { nombre: "Set de brochas de maquillaje veganas", publico: "Mujeres 18-35", demanda: "media", competencia: "alta", tendencia: "evergreen", costeUnit: [3, 7], costeEnvio: [1.5, 3], cac: [4, 8], precioVenta: 24.99, riesgos: ["Alta competencia de marcas de maquillaje consolidadas"], razon: "Nicho con demanda constante y buen posicionamiento 'cruelty free'." },
        { nombre: "Diadema de spa para el cuidado facial", publico: "Mujeres 18-40", demanda: "media", competencia: "baja", tendencia: "trending", costeUnit: [1, 2.5], costeEnvio: [0.6, 1.2], cac: [3, 5], precioVenta: 9.99, riesgos: ["Ticket bajo: difícil rentabilizar el CAC en campañas de pago"], razon: "Buen producto de entrada/upsell dentro de un pack de skincare." }
      ]
    },
    {
      clave: "tecnologia", categoria: "Tecnología y gadgets",
      etiquetas: ["tecnologia", "tech", "gadget", "gadgets", "electronica",
        "movil", "smartphone", "auriculares", "cargador", "smart"],
      productos: [
        { nombre: "Soporte magnético de móvil para coche", publico: "Conductores 20-55 años", demanda: "alta", competencia: "alta", tendencia: "evergreen", costeUnit: [2, 5], costeEnvio: [1, 2], cac: [3, 7], precioVenta: 16.99, riesgos: ["Mercado muy saturado y competido en precio"], razon: "Producto de acompañamiento del uso masivo del smartphone al volante." },
        { nombre: "Cargador inalámbrico 3 en 1 (móvil, reloj, auriculares)", publico: "25-45 años, early adopters", demanda: "alta", competencia: "alta", tendencia: "trending", costeUnit: [6, 14], costeEnvio: [1.5, 3], cac: [5, 11], precioVenta: 34.99, riesgos: ["Eléctrico: requiere certificación CE/RoHS", "Compite con marcas grandes (Anker, Belkin)"], razon: "Crecimiento del ecosistema de dispositivos que requieren carga inalámbrica." },
        { nombre: "Auriculares TWS con cancelación de ruido básica", publico: "18-40 años", demanda: "alta", competencia: "alta", tendencia: "evergreen", costeUnit: [7, 16], costeEnvio: [1.5, 3], cac: [6, 13], precioVenta: 39.99, riesgos: ["Alta tasa de devoluciones por fallos de batería/conexión", "Certificación CE obligatoria", "Competencia muy fuerte de marcas establecidas"], razon: "Categoría de gran volumen, aunque con márgenes ajustados por la competencia." },
        { nombre: "Mini proyector portátil de bolsillo", publico: "20-40 años, entretenimiento en casa/exterior", demanda: "media", competencia: "media", tendencia: "trending", costeUnit: [15, 30], costeEnvio: [3, 6], cac: [8, 16], precioVenta: 69.99, riesgos: ["Ticket alto: mayor barrera de decisión de compra", "Certificación CE obligatoria"], razon: "Tendencia en alza para cine/gaming casero de bajo coste." },
        { nombre: "Lámpara LED con altavoz Bluetooth integrado", publico: "18-35 años, decoración/ambiente", demanda: "media", competencia: "media", tendencia: "trending", costeUnit: [5, 11], costeEnvio: [2, 4], cac: [4, 9], precioVenta: 27.99, riesgos: ["Producto electrónico: exige CE"], razon: "Buen desempeño en vídeo corto por su componente visual/ambiental." }
      ]
    },
    {
      clave: "bebes", categoria: "Bebés e infantil",
      etiquetas: ["bebe", "bebes", "infantil", "nino", "ninos", "maternidad", "juguete", "juguetes"],
      productos: [
        { nombre: "Organizador de pañales y toallitas portátil", publico: "Padres primerizos, 25-40 años", demanda: "alta", competencia: "media", tendencia: "evergreen", costeUnit: [3, 6], costeEnvio: [1.5, 3], cac: [4, 8], precioVenta: 22.99, riesgos: ["Contacto indirecto con el bebé: cuidar materiales certificados"], razon: "Demanda estable ligada al ciclo natural de nacimientos, poco estacional." },
        { nombre: "Manta de juego sensorial para bebés", publico: "Padres de bebés 0-12 meses", demanda: "media", competencia: "media", tendencia: "evergreen", costeUnit: [6, 13], costeEnvio: [2, 4], cac: [5, 10], precioVenta: 34.99, riesgos: ["Debe cumplir normativa de seguridad de juguetes (EN71)"], razon: "Recomendado en estimulación temprana, demanda constante en foros de crianza." },
        { nombre: "Termómetro de baño con forma de patito", publico: "Padres primerizos", demanda: "media", competencia: "baja", tendencia: "evergreen", costeUnit: [1.5, 3.5], costeEnvio: [0.8, 1.6], cac: [3, 6], precioVenta: 12.99, riesgos: ["Producto de seguridad: exige normativa infantil"], razon: "Producto de necesidad práctica recurrente en la lista de recién nacidos." },
        { nombre: "Silla de coche portátil para muñecos (juguete)", publico: "Niños 3-7 años, regalo", demanda: "baja", competencia: "baja", tendencia: "declive", costeUnit: [4, 9], costeEnvio: [2, 4], cac: [5, 10], precioVenta: 24.99, riesgos: ["Normativa EN71 obligatoria en juguetes", "Nicho pequeño y en descenso de interés"], razon: "Interés decreciente en búsquedas los últimos 12 meses." },
        { nombre: "Set de vajilla de silicona para bebé (ventosa)", publico: "Padres de bebés en etapa de destete", demanda: "alta", competencia: "media", tendencia: "trending", costeUnit: [3, 6], costeEnvio: [1.5, 3], cac: [4, 8], precioVenta: 24.99, riesgos: ["Contacto alimentario: exige certificación sin BPA"], razon: "Fuerte tendencia en contenido de 'baby-led weaning' en redes." }
      ]
    },
    {
      clave: "oficina", categoria: "Oficina y productividad",
      etiquetas: ["oficina", "teletrabajo", "escritorio", "papeleria", "productividad", "estudio"],
      productos: [
        { nombre: "Soporte ergonómico para portátil ajustable", publico: "Teletrabajadores, 25-50 años", demanda: "alta", competencia: "media", tendencia: "evergreen", costeUnit: [4, 9], costeEnvio: [2, 4], cac: [4, 8], precioVenta: 27.99, riesgos: ["Voluminoso: encarece el flete"], razon: "Demanda consolidada por la normalización del teletrabajo." },
        { nombre: "Organizador de escritorio de bambú", publico: "22-45 años, oficina en casa", demanda: "media", competencia: "baja", tendencia: "evergreen", costeUnit: [3.5, 7], costeEnvio: [2, 4], cac: [3, 6], precioVenta: 24.99, riesgos: ["Voluminoso: el flete pesa mucho en el coste"], razon: "Nicho estable, buena percepción de calidad/sostenibilidad del bambú." },
        { nombre: "Alfombrilla de ratón XL de escritorio", publico: "Gamers y oficinistas, 18-40 años", demanda: "media", competencia: "alta", tendencia: "evergreen", costeUnit: [2, 5], costeEnvio: [1.5, 3], cac: [3, 7], precioVenta: 16.99, riesgos: ["Precio de entrada bajo: márgenes ajustados en campañas de pago"], razon: "Demanda estable, doble público (oficina y gaming)." },
        { nombre: "Lámpara de escritorio LED con puerto USB", publico: "Estudiantes y teletrabajadores", demanda: "media", competencia: "media", tendencia: "evergreen", costeUnit: [5, 10], costeEnvio: [2, 4], cac: [4, 8], precioVenta: 26.99, riesgos: ["Producto eléctrico: exige certificación CE"], razon: "Demanda constante ligada al ciclo escolar y al teletrabajo." },
        { nombre: "Pizarra blanca magnética de sobremesa", publico: "Teletrabajadores y estudiantes", demanda: "baja", competencia: "baja", tendencia: "evergreen", costeUnit: [4, 8], costeEnvio: [2, 4], cac: [4, 7], precioVenta: 21.99, riesgos: ["Nicho pequeño, volumen de ventas limitado"], razon: "Demanda constante pero de volumen reducido, sin picos de tendencia." }
      ]
    },
    {
      clave: "exterior", categoria: "Jardín, coche y aire libre",
      etiquetas: ["jardin", "exterior", "camping", "coche", "auto", "moto", "aire libre", "outdoor"],
      productos: [
        { nombre: "Kit de riego automático por goteo para macetas", publico: "Propietarios de jardín/balcón, 30-60 años", demanda: "media", competencia: "media", tendencia: "trending", costeUnit: [3, 7], costeEnvio: [1.5, 3], cac: [4, 8], precioVenta: 22.99, riesgos: ["Fuerte estacionalidad (primavera-verano)"], razon: "Tendencia en alza por el auge del cultivo urbano/balcón." },
        { nombre: "Organizador de maletero de coche plegable", publico: "Familias con coche, 30-55 años", demanda: "media", competencia: "media", tendencia: "evergreen", costeUnit: [5, 11], costeEnvio: [2.5, 5], cac: [4, 8], precioVenta: 27.99, riesgos: ["Producto voluminoso: encarece el flete"], razon: "Demanda estable, buena percepción de utilidad práctica." },
        { nombre: "Luces solares LED para jardín (pack)", publico: "Propietarios de vivienda con jardín", demanda: "media", competencia: "alta", tendencia: "trending", costeUnit: [4, 9], costeEnvio: [2, 4], cac: [4, 9], precioVenta: 29.99, riesgos: ["Producto eléctrico/solar: exige CE"], razon: "Demanda reforzada en primavera-verano, buena rotación." },
        { nombre: "Hamaca de camping ultraligera", publico: "Aficionados al senderismo/camping, 20-45 años", demanda: "media", competencia: "media", tendencia: "trending", costeUnit: [5, 11], costeEnvio: [2, 4], cac: [5, 10], precioVenta: 32.99, riesgos: ["Estacionalidad marcada (primavera-verano)"], razon: "Auge del turismo de naturaleza y contenido outdoor en redes." },
        { nombre: "Cubre volante de coche antideslizante", publico: "Conductores 25-55 años", demanda: "baja", competencia: "media", tendencia: "declive", costeUnit: [2, 4.5], costeEnvio: [1, 2], cac: [3, 6], precioVenta: 12.99, riesgos: ["Interés decreciente frente a alternativas (fundas de asiento, accesorios tech)"], razon: "Búsquedas en descenso los últimos 12-24 meses." }
      ]
    }
  ];

  /* ------------------------------------------------------------------ *
   * Emparejamiento nicho → categoría
   * ------------------------------------------------------------------ */

  function puntuarCategoria(cat, textoNorm) {
    var puntos = 0;
    if (textoNorm.indexOf(normalizar(cat.categoria)) !== -1) puntos += 3;
    cat.etiquetas.forEach(function (etq) {
      if (textoNorm.indexOf(etq) !== -1) puntos += 1;
    });
    return puntos;
  }

  function elegirCategorias(nicho) {
    var textoNorm = normalizar(nicho);
    var puntuadas = CATEGORIAS.map(function (cat) {
      return { cat: cat, puntos: puntuarCategoria(cat, textoNorm) };
    }).filter(function (x) { return x.puntos > 0; })
      .sort(function (a, b) { return b.puntos - a.puntos; });

    if (puntuadas.length) return { categorias: [puntuadas[0].cat], amplia: false };

    // Sin coincidencias: búsqueda amplia con una muestra diversa de categorías.
    return { categorias: barajar(CATEGORIAS).slice(0, 4), amplia: true };
  }

  /* ------------------------------------------------------------------ *
   * Puntuaciones
   * ------------------------------------------------------------------ */

  var NOTA_DEMANDA = { alta: 8, media: 5, baja: 2 };
  var NOTA_COMPETENCIA = { alta: -2, media: 0, baja: 2 }; // saturación: alta = peor
  var NOTA_TENDENCIA = { trending: 1.5, evergreen: 0.5, declive: -2.5 };

  function notaMargen(margenPct) {
    if (margenPct <= 0) return 1;
    if (margenPct >= 55) return 10;
    if (margenPct <= 30) return 2 + (margenPct / 30) * 3; // 0-30% → 2-5
    return 5 + ((margenPct - 30) / 25) * 5; // 30-55% → 5-10
  }

  function calcularSubpuntuaciones(producto, margenPct) {
    var potencialBeneficio = clamp1a10(notaMargen(margenPct));
    var facilidadEntrada = clamp1a10(
      5 + (NOTA_COMPETENCIA[producto.competencia] || 0) - producto.riesgos.length * 0.6);
    var riesgo = clamp1a10(
      5 - (NOTA_COMPETENCIA[producto.competencia] || 0) + producto.riesgos.length * 1.3);
    return {
      potencial_beneficio: r2(potencialBeneficio),
      facilidad_entrada: r2(facilidadEntrada),
      riesgo: r2(riesgo)
    };
  }

  function clamp1a10(n) { return Math.max(1, Math.min(10, n)); }

  function calcularPuntuacionViabilidad(sub) {
    return r2(clamp1a10((sub.potencial_beneficio + sub.facilidad_entrada +
      (10 - sub.riesgo)) / 3));
  }

  /* ------------------------------------------------------------------ *
   * Construcción de cada producto de salida
   * ------------------------------------------------------------------ */

  var COMPETIDORES_GENERICOS = {
    alta: ["grandes marketplaces generalistas (Amazon, AliExpress)", "varias tiendas Shopify ya consolidadas en el nicho"],
    media: ["algunas tiendas especializadas en el nicho", "vendedores en marketplaces generalistas"],
    baja: ["pocas tiendas especializadas visibles", "hueco frente a la oferta generalista"]
  };

  function construirProducto(plantilla, categoriaNombre) {
    var costeUnit = jitterRango(plantilla.costeUnit, 0.15);
    var costeEnvio = jitterRango(plantilla.costeEnvio, 0.15);
    var cac = jitterRango(plantilla.cac, 0.2);
    var precioVenta = r2(jitter(plantilla.precioVenta, 0.08));

    var costeUnitMedio = medio(costeUnit);
    var costeEnvioMedio = medio(costeEnvio);
    var margenBrutoPct = precioVenta > 0
      ? r2(((precioVenta - costeUnitMedio - costeEnvioMedio) / precioVenta) * 100)
      : 0;

    var sub = calcularSubpuntuaciones(plantilla, margenBrutoPct);
    var puntuacionViabilidad = calcularPuntuacionViabilidad(sub);

    return {
      nombre: plantilla.nombre,
      categoria: categoriaNombre,
      publico_objetivo: plantilla.publico,
      demanda: plantilla.demanda,
      competencia: plantilla.competencia,
      tendencia: plantilla.tendencia,
      coste_unitario_estimado: { min: costeUnit[0], max: costeUnit[1], moneda: "EUR" },
      coste_envio_estimado: { min: costeEnvio[0], max: costeEnvio[1] },
      cac_estimado: { min: cac[0], max: cac[1] },
      margen_bruto_pct: margenBrutoPct,
      precio_venta_recomendado: precioVenta,
      puntuacion_viabilidad: puntuacionViabilidad,
      riesgos: plantilla.riesgos.slice(),
      razon_demanda: plantilla.razon,
      competidores_referencia: COMPETIDORES_GENERICOS[plantilla.competencia] || COMPETIDORES_GENERICOS.media,
      potencial_beneficio: sub.potencial_beneficio,
      facilidad_entrada: sub.facilidad_entrada,
      riesgo: sub.riesgo
    };
  }

  /* ------------------------------------------------------------------ *
   * Resumen ejecutivo
   * ------------------------------------------------------------------ */

  function generarResumen(nicho, productos, amplia) {
    var ordenados = productos.slice().sort(function (a, b) {
      return b.puntuacion_viabilidad - a.puntuacion_viabilidad;
    });
    var top = ordenados.slice(0, Math.min(2, ordenados.length)).map(function (p) { return p.nombre; });
    var margenMedio = r2(productos.reduce(function (s, p) { return s + p.margen_bruto_pct; }, 0) /
      Math.max(1, productos.length));

    var intro = amplia
      ? "No se encontró una categoría específica para \"" + nicho + "\", así que se muestra una " +
        "selección amplia de " + productos.length + " productos con buen desempeño en distintas categorías."
      : "Para el nicho \"" + nicho + "\" se han identificado " + productos.length +
        " productos con potencial de venta.";

    return intro + " El margen bruto medio estimado es del " + margenMedio.toFixed(0) +
      "%. Las mejores oportunidades por viabilidad son: " + top.join(" y ") + ". " +
      "Antes de invertir, valida demanda real (Google Trends, competidores), pide muestras y " +
      "confirma que cumples la regla 3x y un margen neto ≥ 15-20% con la Calculadora coste-beneficio " +
      "de esta misma herramienta. Estimaciones simuladas localmente, con rangos realistas del sector " +
      "pero sin consultar datos de mercado en tiempo real: úsalas como punto de partida, no como cifra final.";
  }

  /* ------------------------------------------------------------------ *
   * API pública
   * ------------------------------------------------------------------ */

  function analizar(nicho) {
    var seleccion = elegirCategorias(nicho);
    var pool = [];
    seleccion.categorias.forEach(function (cat) {
      cat.productos.forEach(function (p) {
        pool.push({ plantilla: p, categoriaNombre: cat.categoria });
      });
    });

    var cuantos = Math.max(5, Math.min(10, pool.length));
    var elegidos = barajar(pool).slice(0, cuantos);

    var productos = elegidos
      .map(function (x) { return construirProducto(x.plantilla, x.categoriaNombre); })
      .sort(function (a, b) { return b.puntuacion_viabilidad - a.puntuacion_viabilidad; });

    return {
      productos: productos,
      resumen_ejecutivo: generarResumen(nicho, productos, seleccion.amplia)
    };
  }

  var AnalistaIA = {
    analizar: analizar,
    _internos: { elegirCategorias: elegirCategorias, CATEGORIAS: CATEGORIAS }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = AnalistaIA;
  else raiz.AnalistaIA = AnalistaIA;
})(typeof window !== "undefined" ? window : globalThis);
