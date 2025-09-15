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
  transaction_type: 'debit' | 'credit';
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
    
    try {
      if (fileType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
        console.log('Starting CSV parsing...');
        transactions = parseCSV(textContent);
        console.log(`CSV parsing completed. Found ${transactions.length} transactions`);
      } else if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        // For PDF files, we'll store them but note they need manual processing
        transactions = []; // PDFs require OCR/parsing which we'll implement later
        console.log('PDF file uploaded - manual processing required');
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or PDF file.');
      }
    } catch (parseError) {
      console.error('Error parsing file:', parseError);
      throw new Error(`File parsing failed: ${parseError.message}`);
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
      console.log(`Preparing to insert ${transactions.length} transactions for user ${user.id}`);
      
      const transactionInserts = transactions.map(tx => ({
        user_id: user.id,
        bank_statement_id: uploadRecord.id,
        transaction_date: tx.date,
        description: tx.description,
        amount: Math.abs(tx.amount), // Always store positive amount
        category: tx.category || 'Uncategorized',
        transaction_type: tx.transaction_type, // Now uses 'expense' | 'income'
        reference_number: `stmt_${uploadRecord.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));

      console.log('Sample transaction insert:', transactionInserts[0]);

      const { error: insertError, data: insertedData } = await supabase
        .from('bank_statement_transactions')
        .insert(transactionInserts)
        .select();

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
        console.error('Failed insert data sample:', transactionInserts.slice(0, 2));
        
        // Update upload record with error
        await supabase
          .from('bank_statement_uploads')
          .update({
            processing_status: 'failed',
            error_message: `Database insertion failed: ${insertError.message}`
          })
          .eq('id', uploadRecord.id);
          
        throw new Error(`Failed to insert transactions: ${insertError.message}`);
      }

      console.log(`Successfully inserted ${insertedData?.length || 0} transactions`);
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
  try {
    console.log('Starting CSV parsing...');
    
    // Helper function for currency formatting
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    };
    
    const rawLines = csvContent.split(/\r?\n/).map(l => l.trim());
    console.log(`Found ${rawLines.length} lines in CSV`);
    
    // Find the first non-empty line as header
    let headerLineIndex = rawLines.findIndex(l => l.length > 0);
    if (headerLineIndex < 0) {
      console.log('No header found');
      return [];
    }

    const headerFields = parseCSVLine(rawLines[headerLineIndex]);
    console.log('Header fields:', headerFields);
    
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const headersNorm = headerFields.map(h => normalize(h));
    console.log('Normalized headers:', headersNorm);
    
    const findIndex = (candidates: string[]) => {
      for (const c of candidates) {
        const ci = headersNorm.findIndex(h => h.includes(normalize(c)));
        if (ci !== -1) return ci;
      }
      return -1;
    };

    // Common header candidates across banks (incl. Venmo)
    const dateIdx = findIndex(['transaction date', 'date', 'posted', 'posted date']);
    const descIdx = findIndex(['description', 'details', 'memo', 'note', 'statement description', 'payee']);
    const fromIdx = findIndex(['from']);
    const toIdx = findIndex(['to', 'counterparty', 'name']);
    const amountNetIdx = findIndex(['amount (net)', 'amount net']);
    const amountTotalIdx = findIndex(['amount (total)', 'amount total', 'amount']);
    const creditIdx = findIndex(['credit']);
    const debitIdx = findIndex(['debit']);
    const typeIdx = findIndex(['type', 'transaction type']);
    
    console.log('Column indices:', {
      dateIdx, descIdx, fromIdx, toIdx, amountNetIdx, amountTotalIdx, creditIdx, debitIdx, typeIdx
    });

    const parseAmount = (s: string | undefined) => {
      if (!s) return NaN;
      let v = s.trim().toLowerCase();
      // Remove common currency symbols and spaces
      v = v.replace(/[$€£\s]/g, '');
      // Parentheses denote negative
      const isParenNegative = /^\(.*\)$/.test(v);
      if (isParenNegative) v = v.slice(1, -1);
      // Remove leading plus
      v = v.replace(/^\+/, '');
      // Handle CR/DR markers (common in statements)
      let sign = 1;
      if (/\bdr\b/.test(v)) sign = -1;
      if (/\bcr\b/.test(v)) sign = 1;
      v = v.replace(/\b(dr|cr)\b/g, '');
      // Determine decimal separator
      if (v.includes(',') && !v.includes('.')) {
        // Assume comma is decimal separator, dot as thousands
        v = v.replace(/\./g, '');
        v = v.replace(/,/g, '.');
      } else {
        // Assume comma is thousands separator
        v = v.replace(/,/g, '');
      }
      const n = parseFloat(v);
      if (isNaN(n)) return NaN;
      return (isParenNegative ? -1 : 1) * sign * n;
    };

    const transactions: ParsedTransaction[] = [];
    let processedCount = 0;
    let skippedCount = 0;
    
    for (let i = headerLineIndex + 1; i < rawLines.length; i++) {
      try {
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
        if (!parsedDate) {
          console.log(`Skipping row ${i}: invalid date "${dateStr}"`);
          skippedCount++;
          continue;
        }

        // Derive description with improved extraction
        let description = '';
        
        // Primary: Try description field
        if (descIdx >= 0 && fields[descIdx]) {
          description = fields[descIdx].trim();
        }
        
        // Secondary: Try from/to fields  
        if (!description) {
          const from = fromIdx >= 0 ? fields[fromIdx] : '';
          const to = toIdx >= 0 ? fields[toIdx] : '';
          const parts = [from, to].filter(Boolean);
          if (parts.length) {
            description = parts.join(' → ');
          }
        }
        
        // Tertiary: Try to find any descriptive field - expanded candidates
        if (!description || description === 'Unknown' || description === 'Transaction') {
          // Look for merchant-like fields in other columns - expanded list
          const merchantCandidates = [
            'merchant', 'payee', 'vendor', 'name', 'reference', 'memo', 'note', 
            'counterparty', 'company', 'business', 'description', 'details',
            'transaction description', 'statement description', 'payment to',
            'payment from', 'recipient', 'sender', 'beneficiary'
          ];
          for (const candidate of merchantCandidates) {
            const idx = headersNorm.findIndex(h => h.includes(normalize(candidate)));
            if (idx >= 0 && fields[idx] && fields[idx].trim() && 
                fields[idx].trim().toLowerCase() !== 'unknown' &&
                fields[idx].trim().toLowerCase() !== 'transaction' &&
                fields[idx].trim().toLowerCase() !== 'n/a' &&
                fields[idx].trim().toLowerCase() !== 'na' &&
                fields[idx].trim().length > 1) {
              description = fields[idx].trim();
              break;
            }
          }
        }
        
        // Fallback: Try to extract from any non-numeric, non-date field with better filtering
        if (!description || description === 'Unknown' || description === 'Transaction') {
          for (let col = 0; col < fields.length; col++) {
            if (col === dateIdx || col === amountNetIdx || col === amountTotalIdx || 
                col === creditIdx || col === debitIdx) continue; // Skip known numeric/date columns
                
            const field = fields[col]?.trim();
            if (field && field.length > 2 && 
                !/^\d+(\.\d+)?$/.test(field) && // Not just a number
                !/^\$?\d+(\.\d+)?$/.test(field) && // Not just currency
                !parseDate(field) && // Not a date
                field.toLowerCase() !== 'unknown' &&
                field.toLowerCase() !== 'transaction' &&
                field.toLowerCase() !== 'n/a' &&
                field.toLowerCase() !== 'na' &&
                field.toLowerCase() !== 'pending' &&
                field.toLowerCase() !== 'completed' &&
                field.toLowerCase() !== 'cleared' &&
                !field.match(/^[A-Z]{2,3}$/)) { // Not currency codes like USD, EUR
              description = field;
              break;
            }
          }
        }
        
        // This will be handled after txType is determined

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

        // As a last resort, try parsing different columns for amount
        if (isNaN(amount)) {
          for (let col = 0; col < fields.length; col++) {
            const testAmount = parseAmount(fields[col]);
            if (!isNaN(testAmount)) {
              amount = testAmount;
              break;
            }
          }
        }

        if (isNaN(amount)) {
          console.log(`Skipping row ${i}: invalid amount in fields:`, fields);
          skippedCount++;
          continue;
        }

        // Determine transaction type based on context, not just amount sign
        // Most bank statements show expenses as positive amounts
        let txType: 'debit' | 'credit' = 'debit'; // Default to expense for positive amounts
        
        // Check for explicit type indicators first
        if (typeIdx >= 0 && fields[typeIdx]) {
          const t = normalize(fields[typeIdx]);
          if (t.includes('debit') || t.includes('payment') || t.includes('withdrawal') || t.includes('spend')) txType = 'debit';
          if (t.includes('credit') || t.includes('deposit') || t.includes('refund')) txType = 'credit';
        } else {
          // If no explicit type, use amount sign as secondary indicator
          // Negative amounts are typically income (deposits) in many formats
          txType = amount < 0 ? 'credit' : 'debit';
        }

        // Final fallback for description if still empty/generic (using txType after it's defined)
        if (!description || description === 'Unknown' || description === 'Transaction') {
          // Use a more meaningful fallback that includes the row number for identification
          const transType = txType === 'credit' ? 'Incoming Transfer' : 'Outgoing Transfer';
          description = `${transType} - Row ${i}`;
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
        processedCount++;
      } catch (rowError) {
        console.error(`Error processing row ${i}:`, rowError);
        skippedCount++;
      }
    }
    
    console.log(`CSV parsing complete. Processed: ${processedCount}, Skipped: ${skippedCount}, Total: ${transactions.length}`);
    return transactions;
  } catch (error) {
    console.error('Error in CSV parsing:', error);
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
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
    const cleanDate = dateStr.replace(/['"]/g, '').trim();
    console.log(`Parsing date: "${cleanDate}"`);

    // Handle M/D/YYYY format (like 8/31/2025)
    let m: RegExpMatchArray | null;
    if ((m = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
      const [_, mon, d, yr] = m;
      const result = `${yr}-${mon.padStart(2, '0')}-${d.padStart(2, '0')}`;
      console.log(`Parsed M/D/YYYY: ${cleanDate} -> ${result}`);
      return result;
    }

    // DD/MM/YYYY or D/M/YY(YY)
    if ((m = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))) {
      let [_, d, mon, yr] = m;
      if (yr.length === 2) yr = (Number(yr) > 70 ? '19' : '20') + yr;
      const result = `${yr}-${mon.padStart(2, '0')}-${d.padStart(2, '0')}`;
      console.log(`Parsed DD/MM/YYYY: ${cleanDate} -> ${result}`);
      return result;
    }

    // DD-MM-YYYY or DD.MM.YYYY or D-M-YY
    if ((m = cleanDate.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{2}|\d{4})$/))) {
      let [_, d, mon, yr] = m;
      if (yr.length === 2) yr = (Number(yr) > 70 ? '19' : '20') + yr;
      const result = `${yr}-${mon.padStart(2, '0')}-${d.padStart(2, '0')}`;
      console.log(`Parsed DD-MM-YYYY: ${cleanDate} -> ${result}`);
      return result;
    }

    // YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(cleanDate)) {
      const parts = cleanDate.includes('/') ? cleanDate.split('/') : cleanDate.split('-');
      const [yr, mon, d] = parts;
      const result = `${yr}-${mon.padStart(2, '0')}-${d.padStart(2, '0')}`;
      console.log(`Parsed YYYY-MM-DD: ${cleanDate} -> ${result}`);
      return result;
    }

    // Fallback to Date parser
    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
      const result = parsed.toISOString().split('T')[0];
      console.log(`Parsed with Date constructor: ${cleanDate} -> ${result}`);
      return result;
    }

    console.log(`Failed to parse date: "${cleanDate}"`);
    return null;
  } catch (error) {
    console.error(`Error parsing date "${dateStr}":`, error);
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
  // Clean up the description to extract merchant name
  let cleaned = description.trim();
  
  // Remove common transaction prefixes
  cleaned = cleaned.replace(/^(pos|atm|card|purchase|payment|transfer|deposit|withdrawal)\s*/i, '');
  
  // Remove dates and times
  cleaned = cleaned.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '');
  cleaned = cleaned.replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/gi, '');
  
  // Remove reference numbers and IDs
  cleaned = cleaned.replace(/\b[a-z]*\d{4,}\b/gi, '');
  cleaned = cleaned.replace(/\b(ref|id|trans|conf|auth)[\s#:]*[a-z0-9]+\b/gi, '');
  
  // Remove excessive numbers but keep street addresses
  cleaned = cleaned.replace(/\b\d{5,}\b/g, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // If we have a meaningful result, return first 3 words
  if (cleaned && cleaned.length > 3 && cleaned.toLowerCase() !== 'unknown') {
    const words = cleaned.split(' ').filter(word => word.length > 1);
    return words.slice(0, 3).join(' ').substring(0, 50);
  }
  
  // Fallback to original description
  return description.substring(0, 50);
}