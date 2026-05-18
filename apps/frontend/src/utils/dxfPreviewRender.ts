// dxf-viewer 沒有型別宣告，使用 any 承接
import { DxfViewer } from 'dxf-viewer'
// three 為 dxf-viewer 的相依套件，這裡只取色彩類別調整背景
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error no type declarations
import { Color as ThreeColor } from 'three'

const waitForAnimationFrames = (count: number) =>
  new Promise<void>((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(() => step(remaining - 1))
    }
    step(count)
  })

const formatDimensionLabel = (width: number | null, height: number | null): string | null => {
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    Number.isNaN(width) ||
    Number.isNaN(height)
  ) {
    return null
  }
  return `${Math.round(width)} x ${Math.round(height)}`
}

const convertCanvasToBlackOnWhite = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const width = sourceCanvas.width
  const height = sourceCanvas.height
  if (!width || !height) return sourceCanvas

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = width
  outputCanvas.height = height

  const outputCtx = outputCanvas.getContext('2d')
  if (!outputCtx) return sourceCanvas

  outputCtx.fillStyle = '#ffffff'
  outputCtx.fillRect(0, 0, width, height)
  outputCtx.drawImage(sourceCanvas, 0, 0)

  const imageData = outputCtx.getImageData(0, 0, width, height)
  const { data } = imageData
  const luminanceThreshold = 245
  const alphaThreshold = 8

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha < alphaThreshold) {
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = 255
      continue
    }

    const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    const isWhite = luminance >= luminanceThreshold
    data[i] = isWhite ? 255 : 0
    data[i + 1] = isWhite ? 255 : 0
    data[i + 2] = isWhite ? 255 : 0
    data[i + 3] = 255
  }

  outputCtx.putImageData(imageData, 0, 0)
  return outputCanvas
}

export interface DxfPreviewLabelStyle {
  /** 標籤字體大小（px）；未指定時依 label 區域高度自動計算 */
  fontSize?: number
  /** 標籤字體粗細，例如 400、600、'bold' */
  fontWeight?: number | string
}

const LABEL_FONT_FAMILY = 'system-ui, -apple-system, sans-serif'
/** 標籤上下留白，相對於 fontSize */
const LABEL_VERTICAL_PADDING_RATIO = 0.35

interface LabelLayout {
  fontSize: number
  fontWeight: number | string
  bandHeight: number
}

const measureLabelTextHeight = (
  metrics: TextMetrics,
  fontSize: number,
): number => {
  const ascent = metrics.actualBoundingBoxAscent ?? metrics.fontBoundingBoxAscent
  const descent = metrics.actualBoundingBoxDescent ?? metrics.fontBoundingBoxDescent
  if (typeof ascent === 'number' && typeof descent === 'number') {
    return ascent + descent
  }
  return fontSize * 1.2
}

const resolveLabelLayout = (
  ctx: CanvasRenderingContext2D,
  label: string,
  labelStyle: DxfPreviewLabelStyle,
  drawingHeight: number,
): LabelLayout => {
  const fontWeight = labelStyle.fontWeight ?? 600
  const fontSize = labelStyle.fontSize ?? Math.max(12, Math.round(drawingHeight * 0.06))

  ctx.font = `${fontWeight} ${fontSize}px ${LABEL_FONT_FAMILY}`
  const textHeight = measureLabelTextHeight(ctx.measureText(label), fontSize)
  const verticalPadding = fontSize * LABEL_VERTICAL_PADDING_RATIO
  const bandHeight = Math.ceil(textHeight + verticalPadding * 2)

  return { fontSize, fontWeight, bandHeight }
}

const composePreviewWithDimensionLabel = (
  drawingCanvas: HTMLCanvasElement,
  boundsWidth: number | null,
  boundsHeight: number | null,
  labelStyle: DxfPreviewLabelStyle = {},
): string => {
  const drawing = convertCanvasToBlackOnWhite(drawingCanvas)
  const label = formatDimensionLabel(boundsWidth, boundsHeight)
  if (!label) {
    return drawing.toDataURL('image/png')
  }

  const composite = document.createElement('canvas')
  composite.width = drawing.width
  composite.height = drawing.height

  const ctx = composite.getContext('2d')
  if (!ctx) {
    return drawing.toDataURL('image/png')
  }

  const layout = resolveLabelLayout(ctx, label, labelStyle, drawing.height)
  composite.height = drawing.height + layout.bandHeight

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, composite.width, composite.height)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, composite.width, layout.bandHeight)

  ctx.fillStyle = '#000000'
  ctx.font = `${layout.fontWeight} ${layout.fontSize}px ${LABEL_FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, composite.width / 2, layout.bandHeight / 2)

  ctx.drawImage(drawing, 0, layout.bandHeight)
  return composite.toDataURL('image/png')
}

export interface DxfPreviewRenderResult {
  imageDataUrl: string | null
  width: number | null
  height: number | null
}

const getViewerBoundsSize = (viewer: {
  bounds?: { minX: number; maxX: number; minY: number; maxY: number } | null
}): { width: number | null; height: number | null } => {
  const bounds = viewer.bounds
  if (!bounds) return { width: null, height: null }

  const { minX, maxX, minY, maxY } = bounds
  if ([minX, maxX, minY, maxY].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
    return { width: null, height: null }
  }

  const width = maxX - minX
  const height = maxY - minY
  if (width < 0 || height < 0) return { width: null, height: null }
  return { width, height }
}

export interface DxfPreviewRenderOptions extends DxfPreviewLabelStyle {
  /** 預覽容器寬度（px） */
  width?: number
  /** 預覽容器高度（px） */
  height?: number
}

export const renderDxfContentToDataUrl = async (
  content: string,
  options: DxfPreviewRenderOptions = {},
): Promise<DxfPreviewRenderResult> => {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-99999px'
  host.style.top = '0'
  host.style.width = `${options.width ?? 260}px`
  host.style.height = `${options.height ?? 120}px`
  host.style.pointerEvents = 'none'
  host.style.opacity = '0'
  document.body.appendChild(host)

  let viewer: any = null
  try {
    viewer = new DxfViewer(host, {
      autoResize: false,
      clearColor: new ThreeColor('#ffffff'),
      clearAlpha: 1.0,
    })

    const dxfBlob = new Blob([content], { type: 'application/dxf' })
    const dxfUrl = URL.createObjectURL(dxfBlob)

    try {
      await viewer.Load({
        url: dxfUrl,
      })
    } finally {
      URL.revokeObjectURL(dxfUrl)
    }

    await waitForAnimationFrames(2)

    const canvas = host.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) {
      console.warn('DXF 預覽找不到 canvas')
      return { imageDataUrl: null, width: null, height: null }
    }

    const { width, height } = getViewerBoundsSize(viewer)
    return {
      imageDataUrl: composePreviewWithDimensionLabel(canvas, width, height, {
        fontSize: options.fontSize,
        fontWeight: options.fontWeight,
      }),
      width,
      height,
    }
  } catch (err) {
    console.error('渲染 DXF 圖片失敗:', err)
    return { imageDataUrl: null, width: null, height: null }
  } finally {
    if (viewer?.Destroy) {
      viewer.Destroy()
    }
    host.remove()
  }
}
