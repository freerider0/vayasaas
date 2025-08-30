import { calcularAnguloInterior, cartesianasAPolares } from './src/components/floorplan/services/ManualSolverService';

// Casos de prueba para verificar el cálculo del ángulo interior

// Caso 1: Cuadrado (todos los ángulos interiores deben ser 90°)
const cuadrado = [
  {x: 0, y: 0},
  {x: 1, y: 0},
  {x: 1, y: 1},
  {x: 0, y: 1}
];

const polaresCuadrado = cartesianasAPolares(cuadrado);
console.log('=== CUADRADO ===');
for (let i = 0; i < polaresCuadrado.length; i++) {
  const angulo = calcularAnguloInterior(polaresCuadrado, i);
  console.log(`Vértice ${i}: ${(angulo * 180 / Math.PI).toFixed(1)}° (esperado: 90°)`);
}

// Caso 2: Triángulo equilátero (todos los ángulos interiores deben ser 60°)
const triangulo = [
  {x: 0, y: 0},
  {x: 1, y: 0},
  {x: 0.5, y: Math.sqrt(3)/2}
];

const polaresTriangulo = cartesianasAPolares(triangulo);
console.log('\n=== TRIÁNGULO EQUILÁTERO ===');
for (let i = 0; i < polaresTriangulo.length; i++) {
  const angulo = calcularAnguloInterior(polaresTriangulo, i);
  console.log(`Vértice ${i}: ${(angulo * 180 / Math.PI).toFixed(1)}° (esperado: 60°)`);
}

// Caso 3: L-shape (ángulos interiores deben ser 90° o 270°)
const lShape = [
  {x: 0, y: 0},
  {x: 2, y: 0},
  {x: 2, y: 1},
  {x: 1, y: 1},
  {x: 1, y: 2},
  {x: 0, y: 2}
];

const polaresL = cartesianasAPolares(lShape);
console.log('\n=== L-SHAPE ===');
const esperadosL = [90, 90, 270, 90, 90, 90]; // Ángulos esperados en grados
for (let i = 0; i < polaresL.length; i++) {
  const angulo = calcularAnguloInterior(polaresL, i);
  console.log(`Vértice ${i}: ${(angulo * 180 / Math.PI).toFixed(1)}° (esperado: ${esperadosL[i]}°)`);
}

// Caso 4: Pentágono regular (todos los ángulos interiores deben ser 108°)
const pentagono = [];
for (let i = 0; i < 5; i++) {
  const angle = (2 * Math.PI * i) / 5;
  pentagono.push({
    x: Math.cos(angle),
    y: Math.sin(angle)
  });
}

const polaresPentagono = cartesianasAPolares(pentagono);
console.log('\n=== PENTÁGONO REGULAR ===');
for (let i = 0; i < polaresPentagono.length; i++) {
  const angulo = calcularAnguloInterior(polaresPentagono, i);
  console.log(`Vértice ${i}: ${(angulo * 180 / Math.PI).toFixed(1)}° (esperado: 108°)`);
}

// Verificar suma de ángulos interiores
function verificarSumaAngulos(polares: any[], nombre: string, esperado: number) {
  let suma = 0;
  for (let i = 0; i < polares.length; i++) {
    suma += calcularAnguloInterior(polares, i);
  }
  const sumaGrados = suma * 180 / Math.PI;
  console.log(`\n${nombre} - Suma de ángulos: ${sumaGrados.toFixed(1)}° (esperado: ${esperado}°)`);
  return Math.abs(sumaGrados - esperado) < 1;
}

// La suma de ángulos interiores debe ser (n-2) * 180°
verificarSumaAngulos(polaresCuadrado, 'Cuadrado', (4-2)*180);
verificarSumaAngulos(polaresTriangulo, 'Triángulo', (3-2)*180);
verificarSumaAngulos(polaresL, 'L-Shape', (6-2)*180);
verificarSumaAngulos(polaresPentagono, 'Pentágono', (5-2)*180);