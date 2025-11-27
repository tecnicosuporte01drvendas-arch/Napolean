// Edge Function do Supabase para enviar emails via Gmail API
// Deploy: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

// Headers CORS que devem ser retornados em TODAS as respostas
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

serve(async (req) => {
  // Handle CORS preflight - DEVE ser a primeira coisa, ANTES de qualquer verificação
  // Isso é crítico para que o navegador permita a requisição
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Obter credenciais do ambiente
    const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID');
    const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET');
    const GMAIL_REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN');
    const GMAIL_USER = Deno.env.get('GMAIL_USER'); // Email do remetente

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_USER) {
      // Retornar erro mas COM headers CORS para que o navegador possa ler a resposta
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Credenciais do Gmail não configuradas',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse do body da requisição
    const { to, subject, html, text }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campos obrigatórios: to, subject, html',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Obter access token usando refresh token (OAuth2)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        refresh_token: GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Erro ao obter access token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('Não foi possível obter access token');
    }

    // Codificar subject usando RFC 2047 para caracteres não-ASCII
    // Isso garante que o subject seja interpretado corretamente pelo Gmail
    const encodeSubjectRFC2047 = (text: string): string => {
      // Verificar se contém caracteres não-ASCII
      if (!/[^\x00-\x7F]/.test(text)) {
        return text;
      }
      
      // Codificar em base64 UTF-8
      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      const base64 = base64Encode(bytes);
      
      // RFC 2047: =?charset?B?encoded-text?=
      // Quebrar em linhas de no máximo 75 caracteres (incluindo prefixo/sufixo)
      const prefix = '=?UTF-8?B?';
      const suffix = '?=';
      const maxChunkLength = 75 - prefix.length - suffix.length;
      
      if (base64.length <= maxChunkLength) {
        return `${prefix}${base64}${suffix}`;
      }
      
      // Quebrar em múltiplas linhas
      const chunks: string[] = [];
      for (let i = 0; i < base64.length; i += maxChunkLength) {
        const chunk = base64.substring(i, i + maxChunkLength);
        chunks.push(`${prefix}${chunk}${suffix}`);
      }
      
      return chunks.join('\r\n ');
    };

    // Criar mensagem em formato RFC 822 (email padrão)
    // Usar \r\n para quebras de linha (padrão de email)
    const message = [
      `From: ${GMAIL_USER}`,
      `To: ${to}`,
      `Subject: ${encodeSubjectRFC2047(subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      html,
    ].join('\r\n');

    // Converter para base64 usando método compatível com UTF-8 no Deno
    // Usar TextEncoder para garantir encoding UTF-8 correto
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    
    // Usar a função base64 do Deno std que suporta UTF-8
    const base64String = base64Encode(messageBytes);
    const encodedMessage = base64String
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Enviar email via Gmail API usando fetch direto
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text();
      throw new Error(`Erro ao enviar email via Gmail API: ${errorText}`);
    }

    const response = await gmailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: response.id || 'enviado',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido ao enviar email',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
