import { useRef } from 'react';
import { getNomeMateria } from '../../data';
import { getPendenciasCorequisitosCalendario } from '../../domain/gradeRules';

const EXPORT_WIDTH = 1200;
const MAX_CANVAS_PIXELS = 16000000;

const canvasToBlob = canvas => new Promise((resolve, reject) => {
  canvas.toBlob(result => {
    if (result) resolve(result);
    else reject(new Error('Não foi possível converter a grade para PNG.'));
  }, 'image/png');
});

export default function useCalendarExport({
  wrapperRef,
  semestreAtual,
  materiasNoCalendario,
  materiasAprovadas,
  materiasMinimoConfirmadas,
  triggerToast
}) {
  const isExportingRef = useRef(false);

  return async function handleDownloadPNG() {
    const pendencias = getPendenciasCorequisitosCalendario(
      materiasNoCalendario,
      materiasAprovadas,
      materiasMinimoConfirmadas
    );
    if (pendencias.length > 0) {
      const nomes = [...new Set(pendencias.map(({ coreqCodigo }) =>
        getNomeMateria(coreqCodigo) || coreqCodigo
      ))];
      triggerToast(
        `Adicione os correquisitos pendentes antes de baixar a grade: ${nomes.join(', ')}.`,
        'error'
      );
      return;
    }

    if (isExportingRef.current) {
      triggerToast('A imagem da grade já está sendo preparada.', 'info');
      return;
    }

    const node = wrapperRef.current;
    if (!node) {
      triggerToast('Área do calendário não disponível para captura.', 'error');
      return;
    }

    isExportingRef.current = true;
    let exportHost = null;
    let downloadUrl = null;

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;

      exportHost = document.createElement('div');
      exportHost.className = 'calendar__export-host';
      exportHost.setAttribute('aria-hidden', 'true');
      exportHost.style.width = `${EXPORT_WIDTH}px`;

      const exportNode = node.cloneNode(true);
      exportNode.classList.add('capturing');
      exportNode.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      exportHost.appendChild(exportNode);
      document.body.appendChild(exportHost);

      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const exportWidth = Math.ceil(exportNode.scrollWidth);
      const exportHeight = Math.ceil(exportNode.scrollHeight);
      if (exportWidth <= 0 || exportHeight <= 0) {
        throw new Error('A grade exportada não possui dimensões válidas.');
      }

      const qualityScale = Math.min(
        2,
        Math.sqrt(MAX_CANVAS_PIXELS / (exportWidth * exportHeight))
      );
      const canvas = await html2canvas(exportNode, {
        backgroundColor: '#121216',
        scale: qualityScale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
        width: exportWidth,
        height: exportHeight,
        windowWidth: EXPORT_WIDTH,
        windowHeight: exportHeight
      });

      const blob = await canvasToBlob(canvas);
      downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `grade-${semestreAtual}semestre.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      triggerToast('Grade baixada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar imagem do calendário', error);
      triggerToast('Erro ao gerar imagem. Tente novamente.', 'error');
    } finally {
      exportHost?.remove();
      if (downloadUrl) {
        const urlToRevoke = downloadUrl;
        setTimeout(() => URL.revokeObjectURL(urlToRevoke), 1000);
      }
      isExportingRef.current = false;
    }
  };
}
