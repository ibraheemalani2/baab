/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface InvestmentRequestNotificationData {
  businessTitle: string;
  businessOwnerName: string;
  businessOwnerEmail: string;
  investorName: string;
  investorEmail: string;
  investorPhone?: string | null;
  investorCity?: string | null;
  investorType: string;
  offeredAmount: number | bigint;
  requestedAmount: number | bigint;
  currency: string;
  message: string;
  previousInvestments: number;
  businessId: string;
  requestId: string;
}

export interface InvestmentRequestForEmail {
  id: string;
  requestedAmount: number | bigint;
  offeredAmount: number | bigint;
  currency: string;
  business: {
    title: string;
    [key: string]: any;
  };
  investor: {
    name: string;
    email: string | null;
    [key: string]: any;
  };
  businessOwner: {
    name: string;
    email: string | null;
    [key: string]: any;
  };
}

export interface InvestmentStatusUpdateData {
  investmentRequest: InvestmentRequestForEmail;
  status: string;
  adminNotes?: string;
  rejectionReason?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Configure nodemailer transporter
    // For development, we'll use Gmail SMTP (can be changed to other providers)

    // Check if email configuration exists
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      this.logger.warn(
        'Email configuration missing. Email notifications will be disabled.',
      );
      // Create a dummy transporter that doesn't actually send emails
      this.transporter = {
        sendMail: () => Promise.resolve({ messageId: 'dev-mode-no-email' }),
        verify: () => Promise.resolve(true),
      } as any;
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
      },
    });

    // Alternative configuration for custom SMTP
    /* 
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    */
  }

  async sendInvestmentRequestNotification(
    data: InvestmentRequestNotificationData,
  ): Promise<void> {
    try {
      const subject = `طلب استثمار جديد في عملك: ${data.businessTitle}`;

      const htmlContent = this.generateInvestmentRequestEmailTemplate(data);
      const textContent = this.generateInvestmentRequestTextTemplate(data);

      const mailOptions = {
        from: `"BAAB - باب" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: data.businessOwnerEmail,
        subject,
        text: textContent,
        html: htmlContent,
        // Add reply-to for better communication
        replyTo: `"BAAB Support" <${process.env.EMAIL_SUPPORT || process.env.EMAIL_USER}>`,
      };

      await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Investment request notification sent successfully to ${data.businessOwnerEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send investment request notification to ${data.businessOwnerEmail}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendInvestmentStatusUpdate(
    data: InvestmentStatusUpdateData,
  ): Promise<void> {
    try {
      const { investmentRequest, status, adminNotes, rejectionReason } = data;

      const statusLabels = {
        APPROVED: 'تم قبول طلبك',
        REJECTED: 'تم رفض طلبك',
        COMPLETED: 'تم إتمام الاستثمار',
        WITHDRAWN: 'تم سحب الطلب',
        PENDING: 'قيد المراجعة',
      };

      const subject = `تحديث طلب الاستثمار - ${investmentRequest.business.title}`;

      // Send email to investor
      const investorHtmlContent = this.generateInvestmentReviewStatusTemplate({
        recipientName: investmentRequest.investor.name,
        businessTitle: investmentRequest.business.title,
        status,
        statusLabel: statusLabels[status] || status,
        adminNotes,
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        recipientType: 'investor',
        requestedAmount: investmentRequest.requestedAmount,
        offeredAmount: investmentRequest.offeredAmount,
        currency: investmentRequest.currency,
      });

      const emails: Promise<any>[] = [];

      // Send email to investor if email exists
      if (investmentRequest.investor.email) {
        const investorMailOptions = {
          from: `"BAAB - باب" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
          to: investmentRequest.investor.email,
          subject,
          html: investorHtmlContent,
        };
        emails.push(this.transporter.sendMail(investorMailOptions));
      }

      // Send email to business owner if email exists
      if (investmentRequest.businessOwner.email) {
        const ownerHtmlContent = this.generateInvestmentReviewStatusTemplate({
          recipientName: investmentRequest.businessOwner.name,
          businessTitle: investmentRequest.business.title,
          status,
          statusLabel: statusLabels[status] || status,
          adminNotes,
          rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
          recipientType: 'owner',
          requestedAmount: investmentRequest.requestedAmount,
          offeredAmount: investmentRequest.offeredAmount,
          currency: investmentRequest.currency,
        });

        const ownerMailOptions = {
          from: `"BAAB - باب" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
          to: investmentRequest.businessOwner.email,
          subject,
          html: ownerHtmlContent,
        };
        emails.push(this.transporter.sendMail(ownerMailOptions));
      }

      // Send all emails
      if (emails.length > 0) {
        await Promise.all(emails);
      }

      this.logger.log(
        `Investment status update notifications sent to investor (${investmentRequest.investor.email || 'no email'}) and owner (${investmentRequest.businessOwner.email || 'no email'})`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to send investment status update notifications',
        error.stack,
      );
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async sendInvestmentStatusUpdateLegacy(
    recipientEmail: string,
    recipientName: string,
    businessTitle: string,
    status: string,
    message?: string,
  ): Promise<void> {
    try {
      const statusLabels = {
        APPROVED: 'تم قبول طلبك',
        REJECTED: 'تم رفض طلبك',
        COMPLETED: 'تم إتمام الاستثمار',
        WITHDRAWN: 'تم سحب الطلب',
      };

      const subject = `${statusLabels[status] || 'تحديث حالة الاستثمار'}: ${businessTitle}`;

      const htmlContent = this.generateStatusUpdateEmailTemplate({
        recipientName,
        businessTitle,
        status,
        statusLabel: statusLabels[status] || status,
        message,
      });

      const mailOptions = {
        from: `"BAAB - باب" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Status update notification sent successfully to ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send status update notification to ${recipientEmail}`,
        error.stack,
      );
      throw error;
    }
  }

  private generateInvestmentRequestEmailTemplate(
    data: InvestmentRequestNotificationData,
  ): string {
    const formatCurrency = (amount: number, currency: string) => {
      if (currency === 'USD') {
        return `$${amount.toLocaleString()}`;
      }
      return `${amount.toLocaleString()} د.ع`;
    };

    const investorTypeLabels = {
      INDIVIDUAL: 'فردي',
      COMPANY: 'شركة',
      FUND: 'صندوق استثمار',
    };

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>طلب استثمار جديد</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #007bff;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }
            .title {
                color: #007bff;
                font-size: 20px;
                margin-bottom: 10px;
            }
            .business-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
            }
            .investor-info {
                background-color: #e3f2fd;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
            }
            .amount-highlight {
                background-color: #fff3cd;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
                border-left: 4px solid #ffc107;
                text-align: center;
            }
            .message-section {
                background-color: #f1f3f4;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
                border-left: 4px solid #28a745;
            }
            .actions {
                text-align: center;
                margin: 30px 0;
            }
            .btn {
                display: inline-block;
                padding: 12px 24px;
                margin: 0 10px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                transition: background-color 0.3s;
            }
            .btn-primary {
                background-color: #007bff;
                color: white;
            }
            .btn-secondary {
                background-color: #6c757d;
                color: white;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                color: #6c757d;
                font-size: 14px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 5px 0;
            }
            .info-label {
                font-weight: bold;
                color: #495057;
            }
            .info-value {
                color: #007bff;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">BAAB - باب</div>
                <div style="color: #6c757d;">دليلك للفرص الاستثمارية</div>
            </div>

            <h2 class="title">🎯 طلب استثمار جديد!</h2>
            
            <p>مرحباً <strong>${data.businessOwnerName}</strong>،</p>
            
            <p>تم استلام طلب استثمار جديد في عملك التجاري. فيما يلي تفاصيل الطلب:</p>

            <div class="business-info">
                <h3 style="color: #007bff; margin-top: 0;">📊 معلومات العمل</h3>
                <div class="info-row">
                    <span class="info-label">اسم العمل:</span>
                    <span class="info-value">${data.businessTitle}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">المبلغ المطلوب:</span>
                    <span class="info-value">${formatCurrency(Number(data.requestedAmount) / 100, data.currency)}</span>
                </div>
            </div>

            <div class="investor-info">
                <h3 style="color: #007bff; margin-top: 0;">👤 معلومات المستثمر</h3>
                <div class="info-row">
                    <span class="info-label">الاسم:</span>
                    <span class="info-value">${data.investorName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">البريد الإلكتروني:</span>
                    <span class="info-value">${data.investorEmail}</span>
                </div>
                ${
                  data.investorPhone
                    ? `
                <div class="info-row">
                    <span class="info-label">الهاتف:</span>
                    <span class="info-value">${data.investorPhone}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.investorCity
                    ? `
                <div class="info-row">
                    <span class="info-label">المدينة:</span>
                    <span class="info-value">${data.investorCity}</span>
                </div>
                `
                    : ''
                }
                <div class="info-row">
                    <span class="info-label">نوع المستثمر:</span>
                    <span class="info-value">${investorTypeLabels[data.investorType] || data.investorType}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">الاستثمارات السابقة:</span>
                    <span class="info-value">${data.previousInvestments} استثمار</span>
                </div>
            </div>

            <div class="amount-highlight">
                <h3 style="color: #856404; margin-top: 0;">💰 المبلغ المعروض</h3>
                <div style="font-size: 24px; font-weight: bold; color: #007bff;">
                    ${formatCurrency(Number(data.offeredAmount) / 100, data.currency)}
                </div>
            </div>

            <div class="message-section">
                <h3 style="color: #155724; margin-top: 0;">💬 رسالة من المستثمر</h3>
                <p style="margin: 0; white-space: pre-line;">${data.message}</p>
            </div>

            <div class="actions">
                <a href="${process.env.FRONTEND_URL}/dashboard/investment-requests" class="btn btn-primary">
                    عرض الطلب في لوحة التحكم
                </a>
                <a href="${process.env.FRONTEND_URL}/business/${data.businessId}" class="btn btn-secondary">
                    عرض تفاصيل العمل
                </a>
            </div>

            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                <p style="margin: 0; color: #0c5460;">
                    <strong>💡 نصائح مهمة:</strong><br>
                    • تأكد من مراجعة ملف المستثمر الشخصي<br>
                    • ناقش تفاصيل الاستثمار قبل الموافقة<br>
                    • يمكنك قبول أو رفض أو التفاوض على الطلب<br>
                    • تواصل مع فريق الدعم في حال وجود أي استفسار
                </p>
            </div>

            <div class="footer">
                <p>هذا البريد الإلكتروني مُرسل من منصة BAAB - باب</p>
                <p>إذا كان لديك أي استفسار، يرجى التواصل معنا على: ${process.env.EMAIL_SUPPORT || 'support@baab.iq'}</p>
                <p style="margin-top: 15px;">
                    <a href="${process.env.FRONTEND_URL}" style="color: #007bff;">زيارة المنصة</a> | 
                    <a href="${process.env.FRONTEND_URL}/support" style="color: #007bff;">الدعم الفني</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateInvestmentRequestTextTemplate(
    data: InvestmentRequestNotificationData,
  ): string {
    const formatCurrency = (amount: number, currency: string) => {
      if (currency === 'USD') {
        return `$${amount.toLocaleString()}`;
      }
      return `${amount.toLocaleString()} د.ع`;
    };

    return `
BAAB - باب: طلب استثمار جديد

مرحباً ${data.businessOwnerName},

تم استلام طلب استثمار جديد في عملك "${data.businessTitle}".

معلومات المستثمر:
- الاسم: ${data.investorName}
- البريد الإلكتروني: ${data.investorEmail}
- نوع المستثمر: ${data.investorType}
- الاستثمارات السابقة: ${data.previousInvestments}

تفاصيل الطلب:
- المبلغ المطلوب: ${formatCurrency(Number(data.requestedAmount) / 100, data.currency)}
- المبلغ المعروض: ${formatCurrency(Number(data.offeredAmount) / 100, data.currency)}

الرسالة:
${data.message}

يمكنك مراجعة الطلب من خلال لوحة التحكم: ${process.env.FRONTEND_URL}/dashboard/investment-requests

للاستفسار: ${process.env.EMAIL_SUPPORT || 'support@baab.iq'}

BAAB - باب | دليلك للفرص الاستثمارية
    `;
  }

  private generateInvestmentReviewStatusTemplate(data: {
    recipientName: string;
    businessTitle: string;
    status: string;
    statusLabel: string;
    adminNotes?: string;
    rejectionReason?: string;
    recipientType: 'investor' | 'owner';
    requestedAmount: number | bigint;
    offeredAmount: number | bigint;
    currency: string;
  }): string {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'APPROVED':
          return '#10b981';
        case 'COMPLETED':
          return '#3b82f6';
        case 'REJECTED':
          return '#ef4444';
        default:
          return '#6b7280';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'APPROVED':
          return '✅';
        case 'COMPLETED':
          return '🎉';
        case 'REJECTED':
          return '❌';
        default:
          return '📢';
      }
    };

    const formatCurrency = (amount: number, currency: string) => {
      if (currency === 'USD') {
        return `$${amount.toLocaleString()}`;
      }
      return `${amount.toLocaleString()} د.ع`;
    };

    const recipientMessage =
      data.recipientType === 'investor'
        ? 'تم تحديث حالة طلب الاستثمار الخاص بك.'
        : 'تم تحديث حالة طلب الاستثمار المتقدم لعملك التجاري.';

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تحديث طلب الاستثمار</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #007bff;
            }
            .status-badge {
                display: inline-block;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 18px;
                margin: 20px 0;
                background-color: ${getStatusColor(data.status)};
                color: white;
            }
            .amount-info {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin: 15px 0;
                display: flex;
                justify-content: space-between;
            }
            .notes-section {
                background-color: #e3f2fd;
                padding: 15px;
                border-radius: 6px;
                margin: 15px 0;
                border-right: 4px solid #2196f3;
            }
            .rejection-section {
                background-color: #ffebee;
                padding: 15px;
                border-radius: 6px;
                margin: 15px 0;
                border-right: 4px solid #f44336;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div style="font-size: 24px; font-weight: bold; color: #007bff;">BAAB - باب</div>
                <div style="color: #6c757d;">دليلك للفرص الاستثمارية</div>
            </div>

            <div style="text-align: center;">
                <div style="font-size: 48px; margin: 20px 0;">${getStatusIcon(data.status)}</div>
                <h2 style="color: ${getStatusColor(data.status)};">${data.statusLabel}</h2>
                <div class="status-badge">${data.businessTitle}</div>
            </div>

            <p>مرحباً <strong>${data.recipientName}</strong>،</p>
            
            <p>${recipientMessage}</p>

            <div class="amount-info">
                <div>
                    <strong>المبلغ المطلوب:</strong><br>
                    ${formatCurrency(Number(data.requestedAmount), data.currency)}
                </div>
                <div>
                    <strong>المبلغ المعروض:</strong><br>
                    ${formatCurrency(Number(data.offeredAmount), data.currency)}
                </div>
            </div>

            ${
              data.adminNotes
                ? `
            <div class="notes-section">
                <h4 style="color: #1976d2; margin-top: 0;">ملاحظات من فريق المراجعة:</h4>
                <p style="margin: 0;">${data.adminNotes}</p>
            </div>
            `
                : ''
            }

            ${
              data.rejectionReason
                ? `
            <div class="rejection-section">
                <h4 style="color: #d32f2f; margin-top: 0;">سبب الرفض:</h4>
                <p style="margin: 0;">${data.rejectionReason}</p>
            </div>
            `
                : ''
            }

            ${
              data.status === 'APPROVED'
                ? `
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="color: #2e7d32;">الخطوات التالية:</h4>
                <p style="margin: 0;">
                    ${
                      data.recipientType === 'investor'
                        ? 'تهانينا! تم قبول طلب الاستثمار الخاص بك. سيتم التواصل معك قريباً لاستكمال العملية.'
                        : 'تم قبول طلب الاستثمار المتقدم لعملك. يمكنك الآن التواصل مع المستثمر لاستكمال العملية.'
                    }
                </p>
            </div>
            `
                : ''
            }

            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard/investment-requests" 
                   style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    عرض لوحة التحكم
                </a>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
                <p>BAAB - باب | دليلك للفرص الاستثمارية</p>
                <p>للاستفسار: ${process.env.EMAIL_SUPPORT || 'support@baab.iq'}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateStatusUpdateEmailTemplate(data: {
    recipientName: string;
    businessTitle: string;
    status: string;
    statusLabel: string;
    message?: string;
  }): string {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'APPROVED':
          return '#28a745';
        case 'COMPLETED':
          return '#007bff';
        case 'REJECTED':
          return '#dc3545';
        default:
          return '#6c757d';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'APPROVED':
          return '✅';
        case 'COMPLETED':
          return '🎉';
        case 'REJECTED':
          return '❌';
        default:
          return '📢';
      }
    };

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تحديث حالة الاستثمار</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #007bff;
            }
            .status-badge {
                display: inline-block;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 18px;
                margin: 20px 0;
                background-color: ${getStatusColor(data.status)};
                color: white;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div style="font-size: 24px; font-weight: bold; color: #007bff;">BAAB - باب</div>
            </div>

            <div style="text-align: center;">
                <div style="font-size: 48px; margin: 20px 0;">${getStatusIcon(data.status)}</div>
                <h2 style="color: ${getStatusColor(data.status)};">${data.statusLabel}</h2>
                <div class="status-badge">${data.businessTitle}</div>
            </div>

            <p>مرحباً <strong>${data.recipientName}</strong>،</p>
            
            <p>تم تحديث حالة طلب الاستثمار الخاص بك.</p>

            ${
              data.message
                ? `
            <div style="background-color: #f1f3f4; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="color: #495057; margin-top: 0;">رسالة إضافية:</h3>
                <p style="margin: 0; white-space: pre-line;">${data.message}</p>
            </div>
            `
                : ''
            }

            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard/investment-requests" 
                   style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    عرض لوحة التحكم
                </a>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
                <p>BAAB - باب | دليلك للفرص الاستثمارية</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async sendBusinessVerificationNotification(data: {
    businessTitle: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    status: string;
    notes: string;
    adminName: string;
    businessId: string;
  }): Promise<void> {
    try {
      const statusArabic = {
        APPROVED: 'تم الموافقة عليه',
        REJECTED: 'تم رفضه',
        PENDING: 'قيد المراجعة',
        SUSPENDED: 'معلق',
        SOLD: 'تم البيع',
        FUNDED: 'تم التمويل',
      };

      const statusColor = {
        APPROVED: '#10b981',
        REJECTED: '#ef4444',
        PENDING: '#f59e0b',
        SUSPENDED: '#6b7280',
        SOLD: '#3b82f6',
        FUNDED: '#8b5cf6',
      };

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@baab.iq',
        to: data.businessOwnerEmail,
        subject: `تحديث حالة عملك التجاري: ${data.businessTitle}`,
        html: this.getBusinessVerificationEmailTemplate(
          data,
          statusArabic,
          statusColor,
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      if (result.messageId === 'dev-mode-no-email') {
        this.logger.log(
          `[DEV MODE] Business verification notification would be sent to ${data.businessOwnerEmail} (email disabled)`,
        );
      } else {
        this.logger.log(
          `Business verification notification sent to ${data.businessOwnerEmail}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to send business verification notification',
        error.stack,
      );
      throw new Error('Failed to send business verification notification');
    }
  }

  private getBusinessVerificationEmailTemplate(
    data: {
      businessTitle: string;
      businessOwnerName: string;
      status: string;
      notes: string;
      adminName: string;
      businessId: string;
    },
    statusArabic: Record<string, string>,
    statusColor: Record<string, string>,
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تحديث حالة عملك التجاري</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; direction: rtl;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">باب - BAAB</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">دليلك للفرص الاستثمارية</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">تحديث حالة عملك التجاري</h2>
                
                <p style="color: #4b5563; margin: 0 0 20px 0; line-height: 1.6;">
                    مرحبا ${data.businessOwnerName}،
                </p>

                <p style="color: #4b5563; margin: 0 0 30px 0; line-height: 1.6;">
                    نود إعلامك بتحديث حالة عملك التجاري "<strong>${data.businessTitle}</strong>" على منصة باب.
                </p>

                <!-- Status Box -->
                <div style="background-color: ${statusColor[data.status] || '#6b7280'}; color: white; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
                    <h3 style="margin: 0; font-size: 20px;">حالة العمل التجاري</h3>
                    <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold;">
                        ${statusArabic[data.status] || data.status}
                    </p>
                </div>

                ${
                  data.notes
                    ? `
                <!-- Admin Notes -->
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
                    <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">ملاحظات من فريق المراجعة:</h4>
                    <p style="color: #4b5563; margin: 0; line-height: 1.6; font-style: italic;">
                        "${data.notes}"
                    </p>
                </div>
                `
                    : ''
                }

                <!-- Action Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="http://localhost:3000/dashboard" 
                       style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; transition: background-color 0.2s;">
                        عرض عملي التجاري
                    </a>
                </div>

                <!-- Next Steps -->
                ${
                  data.status === 'APPROVED'
                    ? `
                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 30px 0;">
                    <h4 style="color: #047857; margin: 0 0 10px 0;">الخطوات التالية:</h4>
                    <p style="color: #065f46; margin: 0; line-height: 1.6;">
                        تهانينا! تم الموافقة على عملك التجاري ويمكن الآن للمستثمرين مشاهدته وإرسال طلبات استثمار. ستصلك إشعارات عند وجود طلبات جديدة.
                    </p>
                </div>
                `
                    : data.status === 'REJECTED'
                      ? `
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 30px 0;">
                    <h4 style="color: #dc2626; margin: 0 0 10px 0;">الخطوات التالية:</h4>
                    <p style="color: #991b1b; margin: 0; line-height: 1.6;">
                        نأسف لعدم الموافقة على عملك التجاري. يرجى مراجعة الملاحظات أعلاه وتحديث البيانات، ثم يمكنك إعادة التقديم.
                    </p>
                </div>
                `
                      : ''
                }

                <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px; line-height: 1.5;">
                    إذا كان لديك أي أسئلة، يرجى التواصل معنا على info@baab.iq أو من خلال منصة باب.
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    تم المراجعة بواسطة: ${data.adminName}<br>
                    تاريخ الإرسال: ${new Date().toLocaleDateString('ar-EG')}
                </p>
                <br>
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                    BAAB - باب | دليلك للفرص الاستثمارية
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email service connection failed', error.stack);
      return false;
    }
  }
}
