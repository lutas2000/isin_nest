import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileLoggerService } from '../logger/file-logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly fileLogger: FileLoggerService;

  constructor() {
    this.fileLogger = new FileLoggerService();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '內部伺服器錯誤';
    let errorDetails: any = null;

    // 處理不同類型的異常
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errorDetails = responseObj;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
      errorDetails = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    } else {
      message = String(exception);
      errorDetails = { raw: exception };
    }

    // 構建錯誤日誌訊息
    const errorLog = {
      timestamp: new Date().toISOString(),
      statusCode: status,
      path: request.url,
      method: request.method,
      message,
      error: errorDetails,
      user: (request as any).user?.id || 'anonymous',
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.get('user-agent'),
      body: request.body,
      query: request.query,
      params: request.params,
    };

    // 寫入檔案日誌
    const logMessage = `HTTP ${status} ${request.method} ${request.url} - ${message}`;
    const stackTrace = exception instanceof Error ? exception.stack : JSON.stringify(errorDetails, null, 2);
    
    // 將詳細錯誤資訊以 JSON 格式附加到日誌
    const detailedErrorLog = `詳細錯誤資訊: ${JSON.stringify(errorLog, null, 2)}`;
    const fullStackTrace = stackTrace ? `${stackTrace}\n${detailedErrorLog}` : detailedErrorLog;
    
    this.fileLogger.error(logMessage, fullStackTrace, GlobalExceptionFilter.name);
    
    // 同時使用 NestJS Logger 記錄
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // 如果是開發環境，返回詳細錯誤資訊
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // 構建回應
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // 開發環境下包含更多詳細資訊
    if (isDevelopment && errorDetails) {
      errorResponse.error = errorDetails;
    }

    // 發送回應
    response.status(status).json(errorResponse);
  }
}

