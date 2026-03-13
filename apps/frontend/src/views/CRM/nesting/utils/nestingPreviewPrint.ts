import { renderAsync } from 'docx-preview'
import { nestingService } from '@/services/crm/nesting.service'

const getHeadStyles = () => {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n')
}

const getPrintOnlyStyles = () => {
  return `
    <style>
      @page {
        size: A4 portrait;
        margin: 0;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }

      .preview-docx-wrap {
        max-height: none !important;
        min-height: auto !important;
        overflow: visible !important;
      }

      .preview-docx-wrap,
      .preview-docx-wrap.docx-wrapper {
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .preview-docx-wrap .docx-wrapper {
        padding: 0 !important;
        background: #fff !important;
      }

      .preview-docx-wrap .docx {
        box-shadow: none !important;
        margin: 0 auto !important;
        max-width: 100% !important;
      }
    </style>
  `
}

const openPrintWindow = (previewHtml: string, title: string) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('無法開啟列印視窗，請檢查瀏覽器彈出視窗設定')
    return
  }

  const styles = getHeadStyles()
  const printOnlyStyles = getPrintOnlyStyles()

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        ${styles}
        ${printOnlyStyles}
      </head>
      <body>
        ${previewHtml}
      </body>
    </html>
  `)
  printWindow.document.close()

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }
}

export const printNestingPreviewElement = (previewEl: HTMLElement, title: string) => {
  const previewContent = previewEl.innerHTML
  if (!previewContent.trim()) {
    alert('預覽尚未完成，請稍後再試')
    return
  }

  openPrintWindow(previewEl.outerHTML, title)
}

export const printNestingBlob = async (blob: Blob, title: string) => {
  const tempContainer = document.createElement('div')
  tempContainer.className = 'preview-docx-wrap'
  tempContainer.style.position = 'fixed'
  tempContainer.style.left = '-99999px'
  tempContainer.style.top = '0'
  tempContainer.style.width = '1200px'
  document.body.appendChild(tempContainer)

  try {
    await renderAsync(blob, tempContainer, undefined, { useBase64URL: true })
    openPrintWindow(tempContainer.outerHTML, title)
  } catch (error) {
    console.error('列印預覽渲染失敗:', error)
    alert('列印預覽渲染失敗')
  } finally {
    tempContainer.remove()
  }
}

export const printNestingById = async (nestingId: string) => {
  const blob = await nestingService.getPreviewDocx(nestingId)
  if (!blob) {
    alert('目前沒有可列印的預覽內容')
    return
  }

  await printNestingBlob(blob, `排版預覽 - ${nestingId}`)
}
