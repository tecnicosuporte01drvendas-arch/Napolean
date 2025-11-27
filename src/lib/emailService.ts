// Serviço de envio de emails via Gmail API (OAuth2)
// Este serviço chama uma Edge Function do Supabase que faz o envio real

import { supabase } from './supabase';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  /**
   * Envia um email usando a Edge Function do Supabase
   * A Edge Function usa Gmail API com OAuth2
   * Usa fetch direto para evitar problemas de CORS com supabase.functions.invoke()
   */
  async sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Credenciais do Supabase não configuradas');
        return false;
      }

      // Usar fetch direto em vez de supabase.functions.invoke() para evitar problemas de CORS
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''), // Remove HTML tags para texto simples
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao enviar email:', errorText);
        return false;
      }

      const data = await response.json();
      return data?.success === true;
    } catch (error: any) {
      console.error('Erro ao chamar função de email:', error);
      return false;
    }
  },

  /**
   * Envia código de verificação OTP
   */
  async sendVerificationCode(email: string, codigo: string): Promise<boolean> {
    const subject = 'Código de Verificação - Napolean';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .code-box { background: white; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; font-family: 'Courier New', monospace; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Napolean</h1>
              <p>Plataforma de Inteligência em Vendas</p>
            </div>
            <div class="content">
              <h2>Seu código de verificação</h2>
              <p>Olá,</p>
              <p>Você solicitou um código de verificação para acessar a plataforma Napolean.</p>
              
              <div class="code-box">
                <div class="code">${codigo}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este código expira em 15 minutos. Não compartilhe este código com ninguém.
              </div>
              
              <p>Se você não solicitou este código, ignore este email.</p>
              
              <p>Atenciosamente,<br>Equipe Napolean</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  },
};

