function base(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #0f6fff; padding: 24px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; }
    .content { padding: 32px; color: #333; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
    .badge-emergency { background: #fee2e2; color: #dc2626; }
    .badge-normal { background: #dbeafe; color: #1d4ed8; }
    .detail { background: #f9fafb; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .detail p { margin: 4px 0; font-size: 14px; }
    .btn { display: inline-block; margin-top: 16px; padding: 10px 24px; background: #0f6fff; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; }
    .footer { padding: 16px 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Medgrid</h1></div>
    <div class="content">
      <h2>${title}</h2>
      ${body}
    </div>
    <div class="footer">This is an automated message from Medgrid. Do not reply.</div>
  </div>
</body>
</html>`;
}

export function requestCreatedEmail(data: {
  facilityName: string;
  resourceName: string;
  quantity: number;
  classification: string;
  urgencyLevel: string;
  status: string;
}): { subject: string; html: string } {
  const isEmergency = data.classification === "emergency";
  return {
    subject: `[Medgrid] New ${isEmergency ? "Emergency " : ""}Request: ${data.resourceName}`,
    html: base(
      `New ${isEmergency ? "🚨 Emergency " : ""}Request`,
      `<p><strong>${data.facilityName}</strong> has submitted a new coordination request.</p>
      <div class="detail">
        <p><strong>Resource:</strong> ${data.resourceName}</p>
        <p><strong>Quantity:</strong> ${data.quantity}</p>
        <p><strong>Urgency:</strong> ${data.urgencyLevel}</p>
        <p><strong>Classification:</strong>
          <span class="badge badge-${isEmergency ? "emergency" : "normal"}">${data.classification}</span>
        </p>
        <p><strong>Status:</strong> ${data.status}</p>
      </div>
      <p>Log in to Medgrid to respond to this request.</p>`
    ),
  };
}

export function requestAcknowledgedEmail(data: {
  resourceName: string;
  acknowledgedByName: string;
  acknowledgedAt: Date;
}): { subject: string; html: string } {
  return {
    subject: `[Medgrid] Your request has been acknowledged`,
    html: base(
      "Request Acknowledged",
      `<p>Your emergency request for <strong>${data.resourceName}</strong> has been acknowledged.</p>
      <div class="detail">
        <p><strong>Acknowledged by:</strong> ${data.acknowledgedByName}</p>
        <p><strong>Time:</strong> ${data.acknowledgedAt.toUTCString()}</p>
      </div>
      <p>The responding facility is preparing to fulfill your request.</p>`
    ),
  };
}

export function requestFulfilledEmail(data: {
  resourceName: string;
  quantity: number;
  fulfilledByName: string;
  totalAmount: number;
  fulfilledAt: Date;
}): { subject: string; html: string } {
  return {
    subject: `[Medgrid] Request fulfilled: ${data.resourceName}`,
    html: base(
      "Request Fulfilled ✅",
      `<p>Your coordination request has been fulfilled.</p>
      <div class="detail">
        <p><strong>Resource:</strong> ${data.resourceName}</p>
        <p><strong>Quantity:</strong> ${data.quantity}</p>
        <p><strong>Fulfilled by:</strong> ${data.fulfilledByName}</p>
        <p><strong>Total amount:</strong> ₵${data.totalAmount.toFixed(2)}</p>
        <p><strong>Fulfilled at:</strong> ${data.fulfilledAt.toUTCString()}</p>
      </div>`
    ),
  };
}

export function requestCanceledEmail(data: {
  resourceName: string;
  refundAmount: number;
}): { subject: string; html: string } {
  return {
    subject: `[Medgrid] Request canceled: ${data.resourceName}`,
    html: base(
      "Request Canceled",
      `<p>Your coordination request for <strong>${data.resourceName}</strong> has been canceled.</p>
      ${
        data.refundAmount > 0
          ? `<div class="detail"><p><strong>Refund:</strong> ₵${data.refundAmount.toFixed(2)} has been credited back to your facility balance.</p></div>`
          : ""
      }`
    ),
  };
}

export function requestExpiredEmail(data: {
  resourceName: string;
  quantity: number;
}): { subject: string; html: string } {
  return {
    subject: `[Medgrid] Emergency request expired: ${data.resourceName}`,
    html: base(
      "Request Expired ⚠️",
      `<p>Your emergency request for <strong>${data.resourceName}</strong> (Qty: ${data.quantity}) has expired without being fulfilled.</p>
      <p>You may create a new request if the need is still active.</p>`
    ),
  };
}

export function balanceLowEmail(data: {
  facilityName: string;
  currentBalance: number;
  threshold: number;
}): { subject: string; html: string } {
  return {
    subject: `[Medgrid] Low balance alert`,
    html: base(
      "Low Balance Alert ⚠️",
      `<p>The balance for <strong>${data.facilityName}</strong> has dropped below the alert threshold.</p>
      <div class="detail">
        <p><strong>Current balance:</strong> ₵${data.currentBalance.toFixed(2)}</p>
        <p><strong>Alert threshold:</strong> ₵${data.threshold.toFixed(2)}</p>
      </div>
      <p>Please top up your balance to continue creating coordination requests.</p>`
    ),
  };
}

export function balanceTopupEmail(data: {
  facilityName: string;
  amount: number;
  newBalance: number;
}): { subject: string; html: string } {
  return {
    subject: `[Medgrid] Balance top-up confirmed`,
    html: base(
      "Balance Top-Up Confirmed ✅",
      `<p>Your balance top-up for <strong>${data.facilityName}</strong> has been processed.</p>
      <div class="detail">
        <p><strong>Amount added:</strong> ₵${data.amount.toFixed(2)}</p>
        <p><strong>New balance:</strong> ₵${data.newBalance.toFixed(2)}</p>
      </div>`
    ),
  };
}
