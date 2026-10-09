/**
 * /sitemap.xml - para buscadores y asistentes de IA (lo genera scripts/lib/aeo.mjs).
 * Sale siempre del modo rediseno (es la web que se publica).
 */
import { creaConstructor } from '../../scripts/lib/construir-pagina.mjs';

export async function GET() {
  const { aeo } = creaConstructor(process.cwd(), { modo: 'rediseno' });
  return new Response(aeo.sitemap(), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
