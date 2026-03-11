import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nesting } from './entities/nesting.entity';
import { NestingItem } from './entities/nesting-item.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import { extname, join as pathJoin, basename } from 'path';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import * as JSZip from 'jszip';

@Injectable()
export class NestingService {
  constructor(
    @InjectRepository(Nesting)
    private nestingRepository: Repository<Nesting>,
    @InjectRepository(NestingItem)
    private nestingItemRepository: Repository<NestingItem>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<Nesting>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.nestingRepository.findAndCount({
      relations: ['order', 'designWorkOrder', 'nestingItems'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderId(orderId: string): Promise<Nesting[]> {
    return this.nestingRepository.find({
      where: { orderId },
      relations: ['order', 'designWorkOrder', 'nestingItems'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Nesting> {
    const nesting = await this.nestingRepository.findOne({
      where: { id },
      relations: ['order', 'designWorkOrder', 'nestingItems'],
    });

    if (!nesting) {
      throw new NotFoundException(`排版 ID ${id} 不存在`);
    }

    return nesting;
  }

  async create(data: Partial<Nesting>): Promise<Nesting> {
    // 如果沒有提供排版 ID，根據訂單 ID 產生排版圖號；否則使用既有 ID
    const id =
      data.id ||
      (data.orderId ? await this.generateNestingNumber(data.orderId) : randomUUID());

    const nesting = this.nestingRepository.create({
      ...data,
      id,
    });
    return this.nestingRepository.save(nesting);
  }

  async update(id: string, data: Partial<Nesting>): Promise<Nesting> {
    const nesting = await this.findOne(id);
    Object.assign(nesting, data);
    return this.nestingRepository.save(nesting);
  }

  async remove(id: string): Promise<void> {
    const nesting = await this.findOne(id);
    await this.nestingRepository.remove(nesting);
  }

  // 排版工件管理
  async addItem(nestingId: string, payload: Partial<NestingItem>): Promise<NestingItem> {
    const nesting = await this.findOne(nestingId); // 確認排版存在

    const nestingItem = this.nestingItemRepository.create({
      ...payload,
      id: payload.id || randomUUID(),
      nesting,
      quantity: payload.quantity ?? 1,
    });
    return this.nestingItemRepository.save(nestingItem);
  }

  async updateItem(id: string, quantity: number): Promise<NestingItem> {
    const nestingItem = await this.nestingItemRepository.findOneBy({ id });
    if (!nestingItem) {
      throw new NotFoundException(`排版工件 ID ${id} 不存在`);
    }
    nestingItem.quantity = quantity;
    return this.nestingItemRepository.save(nestingItem);
  }

  async removeItem(id: string): Promise<void> {
    const nestingItem = await this.nestingItemRepository.findOneBy({ id });
    if (!nestingItem) {
      throw new NotFoundException(`排版工件 ID ${id} 不存在`);
    }
    await this.nestingItemRepository.remove(nestingItem);
  }

  async importFromDocx(
    file: any,
    meta: { orderId: string; material: string },
  ): Promise<Nesting> {
    if (!file || !file.buffer) {
      throw new NotFoundException('未收到上傳的 DOCX 檔案');
    }

    const result = await mammoth.convertToHtml({ buffer: file.buffer });
    const html = result.value || '';

    const {
      nestingData,
      items,
    } = this.parseHtmlToNestingData(html);

    const originalName: string | undefined = file.originalname;
    const fileBaseName =
      typeof originalName === 'string'
        ? originalName.replace(extname(originalName), '')
        : undefined;

    const id = fileBaseName || (await this.generateNestingNumber(meta.orderId));

    const nestingPath = process.env.NESTING_PATH;
    if (!nestingPath) {
      throw new NotFoundException('NESTING_PATH 未設定');
    }

    await fs.mkdir(nestingPath, { recursive: true });
    const docxFilePath = `${nestingPath}/${id}.docx`;
    let bufferToSave = file.buffer as Buffer;
    try {
      bufferToSave = await this.convertEmfToPngInDocx(bufferToSave);
    } catch {
      // LibreOffice 未安裝或轉換失敗時仍儲存原始 docx
    }
    await fs.writeFile(docxFilePath, bufferToSave);

    const nesting = this.nestingRepository.create({
      id,
      ...nestingData,
      orderId: meta.orderId,
      material: meta.material,
      thickness: nestingData.thickness,
    });
    const savedNesting = await this.nestingRepository.save(nesting);

    if (items.length > 0) {
      const nestingItems = items.map((item) =>
        this.nestingItemRepository.create({
          id: item.id || randomUUID(),
          nesting: savedNesting,
          quantity: item.quantity ?? 1,
          processingTime: item.processingTime,
          x: item.x,
          y: item.y,
        }),
      );
      await this.nestingItemRepository.save(nestingItems);
      savedNesting.nestingItems = nestingItems;
    }

    return savedNesting;
  }

  private parseHtmlToNestingData(html: string): {
    nestingData: Partial<Nesting>;
    items: Array<{
      id?: string;
      processingTime?: number;
      x?: number;
      y?: number;
      quantity?: number;
    }>;
  } {
    const $ = cheerio.load(html);

    const asNumber = (value?: string | null): number | undefined => {
      if (!value) return undefined;
      const cleaned = value.replace(/[,%\s]/g, '');
      if (!cleaned) return undefined;
      const num = Number(cleaned);
      return Number.isNaN(num) ? undefined : num;
    };

    const timeToSeconds = (value?: string | null): number | undefined => {
      if (!value) return undefined;
      const match = value.match(/(\d{1,2}):(\d{2}):(\d{2})/);
      if (!match) return undefined;
      return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    };

    const nestingData: Partial<Nesting> = {};

    const allTableText = $('table').text();
    const cutMatch = allTableText.match(/切割長度[:：]?\s*([\d.,]+)/);
    const lineMatch = allTableText.match(/劃線長度\s*[:：]?\s*([\d.,]+)/);
    const sizeMatch = allTableText.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);

    if (cutMatch) nestingData.cutLength = asNumber(cutMatch[1]);
    if (lineMatch) nestingData.lineLength = asNumber(lineMatch[1]);
    if (sizeMatch) nestingData.thickness = asNumber(sizeMatch[3]);

    $('tr').each((_, tr) => {
      const cells: string[] = [];
      $(tr).find('td').each((__, td) => {
        cells.push($(td).text().trim());
      });

      for (let i = 0; i < cells.length - 1; i++) {
        const label = cells[i];
        const value = cells[i + 1];

        if (label === 'X') nestingData.x = asNumber(value);
        if (label === 'Y') nestingData.y = asNumber(value);
        if (label === '加工時間') nestingData.processingTime = timeToSeconds(value);
        if (label.includes('使用率')) nestingData.utilization = asNumber(value);
        if (label === '重量') nestingData.weight = asNumber(value);
        if (label.includes('廢料')) nestingData.scrap = asNumber(value);
      }
    });

    const items: Array<{
      id?: string;
      processingTime?: number;
      x?: number;
      y?: number;
      quantity?: number;
    }> = [];

    $('tr').each((_, tr) => {
      const rowText = $(tr).text();
      if (!rowText.includes('.DFT')) return;

      const cells: string[] = [];
      $(tr).find('td').each((__, td) => {
        cells.push($(td).text().trim());
      });

      if (cells.length >= 6) {
        const partCell = cells[1];
        const partIdMatch = partCell.match(/^(.+?)\.DFT$/i);
        const partId = partIdMatch ? partIdMatch[1] : undefined;

        items.push({
          id: partId,
          processingTime: timeToSeconds(cells[2]),
          quantity: asNumber(cells[3]),
          x: asNumber(cells[4]),
          y: asNumber(cells[5]),
        });
      }
    });

    return { nestingData, items };
  }

  // 生成排版圖號
  // 格式：前三碼客戶型號 + 年份代號 + 月份 + 日期 + 流水號 + 版次
  private async generateNestingNumber(orderId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // 取年份後兩位
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // 取訂單ID前三碼作為客戶型號前綴
    const prefix = orderId.slice(0, 3).toUpperCase();
    const dateCode = `${year}${month}${day}`;
    
    // 查找今天已經建立的排版數量
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const todayCount = await this.nestingRepository
      .createQueryBuilder('nesting')
      .where('nesting.created_at >= :startOfDay', { startOfDay })
      .andWhere('nesting.created_at < :endOfDay', { endOfDay })
      .getCount();
    
    // 流水號（A, B, C... 或 01, 02, 03...）
    const sequence = String.fromCharCode(65 + todayCount); // A, B, C...
    const version = '01'; // 版次
    
    return `${prefix}${dateCode}${sequence}${version}`;
  }

  /**
   * 將 DOCX 內 word/media 的 EMF/WMF 轉成 PNG，使瀏覽器可顯示。
   * 需安裝 ImageMagick（convert 指令）。若轉換失敗會拋錯，呼叫方應 fallback 儲存原始 buffer。
   */
  private async convertEmfToPngInDocx(docxBuffer: Buffer): Promise<Buffer> {
    const zip = await JSZip.loadAsync(docxBuffer);
    const emfWmfNames: string[] = [];
    zip.forEach((relativePath) => {
      if (/^word\/media\/[^/]+\.(emf|wmf)$/i.test(relativePath)) {
        emfWmfNames.push(relativePath);
      }
    });
    if (emfWmfNames.length === 0) return docxBuffer;

    const tempDir = pathJoin(tmpdir(), `nesting-emf-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
    try {
      for (const name of emfWmfNames) {
        const ext = name.endsWith('.wmf') ? '.wmf' : '.emf';
        const baseName = basename(name, ext);
        const emfPath = pathJoin(tempDir, basename(name));
        const pngPath = pathJoin(tempDir, `${baseName}.png`);
        const emfBuf = await zip.file(name)?.async('nodebuffer');
        if (!emfBuf) continue;
        await fs.writeFile(emfPath, emfBuf);
        try {
          // 使用 LibreOffice headless 將單一 EMF/WMF 轉成 PNG，輸出到 tempDir。
          // 優先使用環境變數 LIBREOFFICE_PATH，否則 fallback 到 macOS 預設安裝路徑。
          const libreofficeCmd =
            process.env.LIBREOFFICE_PATH || '/Applications/LibreOffice.app/Contents/MacOS/soffice';
          execSync(
            `"${libreofficeCmd}" --headless --convert-to png --outdir "${tempDir}" "${emfPath}"`,
            { stdio: 'pipe' },
          );
        } catch (error: any) {
          throw error;
        }
        const pngBuf = await fs.readFile(pngPath);
        const pngZipPath = `word/media/${baseName}.png`;
        zip.file(pngZipPath, pngBuf);
        zip.remove(name);
      }
      const relsPath = 'word/_rels/document.xml.rels';
      const relsFile = zip.file(relsPath);
      if (relsFile) {
        let relsContent = await relsFile.async('string');
        for (const name of emfWmfNames) {
          const baseName = basename(name, name.endsWith('.wmf') ? '.wmf' : '.emf');
          const mediaOld = `media/${baseName}.emf`;
          const mediaWmf = `media/${baseName}.wmf`;
          const mediaNew = `media/${baseName}.png`;
          relsContent = relsContent.replace(new RegExp(mediaOld.replace(/\./g, '\\.'), 'g'), mediaNew);
          relsContent = relsContent.replace(new RegExp(mediaWmf.replace(/\./g, '\\.'), 'g'), mediaNew);
        }
        zip.file(relsPath, relsContent);
      }
      return (await zip.generateAsync({ type: 'nodebuffer' })) as Buffer;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /** 讀取 NESTING_PATH 下 {id}.docx 的 buffer，若不存在或未設定則回傳 null */
  async getPreviewDocx(id: string): Promise<Buffer | null> {
    const nestingPath = process.env.NESTING_PATH;
    if (!nestingPath) return null;
    const filePath = `${nestingPath}/${id}.docx`;
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }
}

