/**
 * Valida una cédula de ciudadanía ecuatoriana (10 dígitos, provincia 01-24 o 30,
 * tercer dígito < 6 y dígito verificador por algoritmo Módulo 10).
 */
export function validarCedulaEcuatoriana(cedulaRaw: string): boolean {
  const cedula = cedulaRaw.trim();
  if (!/^[0-9]{10}$/.test(cedula)) return false;

  const provincia = parseInt(cedula.substring(0, 2), 10);
  if ((provincia < 1 || provincia > 24) && provincia !== 30) return false;

  const tercerDigito = parseInt(cedula[2], 10);
  if (tercerDigito >= 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula[i], 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }

  const digitoVerificadorEsperado = (10 - (suma % 10)) % 10;
  const digitoIngresado = parseInt(cedula[9], 10);

  return digitoVerificadorEsperado === digitoIngresado;
}