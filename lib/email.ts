import { Resend } from "resend";
import { ClientData, CreativeData, ProductData } from "@/types";

const resend = new Resend(process.env.RESEND_API_KEY);

const BRAND_COLOR = "#4F6EF7";
const BG_COLOR = "#0A0B0F";
const SURFACE_COLOR = "#111318";
const TEXT_COLOR = "#F1F5F9";
const TEXT2_COLOR = "#94A3B8";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en").format(num);
}

function baseEmailTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:'DM Sans',Arial,sans-serif;color:${TEXT_COLOR};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:${SURFACE_COLOR};border-radius:12px;overflow:hidden;border:1px solid #252B38;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px;background:linear-gradient(135deg,#4F6EF7,#7C3AED);text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Growth<span style="color:#fff;opacity:0.8">OS</span></h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${title}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #252B38;text-align:center;">
              <p style="margin:0;color:${TEXT2_COLOR};font-size:12px;">This report was generated automatically by GrowthOS.</p>
              <p style="margin:4px 0 0;color:${TEXT2_COLOR};font-size:12px;">© ${new Date().getFullYear()} GrowthOS. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function kpiCard(label: string, value: string, delta?: string): string {
  const deltaColor = delta?.startsWith("+") ? "#22C55E" : "#EF4444";
  return `
<td style="padding:16px;background-color:#181C23;border-radius:8px;border:1px solid #252B38;text-align:center;">
  <p style="margin:0;font-size:12px;color:${TEXT2_COLOR};text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
  <p style="margin:8px 0 4px;font-size:22px;font-weight:700;color:${TEXT_COLOR};font-family:'Courier New',monospace;">${value}</p>
  ${delta ? `<p style="margin:0;font-size:12px;color:${deltaColor};">${delta}</p>` : ""}
</td>`;
}

function creativeCard(creative: CreativeData): string {
  const roasColor =
    creative.roas >= 8
      ? "#F59E0B"
      : creative.roas >= 5
      ? "#22C55E"
      : creative.roas >= 4
      ? "#4F6EF7"
      : "#94A3B8";

  return `
<tr>
  <td style="padding:12px 0;border-bottom:1px solid #252B38;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="60">
          ${
            creative.thumbnailUrl
              ? `<img src="${creative.thumbnailUrl}" width="50" height="60" style="border-radius:6px;object-fit:cover;" />`
              : `<div style="width:50px;height:60px;background:#252B38;border-radius:6px;"></div>`
          }
        </td>
        <td style="padding-left:12px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${TEXT_COLOR};">${creative.name}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${TEXT2_COLOR};">${creative.campaignName || "—"}</p>
        </td>
        <td style="text-align:right;">
          <p style="margin:0;font-size:16px;font-weight:700;color:${roasColor};">${creative.roas.toFixed(1)}x</p>
          <p style="margin:2px 0 0;font-size:12px;color:${TEXT2_COLOR};">ROAS</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

interface ReportData {
  totalRevenue: number;
  adSpend: number;
  roas: number;
  purchases: number;
  topCreatives: CreativeData[];
  topProducts: ProductData[];
  period: string;
}

export async function sendDailyReport(
  client: ClientData,
  data: ReportData
): Promise<void> {
  const content = `
<p style="margin:0 0 8px;color:${TEXT2_COLOR};font-size:14px;">Hi ${client.name} Team,</p>
<p style="margin:0 0 24px;font-size:16px;">Here's your <strong>daily performance summary</strong> for ${data.period}.</p>

<!-- KPIs -->
<table width="100%" cellpadding="8" cellspacing="8" style="margin-bottom:32px;">
  <tr>
    ${kpiCard("Revenue", formatCurrency(data.totalRevenue))}
    ${kpiCard("Ad Spend", formatCurrency(data.adSpend))}
    ${kpiCard("ROAS", `${data.roas.toFixed(1)}x`)}
    ${kpiCard("Purchases", formatNumber(data.purchases))}
  </tr>
</table>

<!-- Top Creative -->
${
  data.topCreatives[0]
    ? `
<h3 style="margin:0 0 16px;font-size:16px;color:${TEXT_COLOR};">🏆 Top Performing Creative</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
  ${creativeCard(data.topCreatives[0])}
</table>`
    : ""
}

<p style="margin:0;color:${TEXT2_COLOR};font-size:13px;">Log in to <a href="${process.env.NEXTAUTH_URL}" style="color:${BRAND_COLOR};">GrowthOS</a> to view full analytics.</p>
`;

  await resend.emails.send({
    from: "GrowthOS <reports@growthOS.com>",
    to: client.users?.map((u) => u.email) || [],
    subject: `📊 Daily Report — ${client.name} — ${data.period}`,
    html: baseEmailTemplate(`Daily Report — ${data.period}`, content),
  });
}

export async function sendWeeklyReport(
  client: ClientData,
  data: ReportData
): Promise<void> {
  const content = `
<p style="margin:0 0 8px;color:${TEXT2_COLOR};font-size:14px;">Hi ${client.name} Team,</p>
<p style="margin:0 0 24px;font-size:16px;">Here's your <strong>weekly performance summary</strong> for ${data.period}.</p>

<!-- KPIs -->
<table width="100%" cellpadding="8" cellspacing="8" style="margin-bottom:32px;">
  <tr>
    ${kpiCard("Total Revenue", formatCurrency(data.totalRevenue))}
    ${kpiCard("Total Ad Spend", formatCurrency(data.adSpend))}
    ${kpiCard("Avg ROAS", `${data.roas.toFixed(1)}x`)}
    ${kpiCard("Total Purchases", formatNumber(data.purchases))}
  </tr>
</table>

<!-- Top 3 Creatives -->
<h3 style="margin:0 0 16px;font-size:16px;color:${TEXT_COLOR};">🎯 Top 3 Performing Creatives</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
  ${data.topCreatives.slice(0, 3).map(creativeCard).join("")}
</table>

<!-- Top Products -->
${
  data.topProducts.length > 0
    ? `
<h3 style="margin:0 0 16px;font-size:16px;color:${TEXT_COLOR};">🛍️ Bestsellers This Week</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
  ${data.topProducts
    .slice(0, 5)
    .map(
      (p, i) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #252B38;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="24" style="color:${TEXT2_COLOR};font-size:14px;">#${i + 1}</td>
          <td style="font-size:14px;color:${TEXT_COLOR};">${p.name}</td>
          <td style="text-align:right;font-size:14px;font-weight:600;color:${TEXT_COLOR};">${formatCurrency(p.revenue)}</td>
          <td style="text-align:right;font-size:13px;color:${TEXT2_COLOR};padding-left:12px;">${formatNumber(p.totalSold)} sold</td>
        </tr>
      </table>
    </td>
  </tr>`
    )
    .join("")}
</table>`
    : ""
}

<p style="margin:0;color:${TEXT2_COLOR};font-size:13px;">Log in to <a href="${process.env.NEXTAUTH_URL}" style="color:${BRAND_COLOR};">GrowthOS</a> for full insights and inventory alerts.</p>
`;

  await resend.emails.send({
    from: "GrowthOS <reports@growthOS.com>",
    to: client.users?.map((u) => u.email) || [],
    subject: `📈 Weekly Report — ${client.name} — ${data.period}`,
    html: baseEmailTemplate(`Weekly Report — ${data.period}`, content),
  });
}

export async function sendMonthlyReport(
  client: ClientData,
  data: ReportData
): Promise<void> {
  const content = `
<p style="margin:0 0 8px;color:${TEXT2_COLOR};font-size:14px;">Hi ${client.name} Team,</p>
<p style="margin:0 0 24px;font-size:16px;">Here's your comprehensive <strong>monthly performance report</strong> for ${data.period}.</p>

<!-- KPIs -->
<table width="100%" cellpadding="8" cellspacing="8" style="margin-bottom:32px;">
  <tr>
    ${kpiCard("Total Revenue", formatCurrency(data.totalRevenue))}
    ${kpiCard("Total Ad Spend", formatCurrency(data.adSpend))}
    ${kpiCard("Avg ROAS", `${data.roas.toFixed(1)}x`)}
    ${kpiCard("Total Purchases", formatNumber(data.purchases))}
  </tr>
</table>

<!-- All Top Creatives -->
<h3 style="margin:0 0 16px;font-size:16px;color:${TEXT_COLOR};">🏆 Top Performing Creatives</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
  ${data.topCreatives.slice(0, 5).map(creativeCard).join("")}
</table>

<!-- All Top Products -->
${
  data.topProducts.length > 0
    ? `
<h3 style="margin:0 0 16px;font-size:16px;color:${TEXT_COLOR};">🛍️ Top Products This Month</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #252B38;border-radius:8px;overflow:hidden;">
  <tr style="background-color:#181C23;">
    <td style="padding:10px 12px;font-size:12px;color:${TEXT2_COLOR};text-transform:uppercase;">#</td>
    <td style="padding:10px 12px;font-size:12px;color:${TEXT2_COLOR};text-transform:uppercase;">Product</td>
    <td style="padding:10px 12px;font-size:12px;color:${TEXT2_COLOR};text-transform:uppercase;text-align:right;">Units Sold</td>
    <td style="padding:10px 12px;font-size:12px;color:${TEXT2_COLOR};text-transform:uppercase;text-align:right;">Revenue</td>
  </tr>
  ${data.topProducts
    .map(
      (p, i) => `
  <tr style="border-top:1px solid #252B38;">
    <td style="padding:12px;font-size:14px;color:${TEXT2_COLOR};">${i + 1}</td>
    <td style="padding:12px;font-size:14px;color:${TEXT_COLOR};">${p.name}</td>
    <td style="padding:12px;font-size:14px;color:${TEXT_COLOR};text-align:right;">${formatNumber(p.totalSold)}</td>
    <td style="padding:12px;font-size:14px;font-weight:600;color:${TEXT_COLOR};text-align:right;">${formatCurrency(p.revenue)}</td>
  </tr>`
    )
    .join("")}
</table>`
    : ""
}

<div style="background-color:#181C23;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #252B38;">
  <h3 style="margin:0 0 12px;font-size:15px;color:${TEXT_COLOR};">📋 Monthly Summary</h3>
  <p style="margin:0 0 8px;font-size:14px;color:${TEXT2_COLOR};">Total Ad Spend: <strong style="color:${TEXT_COLOR};">${formatCurrency(data.adSpend)}</strong></p>
  <p style="margin:0 0 8px;font-size:14px;color:${TEXT2_COLOR};">Total Revenue Generated: <strong style="color:${TEXT_COLOR};">${formatCurrency(data.totalRevenue)}</strong></p>
  <p style="margin:0 0 8px;font-size:14px;color:${TEXT2_COLOR};">Overall ROAS: <strong style="color:${BRAND_COLOR};">${data.roas.toFixed(2)}x</strong></p>
  <p style="margin:0;font-size:14px;color:${TEXT2_COLOR};">Total Purchases: <strong style="color:${TEXT_COLOR};">${formatNumber(data.purchases)}</strong></p>
</div>

<p style="margin:0;color:${TEXT2_COLOR};font-size:13px;">Log in to <a href="${process.env.NEXTAUTH_URL}" style="color:${BRAND_COLOR};">GrowthOS</a> to explore full monthly analytics and download your report.</p>
`;

  await resend.emails.send({
    from: "GrowthOS <reports@growthOS.com>",
    to: client.users?.map((u) => u.email) || [],
    subject: `📊 Monthly Report — ${client.name} — ${data.period}`,
    html: baseEmailTemplate(`Monthly Report — ${data.period}`, content),
  });
}
