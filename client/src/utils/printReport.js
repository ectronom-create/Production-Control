/**
 * Utility to reliably print printable report documents across all modern browsers
 * without modal clipping, background filter issues, or blank pages.
 */
export function printReportDocument(targetId = 'report-printable-area') {
  const element = document.getElementById(targetId);
  if (!element) {
    window.print();
    return;
  }

  // Remove any leftover print iframe
  const existingFrame = document.getElementById('print-report-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  // Create isolated invisible iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'print-report-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow.document;

  // Gather all style elements and stylesheets
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(node => node.outerHTML)
    .join('\n');

  const isRtl = document.documentElement.dir === 'rtl';
  const lang = document.documentElement.lang || 'ar';

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <title>ECTRON Official Report Print</title>
    ${styles}
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #report-printable-area {
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        visibility: visible !important;
        display: block !important;
        background: #ffffff !important;
      }
      #report-printable-area * {
        visibility: visible !important;
      }
      .report-document {
        padding: 0 !important;
        width: 100% !important;
      }
      .report-table {
        width: 100% !important;
        page-break-inside: auto;
      }
      .report-table tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      .report-sign-block {
        page-break-inside: avoid;
      }
    </style>
  </head>
  <body>
    <div id="report-printable-area" class="report-document">
      ${element.innerHTML}
    </div>
  </body>
</html>`);
  iframeDoc.close();

  // Give images and fonts a moment to layout
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.warn('Iframe print error, falling back to window.print():', err);
      window.print();
    } finally {
      // Clean up iframe after print dialog interaction
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 3000);
    }
  }, 250);
}
