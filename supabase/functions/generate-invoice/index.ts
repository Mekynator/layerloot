import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
// @deno-types="https://esm.sh/jspdf@2.5.2"
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRole);

    const { order_id, regenerate } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing invoice (return it unless regenerating)
    const { data: existing } = await supabase
      .from("invoices")
      .select("*")
      .eq("order_id", order_id)
      .maybeSingle();

    if (existing && !regenerate) {
      // Return signed URL
      const { data: signed } = await supabase.storage
        .from("invoices")
        .createSignedUrl(existing.pdf_path, 3600);
      return new Response(
        JSON.stringify({
          invoice_url: signed?.signedUrl ?? null,
          invoice_number: existing.invoice_number,
          invoice_id: existing.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order data
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", order_id).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", order_id),
    ]);

    const order = orderRes.data;
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = itemsRes.data ?? [];

    // Get customer info
    let customerName = "Customer";
    let customerEmail = "";
    if (order.user_id) {
      const [profileRes, authRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", order.user_id).maybeSingle(),
        supabase.auth.admin.getUserById(order.user_id),
      ]);
      customerName = profileRes.data?.full_name || "Customer";
      customerEmail = authRes.data?.user?.email || "";
    }

    // Generate or reuse invoice number
    let invoiceNumber = existing?.invoice_number;
    if (!invoiceNumber) {
      const { data: numData } = await supabase.rpc("generate_invoice_number");
      invoiceNumber = numData as string;
    }

    const invoiceDate = new Date();
    const shippingAddr = order.shipping_address as any;

    // Build PDF
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = 210;
    const margin = 20;
    const cw = pw - margin * 2;
    let y = 20;

    const blue = [30, 64, 175]; // brand blue
    const dark = [15, 23, 42]; // slate-900
    const muted = [100, 116, 139]; // slate-500
    const lightBg = [248, 250, 252]; // slate-50

    // --- Header ---
    doc.setFontSize(20);
    doc.setTextColor(...blue);
    doc.setFont("helvetica", "bold");
    doc.text("\u2B21 LAYERLOOT", margin, y);

    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.text("LayerLoot · Custom 3D Printed Creations", pw - margin, y - 4, { align: "right" });
    doc.text("layerloot.neuraltune.me", pw - margin, y, { align: "right" });
    doc.text("layerloot.support@neuraltune.me", pw - margin, y + 4, { align: "right" });

    y += 14;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pw - margin, y);
    y += 10;

    // --- INVOICE title ---
    doc.setFontSize(28);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", margin, y);

    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #: ${invoiceNumber}`, pw - margin, y - 10, { align: "right" });
    doc.text(`Date: ${invoiceDate.toLocaleDateString("en-DK", { year: "numeric", month: "long", day: "numeric" })}`, pw - margin, y - 4, { align: "right" });
    doc.text(`Order #: ${order_id.slice(0, 8).toUpperCase()}`, pw - margin, y + 2, { align: "right" });

    y += 14;

    // --- Customer & shipping info boxes ---
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, y, cw / 2 - 4, 30, 2, 2, "F");
    doc.roundedRect(margin + cw / 2 + 4, y, cw / 2 - 4, 30, 2, 2, "F");

    doc.setFontSize(7);
    doc.setTextColor(...blue);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", margin + 5, y + 6);
    doc.text("SHIP TO", margin + cw / 2 + 9, y + 6);

    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "normal");
    doc.text(customerName, margin + 5, y + 13);
    if (customerEmail) doc.text(customerEmail, margin + 5, y + 18);

    if (shippingAddr) {
      let sy = y + 13;
      if (shippingAddr.name) { doc.text(shippingAddr.name, margin + cw / 2 + 9, sy); sy += 5; }
      if (shippingAddr.street) { doc.text(shippingAddr.street, margin + cw / 2 + 9, sy); sy += 5; }
      const cityLine = [shippingAddr.zip, shippingAddr.city].filter(Boolean).join(" ");
      if (cityLine) { doc.text(cityLine, margin + cw / 2 + 9, sy); sy += 5; }
      if (shippingAddr.country) doc.text(shippingAddr.country, margin + cw / 2 + 9, sy);
    }

    y += 38;

    // --- Items table ---
    // Header
    doc.setFillColor(...blue);
    doc.roundedRect(margin, y, cw, 8, 1, 1, "F");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("PRODUCT", margin + 4, y + 5.5);
    doc.text("QTY", margin + cw - 60, y + 5.5, { align: "right" });
    doc.text("UNIT PRICE", margin + cw - 30, y + 5.5, { align: "right" });
    doc.text("TOTAL", margin + cw - 4, y + 5.5, { align: "right" });
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    doc.setFontSize(9);
    items.forEach((item: any, i: number) => {
      if (i % 2 === 0) {
        doc.setFillColor(...lightBg);
        doc.rect(margin, y - 4, cw, 8, "F");
      }
      doc.setTextColor(...dark);
      doc.text(item.product_name || "Product", margin + 4, y + 1);
      doc.setTextColor(...muted);
      doc.text(String(item.quantity), margin + cw - 60, y + 1, { align: "right" });
      doc.text(`${Number(item.unit_price).toFixed(2)} DKK`, margin + cw - 30, y + 1, { align: "right" });
      doc.setTextColor(...dark);
      doc.text(`${Number(item.total_price).toFixed(2)} DKK`, margin + cw - 4, y + 1, { align: "right" });
      y += 8;
    });

    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pw - margin, y);
    y += 6;

    // --- Financial summary ---
    const summaryX = margin + cw - 70;
    const valX = margin + cw - 4;

    const addSummaryRow = (label: string, value: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 11 : 9);
      doc.setTextColor(...(bold ? dark : muted));
      doc.text(label, summaryX, y);
      doc.setTextColor(...dark);
      doc.text(value, valX, y, { align: "right" });
      y += bold ? 8 : 6;
    };

    addSummaryRow("Subtotal", `${Number(order.subtotal).toFixed(2)} DKK`);

    // Discount
    const discountMeta = order.discount_metadata as any;
    if (discountMeta) {
      const discountAmt = discountMeta.total_discount || discountMeta.discount_amount || 0;
      if (discountAmt > 0) {
        addSummaryRow("Discount", `-${Number(discountAmt).toFixed(2)} DKK`);
      }
    }

    addSummaryRow("Shipping", order.shipping_cost > 0 ? `${Number(order.shipping_cost).toFixed(2)} DKK` : "Free");

    y += 2;
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.6);
    doc.line(summaryX, y, valX, y);
    y += 6;

    addSummaryRow("Grand Total", `${Number(order.total).toFixed(2)} DKK`, true);

    y += 6;

    // --- Payment status ---
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.roundedRect(margin, y, cw, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT STATUS: PAID", margin + cw / 2, y + 6.5, { align: "center" });

    y += 18;

    // --- Footer ---
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your purchase!", margin + cw / 2, y, { align: "center" });
    y += 5;
    doc.text("Questions? Contact us at layerloot.support@neuraltune.me", margin + cw / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(7);
    doc.text("LayerLoot \u00B7 Custom 3D Printed Creations \u00B7 layerloot.neuraltune.me", margin + cw / 2, y, { align: "center" });

    // Generate buffer
    const pdfOutput = doc.output("arraybuffer");
    const pdfBuffer = new Uint8Array(pdfOutput);

    // Delete old PDF if regenerating
    const storagePath = `${order_id}/invoice.pdf`;
    if (existing?.pdf_path) {
      await supabase.storage.from("invoices").remove([existing.pdf_path]);
    }

    // Upload PDF
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert invoice record
    const invoiceData = {
      order_id,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate.toISOString(),
      pdf_path: storagePath,
    };

    if (existing) {
      await supabase.from("invoices").update(invoiceData).eq("id", existing.id);
    } else {
      await supabase.from("invoices").insert(invoiceData);
    }

    // Create signed URL
    const { data: signed } = await supabase.storage
      .from("invoices")
      .createSignedUrl(storagePath, 3600);

    return new Response(
      JSON.stringify({
        invoice_url: signed?.signedUrl ?? null,
        invoice_number: invoiceNumber,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-invoice error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
