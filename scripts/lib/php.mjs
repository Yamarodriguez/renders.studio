/**
 * Lee el formato en que WordPress guarda los datos de las imagenes
 * (lo que en PHP se llama "serialize"). Hace falta para reconstruir el
 * srcset de cada foto: los tamanos disponibles estan ahi.
 *
 * Ejemplo:  a:2:{s:5:"width";i:1024;s:4:"file";s:8:"foto.png";}
 */

export function desSerializa(texto) {
  if (!texto || typeof texto !== 'string') return null;
  let i = 0;

  function lee() {
    const t = texto[i];
    switch (t) {
      case 'N':
        i += 2; // N;
        return null;
      case 'b': {
        i += 2; // b:
        const v = texto[i] === '1';
        i += 2; // 1;
        return v;
      }
      case 'i': {
        i += 2;
        const fin = texto.indexOf(';', i);
        const v = Number(texto.slice(i, fin));
        i = fin + 1;
        return v;
      }
      case 'd': {
        i += 2;
        const fin = texto.indexOf(';', i);
        const v = Number(texto.slice(i, fin));
        i = fin + 1;
        return v;
      }
      case 's': {
        i += 2;
        const dosP = texto.indexOf(':', i);
        const largo = Number(texto.slice(i, dosP));
        // el largo va en BYTES, no en caracteres: hay que contar en utf-8
        const desde = dosP + 2; // salta :"
        let bytes = 0;
        let j = desde;
        while (bytes < largo && j < texto.length) {
          bytes += Buffer.byteLength(texto[j], 'utf8');
          j++;
        }
        const v = texto.slice(desde, j);
        i = j + 2; // salta ";
        return v;
      }
      case 'a': {
        i += 2;
        const dosP = texto.indexOf(':', i);
        const n = Number(texto.slice(i, dosP));
        i = dosP + 2; // salta :{
        const obj = {};
        for (let k = 0; k < n; k++) {
          const clave = lee();
          const valor = lee();
          obj[clave] = valor;
        }
        i += 1; // salta }
        return obj;
      }
      default:
        throw new Error(`No se leer el tipo "${t}" en la posicion ${i}`);
    }
  }

  try {
    return lee();
  } catch (e) {
    return null;
  }
}
