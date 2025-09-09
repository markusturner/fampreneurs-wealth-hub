import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  fileName: string;
  fileContent: string; // base64 encoded
  fileType: string;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  category?: string;
  merchant_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { fileName, fileContent, fileType }: UploadRequest = await req.json();
    
    console.log(`Processing bank statement: ${fileName} for user: ${user.id}`);

    // Decode base64 content
    const fileBuffer = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
    const textContent = new TextDecoder().decode(fileBuffer);

    // Parse transactions based on file type
    let transactions: ParsedTransaction[] = [];
    
    if (fileType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
      transactions = parseCSV(textContent);
    } else if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      // For PDF files, we'll store them but note they need manual processing
      transactions = []; // PDFs require OCR/parsing which we'll implement later
      console.log('PDF file uploaded - manual processing required');
    } else {
      throw new Error('Unsupported file type. Please upload a CSV or PDF file.');
    }

    console.log(`Parsed ${transactions.length} transactions`);

    // Store file in storage
    const filePath = `${user.id}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('bank-statements')
      .upload(filePath, fileBuffer, {
        contentType: fileType,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Record the upload in database
    const { data: uploadRecord, error: recordError } = await supabase
      .from('bank_statement_uploads')
      .insert({
        user_id: user.id,
        filename: fileName,
        file_path: filePath,
        file_size: fileBuffer.length,
        transactions_extracted: transactions.length,
        processing_status: 'completed',
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (recordError) {
      console.error('Error recording upload:', recordError);
      throw new Error('Failed to record upload');
    }

    // Insert transactions into bank_statement_transactions table (only if we have transactions)
    if (transactions.length > 0) {
      const transactionInserts = transactions.map(tx => ({
        user_id: user.id,
        bank_statement_id: uploadRecord.id,
        transaction_date: tx.date,
        description: tx.description,
        amount: tx.transaction_type === 'debit' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
        category: tx.category || 'Uncategorized',
        transaction_type: tx.transaction_type,
        reference_number: `stmt_${uploadRecord.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));

      const { error: insertError } = await supabase
        .from('bank_statement_transactions')
        .insert(transactionInserts);

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
        throw new Error('Failed to insert transactions');
      }
    }

    console.log(`Successfully inserted ${transactions.length} transactions`);

    const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const message = isPDF 
      ? `PDF file ${fileName} uploaded successfully. Manual processing will be required to extract transactions.`
      : `Successfully processed ${transactions.length} transactions from ${fileName}`;

    return new Response(
      JSON.stringify({
        success: true,
        message: message,
        uploadId: uploadRecord.id,
        transactionsCount: transactions.length,
        isPDF: isPDF
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error processing bank statement:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function parseCSV(csvContent: string): ParsedTransaction[] {
  const rawLines = csvContent.split(/\r?\n/).map(l => l.trim());
  // Find the first non-empty line as header
  let headerLineIndex = rawLines.findIndex(l => l.length > 0);
  if (headerLineIndex < 0) return [];

  const headerFields = parseCSVLine(rawLines[headerLineIndex]);
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const headersNorm = headerFields.map(h => normalize(h));
  const findIndex = (candidates: string[]) => {
    for (const c of candidates) {
      const ci = headersNorm.findIndex(h => h.includes(normalize(c)));
      if (ci !== -1) return ci;
    }
    return -1;
  };

  // Common header candidates across banks (incl. Venmo)
  const dateIdx = findIndex(['transaction date', 'date', 'posted', 'posted date']);
  const descIdx = findIndex(['description', 'details', 'memo', 'note', 'statement description']);
  const fromIdx = findIndex(['from']);
  const toIdx = findIndex(['to', 'counterparty', 'name']);
  const amountNetIdx = findIndex(['amount (net)', 'amount net']);
  const amountTotalIdx = findIndex(['amount (total)', 'amount total', 'amount']);
  const creditIdx = findIndex(['credit']);
  const debitIdx = findIndex(['debit']);
  const typeIdx = findIndex(['type', 'transaction type']);

  const parseAmount = (s: string | undefined) => {
    if (!s) return NaN;
    let v = s.replace(/\$/g, '').replace(/,/g, '').trim();
    if (/^\(.*\)$/.test(v)) v = '-' + v.slice(1, -1);
    v = v.replace(/^\+/, '');
    return parseFloat(v);
  };

  const transactions: ParsedTransaction[] = [];
  for (let i = headerLineIndex + 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) continue;
    const fields = parseCSVLine(line);
    if (!fields || fields.length < 2) continue;

    // Get date
    let dateStr: string | undefined;
    if (dateIdx >= 0 && fields[dateIdx] !== undefined) {
      dateStr = fields[dateIdx];
    } else {
      // Fallback to first column
      dateStr = fields[0];
    }
    const parsedDate = parseDate(dateStr || '');
    if (!parsedDate) continue;

    // Derive description
    let description = '';
    if (descIdx >= 0 && fields[descIdx]) description = fields[descIdx];
    if (!description) {
      const from = fromIdx >= 0 ? fields[fromIdx] : '';
      const to = toIdx >= 0 ? fields[toIdx] : '';
      const parts = [from, to].filter(Boolean);
      description = parts.length ? parts.join(' → ') : 'Transaction';
    }

    // Determine amount
    let amount = NaN;
    if (amountNetIdx >= 0) amount = parseAmount(fields[amountNetIdx]);
    if (isNaN(amount) && amountTotalIdx >= 0) amount = parseAmount(fields[amountTotalIdx]);

    // If CSV has separate credit/debit columns
    if (isNaN(amount) && (creditIdx >= 0 || debitIdx >= 0)) {
      const creditVal = creditIdx >= 0 ? parseAmount(fields[creditIdx]) : NaN;
      const debitVal = debitIdx >= 0 ? parseAmount(fields[debitIdx]) : NaN;
      if (!isNaN(creditVal)) amount = Math.abs(creditVal);
      else if (!isNaN(debitVal)) amount = -Math.abs(debitVal);
    }

    // As a last resort, try the 3rd column (legacy behavior)
    if (isNaN(amount) && fields[2] !== undefined) amount = parseAmount(fields[2]);

    if (isNaN(amount)) continue;

    // Determine transaction type
    let txType: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';
    if (typeIdx >= 0 && fields[typeIdx]) {
      const t = normalize(fields[typeIdx]);
      if (t.includes('debit') || t.includes('payment') || t.includes('withdrawal')) txType = 'debit';
      if (t.includes('credit') || t.includes('deposit') || t.includes('refund')) txType = 'credit';
    }

    const cleanAmount = Math.abs(amount);
    const tx: ParsedTransaction = {
      date: parsedDate,
      description: description.trim(),
      amount: cleanAmount,
      transaction_type: txType,
      category: categorizeTransaction(description),
      merchant_name: extractMerchantName(description),
    };

    transactions.push(tx);
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim());
  return fields;
}

function parseDate(dateStr: string): string | null {
  try {
    // Try various date formats
    const cleanDate = dateStr.replace(/['"]/g, '').trim();
    
    // Format: MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
      const [month, day, year] = cleanDate.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Format: YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleanDate)) {
      return cleanDate;
    }
    
    // Try parsing as Date
    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null;
  } catch {
    return null;
  }
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('food')) {
    return 'Food & Dining';
  }
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('station')) {
    return 'Transportation';
  }
  if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('dining')) {
    return 'Food & Dining';
  }
  if (desc.includes('amazon') || desc.includes('walmart') || desc.includes('target')) {
    return 'Shopping';
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('subscription')) {
    return 'Entertainment';
  }
  if (desc.includes('rent') || desc.includes('mortgage') || desc.includes('utilities')) {
    return 'Bills & Utilities';
  }
  if (desc.includes('medical') || desc.includes('pharmacy') || desc.includes('doctor')) {
    return 'Healthcare';
  }
  
  return 'Other';
}

function extractMerchantName(description: string): string {
  // Simple merchant name extraction
  const cleaned = description.replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ');
  
  // Take first few meaningful words
  return words.slice(0, 3).join(' ').substring(0, 50);
}