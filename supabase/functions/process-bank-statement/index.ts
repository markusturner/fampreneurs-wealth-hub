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
    } else {
      throw new Error('Unsupported file type. Please upload a CSV file.');
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

    // Insert transactions into account_transactions table
    const transactionInserts = transactions.map(tx => ({
      user_id: user.id,
      account_id: uploadRecord.id, // Using upload record as account reference
      transaction_id: `statement_${uploadRecord.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: tx.amount,
      description: tx.description,
      transaction_date: tx.date,
      transaction_type: tx.transaction_type,
      category: tx.category || 'Uncategorized',
      merchant_name: tx.merchant_name,
      currency: 'USD',
      pending: false,
      metadata: {
        source: 'bank_statement_upload',
        upload_id: uploadRecord.id,
        original_filename: fileName
      }
    }));

    const { error: insertError } = await supabase
      .from('account_transactions')
      .insert(transactionInserts);

    if (insertError) {
      console.error('Error inserting transactions:', insertError);
      throw new Error('Failed to insert transactions');
    }

    console.log(`Successfully inserted ${transactions.length} transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${transactions.length} transactions from ${fileName}`,
        uploadId: uploadRecord.id,
        transactionsCount: transactions.length
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
  const lines = csvContent.trim().split('\n');
  const transactions: ParsedTransaction[] = [];

  // Skip header row if it exists
  const startIndex = lines[0] && lines[0].toLowerCase().includes('date') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      // Parse CSV line (basic CSV parsing - handles quoted fields)
      const fields = parseCSVLine(line);
      
      if (fields.length < 3) continue; // Need at least date, description, amount

      const date = parseDate(fields[0]);
      const description = fields[1] || 'Unknown Transaction';
      const amount = parseFloat(fields[2].replace(/[,$]/g, ''));

      if (isNaN(amount) || !date) continue;

      const transaction: ParsedTransaction = {
        date: date,
        description: description.trim(),
        amount: Math.abs(amount),
        transaction_type: amount >= 0 ? 'credit' : 'debit',
        category: categorizeTransaction(description),
        merchant_name: extractMerchantName(description)
      };

      transactions.push(transaction);
    } catch (error) {
      console.warn(`Error parsing line ${i + 1}: ${line}`, error);
      continue;
    }
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