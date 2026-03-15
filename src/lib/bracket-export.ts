'use client';

import { jsPDF } from 'jspdf';

async function svgToCanvas(svg: SVGSVGElement, scale = 2) {
  const serializer = new XMLSerializer();
  const svgMarkup = serializer.serializeToString(svg);
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Failed to render bracket SVG'));
      nextImage.src = url;
    });

    const viewBox = svg.viewBox.baseVal;
    const width =
      viewBox.width ||
      svg.width.baseVal.value ||
      svg.getBoundingClientRect().width ||
      1200;
    const height =
      viewBox.height ||
      svg.height.baseVal.value ||
      svg.getBoundingClientRect().height ||
      800;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create export canvas');
    }

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.fillStyle = '#050505';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadBracketSvgAsPng(svg: SVGSVGElement, filename: string) {
  const canvas = await svgToCanvas(svg, 2);

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to export bracket PNG'));
        return;
      }

      triggerDownload(blob, filename);
      resolve();
    }, 'image/png');
  });
}

export async function downloadBracketSectionsAsPdf(
  sections: Array<{ label: string; svg: SVGSVGElement }>,
  filename: string
) {
  const populatedSections = sections.filter((section) => Boolean(section.svg));
  if (populatedSections.length === 0) {
    throw new Error('No bracket sections available to export');
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  for (const [index, section] of populatedSections.entries()) {
    const canvas = await svgToCanvas(section.svg, 2);
    const imageData = canvas.toDataURL('image/png');

    if (index > 0) {
      pdf.addPage('a4', 'landscape');
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const headerY = 28;
    const availableWidth = pageWidth - 32;
    const availableHeight = pageHeight - 56;
    const widthRatio = availableWidth / canvas.width;
    const heightRatio = availableHeight / canvas.height;
    const ratio = Math.min(widthRatio, heightRatio);
    const renderWidth = canvas.width * ratio;
    const renderHeight = canvas.height * ratio;
    const renderX = (pageWidth - renderWidth) / 2;
    const renderY = headerY + 12;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(section.label, 16, headerY);
    pdf.addImage(imageData, 'PNG', renderX, renderY, renderWidth, renderHeight);
  }

  pdf.save(filename);
}
