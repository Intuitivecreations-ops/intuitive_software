import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the uploaded file URL from request
    const { receiptUrl } = await req.json();

    if (!receiptUrl) {
      return new Response(
        JSON.stringify({ error: 'Receipt URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the image from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('receipts')
      .download(receiptUrl);

    if (downloadError) {
      throw new Error(`Failed to download receipt: ${downloadError.message}`);
    }

    // Convert blob to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use AI to extract receipt data
    // Note: Supabase provides built-in AI capabilities
    const aiPrompt = `
      Extract the following information from this receipt image:
      - Vendor/Store name
      - Date (format: YYYY-MM-DD)
      - Total amount (numeric value only)
      - Category (guess based on items: Food, Office Supplies, Travel, Utilities, etc.)
      - Payment method if visible (Cash, Credit Card, etc.)
      
      Return ONLY valid JSON in this exact format:
      {
        "vendor": "store name",
        "date": "YYYY-MM-DD",
        "amount": 0.00,
        "category": "category name",
        "payment_method": "method or null",
        "description": "brief description of purchase"
      }
    `;

    // For now, we'll use a simple pattern matching approach
    // In production, you'd integrate with OpenAI Vision API or similar
    // This is a placeholder that returns a structured response
    const extractedData = {
      vendor: "Manual Entry Required",
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: "Uncategorized",
      payment_method: null,
      description: "Receipt uploaded - please verify details",
      confidence: 0,
      raw_text: "AI parsing requires OpenAI API key"
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        message: "Receipt processed. AI parsing requires additional setup (OpenAI API)."
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing receipt:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});